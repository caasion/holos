import type { ISODate, DataService, HelperService, CalendarMeta, PluginSettings, TDate, Track, Project } from '../plugin/types';
import { get } from 'svelte/store';
import { CalendarPipeline } from '../calendar/calendarPipelines';
import { addDays, parseISO, startOfDay } from 'date-fns';
import { Menu, Notice, type App } from 'obsidian';
import { NewItemModal } from 'src/templates/NewItemModal';
import { GenericEditModal } from 'src/templates/EditItemModal';
import { ConfirmationModal } from 'src/plugin/ConfirmationModal';
import { NewTrackModal } from './NewTrackModal';
import { EditTrackLabelModal } from './EditTrackLabelModal';
import { EditTrackTimeModal } from './EditTrackTimeModal';
import { EditJournalHeaderModal } from './EditJournalHeaderModal';
import type { TemplateActions } from 'src/templates/templateActions';
import { generateID } from 'src/plugin/helpers';
import type { TrackNoteService } from './trackNote';

export interface TrackActionsDeps {
    settings: PluginSettings;
    templateAct: TemplateActions;
    data: DataService;
    calendarPipelines: CalendarPipeline;
    trackNoteService?: TrackNoteService;
}

export class TrackActions {
    private settings: PluginSettings;
    private templates: TemplateActions;
    private data: DataService;
    private calendarPipelines: CalendarPipeline;
    private trackNoteService?: TrackNoteService;

    constructor(deps: TrackActionsDeps) {
        this.settings = deps.settings;
        this.templates = deps.templateAct;
        this.data = deps.data;
        this.calendarPipelines = deps.calendarPipelines;
        this.trackNoteService = deps.trackNoteService;
    }

    // ===== Reading trakcs ===== /
    
    /** Gets the metadata of an item given a date with a template */
    public getTrack(tDate: TDate, id: string): Track {
        return this.templates.getTemplate(tDate).tracks[id];
    }

    /** Returns the id of a track from a specified template given the item label (case insensitive). */
    public getTrackIDFromLabel(tDate: TDate, label: string): string {
        const template = this.templates.getTemplate(tDate);
        
        // Guard: if no template exists for this date, return empty string
        if (!template) {
            return "";
        }
    
        for (const item of Object.values(template)) {
            if (label.toLowerCase() == item.label.toLowerCase()) {
                return item.id;
            }
        }
    
        return "";
    }

    // ===== Creating tracks ===== // 
    
    /** Handles the creation of a new track (modal and creation). */
    public handleNewTrack(app: App, tDate: ISODate) {
        const nextOrder = Object.values(this.templates.getTemplate(tDate)?.tracks || {}).length;
        new NewTrackModal(app, nextOrder, tDate, async (track: Track) => {
            // Create track in file system
            if (this.trackNoteService) {
                const success = await this.trackNoteService.createTrack(track);
                if (success) {
                    new Notice(`Track "${track.label}" created successfully`);
                } else {
                    new Notice(`Failed to create track "${track.label}"`);
                }
            } else {
                // Fallback to template actions if service not available
                this.templates.addTrackToTemplate(tDate, track.id, track);
            }
        }).open();
    }
    
    // ===== Modifying tracks ===== //

    /** Updates a habit's rrule within a track */
    public async updateHabitRRule(tDate: TDate, trackId: string, habitId: string, rrule: string): Promise<boolean> {
        if (this.trackNoteService) {
            return await this.trackNoteService.updateHabit(trackId, habitId, { rrule });
        }
        
        // Fallback to template actions
        const currTemplate = this.templates.getTemplate(tDate);
        if (!currTemplate || !currTemplate.tracks[trackId]) return false;

        this.templates.setTemplate(tDate, {
            ...currTemplate,
            tracks: {
                ...currTemplate.tracks,
                [trackId]: {
                    ...currTemplate.tracks[trackId],
                    habits: {
                        ...currTemplate.tracks[trackId].habits,
                        [habitId]: {
                            ...currTemplate.tracks[trackId].habits[habitId],
                            rrule
                        }
                    }
                }
            }
        });
    
        return true;
    }

    /** Updates a habit's label within a track. */
    public async updateHabitLabel(tDate: TDate, trackId: string, habitId: string, label: string): Promise<boolean> {
        if (this.trackNoteService) {
            return await this.trackNoteService.updateHabit(trackId, habitId, { label });
        }
        
        // Fallback to template actions
        const currTemplate = this.templates.getTemplate(tDate);
        if (!currTemplate || !currTemplate.tracks[trackId]) return false;

        this.templates.setTemplate(tDate, {
            ...currTemplate,
            tracks: {
                ...currTemplate.tracks,
                [trackId]: {
                    ...currTemplate.tracks[trackId],
                    habits: {
                        ...currTemplate.tracks[trackId].habits,
                        [habitId]: {
                            ...currTemplate.tracks[trackId].habits[habitId],
                            label
                        }
                    }
                }
            }
        });
    
        return true;
    }

    /** Adds a habit to a track. */
    public async addHabitToTrack(app: App, tDate: TDate, trackId: string) {
        const habitId = generateID("habit-");
        const newHabit = {
            id: habitId,
            label: "",
            rrule: ""
        };

        if (this.trackNoteService) {
            await this.trackNoteService.updateTrack(trackId, { addHabit: newHabit });
            return;
        }
        
        // Fallback to template actions
        const currTemplate = this.templates.getTemplate(tDate);
        if (!currTemplate || !currTemplate.tracks[trackId]) return;

        this.templates.setTemplate(tDate, {
            ...currTemplate,
            tracks: {
                ...currTemplate.tracks,
                [trackId]: {
                    ...currTemplate.tracks[trackId],
                    habits: {
                        ...currTemplate.tracks[trackId].habits,
                        [habitId]: newHabit
                    }
                }
            }
        });
    }

    /** Removes a habit from a track. */
    public async removeHabitFromTrack(tDate: TDate, trackId: string, habitId: string): Promise<boolean> {
        if (this.trackNoteService) {
            return await this.trackNoteService.updateTrack(trackId, { removeHabitId: habitId });
        }
        
        // Fallback to template actions
        const currTemplate = this.templates.getTemplate(tDate);
        if (!currTemplate || !currTemplate.tracks[trackId]) return false;

        const { [habitId]: _, ...remainingHabits } = currTemplate.tracks[trackId].habits;

        this.templates.setTemplate(tDate, {
            ...currTemplate,
            tracks: {
                ...currTemplate.tracks,
                [trackId]: {
                    ...currTemplate.tracks[trackId],
                    habits: remainingHabits
                }
            }
        });
    
        return true;
    }

    /** Updates the active project within a track. */
    public updateTrackProject(tDate: TDate, trackId: string, project: Project): boolean {
        const currTemplate = this.templates.getTemplate(tDate);
        if (!currTemplate || !currTemplate.tracks[trackId]) return false;

        this.templates.setTemplate(tDate, {
            ...currTemplate,
            tracks: {
                ...currTemplate.tracks,
                [trackId]: {
                    ...currTemplate.tracks[trackId],
                    activeProject: project
                }
            }
        });
    
        return true;
    }

    /** Updates a track's order property. */
    public updateTrackOrder(tDate: TDate, trackId: string, order: number): boolean {
        const currTemplate = this.templates.getTemplate(tDate);
        if (!currTemplate || !currTemplate.tracks[trackId]) return false;

        this.templates.setTemplate(tDate, {
            ...currTemplate,
            tracks: {
                ...currTemplate.tracks,
                [trackId]: {
                    ...currTemplate.tracks[trackId],
                    order
                }
            }
        });
    
        return true;
    }

    /** Updates a track's label. */
    public async updateTrackLabel(tDate: TDate, trackId: string, label: string): Promise<boolean> {
        if (this.trackNoteService) {
            return await this.trackNoteService.updateTrack(trackId, { label });
        }
        
        // Fallback to template actions
        const currTemplate = this.templates.getTemplate(tDate);
        if (!currTemplate || !currTemplate.tracks[trackId]) return false;

        this.templates.setTemplate(tDate, {
            ...currTemplate,
            tracks: {
                ...currTemplate.tracks,
                [trackId]: {
                    ...currTemplate.tracks[trackId],
                    label
                }
            }
        });
    
        return true;
    }

    /** Updates a track's time commitment (in minutes). */
    public async updateTrackTimeCommitment(tDate: TDate, trackId: string, timeCommitment: number): Promise<boolean> {
        if (this.trackNoteService) {
            return await this.trackNoteService.updateTrack(trackId, { frontmatter: { time_commitment: timeCommitment } });
        }
        
        // Fallback to template actions
        const currTemplate = this.templates.getTemplate(tDate);
        if (!currTemplate || !currTemplate.tracks[trackId]) return false;

        this.templates.setTemplate(tDate, {
            ...currTemplate,
            tracks: {
                ...currTemplate.tracks,
                [trackId]: {
                    ...currTemplate.tracks[trackId],
                    timeCommitment
                }
            }
        });
    
        return true;
    }

    /** Updates a track's journal header. */
    public async updateTrackJournalHeader(tDate: TDate, trackId: string, journalHeader: string): Promise<boolean> {
        if (this.trackNoteService) {
            return await this.trackNoteService.updateTrack(trackId, { frontmatter: { journal_header: journalHeader } });
        }
        
        // Fallback to template actions
        const currTemplate = this.templates.getTemplate(tDate);
        if (!currTemplate || !currTemplate.tracks[trackId]) return false;

        this.templates.setTemplate(tDate, {
            ...currTemplate,
            tracks: {
                ...currTemplate.tracks,
                [trackId]: {
                    ...currTemplate.tracks[trackId],
                    journalHeader
                }
            }
        });
    
        return true;
    }

    /** Handles editing a track's label with a modal. */
    public handleEditTrackLabel(app: App, tDate: ISODate, trackId: string, currentLabel: string) {
        new EditTrackLabelModal(
            app,
            currentLabel,
            (label) => this.updateTrackLabel(tDate, trackId, label),
            () => this.handleRemoveTrack(app, tDate, trackId)
        ).open();
    }

    /** Handles editing a track's time commitment with a modal. */
    public handleEditTrackTime(app: App, tDate: ISODate, trackId: string, currentTimeMinutes: number) {
        new EditTrackTimeModal(
            app,
            currentTimeMinutes,
            (timeMinutes) => this.updateTrackTimeCommitment(tDate, trackId, timeMinutes)
        ).open();
    }

    /** Handles editing a track's journal header with a modal. */
    public handleEditJournalHeader(app: App, tDate: ISODate, trackId: string, currentHeader: string) {
        new EditJournalHeaderModal(
            app,
            currentHeader,
            (header) => this.updateTrackJournalHeader(tDate, trackId, header)
        ).open();
    }

    /** Creates and opens the context menu for an item. */
    public openTrackMenu(app: App, evt: MouseEvent, date: ISODate, id: string, meta: Track) {
        evt.preventDefault();
        evt.stopPropagation();

        const menu = new Menu();
 
        menu
            .addItem((i) =>
                i.setTitle(`ID: ${id}`)
                .setIcon("info")
            )
            .addSeparator()
            .addItem((i) =>
                i.setTitle("Edit")
                .setIcon("pencil")
                .onClick(() => {
                    new GenericEditModal(app, meta, (newMeta) => this.data.updateItemMeta(this.templates.getTemplateDate(date), id, newMeta)).open();
                })
            )
            .addItem((i) =>
                i.setTitle("Remove")
                .setIcon("x")
                .onClick(() => {
                    this.handleRemoveTrack(app, this.templates.getTemplateDate(date), id);
                })
            )

        menu.showAtPosition({ x: evt.clientX, y: evt.clientY });
    }

    /** Swaps two tracks within a template given the id of the first track, and the distance to swap the track to. A costly operation. */
    public swapTracks(tDate: ISODate, id: string, dist: number): boolean {
        const currOrder = this.getTrack(tDate, id).order;
        const newOrder = currOrder + dist;
        const swapTargetID = Object.values(this.data.getTemplate(tDate)).find(t => t.order == newOrder)?.id;

        if (!swapTargetID) return false;

        // WILL FIX LATER

        this.updateTrackOrder(tDate, id, newOrder);
        this.updateTrackOrder(tDate, swapTargetID, currOrder);

        return true;
    }

    // ===== Deleting tracks ===== //

    /** Handles the deletion of a track given the template date and id (confirmation modal, deletion, and clean-up). */
    public handleRemoveTrack(app: App, tDate: ISODate, id: string) {
        new ConfirmationModal(
            app, 
            async () => await this.removeTrack(tDate, id),
            "Remove",
            "Removing the track will not remove all cell contents."
        ).open();
    }

    /** Deletes an track and its cell contents */
    public async removeTrack(tDate: ISODate, id: string): Promise<boolean> {
        if (this.trackNoteService) {
            const success = await this.trackNoteService.deleteTrack(id);
            if (success) {
                new Notice('Track deleted successfully');
                return true;
            }
            return false;
        }
        
        // Fallback to template actions
        if (!this.templates.getTemplate(tDate)) return false;

        // WILL FIX LATER

        this.data.removeFromTemplate(tDate, id);
        this.data.removeFromCellsInTemplate(tDate, id);

        return true;
    }

    // ===== Reading data from tracks ===== //
    
    /** Sets the contents of a floatCell for a given track id.
     * Doesn't matter if the cell was previously empty.
     */
    public setFloatCell(tDate: TDate, id: string, value: Element[]): boolean {    
        // NOT IMPLEMENTED
    
        return false;
    }
    
    
    /** Gets the contents of a float cell given an track id. 
     * Returns an empty string if there is no template, track, or floatCell value found. */
    public getFloatCell(tDate: TDate, id: string) {
        // NOT IMPLEMENTED
    
        return "";
    }
}