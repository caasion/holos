import { eachDayOfInterval, parseISO } from "date-fns";
import { TFolder, type App, TFile, getAllTags, type FrontMatterCache, type EventRef, Menu, Notice } from "obsidian";
import { PlannerParser } from "src/planner/logic/parser";
import { getISODate } from "src/plugin/helpers";
import type { DateInterval, Element, Habit, ISODate, PluginSettings, Project, Track, TrackFileFrontmatter } from "src/plugin/types";
import { type Writable, get, writable } from "svelte/store";

interface TrackFiles {
    id: string | null;
    track: TFile | null;
    activeProjectId: string | null;
    projects: Record<string, TFile>;
}

export interface TrackNoteServiceDeps {
    app: App;
    settings: PluginSettings;
    parsedTracksContent: Writable<Record<string, Track>>;
}

export class TrackNoteService {
    private app: App;
    private settings: PluginSettings;

    public parsedTracksContent: Writable<Record<string, Track>>;
    public tracksByDate: Writable<Record<ISODate, string[]>>;

    private trackFileCache: Record<string, TrackFiles> = {};
    
    // Flag to prevent file watcher from overwriting our own programmatic updates
    private isUpdatingInternally = false;
    
    // File watcher references
    private fileModifyRef: EventRef | null = null;
    private fileCreateRef: EventRef | null = null;
    private fileDeleteRef: EventRef | null = null;
    private fileRenameRef: EventRef | null = null;

    constructor(deps: TrackNoteServiceDeps) {
        this.app = deps.app;
        this.settings = deps.settings;
        this.parsedTracksContent = writable<Record<string, Track>>({});
        this.tracksByDate = writable<Record<ISODate, string[]>>({});
    }

    private normalizeISODate(value: unknown): string | null {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed ? trimmed : null;
        }

        if (typeof value === 'number') {
            return String(value);
        }

        return null;
    }

    private parseEffective(frontmatter?: FrontMatterCache['frontmatter']): DateInterval[] {
        const rawEffective = frontmatter?.effective;
        if (!Array.isArray(rawEffective)) return [];

        const effective: DateInterval[] = [];

        for (const interval of rawEffective) {
            if (!interval || typeof interval !== 'object') continue;

            const record = interval as Record<string, unknown>;
            const start = this.normalizeISODate(record.start);
            const end = this.normalizeISODate(record.end);

            if (!start) continue;
            effective.push(end ? { start, end } : { start });
        }

        return effective;
    }
    
    // ===== Rendering logic ===== //

    private addToTracksByDate(trackId: string, effective: DateInterval[]): void {
        const today = getISODate(new Date());

        for (const interval of effective) {
            const intervalEnd = interval.end ?? today;

            const dates = eachDayOfInterval({ 
                start: parseISO(interval.start), 
                end: parseISO(intervalEnd) 
            });

            dates.forEach(date => {
                const iso = getISODate(date);

                this.tracksByDate.update(prev => {
                    prev[iso] ??= [];
                    prev[iso].push(trackId);
                    return prev;
                })
            })
        }
    }
    
    // ===== Read operations ===== //

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
                const trackFiles = await this.findFilesInFolder(child);
                
                // Only add to cache if we found a valid track with an ID
                if (trackFiles.id && trackFiles.track) {
                    this.trackFileCache[trackFiles.id] = trackFiles;
                }
            }
        }
    }

    private async findFilesInFolder(folder: TFolder): Promise<TrackFiles> {
        const files: TrackFiles = { id: null, track: null, activeProjectId: null, projects: {}}

        for (const file of folder.children) {
            if (file instanceof TFile && file.extension === "md") {
                let cache = this.app.metadataCache.getFileCache(file);

                if (!cache) {
                    await new Promise<void>(resolve => {
                        const ref = this.app.metadataCache.on('changed', (changedFile) => {
                            if (changedFile.path === file.path) {
                                this.app.metadataCache.offref(ref);
                                resolve();
                            }
                        });

                        setTimeout(() => {
                            this.app.metadataCache.offref(ref);
                            resolve();
                        }, 1000);
                    })

                    cache = this.app.metadataCache.getFileCache(file);
                }

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

    private async loadTrackContent(id: string, trackFiles: TrackFiles): Promise<Track | null> {
        // Track content
        const trackFile = trackFiles.track ?? null;
        if (!trackFile) return null;

        console.log(`Loading ${id}`)

        const cache = this.app.metadataCache.getFileCache(trackFile);
        const frontmatter = cache?.frontmatter;
        const trackContent = await this.app.vault.read(trackFile);
        if (!trackContent || !frontmatter) return null;
        
        if (!("order" in frontmatter)) {
            console.warn(`${trackFile.name} is missing order. Aborting.`);
            return null;
        }

        const { order, timeCommitment, journalHeader } = frontmatter;
        const effective = this.parseEffective(frontmatter);
        this.addToTracksByDate(id, effective);

        const color = frontmatter.color ?? "#cccccc";

        const description = PlannerParser.extractFirstSection(trackContent);

        // Projects
        const projects: Record<string, Project> = {};

        for (const [id, file] of Object.entries(trackFiles.projects)) {
            const projectData = await this.loadProjectContent(id, file);
            if (!projectData) continue;

            projects[id] = projectData;
        }
        
        return {
            id,
            order,
            color,
            effective,
            timeCommitment,
            journalHeader,
            
            label: trackFile.basename,
            description,
            projects
        }
    }

    private async loadProjectContent(id: string, projectFile: TFile): Promise<Project | null> {
        console.log(`Loading ${id}`)

        const cache = this.app.metadataCache.getFileCache(projectFile);
        const frontmatter = cache?.frontmatter;
        const projectContent = await this.app.vault.read(projectFile);
        
        if (!projectContent || !frontmatter) return null;

        const { startDate, endDate } = frontmatter;
        
        if (!startDate) {
            console.warn(`${projectFile.name} is missing 'startDate' frontmatter field. Aborting.`);
            return null;
        }

        // Parse habits section
        const habitSection = PlannerParser.extractSection(projectContent, "Habits");
        const habits = PlannerParser.parseHabitSection(habitSection);

        const taskSection = PlannerParser.extractSection(projectContent, "Tasks");
        const tasks = PlannerParser.parseTaskSection(taskSection);
        
        const description = PlannerParser.extractFirstSection(projectContent);
        
        return {
            id,
            label: projectFile.basename,
            description,
            startDate,
            endDate,
            tasks,
            habits
        };
    }

    // ===== File watchers ===== //

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
            // Skip if we're making the change internally
            if (this.isUpdatingInternally) return;
            
            if (!(file instanceof TFile) || !this.isInTrackFolder(file.path)) return;

            const trackId = this.findTrackIdByPath(file.path);
            if (trackId) {
                console.log(`Track file modified externally: ${file.path}, refreshing track ${trackId}`);
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

    // ===== Track-level operation ===== // 

    /** Create a new track with folder structure */
    async createTrack(track: Track): Promise<boolean> {
        try {
            // Create the track folder
            const trackFolderPath = `${this.settings.trackFolder}/${track.label}`;
            const trackFolder = this.app.vault.getFolderByPath(trackFolderPath);
            
            if (!trackFolder) {
                console.log(`Creating folder: ${trackFolderPath}`);
                await this.app.vault.createFolder(trackFolderPath);
            }

            // Create the track file
            console.log("Creating file")
            const trackFilePath = `${trackFolderPath}/${track.label}.md`;
            const trackContent = this.generateTrackContent(track);
            await this.app.vault.create(trackFilePath, trackContent);

            return true;
        } catch (error) {
            console.error('Error creating track:', error);
            return false;
        }
    }

    /** Generate track file content from Track object */
    private generateTrackContent(track: Track): string {
        const lines: string[] = [];

        // Frontmatter
        lines.push('---');
        lines.push('tags:');
        lines.push('  - holos/track');
        lines.push(`id: ${track.id}`);
        lines.push(`order: ${track.order}`);
        lines.push(`color: ${track.color}`);
        lines.push('effective:');
        for (const interval of track.effective) {
            lines.push(`  - start: ${interval.start}`);
            if (interval.end) {
                lines.push(`    end: ${interval.end}`);
            }
        }
        lines.push(`timeCommitment: ${track.timeCommitment}`);
        lines.push(`journalHeader: ${track.journalHeader}`);
        lines.push('---');
        lines.push('');

        // Description
        if (track.description) {
            lines.push(track.description);
            lines.push('');
        }

        return lines.join('\n');
    }

    /** Update track label, which updates the name of the track folder and the file. */
    async updateTrackLabel(trackId: string, label: string) {
        const trackFiles = this.trackFileCache[trackId];

        if (!trackFiles || !trackFiles.track) {
            console.warn(`Track ${trackId} not found`);
            return false;
        }

        const trackFile = trackFiles.track;
        const oldFolder = trackFile.parent;
        if (!oldFolder) {
            throw new Error(`Error while editing updating track label of track ${trackId}: Old folder not found.`)
        }
        
        const newFolderPath = `${this.settings.trackFolder}/${label}`;
        const newTrackPath = `${newFolderPath}/${label}.md`;

        // Instant responsive UI change
        this.parsedTracksContent.update(tracks => ({
            ...tracks,
            [trackId]: {
                ...tracks[trackId],
                label
            }
        }));

        // File system & cache changes (flagged as internal)
        this.isUpdatingInternally = true;
        try {
            // Rename folder first, then rename the track file within the renamed folder
            await this.app.fileManager.renameFile(oldFolder, newFolderPath);
            
            // After folder rename, get the updated file reference
            const renamedTrackFile = this.app.vault.getFileByPath(`${newFolderPath}/${trackFile.name}`);
            if (renamedTrackFile) {
                await this.app.fileManager.renameFile(renamedTrackFile, newTrackPath);
            }
            
            await this.invalidateCache();
        } finally {
            this.isUpdatingInternally = false;
        }

        return true;
    }

    /** Update track properties which affect the file frontmatter atomically. */
    async updateTrackFrontmatter(trackId: string, frontmatter: Partial<TrackFileFrontmatter>) {
        const trackFiles = this.trackFileCache[trackId];

        if (!trackFiles || !trackFiles.track) {
            console.warn(`Track ${trackId} not found`);
            return false;
        }

        const trackFile = trackFiles.track;

        this.isUpdatingInternally = true;
        try {
            await this.app.fileManager.processFrontMatter(trackFile, (oldFrontmatter) => {
                for (const [key, value] of Object.entries(frontmatter)) {
                    oldFrontmatter[key] = value;
                }
            });
        } finally {
            this.isUpdatingInternally = false;
        }

        // Direct update - no race condition now
        this.parsedTracksContent.update(tracks => {
            const track = tracks[trackId];
            if (!track) return tracks;

            return {
                ...tracks,
                [trackId]: {
                    ...track,
                    ...frontmatter
                }
            };
        });

        return true;
    }

    /** Update track description. */
    async updateTrackDescription(trackId: string, description: string) {
        try {
            const trackFiles = this.trackFileCache[trackId];
            if (!trackFiles || !trackFiles.track) {
                console.warn(`Track ${trackId} not found`);
                return false;
            }

            const file = trackFiles.track;
            const content = await this.app.vault.read(file);
            
            const updatedContent = PlannerParser.replaceFirstSection(content, description);
            
            this.isUpdatingInternally = true;
            try {
                await this.app.vault.modify(file, updatedContent);
            } finally {
                this.isUpdatingInternally = false;
            }

            // Direct update - change description in memory
            this.parsedTracksContent.update(tracks => ({
                ...tracks,
                [trackId]: {
                    ...tracks[trackId],
                    description
                }
            }));
            
            return true;
        } catch (error) {
            console.error('Error updating track description:', error);
            return false;
        }
    }

    /** Create a new project in a track */
    async createProject(trackId: string, project: Project): Promise<boolean> {
        try {
            const trackFiles = this.trackFileCache[trackId];
            if (!trackFiles || !trackFiles.track) {
                console.warn(`Track ${trackId} not found`);
                return false;
            }

            const trackFolder = trackFiles.track.parent;
            if (!trackFolder) return false;

            // Create project file
            const projectFilePath = `${trackFolder.path}/${project.label}.md`;
            const projectContent = this.generateProjectContent(project);
            await this.app.vault.create(projectFilePath, projectContent);

            await this.invalidateCache();
            return true;
        } catch (error) {
            console.error('Error creating project:', error);
            return false;
        }
    }

    newProjectFactory(trackId: string): Project {
        const id = crypto.randomUUID();
        const today = getISODate(new Date());

        // Get existing projects in this track
        const track = this.getTrack(trackId);
        const existingLabels = track ? Object.values(track.projects).map(p => p.label) : [];
        
        // Find all "New Project" variations
        const newProjectPattern = /^New Project( (\d+))?$/;
        const numbers: number[] = [];
        
        for (const label of existingLabels) {
            const match = label.match(newProjectPattern);
            if (match) {
                if (match[2]) {
                    // "New Project N" format
                    numbers.push(parseInt(match[2], 10));
                } else {
                    // Just "New Project" - treat as 0
                    numbers.push(0);
                }
            }
        }
        
        // Determine the next label
        let label = 'New Project';
        if (numbers.length > 0) {
            const maxNumber = Math.max(...numbers);
            label = `New Project ${maxNumber + 1}`;
        }

        return {
            id,
            label,
            description: '',
            startDate: today,
            habits: {},
            tasks: [],
        }
    }

    /** Generate project file content from Project object */
    private generateProjectContent(project: Project): string {
        const lines: string[] = [];

        // Frontmatter
        lines.push('---');
        lines.push('tags:');
        lines.push('  - holos/project');
        lines.push(`id: ${project.id}`);
        lines.push(`startDate: ${project.startDate}`);
        lines.push(`endDate: ${project.endDate ?? ''}`);
        lines.push('---');
        lines.push('');

        // Habits section
        lines.push('## Habits');
        lines.push('');
        for (const habit of Object.values(project.habits)) {
            const rruleStr = habit.rrule ? ` (${habit.rrule})` : '';
            lines.push(`- ${habit.label}${rruleStr}`);
        }
        lines.push('');

        // Tasks section
        lines.push('## Tasks');
        lines.push('');
        for (const element of project.tasks) {
            const taskMarker = element.isTask ? `[${element.taskStatus || ' '}] ` : '';
            lines.push(`- ${taskMarker}${element.text}`);
            
            for (const child of element.children) {
                lines.push(`\t- ${child}`);
            }
        }

        return lines.join('\n');
    }

    /** Delete a track and its folder */
    async deleteTrack(trackId: string): Promise<boolean> {
        try {
            const trackFiles = this.trackFileCache[trackId];
            if (!trackFiles || !trackFiles.track) {
                console.warn(`Track ${trackId} not found`);
                return false;
            }

            const trackFolder = trackFiles.track.parent;
            if (!trackFolder) return false;

            // Delete the entire track folder (including all projects)
            await this.app.vault.delete(trackFolder, true);

            new Notice('Track deleted successfully');

            return true;
        } catch (error) {
            console.error('Error deleting track:', error);
            return false;
        }
    }

    // ===== Project-level operations ===== //

    /** Update project label (renames the file) */
    async updateProjectLabel(trackId: string, projectId: string, label: string): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        const newPath = `${projectFile.parent!.path}/${label}.md`;
        
        this.isUpdatingInternally = true;
        try {
            await this.app.fileManager.renameFile(projectFile, newPath);
        } finally {
            this.isUpdatingInternally = false;
        }

        // Direct update - change project label in memory
        this.parsedTracksContent.update(tracks => {
            const track = tracks[trackId];
            if (!track?.projects[projectId]) return tracks;

            return {
                ...tracks,
                [trackId]: {
                    ...track,
                    projects: {
                        ...track.projects,
                        [projectId]: {
                            ...track.projects[projectId],
                            label
                        }
                    }
                }
            };
        });
    }

    /** Update project description (first section) */
    async updateProjectDescription(trackId: string, projectId: string, description: string): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        const content = await this.app.vault.read(projectFile);
        const updated = PlannerParser.replaceFirstSection(content, description);
        
        this.isUpdatingInternally = true;
        try {
            await this.app.vault.modify(projectFile, updated);
        } finally {
            this.isUpdatingInternally = false;
        }

        // Direct update - change project description in memory
        this.parsedTracksContent.update(tracks => {
            const track = tracks[trackId];
            if (!track?.projects[projectId]) return tracks;

            return {
                ...tracks,
                [trackId]: {
                    ...track,
                    projects: {
                        ...track.projects,
                        [projectId]: {
                            ...track.projects[projectId],
                            description
                        }
                    }
                }
            };
        });
    }

    /** Update project start date */
    async updateProjectStartDate(trackId: string, projectId: string, startDate: string): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        this.isUpdatingInternally = true;
        try {
            await this.app.fileManager.processFrontMatter(projectFile, (fm) => {
                fm.startDate = startDate;
            });
        } finally {
            this.isUpdatingInternally = false;
        }

        // Direct update - change project startDate in memory
        this.parsedTracksContent.update(tracks => {
            const track = tracks[trackId];
            if (!track?.projects[projectId]) return tracks;

            return {
                ...tracks,
                [trackId]: {
                    ...track,
                    projects: {
                        ...track.projects,
                        [projectId]: {
                            ...track.projects[projectId],
                            startDate
                        }
                    }
                }
            };
        });
    }

    /** Update project end date */
    async updateProjectEndDate(trackId: string, projectId: string, endDate: string | null): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        this.isUpdatingInternally = true;
        try {
            await this.app.fileManager.processFrontMatter(projectFile, (fm) => {
                if (endDate) {
                    fm.endDate = endDate;
                } else {
                    delete fm.endDate;
                }
            });
        } finally {
            this.isUpdatingInternally = false;
        }

        // Direct update - change project endDate in memory
        this.parsedTracksContent.update(tracks => {
            const track = tracks[trackId];
            if (!track?.projects[projectId]) return tracks;

            return {
                ...tracks,
                [trackId]: {
                    ...track,
                    projects: {
                        ...track.projects,
                        [projectId]: {
                            ...track.projects[projectId],
                            endDate: endDate ?? undefined
                        }
                    }
                }
            };
        });
    }

    /** Delete a project file */
    async deleteProject(trackId: string, projectId: string): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        await this.app.vault.delete(projectFile);
        await this.refreshTrack(trackId);
    }

    // ===== Project Habit operations ===== //

    /** Add a new habit to a project */
    async addProjectHabit(trackId: string, projectId: string): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        const newHabitId = `habit-${Date.now()}`;
        const newHabit: Habit = {
            id: newHabitId,
            raw: "- New Habit",
            label: "New Habit",
            rrule: ""
        };

        const content = await this.app.vault.read(projectFile);
        const habitSection = PlannerParser.extractSection(content, "Habits");
        const habits = PlannerParser.parseHabitSection(habitSection);
        
        habits[newHabitId] = newHabit;
        
        const newHabitsSection = PlannerParser.serializeHabits(habits);
        const updated = PlannerParser.replaceSection(content, 'Habits', newHabitsSection);
        
        this.isUpdatingInternally = true;
        try {
            await this.app.vault.modify(projectFile, updated);
        } finally {
            this.isUpdatingInternally = false;
        }

        // Direct update - add habit to memory
        this.parsedTracksContent.update(tracks => {
            const track = tracks[trackId];
            if (!track?.projects[projectId]) return tracks;

            return {
                ...tracks,
                [trackId]: {
                    ...track,
                    projects: {
                        ...track.projects,
                        [projectId]: {
                            ...track.projects[projectId],
                            habits: {
                                ...track.projects[projectId].habits,
                                [newHabitId]: newHabit
                            }
                        }
                    }
                }
            };
        });
    }

    /** Update a specific habit in a project */
    async updateProjectHabit(trackId: string, projectId: string, habitId: string, habit: Habit): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        const content = await this.app.vault.read(projectFile);
        const habitSection = PlannerParser.extractSection(content, "Habits");
        const habits = PlannerParser.parseHabitSection(habitSection);
        
        habits[habitId] = habit;
        
        const newHabitsSection = PlannerParser.serializeHabits(habits);
        const updated = PlannerParser.replaceSection(content, 'Habits', newHabitsSection);
        
        this.isUpdatingInternally = true;
        try {
            await this.app.vault.modify(projectFile, updated);
        } finally {
            this.isUpdatingInternally = false;
        }

        // Direct update - update habit in memory
        this.parsedTracksContent.update(tracks => {
            const track = tracks[trackId];
            if (!track?.projects[projectId]) return tracks;

            return {
                ...tracks,
                [trackId]: {
                    ...track,
                    projects: {
                        ...track.projects,
                        [projectId]: {
                            ...track.projects[projectId],
                            habits: {
                                ...track.projects[projectId].habits,
                                [habitId]: habit
                            }
                        }
                    }
                }
            };
        });
    }

    /** Delete a habit from a project */
    async deleteProjectHabit(trackId: string, projectId: string, habitId: string): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        const content = await this.app.vault.read(projectFile);
        const habitSection = PlannerParser.extractSection(content, "Habits");
        const habits = PlannerParser.parseHabitSection(habitSection);
        
        delete habits[habitId];
        
        const newHabitsSection = PlannerParser.serializeHabits(habits);
        const updated = PlannerParser.replaceSection(content, 'Habits', newHabitsSection);
        
        this.isUpdatingInternally = true;
        try {
            await this.app.vault.modify(projectFile, updated);
        } finally {
            this.isUpdatingInternally = false;
        }

        // Direct update - remove habit from memory
        this.parsedTracksContent.update(tracks => {
            const track = tracks[trackId];
            if (!track?.projects[projectId]) return tracks;

            const newHabits = { ...track.projects[projectId].habits };
            delete newHabits[habitId];

            return {
                ...tracks,
                [trackId]: {
                    ...track,
                    projects: {
                        ...track.projects,
                        [projectId]: {
                            ...track.projects[projectId],
                            habits: newHabits
                        }
                    }
                }
            };
        });
    }

    // ===== Project Task operations ===== //

    /** Serialize elements array to string for Data section */
    private serializeDataSection(elements: Element[]): string {
        let result = '';
        for (const element of elements) {
            result += PlannerParser.serializeElement(element);
        }
        return result;
    }

    /** Add a new element (task) to a project */
    async addProjectElement(trackId: string, projectId: string): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        const newElement: Element = {
            raw: "\t- [ ] New Task",
            text: "New Task",
            isTask: true,
            taskStatus: " ",
            children: [],
        };

        const content = await this.app.vault.read(projectFile);
        const dataSection = PlannerParser.extractSection(content, "Data");
        const data = PlannerParser.parseTaskSection(dataSection);
        
        data.push(newElement);
        
        const newDataSection = this.serializeDataSection(data);
        const updated = PlannerParser.replaceSection(content, 'Data', newDataSection);
        
        this.isUpdatingInternally = true;
        try {
            await this.app.vault.modify(projectFile, updated);
        } finally {
            this.isUpdatingInternally = false;
        }

        // Direct update - add element to memory
        this.parsedTracksContent.update(tracks => {
            const track = tracks[trackId];
            if (!track?.projects[projectId]) return tracks;

            return {
                ...tracks,
                [trackId]: {
                    ...track,
                    projects: {
                        ...track.projects,
                        [projectId]: {
                            ...track.projects[projectId],
                            data: [...track.projects[projectId].data, newElement]
                        }
                    }
                }
            };
        });
    }

    /** Update a specific element in a project */
    async updateProjectElement(trackId: string, projectId: string, elementIndex: number, updatedElement: Partial<Element>): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        const content = await this.app.vault.read(projectFile);
        const dataSection = PlannerParser.extractSection(content, "Data");
        const data = PlannerParser.parseTaskSection(dataSection);
        
        if (elementIndex >= 0 && elementIndex < data.length) {
            data[elementIndex] = { ...data[elementIndex], ...updatedElement };
        }
        
        const newDataSection = this.serializeDataSection(data);
        const updated = PlannerParser.replaceSection(content, 'Data', newDataSection);
        
        this.isUpdatingInternally = true;
        try {
            await this.app.vault.modify(projectFile, updated);
        } finally {
            this.isUpdatingInternally = false;
        }

        // Direct update - update element in memory
        this.parsedTracksContent.update(tracks => {
            const track = tracks[trackId];
            if (!track?.projects[projectId]) return tracks;

            const newData = [...track.projects[projectId].data];
            if (elementIndex >= 0 && elementIndex < newData.length) {
                newData[elementIndex] = { ...newData[elementIndex], ...updatedElement };
            }

            return {
                ...tracks,
                [trackId]: {
                    ...track,
                    projects: {
                        ...track.projects,
                        [projectId]: {
                            ...track.projects[projectId],
                            data: newData
                        }
                    }
                }
            };
        });
    }

    /** Delete an element from a project */
    async deleteProjectElement(trackId: string, projectId: string, elementIndex: number): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        const content = await this.app.vault.read(projectFile);
        const dataSection = PlannerParser.extractSection(content, "Data");
        const data = PlannerParser.parseTaskSection(dataSection);
        
        if (elementIndex >= 0 && elementIndex < data.length) {
            data.splice(elementIndex, 1);
        }
        
        const newDataSection = this.serializeDataSection(data);
        const updated = PlannerParser.replaceSection(content, 'Data', newDataSection);
        
        this.isUpdatingInternally = true;
        try {
            await this.app.vault.modify(projectFile, updated);
        } finally {
            this.isUpdatingInternally = false;
        }

        // Direct update - remove element from memory
        this.parsedTracksContent.update(tracks => {
            const track = tracks[trackId];
            if (!track?.projects[projectId]) return tracks;

            const newData = [...track.projects[projectId].data];
            if (elementIndex >= 0 && elementIndex < newData.length) {
                newData.splice(elementIndex, 1);
            }

            return {
                ...tracks,
                [trackId]: {
                    ...track,
                    projects: {
                        ...track.projects,
                        [projectId]: {
                            ...track.projects[projectId],
                            data: newData
                        }
                    }
                }
            };
        });
    }

    // ===== Reading tracks ===== //
    
    /** Gets track metadata by ID */
    public getTrack(id: string): Track | undefined {
        const tracks = get(this.parsedTracksContent);
        return tracks[id];
    }

    /** Returns the id of a track given the label (case insensitive) */
    public getTrackIDFromLabel(label: string): string {
        const tracks = get(this.parsedTracksContent);
        
        for (const track of Object.values(tracks)) {
            if (label.toLowerCase() === track.label.toLowerCase()) {
                return track.id;
            }
        }
    
        return "";
    }

    // ===== Clean up ===== //

    /** Clean up resources */
    destroy(): void {
        this.cleanupFileWatchers();
    }
}