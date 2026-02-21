import { ItemView, WorkspaceLeaf } from "obsidian";
import { mount } from 'svelte';
import HolosPlugin from '../main';
import Templates from "src/templates/Templates.svelte";
import Tracks from "src/tracks/ui/Tracks.svelte";

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
        // Initialize track note service if not already initialized
        if (!this.plugin.trackNoteService) {
            await this.plugin.initializeTrackNoteService();
        }

        const container = this.contentEl;
		container.empty();
                
        mount(Tracks, {target: container, props: {
            app: this.plugin.app,
            trackNoteService: this.plugin.trackNoteService
        }})
    }

    async onClose() {

    }
} 