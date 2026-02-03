import { writable } from "svelte/store";
import type { ISODate, Templates, Track } from "src/plugin/types";

export const templates = writable<Templates>({});
export const sortedTemplateDates = writable<ISODate[]>([]);