import type { ISODate, DataService, HelperService, ItemMeta, CalendarMeta, ItemID, PluginSettings } from '../types';
import { get } from 'svelte/store';
import { CalendarPipeline } from './calendarPipelines';
import { addDays, parseISO, startOfDay } from 'date-fns';
import { Menu, Notice, type App } from 'obsidian';
import { NewItemModal } from 'src/ui/NewItemModal';
import { GenericEditModal } from 'src/ui/EditItemModal';
import { getTemplate, sortedTemplateDates } from 'src/state/plannerStore';
import { NewTemplateModal } from 'src/ui/NewTemplateModal';
import { ConfirmationModal } from 'src/ui/ConfirmationModal';

export interface PlannerServiceDeps {
    settings: PluginSettings;
    data: DataService;
    helpers: HelperService;
    calendarPipelines: CalendarPipeline;
}

export class PlannerActions {
    private settings: PluginSettings;
    private data: DataService;
    private helpers: HelperService;
    private calendarPipelines: CalendarPipeline;

    constructor(deps: PlannerServiceDeps) {
        this.settings = deps.settings;
        this.data = deps.data;
        this.helpers = deps.helpers;
        this.calendarPipelines = deps.calendarPipelines;
    }

    /** Uses binary search to get the template date for a given date. */
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

    /** Creates a new item given a date and item details. */
    public newItem(date: ISODate, meta: ItemMeta) {
        this.data.updateItemMeta(date, meta.id, meta);

        const templateDate = this.getTemplateDate(date); 
        this.data.templates.update(templates => {
            const currentMetaRecord = templates[templateDate] || {};
            const newMetaRecord = { ...currentMetaRecord, [meta.id]: {...meta, order: Object.keys(currentMetaRecord).length } };
            return { ...templates, [templateDate]: newMetaRecord };
        });

        if (meta.type === "calendar") {
            const from = parseISO(date);
            const to = addDays(from, this.settings.lookaheadDays)

            this.calendarPipelines.fetchInGracePeriod(
                templateDate,
                meta.id, 
                from, 
                addDays(to, this.settings.lookaheadDays)
            );

            new Notice(`Fetched Calendar "${meta.label}" from ${date} to ${this.helpers.getISODate(to)}.`);
        }
    }

    /** Handles the deletion of an item given the template date and id (confirmation modal, deletion, and clean-up). */
    public handleRemoveItem(app: App, tDate: ISODate, id: ItemID) {
        new ConfirmationModal(
            app, 
            () => this.removeItem(tDate, id),
            "Remove",
            "Removing the item will remove all cell contents."
        ).open();
    }

    /** Deletes an item and its cell contents */
    public removeItem(tDate: ISODate, id: ItemID): boolean {
        if (!get(this.data.templates)[tDate]) return false;

        this.data.removeFromTemplate(tDate, id);
        this.data.removeFromCellsInTemplate(tDate, id);

        return true;
    }

    /** Handles the create of a new template (modal and creation). */
    public handleNewTemplate(app: App) {
        new NewTemplateModal(app, this.helpers.getISODate(new Date()), (date, copyFrom) => this.data.setTemplate(date, copyFrom == '' ? {} : this.data.getTemplate(copyFrom))).open();
    }

    /** Handles the removal of a new template (confirmation modal, deletion, and clean-up.) */
    public handleRemoveTemplate(app: App, tDate: ISODate) {
        new ConfirmationModal(
            app, 
            () => this.data.removeTemplate(tDate), 
            "Remove",
            "Removing the template will remove all items and their contents."
        ).open();
    }

    /** Creates and opens the context menu for creating a new item. */
    public newItemMenu(app: App, evt: MouseEvent, tDate: ISODate): void {
        evt.preventDefault();
        evt.stopPropagation();
    
        const menu = new Menu();

        menu
        .addItem((i) =>
            i.setTitle("Create New Action Item")
            .setIcon("add")
            .onClick(() => {
                new NewItemModal(app, "action", tDate, (date: ISODate, meta: ItemMeta) => this.newItem(date, meta)).open();
            })
        )
        .addItem((i) =>
            i.setTitle("Add New Remote Calendar")
            .setIcon("add")
            .onClick(() => {
                new NewItemModal(app, "calendar", tDate, (date: ISODate, meta: ItemMeta) => this.newItem(date, meta as CalendarMeta)).open();
            })
        )
        
    
        menu.showAtPosition({ x: evt.clientX, y: evt.clientY });
    }

    /** Creates and opens the context menu for an item. */
    public openItemMenu(app: App, evt: MouseEvent, date: ISODate, id: ItemID, meta: ItemMeta) {
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
                    new GenericEditModal(app, meta, (newMeta) => this.data.updateItemMeta(this.getTemplateDate(date), id, newMeta)).open();
                })
            )
            .addItem((i) =>
                i.setTitle("Remove")
                .setIcon("x")
                .onClick(() => {
                    this.handleRemoveItem(app, this.getTemplateDate(date), id);
                })
            )

        if (meta.type === "calendar") {
            const from = parseISO(date);
            const to = addDays(from, this.settings.lookaheadDays)

            menu.addItem((i) => 
                i.setTitle(`Fetch Calendar (from ${date} to ${this.helpers.getISODate(to)})`)
                .setIcon("pencil")
                .onClick(() => {
                    this.calendarPipelines.fetchInGracePeriod(
                        this.getTemplateDate(date),
                        meta.id, 
                        from, 
                        to
                    );
                })
            )
        }

        menu.showAtPosition({ x: evt.clientX, y: evt.clientY });
    }

    /** Swaps two items within a template given the id of the first item, and the distance to swap the item to. A costly operation. */
    public swapItem(tDate: ISODate, id: ItemID, dist: number): boolean {
        const currOrder = this.data.getItemMeta(tDate, id).order;
        const newOrder = currOrder + dist;
        const swapTargetID = Object.values(this.data.getTemplate(tDate)).find(t => t.order == newOrder)?.id;

        if (!swapTargetID) return false;

        this.data.updateItemMeta(tDate, id, {order: newOrder});
        this.data.updateItemMeta(tDate, swapTargetID, {order: currOrder});

        return true;
    }
}