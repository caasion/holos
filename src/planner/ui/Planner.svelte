<script lang="ts">
	import { format, parseISO } from "date-fns";
	import type { App } from "obsidian";
	import type { CalendarPipeline } from "src/calendar/calendarPipelines";
	import type { PlannerActions } from "src/planner/logic/itemActions";
	import type { BlockMeta, DataService, DateMapping, HelperService, ISODate, Item, ItemData, ItemDict, ItemID, ItemMeta, PluginSettings, TDate } from "src/plugin/types";
	import { PlannerParser } from "src/planner/logic/parser";
	import { DailyNoteService } from "src/planner/logic/dailyNote";
	import FloatBlock from "src/planner/ui/float/FloatBlock.svelte";
	import TemplateEditor from "src/templates/TemplateEditor.svelte";
	import EditableCell from "./grid/EditableCell.svelte";
	import { getISODate, getISODates, getLabelFromDateRange } from "src/plugin/helpers";
	import DebugBlock from "src/playground/DebugBlock.svelte";
	import { getBlocksMeta, getDateMappings, getSortedTemplates } from "../logic/rendering";
	import Navbar from "./Navbar.svelte";
	import HeaderCell from "./grid/HeaderCell.svelte";
	import EmptyCell from "./grid/EmptyCell.svelte";
	import PlannerGrid from "./grid/PlannerGrid.svelte";
	import { templates } from "../plannerStore";

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
	let sortedTemplateDates: Record<TDate, Item[]> = $derived(getSortedTemplates(dateMappings, $templates));
	
	// Calculate the number of rows needed and derive the dates involved in each block
	let blocksMeta: BlockMeta[] = $derived(getBlocksMeta(blocks, columns, dateMappings, sortedTemplateDates));

	// Get parsed content from the service store
	const parsedContentStore = dailyNoteService.parsedContent;

	let parsedContent = $derived<Record<ISODate, Record<ItemID, ItemData>>>($parsedContentStore);
	
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

<h1>Holos</h1> 

<Navbar
	{goTo}
	incrementAmount={columns}

	label={getLabelFromDateRange(dates[0], dates[dates.length - 1])}
	{anchor}

	view={inTemplateEditor ? "Planner" : "Templates Editor"}
	toggleView={() => inTemplateEditor = !inTemplateEditor}
/>

{#if inTemplateEditor}

<TemplateEditor {app} {plannerActions} {helper} />

{:else}

<FloatBlock 
	templates={sortedTemplateDates} 
	contextMenu={(e: MouseEvent, tDate: ISODate, id: ItemID, meta: ItemMeta) => plannerActions.openItemMenu(app, e, tDate, id, meta)} 
	focusCell={(opt: boolean) => { return false }}
/>  

<PlannerGrid 
	{sortedTemplateDates}
	{blocksMeta}
	{columns}
	{parsedContent}
	{handleCellUpdate}
	{addNewItemToCell}
	{openDailyNote}
/>

{/if}