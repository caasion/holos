import { differenceInMinutes, format } from "date-fns";
import IcalExpander from "ical-expander";
import ICAL from "ical.js";
import type { occurrenceDetails } from "ical.js/dist/types/event";
import type { CalendarID, ISODate, NormalizedEvent } from "src/plugin/types";

/** [PURE HELPER] Converts an ICS string into a list of events with details. */
export function parseICS(ics: string, calendarId: string): NormalizedEvent[] {
    const icalExpander = new IcalExpander({ics, maxIterations: 10})
    // TODO: Handle iterations

    const results = icalExpander.all();

    const mappedEvents: NormalizedEvent[] = results.events.map(e => normalizeEvent(e, calendarId)); // only contains one-off events
    const mappedOccurrences: NormalizedEvent[] = results.occurrences.map(o => normalizeOccurrenceEvent(o, calendarId));
    const allEvents = [...mappedEvents, ...mappedOccurrences]; // contains recurring events

    return allEvents;
}

/** [PURE HELPER] Converts an ICS string into a list of events with details within a given time period. */
export function parseICSBetween(ics: string, calendarId: CalendarID, after: Date, before: Date): NormalizedEvent[] {
    const icalExpander = new IcalExpander({ics})
    const results = icalExpander.between(after, before);

    const mappedEvents: NormalizedEvent[] = results.events.map(e => normalizeEvent(e, calendarId)); // only contains one-off events
    const mappedOccurrences: NormalizedEvent[] = results.occurrences.map(o => normalizeOccurrenceEvent(o, calendarId));
    const allEvents = [...mappedEvents, ...mappedOccurrences]; // contains recurring events

    return allEvents;
}

/** [PURE HELPER] Normalizes a normal ical event. */
export function normalizeEvent(event: ICAL.Event, calendarId: CalendarID): NormalizedEvent {
    return { 
        id: event.uid,
        start: event.startDate.toJSDate(), // Normalize dates to JS Date object instead of ical TIME object
        end: event.endDate.toJSDate(),
        allDay: event.startDate.isDate,
        summary: event.summary,
        location: event.location,
        description: event.description,
        calendarId
    }
}

/** [PURE HELPER] Normalizes a recurring event given occurrence details. */
export function normalizeOccurrenceEvent(occurance: occurrenceDetails, calendarId: string): NormalizedEvent {
    const event = occurance.item;

    return { 
        id: event.uid,
        recurrId: occurance.recurrenceId.toJSDate(), // Normalize dates to JS Date object instead of ical TIME object
        start: occurance.startDate.toJSDate(),
        end: occurance.endDate.toJSDate(),
        allDay: event.startDate.isDate,
        summary: event.summary,
        location: event.location,
        description: event.description,
        calendarId
    }
}

/** [PURE HELPER] Builds a record of Date-EventIDs and EventId-NormalizedEvent for quick look-up. O(1) */
export function buildEventDictionaries(events: NormalizedEvent[]): { index: Record<ISODate, string[]>, eventsById: Record<string, NormalizedEvent> } {
    const index: Record<ISODate, string[]> = {};

    events.forEach(e => {
        const date = format(e.start, "yyyy-MM-dd");
        index[date] ??= []
        index[date].push(e.id);
    })

    const eventsById: Record<string, NormalizedEvent> = {};

    events.forEach(e => {
        eventsById[e.id] = e;
    })

    return { index, eventsById };

}

/** [PURE HELPER] Turns a list of normalized events into a label with \n indicators. */
export function getEventLabels(events: NormalizedEvent[]): string {
    let value: string = "";

    events.forEach(event => {
        if (event.allDay) {
            value += `${event.summary}`
        } else {
            const start = format(event.start, "HH:mm")
            value += `${event.summary} @ ${start} (${getDurationAsString(event.start, event.end)})`
        }
        value += " \n\n";
    })

    return value;
}

/** [PURE HELPER] */
function getDurationAsString(start: Date, end: Date): string {
    let diff: number = differenceInMinutes(end, start)
    let units: string = "min";

    if (diff % 60 == 0) {
        diff /= 60;
        units = "hr";
    }

    return `${diff} ${units}`
}