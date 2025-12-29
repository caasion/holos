import type { Day } from "date-fns";
import type { Writable } from "svelte/store";
import ICAL from "ical.js";
import type { occurrenceDetails } from "ical.js/dist/types/types";
import type { App, RequestUrlResponse, RequestUrlResponsePromise } from "obsidian";

/* Plugin Data Types */
export type ISODate = string; // Create date type for dates in ISO 8601 for simplification (not as heavy as a Date object)

/* Plugin Daydata Datatypes */
export type Time = {
	hours: number; 
	minutes: number; 
}

export interface LineInfo {
	raw: string;
    level: number;
    text: string;
    isTask: boolean;
    checked?: boolean;
    metadata?: string;
}

// An object represents a task or an event\
export interface Element {
	raw: string;
	text: string;
	children: string[];
	isTask: boolean;
	checked?: boolean;
	startTime?: Time; // in ISO time
	duration?: number; // duration value
	durationUnit?: 'min' | 'hr'; // duration unit
	taskProgress?: number; // time spent on task
	taskLimit?: number; // total time allocated for task
	taskUnit?: 'min' | 'hr'; // unit for task tracking
}

export interface ItemData {
	id: string; // ActionItemID + date
	time: number; // default: retrieves from template, but can be modified otherwise
	items: Element[];
}

/* Plugin Template Datatypes */
export type ActionItemID = string;
export type CalendarID = string;
export type ItemID = ActionItemID | CalendarID;
export type ItemMeta = ActionItemMeta | CalendarMeta;
export type ItemType = "action" | "calendar";

export interface ItemInnerMeta {
    timeCommitment?: number; 
    habits?: string[];
    journalHeader?: string;
}

export interface ActionItemMeta {
    id: ActionItemID;
    type: "action";
    order: number;
    label: string;
    color: string;
    floatCell: string;
    innerMeta: ItemInnerMeta;
}

export interface CalendarMeta {
    id: CalendarID;
    type: "calendar";
    order: number;
    label: string;
    color: string;
    floatCell: string;
    innerMeta: ItemInnerMeta;
    url: string;
    etag?: string;
    lastFetched?: number;
    lastModified?: string;
    contentHash?: string;
}

export interface PlannerState {
    templates: Record<ISODate, Record<ItemID, ItemMeta>>;
}

/* Data persistence */
export interface PluginData {
    version: number;
    settings: PluginSettings;
    planner: PlannerState;
}

export interface PluginSettings {
    /* Rendering Settings */
    blocks: number;
    columns: number;
    weekFormat: boolean;
    weekStartOn: Day;

    /* Data Saving */
    autosaveDebounceMs: number;
    sectionHeading: string;

    /* Calendar Settings */
    refreshRemoteMs: number;
    lookaheadDays: number;

    /* Developer Mode */
    debug: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    blocks: 1,
    columns: 7,
    weekFormat: true,
    weekStartOn: 0,

    autosaveDebounceMs: 200,
    sectionHeading: "Ultimate Planner",

    refreshRemoteMs: 5 * 60 * 1000,
    lookaheadDays: 14,

    debug: false,
}

export type CalendarStatus = "idle" | "fetching" | "unchanged" | "updated" | "error";

/* Core Data Service */
export interface DataService {
    // Svelte Stores (The Writable objects themselves)
    templates: Writable<Record<ISODate, Record<ItemID, ItemMeta>>>;
    calendarState: Writable<CalendarState>;
    fetchToken: Writable<number>;

    // Planner Store Actions (matches exports from plannerStore.ts)
    setTemplate: (tDate: ISODate, newTemplate: Record<ItemID, ItemMeta>) => void;
    addToTemplate: (tDate: ISODate, id: ItemID, meta: ItemMeta) => boolean;
    getTemplate: (tDate: ISODate) => Record<ItemID, ItemMeta>;
    getItemFromLabel: (tDate: ISODate, label: string) => ItemID;
    removeFromTemplate: (tDate: ISODate, id: ItemID) => boolean;
    removeFromCellsInTemplate: (tDate: ISODate, id: ItemID) => boolean;
    removeTemplate: (tDate: ISODate) => boolean;
    getItemMeta: (tDate: ISODate, id: ItemID) => ItemMeta;
    updateItemMeta: (tDate: ISODate, id: ItemID, updates: Partial<ItemMeta>) => boolean;
    setFloatCell: (tDate: ISODate, id: ItemID, value: string) => boolean;
    getFloatCell: (tDate: ISODate, id: ItemID) => string;
}

// Core Helper Service Contract (Pure Functions from helper.ts)
export interface HelperService {
    hashText: (text: string) => Promise<string>;
    generateID: (prefix: string) => string;
    getISODate: (date: Date) => ISODate;
    getISODates: (anchor: Date, amount: number, weekStartsOn?: Day) => ISODate[];
    getLabelFromDateRange: (first: Date, last: Date) => string;
    addDaysISO: (iso: ISODate, n: number) => ISODate;
    swapArrayItems: <T>(array: T[], a: number, b: number) => T[]; 
    idUsedInTemplates: (templates: Record<ISODate, Record<ItemID, ItemMeta>>, rowID: ItemID) => boolean;
}

export interface CalendarHelperService {
    parseICS: (ics: string, calendarId: string) => NormalizedEvent[];
    parseICSBetween: (ics: string, calendarId: CalendarID, after: Date, before: Date) => NormalizedEvent[];
    normalizeEvent: (event: ICAL.Event, calendarId: CalendarID) => NormalizedEvent;
    normalizeOccurrenceEvent: (occurance: occurrenceDetails, calendarId: string) => NormalizedEvent;
    buildEventDictionaries: (events: NormalizedEvent[]) => { index: Record<ISODate, string[]>, eventsById: Record<string, NormalizedEvent> }
    getEventLabels: (events: NormalizedEvent[]) => string;
}

export interface FetchService {
    fetchFromUrl: (url: string, etag?: string, lastFetched?: string) => Promise<RequestUrlResponse>;
    detectFetchChange: (response: RequestUrlResponse, contentHash: string, oldContentHash?: string) => boolean;
}

/* Calendar State */
export interface CalendarState {
    status: CalendarStatus;
    lastError?: string;
}

export interface NormalizedEvent {
    id: string;
    recurrId?: Date;
    start: Date;
    end: Date;
    allDay: boolean;
    summary: string;
    location?: string;
    description?: string;
    calendarId: string;
}