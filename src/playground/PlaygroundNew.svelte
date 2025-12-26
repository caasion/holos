<script lang="ts">
	import { format, parseISO } from "date-fns";
	import type { App, TFile } from "obsidian";
	import type { CalendarPipeline } from "src/actions/calendarPipelines";
	import type { PlannerActions } from "src/actions/itemActions";
	import type { DataService, HelperService, ISODate, ItemData, ItemID, ItemMeta, PluginSettings } from "src/types";
	import { tick } from "svelte";
	import { templates } from "src/state/plannerStore";
	import { PlannerParser } from "src/lib/parser";
	import { getAllDailyNotes, getDailyNote, createDailyNote } from "obsidian-daily-notes-interface";
	import moment from "moment";
	import { Notice } from "obsidian";
	import FloatBlock from "src/ui/FloatBlock.svelte";
	import TemplateEditor from "src/ui/TemplateEditor.svelte";
	import EditableCell from "./EditableCell.svelte";

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

	let showTemplateEditor = $state<boolean>(false);
	
	// Track if we're currently writing to prevent re-reading our own changes
	let isWriting = $state<boolean>(false);
	
	// Debounce timer for writes
	let writeTimer: NodeJS.Timeout | null = null;

	/* Table Rendering */
	const weekFormat = settings.weekFormat;
	const columns = settings.columns;
	const blocks = settings.blocks;

	let anchor = $state<ISODate>(helper.getISODate(new Date()));

	let dates = $derived.by<ISODate[]>(() => {
		const anchorDate = parseISO(anchor);

		if (weekFormat) {
			return helper.getISODates(anchorDate, blocks, settings.weekStartOn);
		} else {
			return helper.getISODates(anchorDate, columns * blocks)
		}
	})

	interface ColumnMeta {
		date: ISODate;
		tDate: ISODate;
	}

	let columnsMeta: ColumnMeta[] = $derived.by(() => {
		const _ = $templates; // trick to ensure reactivity.

		return dates.map(date => ({
			date,
			tDate: plannerActions.getTemplateDate(date),
		}));
	});

	interface RenderItem {
		id: ItemID;
		meta: ItemMeta;
	}

	type SortedTemplates = Record<ISODate, RenderItem[]>;

	let sortedTemplates = $derived.by<SortedTemplates>(() => {
		const allTemplateDates = new Set(columnsMeta.map(c => c.tDate));

		const result: SortedTemplates = {};

		allTemplateDates.forEach(date => {
			if (date != "") {
				const rawTemplate = data.getTemplate(date); 
			
				const itemsArray: RenderItem[] = Object.entries(rawTemplate).map(([id, meta]) => ({id,meta}));

				itemsArray.sort((a, b) => a.meta.order - b.meta.order);

				result[date] = itemsArray;
			}			
		});

		return result;
	});
	
	interface BlockMeta {
		rows: number; // Use a function to get the # of rows to render
		dates: ColumnMeta[];
	}

	let blocksMeta = $derived.by<BlockMeta[]>(() => {
		let meta: BlockMeta[] = [];
		
		for (let i = 0; i < blocks; i++) {
			const columnChunk: ColumnMeta[] = columnsMeta.slice(columns * i, columns * (i + 1));
			const templateLengths: number[] = columnChunk.map(({ date, tDate}) => tDate != "" ? sortedTemplates[tDate].length : 0)

			meta.push({
				rows: Math.max(...templateLengths),
				dates: columnChunk,
			})
		}

		return meta;
	})

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
			time: 60,
			items: [{
				raw: "",
				text: "",
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
	async function goTo(newDate: ISODate) {
		/* Maintain focus when switching weeks */
		anchor = newDate;
		await tick();
		// focusCell(focus.row, focus.col);
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

<!-- <DebugBlock label={"Dates:"} object={dates} />
<DebugBlock label={"Columns Meta:"} object={columnsMeta} />
<DebugBlock label={"Sorted Templates:"} object={sortedTemplates} />
<DebugBlock label={"Blocks Meta:"} object={blocksMeta} /> -->


<div class="header">
	<div class="nav-buttons">
		<button onclick={() => goTo(helper.getISODate(new Date()))}>Today</button>
    	<button onclick={() => goTo(helper.addDaysISO(anchor, -settings.columns))}>&lt;</button>
		<button onclick={() => goTo(helper.addDaysISO(anchor, settings.columns))}>&gt;</button>
	</div>
	<div class="week">
		<span class="week-label">{helper.getLabelFromDateRange(parseISO(columnsMeta[0].date), parseISO(columnsMeta[columnsMeta.length - 1].date))}</span>
		<input type="date" bind:value={anchor} />
	</div>
	<div class="new-ai">
		<button onclick={(evt) => showTemplateEditor = !showTemplateEditor}>{showTemplateEditor ? "Planner View" : "Templates Editor"}</button>
	</div>
</div>

{#if !showTemplateEditor}

<FloatBlock 
	templates={sortedTemplates} 
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
                        <div class="cell">
							{#if (col == 0 && sortedTemplates[tDate][row].meta.label !== "") || tDate == date}
							<div class="row-label" style={`background-color: ${sortedTemplates[tDate][row].meta.color}b3; color: white;`}>{sortedTemplates[tDate][row].meta.type == "calendar" ? "📅" : ""} {sortedTemplates[tDate][row].meta.label}</div>
						{/if}
						{#if (parsedContent[date] && parsedContent[date][sortedTemplates[tDate][row].id])}
							<EditableCell 
								date={date}
								itemId={sortedTemplates[tDate][row].id}
								itemData={parsedContent[date][sortedTemplates[tDate][row].id]}
								onUpdate={handleCellUpdate}
								itemColor={sortedTemplates[tDate][row].meta.color}
								/>
							{:else}
								<div class="empty-cell">
									<div class="empty-message">No data</div>
									<button 
										class="add-new-btn" 
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
	/* Navigation Menu */
	.header {
		display: grid;
    	grid-template-columns: 1fr 1fr 1fr;
	}

	.week {
		display: flex;
		justify-content: center; 
		position: relative;
	}

	.week-label {
		font-weight: 600;
		font-size: x-large;
		text-align: center;
		padding: .25rem .5rem;
		display: inline-block;
		pointer-events: none;  
	}

	.week input[type="date"] {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);

		width: 100%;
		height: 100%;
		z-index: 1;

		opacity: 0;
		cursor: pointer;
	}

	.week input[type="date"]::-webkit-calendar-picker-indicator {
		width: 100%;
		cursor: pointer;
	}

	.week input[type="date"]::-webkit-datetime-edit {
		display: none;
	}

	.new-ai {
		display: flex;
		justify-content: flex-end;
	}

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

	.row-label {
		padding: 4px 8px;
		border-radius: 4px;
		font-weight: 600;
		margin-bottom: 4px;
		font-size: 0.9em;
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

	.empty-message {
		color: var(--text-muted);
		font-style: italic;
		font-size: 0.9em;
	}

	.add-new-btn {
		padding: 4px 12px;
		background: transparent;
		border: 1px dashed var(--interactive-accent);
		color: var(--interactive-accent);
		cursor: pointer;
		border-radius: 4px;
		font-size: 0.85em;
		transition: all 0.2s;
	}

	.add-new-btn:hover {
		background-color: var(--interactive-accent);
		color: white;
		border-style: solid;
	}
</style>
