import { ItemView, WorkspaceLeaf } from "obsidian";
import { mount } from 'svelte';
import TracksComponent from './ui/Tracks.svelte';
import HolosPlugin from '../main';

export const TRACKS_VIEW_TYPE = "holos-tracks-view"

export class TracksView extends ItemView {
    plugin: HolosPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: HolosPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return TRACKS_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Holos Tracks"
    }

    async onOpen() {
        const container = this.contentEl;
		container.empty();
        
        mount(TracksComponent, {target: container, props: {
            trackNoteService: this.plugin.trackNoteService
        }});
    }

    async onClose() {
        // Cleanup if needed
    }
}
