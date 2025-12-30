<script lang="ts">
	import { format, parseISO } from "date-fns";
	import type { App, TFile } from "obsidian";
	import type { CalendarPipeline } from "src/calendar/calendarPipelines";
	import type { PlannerActions } from "src/planner/logic/itemActions";
	import type { BlockMeta, DataService, DateMapping, HelperService, ISODate, Item, ItemData, ItemDict, ItemID, ItemMeta, PluginSettings, TDate } from "src/plugin/types";
	import { tick } from "svelte";
	import { PlannerParser } from "src/planner/logic/parser";
	import { getAllDailyNotes, getDailyNote, createDailyNote } from "obsidian-daily-notes-interface";
	import moment from "moment";
	import { Notice } from "obsidian";
	import FloatBlock from "src/planner/ui/FloatBlock.svelte";
	import TemplateEditor from "src/templates/TemplateEditor.svelte";
	import EditableCell from "./EditableCell.svelte";
	import { getISODate, getISODates, getLabelFromDateRange } from "src/plugin/helpers";
	import DebugBlock from "src/playground/DebugBlock.svelte";
	import { getBlocksMeta, getDateMappings, getSortedTemplates } from "../logic/rendering";
	import Navbar from "./Navbar.svelte";

	// Purpose: To provide a UI to interact with the objects storing the information. The view reads the objects to generate an appropriate table.

	interface ViewProps {
		app: App;
		settings: PluginSettings;
		data: DataService;
		helper: HelperService;
		plannerActions: PlannerActions;
		calendarPipeline: CalendarPipeline;
        parser: PlannerParser;
	}

	let { app, settings, data, helper, plannerActions, calendarPipeline, parser }: ViewProps = $props();

	
	
	// Track if we're currently writing to prevent re-reading our own changes
	let isWriting = $state<boolean>(false);
	
	// Debounce timer for writes
	let writeTimer: NodeJS.Timeout | null = null;

	/* === View Rendering === */
	let inTemplateEditor = $state<boolean>(false);

	/* === Table Rendering === */
	// Simplify settings
	const { weekFormat, columns, blocks, weekStartOn} = settings;

	// Set default anchor date to today
	const today = getISODate(new Date());
	let anchor = $state<ISODate>(today);

	// Create an array of relevant ISODates from function getISODates()
	let dates = $derived<ISODate[]>(weekFormat ? getISODates(anchor, blocks, weekStartOn) : getISODates(anchor, columns * blocks))

	// Create a dictionary of each date mapped to its respective template date
	let dateMappings: DateMapping[] = $derived(getDateMappings(dates, plannerActions));

	// Convert a template into a sorted array of items
	let sortedTemplateDates: Record<TDate, Item[]> = $derived(getSortedTemplates(dateMappings, data));
	
	// Calculate the number of rows needed and derive the dates involved in each block
	let blocksMeta: BlockMeta[] = $derived(getBlocksMeta(blocks, columns, dateMappings, sortedTemplateDates));

    async function getDailyNoteContents(file: TFile): Promise<string | null> {
        if (file) {
            return await app.vault.read(file);
        } else {
            return null;
        }
    }

    /* Writing contents back to daily notes */
    async function writeDailyNote(date: ISODate, items: Record<ItemID, ItemData>): Promise<void> {
        isWriting = true;
        
        try {
            const dailyNoteFile = getDailyNote(moment(date), getAllDailyNotes());
            
            if (!dailyNoteFile) {
                console.warn(`No daily note found for ${date}`);
                return;
            }
            
            // Read current content
            const currentContent = await app.vault.read(dailyNoteFile);
            
            // Serialize the new section
            const newSection = parser.serializeSection(date, items);
            
            // Replace the section
            const updatedContent = PlannerParser.replaceSection(currentContent, settings.sectionHeading, newSection);
            
            // Write back to file
            await app.vault.modify(dailyNoteFile, updatedContent);
            
            console.log(`Updated planner section for ${date}`);
        } catch (error) {
            console.error(`Error writing to daily note for ${date}:`, error);
        } finally {
            // Add a small delay before allowing reads again
            setTimeout(() => {
                isWriting = false;
            }, 100);
        }
    }
    
    /* Debounced write function */
    function debouncedWrite(date: ISODate, items: Record<ItemID, ItemData>) {
        if (writeTimer) {
            clearTimeout(writeTimer);
        }
        
        writeTimer = setTimeout(() => {
            writeDailyNote(date, items);
        }, 500); // Wait 500ms after last edit
    }

    /* Retrieving contents of daily notes */
    let parsedContent = $state<Record<ISODate, Record<ItemID, ItemData>>>({});

    async function loadDailyNoteContent(date: ISODate): Promise<Record<ItemID, ItemData>> {
        const dailyNoteFile = getDailyNote(moment(date), getAllDailyNotes());
        const contents = await getDailyNoteContents(dailyNoteFile);
        
        if (!contents) {
            return {};
        }
        
        const extracted = PlannerParser.extractSection(contents, settings.sectionHeading);
        const parsed = parser.parseSection(date, extracted);
        
        return parsed;
    }

    $effect(() => {
        // Skip reading if we're currently writing
        if (isWriting) return;
        
        const result: Record<ISODate, Record<ItemID, ItemData>> = {};
        
        Promise.all(
            dates.map(async (date) => {
                result[date] = await loadDailyNoteContent(date);
            })
        ).then(() => {
            parsedContent = result;
        });
    });

    /* File watching for external changes */
    $effect(() => {
        const fileModifyRef = app.vault.on('modify', async (file) => {
            if (isWriting) return;
            
            // Check if the modified file is one of our daily notes
            const allDailyNotes = getAllDailyNotes();
            const isDailyNote = Object.values(allDailyNotes).some(note => note.path === file.path);
            
            if (!isDailyNote) return;
            
            // Find which date(s) this file corresponds to
            for (const date of dates) {
                const dailyNote = getDailyNote(moment(date), allDailyNotes);
                if (dailyNote && dailyNote.path === file.path) {
                    // Reload this date's content
                    const newContent = await loadDailyNoteContent(date);
                    parsedContent = {
                        ...parsedContent,
                        [date]: newContent
                    };
                }
            }
        });

        return () => {
            app.vault.offref(fileModifyRef);
        };
    });

	// Update handler for editable cells
	function handleCellUpdate(date: ISODate, itemId: ItemID, updatedData: ItemData) {
		// Update local state
		parsedContent = {
			...parsedContent,
			[date]: {
				...parsedContent[date],
				[itemId]: updatedData
			}
		};
		
		// Write to file (debounced)
		debouncedWrite(date, parsedContent[date]);
	}

	// Add new item to an empty cell
	async function addNewItemToCell(date: ISODate, itemId: ItemID, itemMeta: ItemMeta) {
		// Check if daily note exists
		const dailyNoteFile = getDailyNote(moment(date), getAllDailyNotes());
		
		if (!dailyNoteFile) {
			// Prompt user to create daily note
			new Notice("Daily note doesn't exist. Creating it now...");
			
			try {
				await createDailyNote(moment(date));
				new Notice("Daily note created!");
				
				// Reload daily notes to get the new file
				await tick();
			} catch (error) {
				new Notice("Failed to create daily note");
				console.error("Error creating daily note:", error);
				return;
			}
		}
		
		// Create empty item with one element
		const newItemData: ItemData = {
			id: itemId,
			time: itemMeta.innerMeta.timeCommitment,
			items: [{
				raw: "New Item",
				text: "New Item",
				children: [],
				isTask: false
			}]
		};
		
		// Update local state
		parsedContent = {
			...parsedContent,
			[date]: {
				...parsedContent[date] || {},
				[itemId]: newItemData
			}
		};
		
		// Write to file immediately
		await writeDailyNote(date, parsedContent[date]);
		
		// Reload content to ensure sync
		const reloadedContent = await loadDailyNoteContent(date);
		parsedContent = {
			...parsedContent,
			[date]: reloadedContent
		};
	}

	// TODO: Each block should have their own "rowsToRender"

	function focusCell() {
		// TODO: Re-implement row and column navigation.
	}

	// Currently doesn't work
	function goTo(newDate: ISODate) {
		/* Maintain focus when switching weeks */
		anchor = newDate;
	}

	// Open daily note for a specific date
	async function openDailyNote(date: ISODate) {
		let dailyNoteFile = getDailyNote(moment(date), getAllDailyNotes());
		
		if (!dailyNoteFile) {
			// Prompt user to create daily note
			new Notice("Daily note doesn't exist. Creating it now...");
			
			try {
				dailyNoteFile = await createDailyNote(moment(date));
				new Notice("Daily note created!");
			} catch (error) {
				new Notice("Failed to create daily note");
				console.error("Error creating daily note:", error);
				return;
			}
		}
		
		// Open the daily note
		if (dailyNoteFile) {
			await app.workspace.getLeaf(false).openFile(dailyNoteFile);
		}
	}

	// Check if a date is today
	function isToday(date: ISODate): boolean {
		return date === helper.getISODate(new Date());
	}
</script>

<h1>The Ultimate Planner</h1>

<DebugBlock label={"Dates:"} object={dates} />
<DebugBlock label={"Columns Meta:"} object={dateMappings} />
<DebugBlock label={"Sorted Templates:"} object={sortedTemplateDates} />
<DebugBlock label={"Blocks Meta:"} object={blocksMeta} />

<Navbar
	{goTo}
	incrementAmount={columns}

	label={getLabelFromDateRange(dates[0], dates[dates.length - 1])}
	{anchor}

	view={"Planner"}
	toggleView={() => inTemplateEditor = !inTemplateEditor}
/>

{#if !inTemplateEditor}

<FloatBlock 
	templates={sortedTemplateDates} 
	contextMenu={(e: MouseEvent, tDate: ISODate, id: ItemID, meta: ItemMeta) => plannerActions.openItemMenu(app, e, tDate, id, meta)} 
	focusCell={(opt: boolean) => { return false }}
/>  

<div class="main-grid-container">
    {#each blocksMeta as {rows, dates}, block (dates)}
        <div class="block-container">
            <div class="header-row" style={`grid-template-columns: repeat(${columns}, 1fr);`}>
                {#each dates as {date}, col (date)}
                    <div class="header-cell">
                        <button 
                            class="date-card" 
                            class:today={isToday(date)}
                            onclick={() => openDailyNote(date)}
                            title="Click to open daily note"
                        >
                            <div class="dow-label">{format(parseISO(date), "E")}</div>
                            <div class="date-label">{format(parseISO(date), "dd")}</div>
                        </button>
                    </div>
                {/each}
            </div>

            <div class="data-grid" style={`grid-template-columns: repeat(${columns}, 1fr);`}>
                {#each {length: rows} as _, row (row)}
                    {#each dates as {date, tDate: tDate}, col (col)}
					{#if tDate === ""}
						<div class="cell">-</div>
					{:else if row < Object.keys(sortedTemplates[tDate]).length}
                        <div class="cell" style={`background-color: ${sortedTemplates[tDate][row].meta.color}10;`}>
						{#if (parsedContent[date] && parsedContent[date][sortedTemplates[tDate][row].id])}
							<EditableCell 
								date={date}
								showLabel={(col == 0 && sortedTemplates[tDate][row].meta.label !== "") || tDate == date}
								itemLabel={sortedTemplates[tDate][row].meta.label}
								itemId={sortedTemplates[tDate][row].id}
								itemData={parsedContent[date][sortedTemplates[tDate][row].id]}
								onUpdate={handleCellUpdate}
								itemColor={sortedTemplates[tDate][row].meta.color}
								itemType = {sortedTemplates[tDate][row].meta.type}
								/>
							{:else}
								<div class="empty-cell">
									<button 
										class="add-new-btn" 
										style={`border-color: ${sortedTemplates[tDate][row].meta.color}; color: ${sortedTemplates[tDate][row].meta.color};`}
										onclick={() => addNewItemToCell(date, sortedTemplates[tDate][row].id, sortedTemplates[tDate][row].meta)}
										title="Add new item"
									>
										+ Add
									</button>
								</div>
							{/if}
						</div>
					{:else}
						<div class="cell">-</div>
					{/if}
                    {/each}
                {/each}
            </div>
        </div>
    {/each}
</div>
{:else}
<TemplateEditor {app} {plannerActions} {helper} />
{/if}

<style>
	/* Table Header */
	.header-cell {
		padding: 8px;
		display: flex;
		justify-content: center;
		align-items: center;
		border-right: 1px solid #ccc; 
	}

	.header-cell:last-child {
		border-right: none;
	}

	.date-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background-color: var(--interactive-accent);
		opacity: 0.7;
		border-radius: 8px;
		padding: 4px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		transition: all 0.2s;
		border: none;
		cursor: pointer;
		width: 100%;
		height: 100%;
	}

	.date-card:hover {
		opacity: 1;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
		transform: translateY(-2px);
	}

	.date-card.today {
		opacity: 1;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
		border: 2px solid var(--text-accent);
	}

	.date-card.today:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.dow-label {
		text-align: center;
		font-size: 0.9em;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 4px;
		opacity: 0.9;
	}

	.date-label {
		text-align: center;
		font-size: 1.8em;
		font-weight: 700;
		color: white;
		line-height: 1;
	}

	/* Grid Layout */
	.main-grid-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.block-container {
		border: 1px solid #ccc; 
	}

	.header-row {
		display: grid;
		/* grid-template-columns is set dynamically in the Svelte component */
		border-bottom: 2px solid #ccc;
		padding: 8px 0;
		background-color: var(--background-primary);
	}

	.header-cell {
		padding: 4px;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.data-grid {
		display: grid;
		/* grid-template-columns is set dynamically in the Svelte component */
			grid-auto-rows: minmax(40px, auto); 
	}

	.cell {
		padding: 4px;
		border-right: 1px dotted #ccc;
		border-bottom: 1px dashed #ccc;
		border-collapse: collapse;
		min-height: 40px; 
	}

	.empty-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 8px;
		height: 100%;
	}

	.add-new-btn {
		padding: 4px 12px;
		background: transparent;
		border: 1px dashed;
		cursor: pointer;
		border-radius: 4px;
		font-size: 0.85em;
		transition: all 0.2s;
	}

	.add-new-btn:hover {
		opacity: 0.8;
	}
</style>
