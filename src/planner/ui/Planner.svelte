<script lang="ts">
	import { format, parseISO } from "date-fns";
	import type { App } from "obsidian";
	import type { CalendarPipeline } from "src/calendar/calendarPipelines";
	import type { TemplateActions } from "src/templates/templateActions";
	import type { BlockMeta, DataService, DateMapping, HelperService, ISODate, Item, ItemData, ItemDict, ItemID, ItemMeta, PluginSettings, TDate } from "src/plugin/types";
	import { PlannerParser } from "src/planner/logic/parser";
	import { DailyNoteService } from "src/planner/logic/dailyNote";
	import FloatBlock from "src/planner/ui/float/FloatBlock.svelte";
	import TemplateEditor from "src/templates/Templates.svelte";
	import EditableCell from "./grid/EditableCell.svelte";
	import { getISODate, getISODates, getLabelFromDateRange } from "src/plugin/helpers";
	import DebugBlock from "src/playground/DebugBlock.svelte";
	import { getBlocksMeta, getDateMappings } from "../logic/rendering";
	import Navbar from "./Navbar.svelte";
	import HeaderCell from "./grid/HeaderCell.svelte";
	import EmptyCell from "./grid/EmptyCell.svelte";
	import PlannerGrid from "./grid/PlannerGrid.svelte";
	import { compiledTemplateItems, sortedTemplateDates as sortedTemplateDatesStore } from "../../templates/templatesStore";
	import type { TrackNoteService } from "src/tracks/logic/trackNote";

	// Purpose: To provide a UI to interact with the objects storing the information. The view reads the objects to generate an appropriate table.

	interface ViewProps {
		app: App;
		settings: PluginSettings;
		data: DataService;
		helper: HelperService;
		templateActions: TemplateActions;
		calendarPipeline: CalendarPipeline;
		parser: PlannerParser;
		dailyNoteService: DailyNoteService;
		trackNoteService: TrackNoteService;
	}

	let { app, settings, data, helper, templateActions, calendarPipeline, parser, dailyNoteService, trackNoteService }: ViewProps = $props();

	
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
	let dateMappings: DateMapping[] = $derived(getDateMappings(dates, $sortedTemplateDatesStore));

	// Consume precompiled template items (sorted once on template changes)
	const tracksByDateStore = trackNoteService.tracksByDate;
	let tracksByDate = $derived<Record<ISODate, string[]>>($tracksByDateStore);
	
	// Calculate the number of rows needed and derive the dates involved in each block
	let blocksMeta: BlockMeta[] = $derived(getBlocksMeta(blocks, columns, dateMappings, sortedTemplateDates));

	// Get parsed content from the service store
	const parsedContentStore = dailyNoteService.parsedContent;
	const parsedJournalContentStore = dailyNoteService.parsedJournalContent;

	let parsedContent = $derived<Record<ISODate, Record<ItemID, ItemData>>>($parsedContentStore);
	let parsedJournalContent = $derived<Record<ISODate, Record<string, string>>>($parsedJournalContentStore)
	
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

	const trackStore = trackNoteService.parsedTracksContent;
  const parsedTracks = $derived($trackStore);

  // Load track content when component mounts
  $effect(() => {
    trackNoteService.loadAllTrackContent();
  });

  // Setup file watcher with cleanup
  $effect(() => {
    trackNoteService.setupFileWatchers();
    
    return () => {
      trackNoteService.cleanupFileWatchers();
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

	// Open daily note for a specific date
	async function openDailyNote(date: ISODate) {
		await dailyNoteService.openDailyNote(date);
	}

	function goTo(newDate: ISODate) {
			anchor = newDate;
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

<TemplateEditor {app} templatesAct={templateActions} {helper} />

{:else}

<PlannerGrid 
	{dates}
	{tracksByDate}
	{parsedTracks}
	{columns}
	{blocks}
	{parsedContent}
	{parsedJournalContent}
	{handleCellUpdate}
	{addNewItemToCell}
	{openDailyNote}
/>

{/if}