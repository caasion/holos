import { get, writable } from "svelte/store";
import type { ISODate, ItemID, ItemMeta } from "src/types";
import { addDays, eachDayOfInterval, parseISO } from "date-fns";
import { addDaysISO, getISODate } from "src/actions/helpers";

export const dayData = writable<Record<ISODate, Record<ItemID, string>>>({});
export const templates = writable<Record<ISODate, Record<ItemID, ItemMeta>>>({});
export const sortedTemplateDates = writable<ISODate[]>([]);

/** Sets the template for a date.
 * Primarily used for initializing templates.
 */
export function setTemplate(date: ISODate, newTemplate: Record<ItemID, ItemMeta>) {
    templates.update(templates => ({
        ...templates,
        [date]: newTemplate
    }))
}


/** Adds an item to a template of a given date. Returns false if the given date doesn't have a template.  */
export function addToTemplate(tDate: ISODate, id: ItemID, meta: ItemMeta): boolean {
    if (!get(templates)[tDate]) return false;

    templates.update(templates => ({
        ...templates,
        [tDate]: {
            ...templates[tDate],
            [id]: meta
        }
    }))

    return true;
}

export function getTemplate(tDate: ISODate): Record<ItemID, ItemMeta> {
    return get(templates)[tDate];
}

/** Returns the ItemID from a specified template given the item label (case insensitive). */
export function getItemFromLabel(tDate: ISODate, label: string): ItemID {
    const template = getTemplate(tDate);

    for (const item of Object.values(template)) {
        if (label.toLowerCase() == item.label.toLowerCase()) {
            return item.id;
        }
    }

    return "";
}

/** Removes an item from a template of a given date. Returns false if the given date doesn't have a template. */
export function removeFromTemplate(tDate: ISODate, id: ItemID): boolean {
    if (!get(templates)[tDate]) return false;

    templates.update(templates => {
        const current = {...templates};
        delete current[tDate][id];
        return current;
    })
    return true;
}


/** Uses binary search to get the index of a template date within sortedTemplateDates. */
function getIndexFromTDate(tDate: ISODate): number {
    const dates: ISODate[] = get(sortedTemplateDates);

    // Implement binary search to find the template date that is the greatest date less than or equal to the date provided
    let left = 0;
    let right = dates.length - 1;
    let result: number = 0;

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
function getDatesOfTemplate(tDate: ISODate): ISODate[] {
    const tDateIndex = getIndexFromTDate(tDate);
    const nextTDate = get(sortedTemplateDates)[tDateIndex + 1];

    let end: Date = nextTDate ? addDays(parseISO(nextTDate), -1) : addDays(parseISO(tDate), 180);

    return eachDayOfInterval({start: parseISO(tDate), end}).map(d => getISODate(d))

}

/** Removes an item from all cells of a template of a given date. Returns false if the given date doesn't have a template. A costly operation. */
export function removeFromCellsInTemplate(tDate: ISODate, id: ItemID): boolean {
    if (!get(templates)[tDate]) return false;

    // Implementation: Finds the index of the current date, then add one, to find the next template date within sortedTemplateDates. Then, get an array of the dates to remove the item from. Finally, delete the item from every day the template is in.
    const dates: ISODate[] = getDatesOfTemplate(tDate);

    dayData.update(data => {
        const current = {...data}
        dates.forEach(d => {
            if (current[d]) {
                current[d][id] && delete current[d][id];

                // Clean up the dayData entry if there is nothing in that day
                if (Object.keys(current[d]).length === 0) {
                    delete current[d];
                }
            }
        })
        return current;
    })

    return true;
}

export function removeTemplate(tDate: ISODate): boolean {
    if (!get(templates)[tDate]) return false;

    const dates = getDatesOfTemplate(tDate);
    dayData.update(data => {
        const current = {...data};
        dates.forEach(d => {
            current[d] && delete current[d];
        })
        return current;
    })

    templates.update(templates => {
        const current = {...templates};
        current[tDate] && delete current[tDate];
        return current;
    })

    return true;
}

/** Gets the metadata of an item given a date with a template */
export function getItemMeta(tDate: ISODate, id: ItemID): ItemMeta {
    return get(templates)[tDate][id];
}

/** Updates the metadata of an item given a date with a template, the item's id, and a partial object containing the updates. Returns false if given date doesn't have a template. */
export function updateItemMeta(tDate: ISODate, id: ItemID, updates: Partial<ItemMeta>): boolean {
    if (!get(templates)[tDate]) return false;

    templates.update(templates => ({
        ...templates,
        [tDate]: {
            ...templates[tDate],
            [id]: { ...templates[tDate][id], ...updates } as ItemMeta
        }
    }))

    return true;
}


/** Sets the contents of a floatCell for a given item id.
 * Doesn't matter if the cell was previously empty.
 */
export function setFloatCell(tDate: ISODate, id: ItemID, value: string): boolean {
    if (!get(templates)[tDate]) return false;

    templates.update(templates => ({
        ...templates,
        [tDate]: {
            ...templates[tDate],
            [id]: { ...templates[tDate][id], floatCell: value}
        }
    }))

    return true;
}


/** Gets the contents of a float cell given an item id. 
 * Returns an empty string if there is no template, item, or floatCell value found. */
export function getFloatCell(tDate: ISODate, id: ItemID) {
    const temps = get(templates);

    return (temps[tDate] && temps[tDate][id] && temps[tDate][id].floatCell) ?? "";
}


/** Sets the contents of a cell in a given date for given action item ID.
 * Doesn't matter if the cell was previously empty.
 */
export function setCell(date: ISODate, id: ItemID, value: string) {
    dayData.update(data => ({
        ...data,
        [date]: {
            ...data[date],
            [id]: value
        }
    }))
}


/** Gets the contents of a cell in a given date for given row ID. 
 * Returns an empty string if there is no date entry in dayData or if the date entry exists but there is no entry for a given row ID. */
export function getCell(date: ISODate, id: ItemID) {
    const data = get(dayData);

    return data[date] && data[date][id] ? data[date][id] : "";
}