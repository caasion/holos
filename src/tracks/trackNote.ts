import { TFolder, type App, TFile, getAllTags, type FrontMatterCache } from "obsidian";
import { PlannerParser } from "src/planner/logic/parser";
import type { PluginSettings, Project, TDate, Template, Track } from "src/plugin/types";
import type { Writable } from "svelte/store";

interface TrackFiles {
    id: string;
    track: TFile | null;
    activeProjectId: string | null;
    projects: Record<string, TFile>;
}

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

    async loadAllTrackContent(): Promise<Record<string, Track>> {
        const trackFolder = this.app.vault.getFolderByPath(this.settings.trackFolder);

        if (!trackFolder) return {};

        const allTracks: Record<string, Track> = {};

        for (const child of trackFolder.children) {
            if (child instanceof TFolder) {
                const trackFiles = this.findFilesInFolder(child);
                const trackData = await this.loadTrackContent(trackFiles.id, trackFiles);
                if (!trackData) continue;

                allTracks[trackFiles.id] = trackData;
            }
        }

    }

    findFilesInFolder(folder: TFolder): TrackFiles {
        const files: TrackFiles = { id: '', track: null, activeProjectId: null, projects: {}}

        for (const file of folder.children) {
            if (file instanceof TFile && file.extension === "md") {
                const cache = this.app.metadataCache.getFileCache(file);
                const frontmatter = cache?.frontmatter;

                const tags = getAllTags(cache) || [];

                const isTrack = tags.includes('#holos/track') || frontmatter?.tags?.includes('holos/track');
                const isProject = tags.includes('#holos/track') || frontmatter?.tags?.includes('holos/track');
                const id = frontmatter?.id ?? null;
                const isActiveProject = frontmatter?.activeProject ?? false;

                if (isTrack && id) {
                    files.id = id;
                    files.track = file;
                } else if (isProject && id) {
                    files.projects[id] = file;
                } 

                if (isProject && id && isActiveProject) {
                    files.activeProjectId = id;
                }
            }
        }

        return files;
    }

    async loadTrackContent(id: string, trackFiles: TrackFiles): Promise<Track | null> {
        // Track content
        const trackFile = trackFiles.track ?? null;
        if (!trackFile) return null;

        const cache = this.app.metadataCache.getFileCache(trackFile);
        const frontmatter = cache?.frontmatter;
        const trackContent = await this.app.vault.read(trackFile);
        if (!trackContent || !frontmatter) return null;

        const { order, color, time_commitment, journal_header} = frontmatter;
        
        if (!order || !color || !time_commitment || !journal_header) {
            console.warn(`${trackFile.name} is missing frontmatter fields. Aborting.`);
            return null;
        }

        const description = PlannerParser.extractFirstSection(trackContent);
        
        const habitSection = PlannerParser.extractSection(trackContent, "Habits");
        const habits = PlannerParser.parseHabitSection(habitSection);

        // Projects
        const projects: Record<string, Project> = {};

        for (const [id, file] of Object.entries(trackFiles.projects)) {
            const projectData = await this.loadProjectContent(id, file);
            if (!projectData) continue;

            projects[id] = projectData;
        }
        
        return {
            id,
            description,
            order,
            label: trackFile.name,
            color,
            timeCommitment: time_commitment,
            journalHeader: journal_header,
            habits,
            activeProjectId: trackFiles.activeProjectId,
            projects

        }
    }

    async loadProjectContent(id: string, projectFile: TFile): Promise<Project | null> {
        const cache = this.app.metadataCache.getFileCache(projectFile);
        const frontmatter = cache?.frontmatter;
        const projectContent = await this.app.vault.read(projectFile);
        
        if (!projectContent || !frontmatter) return null;

        const { active } = frontmatter;
        
        if (!active) {
            console.warn(`${projectFile.name} is missing 'active' frontmatter field. Aborting.`);
            return null;
        }

        // Parse habits section
        const habitSection = PlannerParser.extractSection(projectContent, "Habits");
        const habits = PlannerParser.parseHabitSection(habitSection);

        // Parse data section (tasks/events)
        const dataSection = PlannerParser.extractSection(projectContent, "Data");
        const data = PlannerParser.parseDataSection(dataSection);
        
        return {
            id,
            label: projectFile.basename,
            active,
            data,
            habits
        };
    }
}