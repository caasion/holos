import type { Day } from "date-fns";
import type { Writable } from "svelte/store";
import ICAL from "ical.js";
import type { occurrenceDetails } from "ical.js/dist/types/types";
import type { RequestUrlResponse } from "obsidian";

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
    taskStatus?: ' ' | 'x' | '-';
	startTime?: Time; // in ISO time
    progress?: number;
    duration?: number;
	timeUnit?: 'min' | 'hr';
}

export interface ItemData {
	id: string; // ActionItemID + date
	time: number; // default: retrieves from template, but can be modified otherwise
	items: Element[];
}

/* NEW Plugin Template Datatypes */
export interface Habit {
	id: string;
	label: string;
	rrule: string;
}

interface RDateInterval {
	startDate: ISODate;
	endDate: ISODate
	rrule?: string;
}

export interface Project {
	id: string
	label: string;
	active: RDateInterval[]; // Project can be on and off
	data: Element[];
	habits: Record<string, Habit>; // can be empty
}

export interface CalendarMeta {
    url: string;
    etag?: string;
    lastFetched?: number;
    lastModified?: string;
    contentHash?: string;
}

export interface Track {
    id: string;
    
    // Track meta
    description: string;
    order: number;
    label: string;
    color: string;
    // calendar: CalendarMeta;
    
    // Additional data
    timeCommitment: number; // in hours
	journalHeader: string;
	habits: Record<string, Habit>;
	
    // Projects
    activeProjectId: string | null;
    projects: Record<string, Project>;
}



/* Plugin Template Datatypes */
export type TDate = ISODate;

export interface Template {
  id: string;
  name: string;
  effectiveFrom: ISODate; 
  tracks: string[];
}

export type Templates = Record<TDate, Template>;

export interface PlannerState {
    templates: Templates;
}

/* Planner Table Rendering */
export interface DateMapping {
    date: ISODate;
    tDate: TDate;
}

export interface Item {
    id: ItemID;
    meta: ItemMeta;
}

export interface BlockMeta {
    rows: number;
    dateTDateMapping: DateMapping[];
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

    /* Track Settings */
    trackFolder: string;

    /* Developer Mode */
    debug: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    blocks: 1,
    columns: 7,
    weekFormat: true,
    weekStartOn: 0,

    autosaveDebounceMs: 200,
    sectionHeading: "Holos",

    trackFolder: "Tracks",

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
}

// Core Helper Service Contract (Pure Functions from helper.ts)
export interface HelperService {
    hashText: (text: string) => Promise<string>;
    generateID: (prefix: string) => string;
    getISODate: (date: Date) => ISODate;
    getISODates: (anchor: ISODate, amount: number, weekStartsOn?: Day) => ISODate[];
    getLabelFromDateRange: (first: ISODate, last: ISODate) => string;
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