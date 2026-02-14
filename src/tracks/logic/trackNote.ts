import { TFolder, type App, TFile, getAllTags, type FrontMatterCache, type EventRef, Menu, Notice } from "obsidian";
import { PlannerParser } from "src/planner/logic/parser";
import type { PluginSettings, Project, Track } from "src/plugin/types";
import { type Writable, get } from "svelte/store";
import { NewTrackModal } from '../ui/NewTrackModal';
import { EditTrackLabelModal } from '../ui/EditTrackLabelModal';
import { EditTrackTimeModal } from '../ui/EditTrackTimeModal';
import { EditJournalHeaderModal } from '../ui/EditJournalHeaderModal';
import { ConfirmationModal } from 'src/plugin/ConfirmationModal';
import { GenericEditModal } from 'src/templates/EditItemModal';

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
                const trackFiles = this.findFilesInFolder(child);
                
                // Only add to cache if we found a valid track with an ID
                if (trackFiles.id && trackFiles.track) {
                    this.trackFileCache[trackFiles.id] = trackFiles;
                }
            }
        }
    }

    private findFilesInFolder(folder: TFolder): TrackFiles {
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

    private async loadTrackContent(id: string, trackFiles: TrackFiles): Promise<Track | null> {
        // Track content
        const trackFile = trackFiles.track ?? null;
        if (!trackFile) return null;

        console.log(`Loading track ${id}`)

        const cache = this.app.metadataCache.getFileCache(trackFile);
        const frontmatter = cache?.frontmatter;
        const trackContent = await this.app.vault.read(trackFile);
        if (!trackContent || !frontmatter) return null;
        
        if (!("order" in frontmatter)) {
            console.warn(`${trackFile.name} is missing order. Aborting.`);
            return null;
        }

        const { order, time_commitment, journal_header} = frontmatter;

        const color = frontmatter.color ?? "#cccccc";

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

    private async loadProjectContent(id: string, projectFile: TFile): Promise<Project | null> {
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

    /** 
     * Update track properties including label, description, frontmatter, and habits.
     * Pass only the fields you want to update in the updates object.
     */
    async updateTrack(trackId: string, updates: {
        label?: string;
        description?: string;
        frontmatter?: Record<string, any>;
        addHabit?: { id: string; label: string; rrule: string };
        removeHabitId?: string;
    }): Promise<boolean> {
        try {
            const trackFiles = this.trackFileCache[trackId];
            if (!trackFiles || !trackFiles.track) {
                console.warn(`Track ${trackId} not found`);
                return false;
            }

            const file = trackFiles.track;

            // Handle label update (requires file/folder rename)
            if (updates.label) {
                const trackFile = trackFiles.track;
                const oldFolder = trackFile.parent;
                if (!oldFolder) return false;

                // Create new folder path
                const newFolderPath = `${this.settings.trackFolder}/${updates.label}`;
                const newTrackPath = `${newFolderPath}/${updates.label}.md`;

                // Rename folder (this moves all contents)
                await this.app.fileManager.renameFile(oldFolder, newFolderPath);

                // Get the moved track file
                const movedTrackFile = this.app.vault.getFileByPath(trackFile.path.replace(oldFolder.path, newFolderPath));
                if (movedTrackFile) {
                    // Rename the track file
                    await this.app.fileManager.renameFile(movedTrackFile, newTrackPath);
                }
                
                await this.invalidateCache();
                return true;
            }

            // Handle frontmatter updates
            if (updates.frontmatter) {
                await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
                    for (const [key, value] of Object.entries(updates.frontmatter!)) {
                        frontmatter[key] = value;
                    }
                });
            }

            // Handle description update
            if (updates.description !== undefined) {
                const content = await this.app.vault.read(file);
                
                // Split into parts
                const lines = content.split('\n');
                let frontmatterEnd = -1;
                let inFrontmatter = false;
                
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i] === '---') {
                        if (!inFrontmatter) {
                            inFrontmatter = true;
                        } else {
                            frontmatterEnd = i;
                            break;
                        }
                    }
                }

                if (frontmatterEnd === -1) return false;

                // Find first section header
                let firstSectionIndex = -1;
                for (let i = frontmatterEnd + 1; i < lines.length; i++) {
                    if (lines[i].match(/^#{1,6}\s+/)) {
                        firstSectionIndex = i;
                        break;
                    }
                }

                // Rebuild content
                const newLines = lines.slice(0, frontmatterEnd + 1);
                newLines.push('');
                newLines.push(updates.description);
                newLines.push('');
                
                if (firstSectionIndex !== -1) {
                    newLines.push(...lines.slice(firstSectionIndex));
                } else {
                    // No sections found, add habits section
                    newLines.push('## Habits');
                    newLines.push('');
                }

                await this.app.vault.modify(file, newLines.join('\n'));
            }

            // Handle adding a habit
            if (updates.addHabit) {
                // Get current track from store
                const track = this.getTrack(trackId);
                if (!track) {
                    console.warn(`Track ${trackId} not found in store`);
                    return false;
                }
                
                // Add habit to track's habits
                const updatedHabits = {
                    ...track.habits,
                    [updates.addHabit.id]: updates.addHabit
                };
                
                // Serialize all habits
                const habitsSection = this.serializeHabits(updatedHabits);
                
                // Replace the Habits section in file
                const content = await this.app.vault.read(file);
                const newContent = PlannerParser.replaceSection(content, 'Habits', habitsSection);
                await this.app.vault.modify(file, newContent);
            }

            // Handle removing a habit
            if (updates.removeHabitId) {
                // Get current track from store
                const track = this.getTrack(trackId);
                if (!track) {
                    console.warn(`Track ${trackId} not found in store`);
                    return false;
                }
                
                // Check if habit exists
                if (!track.habits[updates.removeHabitId]) {
                    console.warn(`Habit ${updates.removeHabitId} not found in track ${trackId}`);
                    return false;
                }
                
                // Remove habit from track's habits
                const updatedHabits = { ...track.habits };
                delete updatedHabits[updates.removeHabitId];
                
                // Serialize remaining habits
                const habitsSection = this.serializeHabits(updatedHabits);
                
                // Replace the Habits section in file
                const content = await this.app.vault.read(file);
                const newContent = PlannerParser.replaceSection(content, 'Habits', habitsSection);
                await this.app.vault.modify(file, newContent);
            }

            await this.refreshTrack(trackId);
            return true;
        } catch (error) {
            console.error('Error updating track:', error);
            return false;
        }
    }

    /** Update a habit's label or rrule */
    async updateHabit(trackId: string, habitId: string, updates: { label?: string; rrule?: string }): Promise<boolean> {
        try {
            const trackFiles = this.trackFileCache[trackId];
            if (!trackFiles || !trackFiles.track) {
                console.warn(`Track ${trackId} not found`);
                return false;
            }

            // Get current track from store
            const track = this.getTrack(trackId);
            if (!track) {
                console.warn(`Track ${trackId} not found in store`);
                return false;
            }
            
            const habit = track.habits[habitId];
            if (!habit) {
                console.warn(`Habit ${habitId} not found in track ${trackId}`);
                return false;
            }

            // Update the habit in the data structure
            const updatedHabits = {
                ...track.habits,
                [habitId]: {
                    ...habit,
                    label: updates.label ?? habit.label,
                    rrule: updates.rrule ?? habit.rrule
                }
            };
            
            // Serialize ALL habits back to text
            const updatedHabitSection = this.serializeHabits(updatedHabits);
            
            // Replace the entire Habits section
            const file = trackFiles.track;
            const content = await this.app.vault.read(file);
            const newContent = PlannerParser.replaceSection(content, 'Habits', updatedHabitSection);
            await this.app.vault.modify(file, newContent);
            
            await this.refreshTrack(trackId);
            return true;
        } catch (error) {
            console.error('Error updating habit:', error);
            return false;
        }
    }

    private serializeHabits(habits: Record<string, { id: string; label: string; rrule: string }>): string {
        let result = '';
        for (const habit of Object.values(habits)) {
            const rruleStr = habit.rrule ? ` (${habit.rrule})` : '';
            result += `- ${habit.label}${rruleStr}\n`;
        }
        return result;
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

    /** Set active project for a track */
    async setActiveProject(trackId: string, projectId: string | null): Promise<boolean> {
        try {
            const trackFiles = this.trackFileCache[trackId];
            if (!trackFiles) {
                console.warn(`Track ${trackId} not found`);
                return false;
            }

            // Remove activeProject flag from all projects
            for (const [id, projectFile] of Object.entries(trackFiles.projects)) {
                const isActive = id === projectId;
                await this.app.fileManager.processFrontMatter(projectFile, (frontmatter) => {
                    if (isActive) {
                        frontmatter.activeProject = true;
                    } else {
                        delete frontmatter.activeProject;
                    }
                });
            }

            await this.refreshTrack(trackId);
            return true;
        } catch (error) {
            console.error('Error setting active project:', error);
            return false;
        }
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

    // ===== Modifying habits ===== //

    /** Adds a habit to a track */
    public async addHabitToTrack(trackId: string, habitLabel: string = "", habitRRule: string = ""): Promise<boolean> {
        const habitId = `habit-${Date.now()}`;
        const newHabit = {
            id: habitId,
            label: habitLabel,
            rrule: habitRRule
        };

        return await this.updateTrack(trackId, { addHabit: newHabit });
    }

    /** Removes a habit from a track */
    public async removeHabitFromTrack(trackId: string, habitId: string): Promise<boolean> {
        return await this.updateTrack(trackId, { removeHabitId: habitId });
    }

    /** Updates a habit's rrule within a track */
    public async updateHabitRRule(trackId: string, habitId: string, rrule: string): Promise<boolean> {
        return await this.updateHabit(trackId, habitId, { rrule });
    }

    /** Updates a habit's label within a track */
    public async updateHabitLabel(trackId: string, habitId: string, label: string): Promise<boolean> {
        return await this.updateHabit(trackId, habitId, { label });
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

    /** Handles editing a track's label with a modal */
    public handleEditTrackLabel(trackId: string, currentLabel: string) {
        new EditTrackLabelModal(
            this.app,
            currentLabel,
            (label) => this.updateTrack(trackId, { label }),
            () => this.handleRemoveTrack(trackId)
        ).open();
    }

    /** Handles editing a track's time commitment with a modal */
    public handleEditTrackTime(trackId: string, currentTimeMinutes: number) {
        new EditTrackTimeModal(
            this.app,
            currentTimeMinutes,
            (timeMinutes) => this.updateTrack(trackId, { frontmatter: { time_commitment: timeMinutes } })
        ).open();
    }

    /** Handles editing a track's journal header with a modal */
    public handleEditJournalHeader(trackId: string, currentHeader: string) {
        new EditJournalHeaderModal(
            this.app,
            currentHeader,
            (header) => this.updateTrack(trackId, { frontmatter: { journal_header: header } })
        ).open();
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