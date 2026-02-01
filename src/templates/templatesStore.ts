import { writable } from "svelte/store";
import type { ISODate, Track } from "src/plugin/types";

export const templates = writable<Record<ISODate, Record<string, Track>>>({});
export const sortedTemplateDates = writable<ISODate[]>([]);