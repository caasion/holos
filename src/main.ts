import { Plugin } from 'obsidian';
import { PLANNER_VIEW_TYPE, PlannerView } from './ui/PlannerView';
import { UltimatePlannerPluginTab } from './ui/SettingsTab';
import { addToTemplate, getFloatCell, getItemMeta, getTemplate, getItemFromLabel, removeFromTemplate, removeTemplate, setFloatCell, setTemplate, sortedTemplateDates, templates, updateItemMeta } from './state/plannerStore';
import { get, type Unsubscriber } from 'svelte/store';
import { DEFAULT_SETTINGS, type CalendarHelperService, type DataService, type FetchService, type HelperService, type PluginData, type PluginSettings } from './types';
import { CalendarPipeline } from './actions/calendarPipelines';
import { PlannerActions } from './actions/itemActions';
import { calendarState, fetchToken } from './state/calendarState';
import { hashText, generateID, getISODate, addDaysISO, swapArrayItems, getISODates, getLabelFromDateRange } from './actions/helpers';
import { parseICS, parseICSBetween, normalizeEvent, normalizeOccurrenceEvent, buildEventDictionaries, getEventLabels } from './actions/calendarHelper';
import { fetchFromUrl, detectFetchChange } from './actions/fetch';
import { PlaygroundView, PLAYGROUND_VIEW_TYPE } from './playground/PlaygroundView';
import { PlannerParser } from './lib/parser';

export default class UltimatePlannerPlugin extends Plugin {
	settings: PluginSettings;
	private saveTimer: number | null = null;
	private storeSubscriptions: Unsubscriber[] = [];
	public dataService: DataService;
	public helperService: HelperService;
	public calendarHelperService: CalendarHelperService;
	public fetchService: FetchService;
	public plannerActions: PlannerActions;
	public calendarPipeline: CalendarPipeline;
	public parserService: PlannerParser;


	async onload() {
		await this.loadPersisted();

		this.dataService = {
			templates,
			calendarState,
			fetchToken,
			
			setTemplate,
			addToTemplate,
			getTemplate,
			getItemFromLabel,
			removeFromTemplate,
			removeFromCellsInTemplate: () => false, // NOT IMPLEMENTED
			removeTemplate,
			getItemMeta,
			updateItemMeta,
			setFloatCell,
			getFloatCell,
		}

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

		this.plannerActions = new PlannerActions({
			settings: this.settings,
			data: this.dataService, 
			helpers: this.helperService, 
			calendarPipelines: this.calendarPipeline
		})

		this.parserService = new PlannerParser({
			data: this.dataService,
			plannerActions: this.plannerActions,
		})

		// Add Settings Tab using Obsidian's API
		this.addSettingTab(new UltimatePlannerPluginTab(this.app, this));

		// Register UPV using Obsidian's API
		this.registerView(PLANNER_VIEW_TYPE, (leaf) => new PlannerView(leaf, this));
		

		// Add a command to open UPV
		this.addCommand({
			id: 'open-planner-view',
			name: 'Open Ultimate Planner',
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
		}

		// Add debug command
		this.addCommand({
			id: 'debug-log-snaposhot',
			name: 'Debug: Log snapshot',
			callback: () => {
				console.log(this.snapshot())
			}
		});
	} 

	async onunload() {
		// Unsubscribe to stores
		await this.storeSubscriptions.forEach(unsub => unsub());

		await this.flushSave(); // Save immediately
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
		templates.set(Object.assign({}, {}, data.planner && data.planner.templates));
		this.storeSubscriptions = [
			templates.subscribe(() => this.queueSave()),
			templates.subscribe((templates) => templates && Object.keys(templates) && sortedTemplateDates.set(Object.keys(templates).sort()))
		]
	}

	private snapshot(): PluginData {
		return {
			version: 6,
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
				console.error("[UP] save FAILED", e);
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