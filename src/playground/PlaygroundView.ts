import { ItemView, WorkspaceLeaf } from "obsidian";
import { mount } from 'svelte';
import HolosPlugin from '../main';
import Templates from "src/templates/Templates.svelte";
import Tracks from "src/tracks/Tracks.svelte";

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
                
        mount(Tracks, {target: container, props: {
            
        }})
    }

    async onClose() {

    }
} 