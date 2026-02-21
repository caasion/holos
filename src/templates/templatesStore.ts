import { derived, writable } from "svelte/store";
import type { ISODate, Item, Templates, Track } from "src/plugin/types";

export const templates = writable<Templates>({});
export const sortedTemplateDates = writable<ISODate[]>([]);
export const parsedTracksContent = writable<Record<string, Track>>({});
export const floatCells = writable<Record<string, string>>({});

export function getFloatCell(tDate: ISODate, id: string): string {
	let cells: Record<string, string> = {};
	const key = `${tDate}::${id}`;
	const unsubscribe = floatCells.subscribe((value) => {
		cells = value;
	});
	unsubscribe();
	return cells[key] ?? "";
}

export function setFloatCell(tDate: ISODate, id: string, value: string): void {
	const key = `${tDate}::${id}`;
	floatCells.update((cells) => ({
		...cells,
		[key]: value,
	}));
}

function sortTemplateItems(template: Record<string, any> | undefined): Item[] {
	if (!template) return [];

	return Object.entries(template)
		.map(([id, meta]) => ({ id, meta }))
		.sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0));
}

export const compiledTemplateItems = derived(templates, ($templates) => {
	const sortedByDate: Record<ISODate, Item[]> = {};

	for (const [tDate, template] of Object.entries($templates)) {
		sortedByDate[tDate] = sortTemplateItems(template as Record<string, any>);
	}

	return sortedByDate;
});