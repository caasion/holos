import type { ISODate } from './types';
import { addDays, eachDayOfInterval, endOfWeek, format, parseISO, startOfWeek, type Day } from 'date-fns';


/** Returns a randomUUID() with a given prefix. */
export function generateID(prefix: string) {
    return prefix + crypto.randomUUID();
}

/** Formats a Date into an ISODate. */
export function getISODate(date: Date): ISODate {
    return format(date, "yyyy-MM-dd")
}

/** Adds days to an ISODate (which cannot be done directly in date-fns). */
export function addDaysISO(iso: ISODate, n: number): ISODate {
    return getISODate(addDays(parseISO(iso), n));
}

/** Get the ISODates from and including today until the specified number. */
export function getISODates(anchor: Date, days: number): ISODate[];
/** Get the ISODates of the weeks from and including this week given the anchor, week number, and the day the week starts on. */
export function getISODates(anchor: Date, weeks: number, weekStartsOn: Day): ISODate[];
export function getISODates(anchor: Date, amount: number, weekStartsOn?: Day) {
    if (weekStartsOn != undefined) { // If we are looking for the dates of a week
        let dates: ISODate[] = [];
        
        for (let i = 0; i < amount; i++) {
            const start = startOfWeek(addDays( anchor, i * 7 ), { weekStartsOn });
            const end = endOfWeek(addDays( anchor, i * 7 ), { weekStartsOn });

            const days = eachDayOfInterval({ start, end });

            days.forEach(day => dates.push(getISODate(day)))
        }

        return dates;
    } else { // IF we just want to get the dates of a block
        const dates = eachDayOfInterval({ start: anchor, end: addDays(anchor, amount)})

        return dates.map(d => getISODate(d));
    }
}

/** [PURE HELPER] Gets a well-formmated label given a date range. */
export function getLabelFromDateRange(first: Date, last: Date): string {
    if (first.getFullYear() === last.getFullYear()) {
        if (first.getMonth() === last.getMonth()) {
            return `${format(first, "MMM")} ${format(first, "dd")} – ${format(last, "dd")}, ${format(first, "yyyy")}`
        } else {
            return `${format(first, "MMM")} ${format(first, "dd")} – ${format(last, "MMM")} ${format(last, "dd")}, ${format(first, "yyyy")}`
        }
    } else {
        return `${format(first, "MMM")} ${format(first, "dd")}, ${format(first, "yyyy")} – ${format(last, "MMM")} ${format(last, "dd")}, ${format(last, "yyyy")}`
    }
}

/** [PURE HELPER] Hash a string using SHA-1. */
export async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** [PURE HELPER] Takes in an array, swaps two items, and returns a new array. Returns the same array if swapping causes an item to go beyond the array. */
export function swapArrayItems<T>(array: T[], a: number, b: number): T[] {
    if (a < 0 || b < 0) return array;
    if (a >= array.length || b >= array.length) return array;

    const newArray = array.slice();
    [newArray[a], newArray[b]] = [newArray[b], newArray[a]];
    return newArray;
}