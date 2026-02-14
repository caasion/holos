import { Plugin } from 'obsidian';
import { PLANNER_VIEW_TYPE, PlannerView } from './planner/PlannerView';
import { TRACKS_VIEW_TYPE, TracksView } from './tracks/TracksView';
import { HolosSettingsTab } from './plugin/SettingsTab';
import { get, type Unsubscriber } from 'svelte/store';
import { DEFAULT_SETTINGS, type CalendarHelperService, type DataService, type FetchService, type HelperService, type PluginData, type PluginSettings } from './plugin/types';
import { CalendarPipeline } from './calendar/calendarPipelines';
import { TemplateActions } from './templates/templateActions';
import { calendarState, fetchToken } from './calendar/calendarState';
import { hashText, generateID, getISODate, addDaysISO, swapArrayItems, getISODates, getLabelFromDateRange } from './plugin/helpers';
import { parseICS, parseICSBetween, normalizeEvent, normalizeOccurrenceEvent, buildEventDictionaries, getEventLabels } from './calendar/calendarHelper';
import { fetchFromUrl, detectFetchChange } from './calendar/fetch';
import { PlaygroundView, PLAYGROUND_VIEW_TYPE } from './playground/PlaygroundView';
import { PlannerParser } from './planner/logic/parser';
import { DailyNoteService } from './planner/logic/dailyNote';
import { sortedTemplateDates, templates, parsedTracksContent } from './templates/templatesStore';
import { sampleTemplateData } from './templates/sampleTemplateData';
import { TrackNoteService } from './tracks/logic/trackNote';

export default class HolosPlugin extends Plugin {
	settings: PluginSettings;
	private saveTimer: number | null = null;
	private storeSubscriptions: Unsubscriber[] = [];
	public dataService: DataService;
	public helperService: HelperService;
	public calendarHelperService: CalendarHelperService;
	public fetchService: FetchService;
	public templateActions: TemplateActions;
	public calendarPipeline: CalendarPipeline;
	public parserService: PlannerParser;
	public dailyNoteService: DailyNoteService;
	public trackNoteService: TrackNoteService;

	async onload() {
		await this.loadPersisted();

		// this.dataService = {
		// 	templates,
		// 	calendarState,
		// 	fetchToken,
			
		// 	setTemplate,
		// 	addToTemplate,
		// 	getTemplate,
		// 	getItemFromLabel,
		// 	removeFromTemplate,
		// 	removeFromCellsInTemplate: () => false, // NOT IMPLEMENTED
		// 	removeTemplate,
		// 	getItemMeta,
		// 	updateItemMeta,
		// 	setFloatCell,
		// 	getFloatCell,
		// }

		this.helperService = {
			hashText,
			generateID,
			getISODate,
			getISODates,
			getLabelFromDateRange,
			addDaysISO,
			swapArrayItems,
			idUsedInTemplates: () => true, // NOT IMPLEMENTED
		}

		this.calendarHelperService = {
			parseICS,
			parseICSBetween,
			normalizeEvent,
			normalizeOccurrenceEvent,
			buildEventDictionaries,
			getEventLabels
		}

		this.fetchService = {
			fetchFromUrl,
			detectFetchChange
		}
		
		this.calendarPipeline = new CalendarPipeline({
			data: this.dataService, 
			fetch: this.fetchService, 
			helpers: this.helperService, 
			calHelpers: this.calendarHelperService
		})
		
		this.templateActions = new TemplateActions();

		this.parserService = new PlannerParser({
			data: this.dataService,
			plannerActions: this.templateActions,
		})

		this.dailyNoteService = new DailyNoteService({
			app: this.app,
			settings: this.settings,
			parser: this.parserService
		});

		// Add Settings Tab using Obsidian's API
		this.addSettingTab(new HolosSettingsTab(this.app, this));

		// Register views using Obsidian's API
		this.registerView(PLANNER_VIEW_TYPE, (leaf) => new PlannerView(leaf, this));
		this.registerView(TRACKS_VIEW_TYPE, (leaf) => new TracksView(leaf, this));

		// Add commands to open views
		this.addCommand({
			id: 'open-planner-view',
			name: 'Open Holos Planner',
			callback: () => {
				this.activateView(PLANNER_VIEW_TYPE);
			}
		});

		if (this.settings.debug) {
			this.registerView(PLAYGROUND_VIEW_TYPE, (leaf) => new PlaygroundView(leaf, this));

			this.addCommand({
				id: 'open-playground-view',
				name: 'Open Playground View',
				callback: () => {
					this.activateView(PLAYGROUND_VIEW_TYPE);
				}
			});

			// Add debug command
			this.addCommand({
				id: 'debug-log-snaposhot',
				name: 'Debug: Log snapshot',
				callback: () => {
					console.log(this.snapshot())
				}
			});
		}
	} 

	async onunload() {
		// Unsubscribe to stores
		await this.storeSubscriptions.forEach(unsub => unsub());

		// Clean up track note service if it was initialized
		if (this.trackNoteService) {
			this.trackNoteService.destroy();
		}

		await this.flushSave(); // Save immediately
	}

	async initializeTrackNoteService() {
		if (this.trackNoteService) return;

		this.trackNoteService = new TrackNoteService({
			app: this.app,
			settings: this.settings,
			parsedTracksContent: parsedTracksContent
		});
	}

	async activateView(view: string) {
		const leaves = this.app.workspace.getLeavesOfType(view);
		if (leaves.length === 0) {
			await this.app.workspace.getLeaf(false).setViewState({
				type: view,
				active: true,
			});

		}

		this.app.workspace.getLeavesOfType(view)[0];
	}

	async loadPersisted() {
		const data: PluginData = await this.loadData() ?? {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings) // Populate Settings
		
		// Initialize Stores, Subscribe, and assign unsubscribers
		templates.set(Object.assign({}, sampleTemplateData, data.planner && data.planner.templates));
		this.storeSubscriptions = [
			templates.subscribe(() => this.queueSave()),
			templates.subscribe((templates) => templates && Object.keys(templates) && sortedTemplateDates.set(Object.keys(templates).sort()))
		]
	}

	private snapshot(): PluginData {
		return {
			version: 7,
			settings: this.settings,
			planner: {
				templates: get(templates),
			},
		}
	}

	public queueSave() {
		if (this.saveTimer) window.clearTimeout(this.saveTimer);
		this.saveTimer = window.setTimeout(async () => {
			this.saveTimer = null;
			try {
				await this.saveData(this.snapshot()); 
			} catch (e) {
				console.error("[Holos] save FAILED", e);
			}
		}, 400);
	}

	private async flushSave() {
		if (this.saveTimer) {
			window.clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}

		await this.saveData(this.snapshot());
	}
}