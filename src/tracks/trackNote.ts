import { TFolder, type App, TFile, getAllTags, type FrontMatterCache, type EventRef } from "obsidian";
import { PlannerParser } from "src/planner/logic/parser";
import type { PluginSettings, Project, Track } from "src/plugin/types";
import { type Writable } from "svelte/store";

interface TrackFiles {
    id: string | null;
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

    private trackFileCache: Record<string, TrackFiles> = {};
    
    // File watcher references
    private fileModifyRef: EventRef | null = null;
    private fileCreateRef: EventRef | null = null;
    private fileDeleteRef: EventRef | null = null;
    private fileRenameRef: EventRef | null = null;

    constructor(deps: TrackNoteServiceDeps) {
        this.app = deps.app;
        this.settings = deps.settings;
    }

    async loadAllTrackContent(): Promise<void> {
        if (!this.trackFileCache || Object.keys(this.trackFileCache).length === 0) {
            await this.populateFileCache();
        }

        const tracks: Record<string, Track> = {};

        for (const key in this.trackFileCache) {
            const track = await this.loadTrackContent(key, this.trackFileCache[key])
            if (track) tracks[key] = track;
        }

        this.parsedTracksContent.set(tracks);
    }

    async populateFileCache(): Promise<void> {
        this.trackFileCache = {};
        
        const trackFolder = this.app.vault.getFolderByPath(this.settings.trackFolder);
        if (!trackFolder) return;
        
        for (const child of trackFolder.children) {
            if (child instanceof TFolder) {
                const trackFiles = this.findFilesInFolder(child);
                
                // Only add to cache if we found a valid track with an ID
                if (trackFiles.id && trackFiles.track) {
                    this.trackFileCache[trackFiles.id] = trackFiles;
                }
            }
        }
    }

    findFilesInFolder(folder: TFolder): TrackFiles {
        const files: TrackFiles = { id: null, track: null, activeProjectId: null, projects: {}}

        for (const file of folder.children) {
            if (file instanceof TFile && file.extension === "md") {
                const cache = this.app.metadataCache.getFileCache(file);
                const frontmatter = cache?.frontmatter;
                const id = frontmatter?.id ?? null;
                if (!id) continue;

                const tags = cache ? getAllTags(cache) || [] : [];

                const isTrack = tags.includes('#holos/track') || frontmatter?.tags?.includes('holos/track');
                const isProject = tags.includes('#holos/project') || frontmatter?.tags?.includes('holos/project');
                
                const isActiveProject = frontmatter?.activeProject ?? false;

                if (isTrack) {
                    files.id = id;
                    files.track = file;
                } else if (isProject) {
                    files.projects[id] = file;
                    if (isActiveProject) files.activeProjectId = id;
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

    /** Invalidate the entire cache and reload all tracks */
    async invalidateCache(): Promise<void> {
        await this.populateFileCache();
        await this.loadAllTrackContent();
    }

    /** Refresh a single track by ID */
    async refreshTrack(trackId: string): Promise<void> {
        const trackFiles = this.trackFileCache[trackId];
        if (!trackFiles) {
            console.warn(`Track ${trackId} not found in cache`);
            return;
        }

        const track = await this.loadTrackContent(trackId, trackFiles);
        if (!track) {
            console.warn(`Failed to load track ${trackId}`);
            return;
        }

        this.parsedTracksContent.update(tracks => ({
            ...tracks,
            [trackId]: track
        }));
    }

    /** Find the track ID for a given file path */
    private findTrackIdByPath(filePath: string): string | null {
        for (const [trackId, trackFiles] of Object.entries(this.trackFileCache)) {
            if (trackFiles.track?.path === filePath) {
                return trackId;
            }
            for (const projectFile of Object.values(trackFiles.projects)) {
                if (projectFile.path === filePath) {
                    return trackId;
                }
            }
        }
        return null;
    }

    /** Check if a file is within the track folder */
    private isInTrackFolder(filePath: string): boolean {
        return filePath.startsWith(this.settings.trackFolder + "/");
    }

    /** Setup file watchers for automatic cache updates */
    setupFileWatchers(): void {
        this.cleanupFileWatchers();

        // Watch for file modifications
        this.fileModifyRef = this.app.vault.on('modify', async (file) => {
            if (!(file instanceof TFile) || !this.isInTrackFolder(file.path)) return;

            const trackId = this.findTrackIdByPath(file.path);
            if (trackId) {
                console.log(`Track file modified: ${file.path}, refreshing track ${trackId}`);
                await this.refreshTrack(trackId);
            }
        });

        // Watch for file creation
        this.fileCreateRef = this.app.vault.on('create', async (file) => {
            if (!(file instanceof TFile) || !this.isInTrackFolder(file.path)) return;

            console.log(`New file created in track folder: ${file.path}, invalidating cache`);
            await this.invalidateCache();
        });

        // Watch for file deletion
        this.fileDeleteRef = this.app.vault.on('delete', async (file) => {
            if (!(file instanceof TFile) || !this.isInTrackFolder(file.path)) return;

            console.log(`File deleted from track folder: ${file.path}, invalidating cache`);
            await this.invalidateCache();
        });

        // Watch for file rename
        this.fileRenameRef = this.app.vault.on('rename', async (file, oldPath) => {
            if (!(file instanceof TFile)) return;
            
            const wasInTrackFolder = this.isInTrackFolder(oldPath);
            const isInTrackFolder = this.isInTrackFolder(file.path);

            // If moved into or out of track folder, or renamed within folder
            if (wasInTrackFolder || isInTrackFolder) {
                console.log(`File renamed: ${oldPath} -> ${file.path}, invalidating cache`);
                await this.invalidateCache();
            }
        });
    }

    /** Clean up file watchers */
    cleanupFileWatchers(): void {
        if (this.fileModifyRef) {
            this.app.vault.offref(this.fileModifyRef);
            this.fileModifyRef = null;
        }
        if (this.fileCreateRef) {
            this.app.vault.offref(this.fileCreateRef);
            this.fileCreateRef = null;
        }
        if (this.fileDeleteRef) {
            this.app.vault.offref(this.fileDeleteRef);
            this.fileDeleteRef = null;
        }
        if (this.fileRenameRef) {
            this.app.vault.offref(this.fileRenameRef);
            this.fileRenameRef = null;
        }
    }

    /** Clean up resources */
    destroy(): void {
        this.cleanupFileWatchers();
    }
}