import type { App, EventRef, TFile } from "obsidian";
import type { ISODate, ItemData, ItemID, PluginSettings } from "src/plugin/types";
import { getAllDailyNotes, getDailyNote, createDailyNote } from "obsidian-daily-notes-interface";
import moment from "moment";
import { Notice } from "obsidian";
import { PlannerParser } from "./parser";
import { writable, type Writable } from "svelte/store";

export interface DailyNoteServiceDeps {
    app: App;
    settings: PluginSettings;
    parser: PlannerParser;
}

export class DailyNoteService {
    private app: App;
    private settings: PluginSettings;
    private parser: PlannerParser;
    
    // Track if we're currently writing to prevent re-reading our own changes
    private isWriting: boolean = false;
    
    // Debounce timer for writes
    private writeTimer: NodeJS.Timeout | null = null;
    
    // Store for parsed content
    public parsedContent: Writable<Record<ISODate, Record<ItemID, ItemData>>> = writable({});
    
    // File watcher reference
    private fileModifyRef: EventRef | null = null;
    
    // Current dates being watched
    private watchedDates: ISODate[] = [];

    constructor(deps: DailyNoteServiceDeps) {
        this.app = deps.app;
        this.settings = deps.settings;
        this.parser = deps.parser;
    }

    /** Get the contents of a daily note file */
    private async getDailyNoteContents(file: TFile): Promise<string | null> {
        if (file) {
            return await this.app.vault.read(file);
        } else {
            return null;
        }
    }

    /** Write content back to a daily note */
    async writeDailyNote(date: ISODate, items: Record<ItemID, ItemData>): Promise<void> {
        this.isWriting = true;
        
        try {
            const dailyNoteFile = getDailyNote(moment(date), getAllDailyNotes());
            
            if (!dailyNoteFile) {
                console.warn(`No daily note found for ${date}`);
                return;
            }
            
            // Read current content
            const currentContent = await this.app.vault.read(dailyNoteFile);
            
            // Serialize the new section
            const newSection = this.parser.serializeSection(date, items);
            
            // Replace the section
            const updatedContent = PlannerParser.replaceSection(currentContent, this.settings.sectionHeading, newSection);
            
            // Write back to file
            await this.app.vault.modify(dailyNoteFile, updatedContent);
            
            console.log(`Updated planner section for ${date}`);
        } catch (error) {
            console.error(`Error writing to daily note for ${date}:`, error);
        } finally {
            // Add a small delay before allowing reads again
            setTimeout(() => {
                this.isWriting = false;
            }, 100);
        }
    }

    /** Debounced write function */
    debouncedWrite(date: ISODate, items: Record<ItemID, ItemData>): void {
        if (this.writeTimer) {
            clearTimeout(this.writeTimer);
        }
        
        this.writeTimer = setTimeout(() => {
            this.writeDailyNote(date, items);
        }, 500); // Wait 500ms after last edit
    }

    /** Load and parse content from a daily note */
    async loadDailyNoteContent(date: ISODate): Promise<Record<ItemID, ItemData>> {
        const dailyNoteFile = getDailyNote(moment(date), getAllDailyNotes());
        const contents = await this.getDailyNoteContents(dailyNoteFile);
        
        if (!contents) {
            return {};
        }
        
        const extracted = PlannerParser.extractSection(contents, this.settings.sectionHeading);
        const parsed = this.parser.parseSection(date, extracted);
        
        return parsed;
    }

    /** Load content for multiple dates */
    async loadMultipleDates(dates: ISODate[]): Promise<void> {
        // Skip reading if we're currently writing
        if (this.isWriting) return;
        
        const result: Record<ISODate, Record<ItemID, ItemData>> = {};
        
        await Promise.all(
            dates.map(async (date) => {
                result[date] = await this.loadDailyNoteContent(date);
            })
        );
        
        this.parsedContent.set(result);
    }

    /** Setup file watching for external changes */
    setupFileWatcher(dates: ISODate[]): void {
        // Clean up existing watcher
        this.cleanupFileWatcher();
        
        this.watchedDates = dates;
        
        this.fileModifyRef = this.app.vault.on('modify', async (file) => {
            if (this.isWriting) return;
            
            // Check if the modified file is one of our daily notes
            const allDailyNotes = getAllDailyNotes();
            const isDailyNote = Object.values(allDailyNotes).some(note => note.path === file.path);
            
            if (!isDailyNote) return;
            
            // Find which date(s) this file corresponds to
            for (const date of this.watchedDates) {
                const dailyNote = getDailyNote(moment(date), allDailyNotes);
                if (dailyNote && dailyNote.path === file.path) {
                    // Reload this date's content
                    const newContent = await this.loadDailyNoteContent(date);
                    this.parsedContent.update(content => ({
                        ...content,
                        [date]: newContent
                    }));
                }
            }
        });
    }

    /** Clean up file watcher */
    cleanupFileWatcher(): void {
        if (this.fileModifyRef) {
            this.app.vault.offref(this.fileModifyRef);
            this.fileModifyRef = null;
        }
    }

    /** Update cell content */
    updateCell(date: ISODate, itemId: ItemID, updatedData: ItemData): void {
        this.parsedContent.update(content => ({
            ...content,
            [date]: {
                ...content[date],
                [itemId]: updatedData
            }
        }));
        
        // Get the updated items for this date and write
        this.parsedContent.subscribe(content => {
            if (content[date]) {
                this.debouncedWrite(date, content[date]);
            }
        })();
    }

    /** Add a new item to an empty cell */
    async addNewItemToCell(date: ISODate, itemId: ItemID, timeCommitment?: number): Promise<boolean> {
        // Check if daily note exists
        let dailyNoteFile = getDailyNote(moment(date), getAllDailyNotes());
        
        if (!dailyNoteFile) {
            // Create daily note
            new Notice("Daily note doesn't exist. Creating it now...");
            
            try {
                await createDailyNote(moment(date));
                new Notice("Daily note created!");
                
                // Get the newly created file
                dailyNoteFile = getDailyNote(moment(date), getAllDailyNotes());
            } catch (error) {
                new Notice("Failed to create daily note");
                console.error("Error creating daily note:", error);
                return false;
            }
        }
        
        // Create empty item with one element
        const newItemData: ItemData = {
            id: itemId,
            time: timeCommitment ?? 0,
            items: [{
                raw: "New Item",
                text: "New Item",
                children: [],
                isTask: false
            }]
        };
        
        // Update local state
        this.parsedContent.update(content => ({
            ...content,
            [date]: {
                ...content[date] || {},
                [itemId]: newItemData
            }
        }));
        
        // Get current content and write immediately
        let currentDateContent: Record<ItemID, ItemData> = {};
        this.parsedContent.subscribe(content => {
            if (content[date]) {
                currentDateContent = content[date];
            }
        })();
        
        await this.writeDailyNote(date, currentDateContent);
        
        // Reload content to ensure sync
        const reloadedContent = await this.loadDailyNoteContent(date);
        this.parsedContent.update(content => ({
            ...content,
            [date]: reloadedContent
        }));
        
        return true;
    }

    /** Open a daily note for a specific date */
    async openDailyNote(date: ISODate): Promise<void> {
        let dailyNoteFile = getDailyNote(moment(date), getAllDailyNotes());
        
        if (!dailyNoteFile) {
            // Create daily note
            new Notice("Daily note doesn't exist. Creating it now...");
            
            try {
                dailyNoteFile = await createDailyNote(moment(date));
                new Notice("Daily note created!");
            } catch (error) {
                new Notice("Failed to create daily note");
                console.error("Error creating daily note:", error);
                return;
            }
        }
        
        // Open the daily note
        if (dailyNoteFile) {
            await this.app.workspace.getLeaf(false).openFile(dailyNoteFile);
        }
    }

    /** Clean up resources */
    destroy(): void {
        this.cleanupFileWatcher();
        if (this.writeTimer) {
            clearTimeout(this.writeTimer);
        }
    }
}
