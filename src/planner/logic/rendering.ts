import type { BlockMeta, DataService, DateMapping, ISODate, Item, TDate } from "src/plugin/types";
import type { PlannerActions } from "./itemActions";

export function getDateMappings(dates: ISODate[], plannerActions: PlannerActions) {
    return dates.map(date => ({
			date,
			tDate: plannerActions.getTemplateDate(date)
		}))
}

export function getSortedTemplates(dateMappings: DateMapping[], data: DataService) {
    const obj: Record<TDate, Item[]> = {};

    const allTemplateDates = new Set(dateMappings.map(d => d.tDate));

    allTemplateDates.forEach(date => {
        if (date != "") return;
        
        const template = data.getTemplate(date); 
    
        const itemsArray: Item[] = Object.entries(template)
            .map(([id, meta]) => ({id,meta}))
            .sort((a, b) => a.meta.order - b.meta.order);

        obj[date] = itemsArray;	
    });

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