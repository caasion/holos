import type { HelperService, ISODate, TDate, Template, Track } from "src/plugin/types";
import { sortedTemplateDates, templates } from "./templatesStore";
import { get, type Writable } from "svelte/store";
import { addDays, eachDayOfInterval, parseISO } from "date-fns";
import { NewTemplateModal } from "./NewTemplateModal";
import { ConfirmationModal } from "src/plugin/ConfirmationModal";
import { getISODate } from "src/plugin/helpers";
import type { App } from "obsidian";

export class TemplateActions {
    // ===== Template Dates ===== //

    /** Uses binary search to get the template date for a given date. Returns blank if not found. */
    public getTemplateDate(date: ISODate): ISODate {
        const dates: ISODate[] = get(sortedTemplateDates);

        // Implement binary search to find the template date that is the greatest date less than or equal to the date provided
        let left = 0;
        let right = dates.length - 1;
        let result: ISODate = "";

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const midDate = dates[mid];

            if (midDate === date) {
                return midDate;
            }
            if (midDate < date) {
                result = midDate;
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return result;
    }

    /** Uses binary search to get the index of a template date within sortedTemplateDates. */
    private getIndexFromTDate(tDate: TDate): number {
        const dates: TDate[] = get(sortedTemplateDates);
    
        // Implement binary search to find the template date that is the greatest date less than or equal to the date provided
        let left = 0;
        let right = dates.length - 1;
    
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const midDate = dates[mid];
    
            if (midDate === tDate) {
                return mid;
            }
            if (midDate < tDate) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
    
        return -1;
    }
    
    /** Returns a list of dates that are involved with a template. */
    public getDatesOfTemplate(tDate: ISODate): ISODate[] {
        const tDateIndex = this.getIndexFromTDate(tDate);
        const nextTDate = get(sortedTemplateDates)[tDateIndex + 1];
    
        let end: Date = nextTDate ? addDays(parseISO(nextTDate), -1) : addDays(parseISO(tDate), 180);
    
        return eachDayOfInterval({start: parseISO(tDate), end}).map(d => getISODate(d))
    }

    // ===== Reading templates ===== //
    public getTemplate(tDate: TDate): Template {
        return get(templates)[tDate];
    }

    // ===== Creation and deletion of templates ===== //

    /** Handles the create of a new template (modal and creation). */
    public handleNewTemplate(app: App) {
        new NewTemplateModal(app, getISODate(new Date()), (date, copyFrom) => this.setTemplate(date, copyFrom == '' ? {} : this.getTemplate(copyFrom))).open();
    }

    /** Handles the removal of a new template (confirmation modal, deletion, and clean-up.) */
    public handleRemoveTemplate(app: App, tDate: ISODate) {
        new ConfirmationModal(
            app, 
            () => this.removeTemplate(tDate), 
            "Remove",
            "Removing the template will remove all items and their contents."
        ).open();
    }

    // ===== Modifying templates ===== //
    
    /** Sets the template for a date.
     * Primarily used for initializing templates.
     */
    public setTemplate(tDate: TDate, newTemplate: Template) {
        templates.update(templates => ({
            ...templates,
            [tDate]: newTemplate,
        }))
    }
    
    /** Adds a track to a template of a given date. Returns false if the given date doesn't have a template. */
    public addTrackToTemplate(tDate: TDate, id: string, meta: Track): boolean {
        templates.update(templates => ({
            ...templates,
            [tDate]: {
                ...templates[tDate],
                tracks : {
                    ...templates[tDate].tracks,
                    [id]: meta
                }
            }
        }))
    
        return true;
    }
    
    /** Removes a template from the list. Does not remove daily data */
    public removeTemplate(tDate: TDate): boolean {
        if (!this.getTemplate(tDate)) return false;
    
        const dates = this.getDatesOfTemplate(tDate);
    
        templates.update(templates => {
            const current = {...templates};
            current[tDate] && delete current[tDate];
            return current;
        })
    
        return true;
    }
}