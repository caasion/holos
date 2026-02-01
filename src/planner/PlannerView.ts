import { ItemView, WorkspaceLeaf } from "obsidian";
import { mount } from 'svelte';
import PlannerComponent from './ui/Planner.svelte';
import HolosPlugin from '../main';

export const PLANNER_VIEW_TYPE = "holos-view"

export class PlannerView extends ItemView {
    plugin: HolosPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: HolosPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return PLANNER_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Holos View"
    }

    async onOpen() {
        const container = this.contentEl;
		container.empty();
        
        mount(PlannerComponent, {target: container, props: {
            app: this.plugin.app,
            settings: this.plugin.settings,
            data: this.plugin.dataService,
            helper: this.plugin.helperService,
            templateActions: this.plugin.templateActions,
            trackActions: this.plugin.trackActions,
            calendarPipeline: this.plugin.calendarPipeline,
            parser: this.plugin.parserService,
            dailyNoteService: this.plugin.dailyNoteService,
        }})
    }

    async onClose() {

    }
} 