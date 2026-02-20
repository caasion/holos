import type { BlockMeta, DateMapping, ISODate, Item, TDate } from "src/plugin/types";

export function getDateMappings(dates: ISODate[], sortedTemplateDates: TDate[]) {
    if (dates.length === 0) return [];

    let templateIndex = 0;
    let currentTemplateDate: TDate = "";
    const mappings: DateMapping[] = [];

    for (const date of dates) {
        while (
            templateIndex < sortedTemplateDates.length &&
            sortedTemplateDates[templateIndex] <= date
        ) {
            currentTemplateDate = sortedTemplateDates[templateIndex];
            templateIndex++;
        }

        mappings.push({
            date,
            tDate: currentTemplateDate,
        });
    }

    return obj;
}

export function getBlocksMeta(blocks: number, columns: number, dateMappings: DateMapping[], sortedTemplates: Record<TDate, Item[]>) {
    let meta: BlockMeta[] = [];
		
    for (let i = 0; i < blocks; i++) {
        // Slice date mappings to only the dates that exist in the current block
        const columnChunk: DateMapping[] = dateMappings.slice(columns * i, columns * (i + 1));
        const templateLengths = columnChunk.map(({ tDate }) => 
            tDate !== "" ? sortedTemplates[tDate]?.length ?? 0 : 0
        );

        meta.push({
            rows: Math.max(...templateLengths, 0),
            dateTDateMapping: columnChunk,
        });
    }

    return meta;
}