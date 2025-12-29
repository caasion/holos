import { writable } from "svelte/store";
import type { CalendarState } from "src/plugin/types";

export const calendarState = writable<CalendarState>({ status: "idle" });

export const fetchToken = writable<number>(0);