import { derived, writable } from "svelte/store";
import type { ISODate, Item, Templates, Track } from "src/plugin/types";

export const templates = writable<Templates>({});
export const sortedTemplateDates = writable<ISODate[]>([]);

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