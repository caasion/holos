import { TFolder, type App, TFile, getAllTags, type FrontMatterCache } from "obsidian";
import { PlannerParser } from "src/planner/logic/parser";
import type { PluginSettings, TDate, Template, Track } from "src/plugin/types";
import type { Writable } from "svelte/store";

export interface TrackNoteServiceDeps {
    app: App;
    settings: PluginSettings;
}

export class TrackNoteService {
    private app: App;
    private settings: PluginSettings;

    public parsedTracksContent: Writable<Record<string, Track>>;

    constructor(deps: TrackNoteServiceDeps) {
        this.app = deps.app;
        this.settings = {...deps.settings, trackFolder: "Tracks"}
    }

    async loadAllTrackContent() {
        const trackFolder = this.app.vault.getFolderByPath(this.settings.trackFolder);

        if (!trackFolder) return;

        const loadedTraccks = [];

        for (const child of trackFolder.children) {
            if (child instanceof TFolder) {
                const folderFiles = this.findFilesInFolder(child);

                const trackFile = folderFiles.track ?? null;
                if (!trackFile) continue;
                const trackData = this.loadTrackContent(trackFile);

                const projectFiles = folderFiles.projects ?? [];

                
            }
        }

    }

    findFilesInFolder(folder: TFolder) {
        const files: {
            track: TFile | null,
            projects: TFile[]
        } = {
            track: null,
            projects: []
        }

        for (const file of folder.children) {
            if (file instanceof TFile && file.extension === "md") {
                const cache = this.app.metadataCache.getFileCache(file);
                const frontmatter = cache?.frontmatter;

                const tags = getAllTags(cache) || [];

                const isTrack = tags.includes('#holos/track') || frontmatter?.tags?.includes('holos/track');
                const isProject = tags.includes('#holos/track') || frontmatter?.tags?.includes('holos/track');

                if (isTrack) {
                    files.track = file;
                } else if (isProject) {
                    files.projects.push(file);
                } 
            }
        }

        return files;
    }

    async loadTrackContent(file: TFile) {
        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;
        const content = await this.app.vault.read(file);

        if (!content) return {};

        // initial section for description
        // tasks section
        // Active project section
        // Inactive projects section

    }
}