import { ItemView, WorkspaceLeaf } from "obsidian";
import { mount } from 'svelte';
import HolosPlugin from '../main';
import PlaygroundNew from "./PlaygroundNew.svelte";

export const PLAYGROUND_VIEW_TYPE = "playground-view"

export class PlaygroundView extends ItemView {
    plugin: HolosPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: HolosPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return PLAYGROUND_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Playground View"
    }

    async onOpen() {
        const container = this.contentEl;
		container.empty();
                
        mount(PlaygroundNew, {target: container, props: {
             app: this.plugin.app,
            settings: this.plugin.settings,
            data: this.plugin.dataService,
            helper: this.plugin.helperService,
            plannerActions: this.plugin.plannerActions,
            calendarPipeline: this.plugin.calendarPipeline,
            parser: this.plugin.parserService,
        }})
    }

    async onClose() {

    }
} 