import { TFolder, type App, TFile, getAllTags, type FrontMatterCache, type EventRef, Menu, Notice } from "obsidian";
import { PlannerParser } from "src/planner/logic/parser";
import type { Element, Habit, PluginSettings, Project, Track, TrackFileFrontmatter } from "src/plugin/types";
import { type Writable, get } from "svelte/store";
import { NewTrackModal } from '../ui/NewTrackModal';
import { EditTrackLabelModal } from '../ui/EditTrackLabelModal';
import { EditTrackTimeModal } from '../ui/EditTrackTimeModal';
import { EditJournalHeaderModal } from '../ui/EditJournalHeaderModal';
import { ConfirmationModal } from 'src/plugin/ConfirmationModal';
import { GenericEditModal } from 'src/templates/EditItemModal';
import Planner from "src/planner/ui/Planner.svelte";

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

    private trackFileCache: Record<string, TrackFiles> = {};
    
    // File watcher references
    private fileModifyRef: EventRef | null = null;
    private fileCreateRef: EventRef | null = null;
    private fileDeleteRef: EventRef | null = null;
    private fileRenameRef: EventRef | null = null;

    constructor(deps: TrackNoteServiceDeps) {
        this.app = deps.app;
        this.settings = deps.settings;
        this.parsedTracksContent = deps.parsedTracksContent;
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

        const { order, timeCommitment, journalHeader} = frontmatter;

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
            timeCommitment,
            journalHeader,
            
            label: trackFile.name,
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

        // Parse data section (tasks/events)
        const dataSection = PlannerParser.extractSection(projectContent, "Tasks");
        const data = PlannerParser.parseDataSection(dataSection);
        
        return {
            id,
            label: projectFile.basename,
            startDate,
            endDate,
            data,
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

    // ===== Write operations ===== // 

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
        lines.push(`id: ${track.id}`);
        lines.push(`order: ${track.order}`);
        lines.push(`color: ${track.color}`);
        lines.push(`time_commitment: ${track.timeCommitment}`);
        lines.push(`journal_header: ${track.journalHeader}`);
        lines.push('tags:');
        lines.push('  - holos/track');
        lines.push('---');
        lines.push('');

        // Description
        if (track.description) {
            lines.push(track.description);
            lines.push('');
        }

        // Habits section
        lines.push('## Habits');
        lines.push('');
        for (const habit of Object.values(track.habits)) {
            const rruleStr = habit.rrule ? ` (${habit.rrule})` : '';
            lines.push(`- ${habit.label}${rruleStr}`);
        }

        return lines.join('\n');
    }

    /** Update track label, which updates the name of the track folder and the file, and invalidates the cache. */
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

        await this.app.fileManager.renameFile(trackFile, newTrackPath);

        await this.app.fileManager.renameFile(oldFolder, newFolderPath);

        await this.invalidateCache();
    }

    /** Update track properties which affect the file frontmatter atomically. Refreshes the track. */
    async updateTrackFrontmatter(trackId: string, frontmatter: Partial<TrackFileFrontmatter>) {
        const trackFiles = this.trackFileCache[trackId];

        if (!trackFiles || !trackFiles.track) {
            console.warn(`Track ${trackId} not found`);
            return false;
        }

        const trackFile = trackFiles.track;

        await this.app.fileManager.processFrontMatter(trackFile, (oldFrontmatter) => {
            for (const [key, value] of Object.entries(frontmatter)) {
                oldFrontmatter[key] = value;
            }
        });

        await this.refreshTrack(trackId);
    }

    /** Update track description. Refreshes the track. */
    async updateTrackDescription(trackId: string, description: string) {
        try {
            const trackFiles = this.trackFileCache[trackId];
            if (!trackFiles || !trackFiles.track) {
                console.warn(`Track ${trackId} not found`);
                return false;
            }

            const file = trackFiles.track;
            const content = await this.app.vault.read(file);
            
            // Use a new helper function
            const updatedContent = this.replaceFirstSection(content, newDescription);
            
            await this.app.vault.modify(file, updatedContent);
            await this.refreshTrack(trackId);
            
            return true;
        } catch (error) {
            console.error('Error updating track description:', error);
            return false;
        }
    }
    /** Update track habits (addition, editing, or removal). Refreshes the track. */
    async updateTrackHabits(trackId: string, habits: Record<string, Habit>) {
        const trackFiles = this.trackFileCache[trackId];
        if (!trackFiles || !trackFiles.track) {
            console.warn(`Track ${trackId} not found`);
            return false;
        }

        const file = trackFiles.track;
        const content = await this.app.vault.read(file);
        
        const newHabitsSection = PlannerParser.serializeHabits(habits);       
        // Replace the Habits section in file
        const newContent = PlannerParser.replaceSection(content, 'Habits', newHabitsSection);
        await this.app.vault.modify(file, newContent);
        await this.refreshTrack(trackId);
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

    /** Generate project file content from Project object */
    private generateProjectContent(project: Project): string {
        const lines: string[] = [];

        // Frontmatter
        lines.push('---');
        lines.push(`id: ${project.id}`);
        lines.push(`active: ${project.active}`);
        lines.push('tags:');
        lines.push('  - holos/project');
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

        // Data section
        lines.push('## Data');
        lines.push('');
        for (const element of project.data) {
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

            return true;
        } catch (error) {
            console.error('Error deleting track:', error);
            return false;
        }
    }

    // ===== Project-level operations ===== //

    /** Helper to update a project file with a content transformation */
    private async updateProjectFile(
        trackId: string,
        projectId: string,
        updater: (content: string) => string
    ): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        const content = await this.app.vault.read(projectFile);
        const updated = updater(content);
        await this.app.vault.modify(projectFile, updated);
        await this.refreshTrack(trackId);
    }

    /** Update project label (renames the file) */
    async updateProjectLabel(trackId: string, projectId: string, label: string): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        const newPath = `${projectFile.parent!.path}/${label}.md`;
        await this.app.fileManager.renameFile(projectFile, newPath);
        await this.refreshTrack(trackId);
    }

    /** Update project description (first section) */
    async updateProjectDescription(trackId: string, projectId: string, description: string): Promise<void> {
        await this.updateProjectFile(trackId, projectId, (content) => {
            return PlannerParser.replaceFirstSection(content, description);
        });
    }

    /** Update project start date */
    async updateProjectStartDate(trackId: string, projectId: string, startDate: string): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        await this.app.fileManager.processFrontMatter(projectFile, (fm) => {
            fm.start_date = startDate;
        });
        await this.refreshTrack(trackId);
    }

    /** Update project end date */
    async updateProjectEndDate(trackId: string, projectId: string, endDate: string | null): Promise<void> {
        const projectFile = this.trackFileCache[trackId]?.projects[projectId];
        if (!projectFile) {
            console.warn(`Project ${projectId} not found in track ${trackId}`);
            return;
        }

        await this.app.fileManager.processFrontMatter(projectFile, (fm) => {
            if (endDate) {
                fm.end_date = endDate;
            } else {
                delete fm.end_date;
            }
        });
        await this.refreshTrack(trackId);
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
        const newHabitId = `habit-${Date.now()}`;
        const newHabit: Habit = {
            id: newHabitId,
            raw: "- New Habit",
            label: "New Habit",
            rrule: ""
        };

        await this.updateProjectFile(trackId, projectId, (content) => {
            const habitSection = PlannerParser.extractSection(content, "Habits");
            const habits = PlannerParser.parseHabitSection(habitSection);
            
            habits[newHabitId] = newHabit;
            
            const newHabitsSection = PlannerParser.serializeHabits(habits);
            return PlannerParser.replaceSection(content, 'Habits', newHabitsSection);
        });
    }

    /** Update a specific habit in a project */
    async updateProjectHabit(trackId: string, projectId: string, habitId: string, habit: Habit): Promise<void> {
        await this.updateProjectFile(trackId, projectId, (content) => {
            const habitSection = PlannerParser.extractSection(content, "Habits");
            const habits = PlannerParser.parseHabitSection(habitSection);
            
            habits[habitId] = habit;
            
            const newHabitsSection = PlannerParser.serializeHabits(habits);
            return PlannerParser.replaceSection(content, 'Habits', newHabitsSection);
        });
    }

    /** Delete a habit from a project */
    async deleteProjectHabit(trackId: string, projectId: string, habitId: string): Promise<void> {
        await this.updateProjectFile(trackId, projectId, (content) => {
            const habitSection = PlannerParser.extractSection(content, "Habits");
            const habits = PlannerParser.parseHabitSection(habitSection);
            
            delete habits[habitId];
            
            const newHabitsSection = PlannerParser.serializeHabits(habits);
            return PlannerParser.replaceSection(content, 'Habits', newHabitsSection);
        });
    }

    // ===== Project Element/Task operations ===== //

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
        await this.updateProjectFile(trackId, projectId, (content) => {
            const dataSection = PlannerParser.extractSection(content, "Data");
            const data = PlannerParser.parseDataSection(dataSection);
            
            // Add a new empty task
            data.push({
                raw: "\t- [ ] New Task",
                text: "New Task",
                isTask: true,
                taskStatus: " ",
                children: [],
            });
            
            const newDataSection = this.serializeDataSection(data);
            return PlannerParser.replaceSection(content, 'Data', newDataSection);
        });
    }

    /** Update a specific element in a project */
    async updateProjectElement(trackId: string, projectId: string, elementIndex: number, updatedElement: Partial<Element>): Promise<void> {
        await this.updateProjectFile(trackId, projectId, (content) => {
            const dataSection = PlannerParser.extractSection(content, "Data");
            const data = PlannerParser.parseDataSection(dataSection);
            
            if (elementIndex >= 0 && elementIndex < data.length) {
                data[elementIndex] = { ...data[elementIndex], ...updatedElement };
            }
            
            const newDataSection = this.serializeDataSection(data);
            return PlannerParser.replaceSection(content, 'Data', newDataSection);
        });
    }

    /** Delete an element from a project */
    async deleteProjectElement(trackId: string, projectId: string, elementIndex: number): Promise<void> {
        await this.updateProjectFile(trackId, projectId, (content) => {
            const dataSection = PlannerParser.extractSection(content, "Data");
            const data = PlannerParser.parseDataSection(dataSection);
            
            if (elementIndex >= 0 && elementIndex < data.length) {
                data.splice(elementIndex, 1);
            }
            
            const newDataSection = this.serializeDataSection(data);
            return PlannerParser.replaceSection(content, 'Data', newDataSection);
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

    // ===== Modal handlers ===== //

    /** Handles the creation of a new track (modal and creation) */
    public handleNewTrack() {
        const tracks = get(this.parsedTracksContent);
        const nextOrder = Object.keys(tracks).length;
        
        new NewTrackModal(this.app, nextOrder, new Date().toISOString().split('T')[0], async (track: Track) => {
            const success = await this.createTrack(track);
            if (success) {
                new Notice(`Track "${track.label}" created successfully`);
            } else {
                new Notice(`Failed to create track "${track.label}"`);
            }
        }).open();
    }

    /** Handles the deletion of a track (confirmation modal and deletion) */
    public handleRemoveTrack(trackId: string) {
        new ConfirmationModal(
            this.app, 
            async () => {
                const success = await this.deleteTrack(trackId);
                if (success) {
                    await this.invalidateCache();
                    new Notice('Track deleted successfully');
                }
            },
            "Remove",
            "Removing the track will delete the entire track folder and all its projects."
        ).open();
    }

    /** Creates and opens the context menu for a track */
    public openTrackMenu(evt: MouseEvent, trackId: string) {
        evt.preventDefault();
        evt.stopPropagation();

        const track = this.getTrack(trackId);
        if (!track) return;

        const menu = new Menu();
 
        menu
            .addItem((i) =>
                i.setTitle(`ID: ${trackId}`)
                .setIcon("info")
            )
            .addSeparator()
            .addItem((i) =>
                i.setTitle("Edit")
                .setIcon("pencil")
                .onClick(() => {
                    new GenericEditModal(this.app, track, async (newMeta) => {
                        // Update multiple fields at once
                        await this.updateTrack(trackId, {
                            frontmatter: {
                                color: newMeta.color,
                                time_commitment: newMeta.timeCommitment,
                                journal_header: newMeta.journalHeader
                            }
                        });
                    }).open();
                })
            )
            .addItem((i) =>
                i.setTitle("Remove")
                .setIcon("x")
                .onClick(() => {
                    this.handleRemoveTrack(trackId);
                })
            )

        menu.showAtPosition({ x: evt.clientX, y: evt.clientY });
    }

    // ===== Clean up ===== //

    /** Clean up resources */
    destroy(): void {
        this.cleanupFileWatchers();
    }
}