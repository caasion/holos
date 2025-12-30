<script lang="ts">
	import { format, parseISO } from "date-fns";
	import type { App } from "obsidian";
	import type { CalendarPipeline } from "src/calendar/calendarPipelines";
	import type { PlannerActions } from "src/planner/logic/itemActions";
	import type { BlockMeta, DataService, DateMapping, HelperService, ISODate, Item, ItemData, ItemDict, ItemID, ItemMeta, PluginSettings, TDate } from "src/plugin/types";
	import { PlannerParser } from "src/planner/logic/parser";
	import { DailyNoteService } from "src/planner/logic/reader";
	import FloatBlock from "src/planner/ui/FloatBlock.svelte";
	import TemplateEditor from "src/templates/TemplateEditor.svelte";
	import EditableCell from "./EditableCell.svelte";
	import { getISODate, getISODates, getLabelFromDateRange } from "src/plugin/helpers";
	import DebugBlock from "src/playground/DebugBlock.svelte";
	import { getBlocksMeta, getDateMappings, getSortedTemplates } from "../logic/rendering";
	import Navbar from "./Navbar.svelte";
	import HeaderCell from "./HeaderCell.svelte";
	import EmptyCell from "./EmptyCell.svelte";

	// Purpose: To provide a UI to interact with the objects storing the information. The view reads the objects to generate an appropriate table.

	interface ViewProps {
		app: App;
		settings: PluginSettings;
		data: DataService;
		helper: HelperService;
		plannerActions: PlannerActions;
		calendarPipeline: CalendarPipeline;
        parser: PlannerParser;
		dailyNoteService: DailyNoteService;
	}

	let { app, settings, data, helper, plannerActions, calendarPipeline, parser, dailyNoteService }: ViewProps = $props();

	
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

	// Get parsed content from the service store
	let parsedContent = $state<Record<ISODate, Record<ItemID, ItemData>>>({});
	dailyNoteService.parsedContent.subscribe(value => {
		parsedContent = value;
	});

	// Load daily note content when dates change
	$effect(() => {
		dailyNoteService.loadMultipleDates(dates);
	});

	// Setup file watcher when dates change
	$effect(() => {
		dailyNoteService.setupFileWatcher(dates);
		
		return () => {
			dailyNoteService.cleanupFileWatcher();
		};
	});

	// Update handler for editable cells
	function handleCellUpdate(date: ISODate, itemId: ItemID, updatedData: ItemData) {
		dailyNoteService.updateCell(date, itemId, updatedData);
	}

	// Add new item to an empty cell
	async function addNewItemToCell(date: ISODate, itemId: ItemID, itemMeta: ItemMeta) {
		await dailyNoteService.addNewItemToCell(date, itemId, itemMeta.innerMeta.timeCommitment);
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
		await dailyNoteService.openDailyNote(date);
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
{#each blocksMeta as {rows, dateTDateMapping} (dateTDateMapping)}
	<div class="block-container">
		<!-- Header Row -->
		<div class="header-row" style={`grid-template-columns: repeat(${columns}, 1fr);`}>
			{#each dateTDateMapping as {date} (date)}
				<HeaderCell {date} {openDailyNote} />
			{/each}
		</div>

		<!-- Data Grid -->
		<div class="data-grid" style={`grid-template-columns: repeat(${columns}, 1fr);`}>
		{#each {length: rows} as _, row (row)}
			{#each dateTDateMapping as {date, tDate: tDate}, col (col)}
			{@const {id, meta} = sortedTemplateDates[tDate][row]}

			{#if row < Object.keys(sortedTemplateDates[tDate]).length && tDate != ""}
				<div class="cell" style={`background-color: ${meta.color}10;`}>
				{#if (parsedContent[date] && parsedContent[date][id])}
					<EditableCell 
						date={date}
						showLabel={(col == 0 && meta.label !== "") || tDate == date}
						itemMeta={meta}
						itemId={id}
						itemData={parsedContent[date][id]}
						onUpdate={handleCellUpdate}
					/>
				{:else}
					<EmptyCell onClick={() => addNewItemToCell(date, id, meta)} label="+ Add" color={meta.color} />
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

	
</style>
