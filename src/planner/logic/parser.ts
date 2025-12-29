// PURPOSE: Provides tools to extract the desired section header and the information from the header section

import type { PlannerActions } from "src/planner/logic/itemActions";
import type { DataService, Element, ISODate, ItemData, ItemID, LineInfo } from "src/plugin/types";

export interface ParserDeps {
	data: DataService;
	plannerActions: PlannerActions;
}

export class PlannerParser {
	private data: DataService;
	private plannerActions: PlannerActions;

	constructor(deps: ParserDeps) {
		this.data = deps.data;
		this.plannerActions = deps.plannerActions;
	}

    static extractSection(content: string, sectionHeading: string): string {
        const lines = content.split('\n');
        let sectionLines: string = "";
        let inSection = false;

        for (const line of lines) {
            // Check if we hit our target heading
            if (line.trim() === `## ${sectionHeading}`) {
                inSection = true;
                continue;
            }
            // If we hit another heading of the same or higher level, stop
            if (inSection && line.startsWith('##')) break; 
            
            if (inSection) sectionLines += `\n${line}`;
        }
        return sectionLines;
    }
    
    public parseSection(date: ISODate, section: string): Record<ItemID, ItemData> {
	    const lines = section.split('\n');
		const itemData: Record<ItemID, ItemData> = {};
		let currItem: ItemData | null = null;
		let currElement: Element | null = null; 
		
		for (let line of lines) {
			// Skip empty lines or lines that aren't bullet points
			if (!line || !line.match(/^\t*- /)) continue;
			
			// If the line starts with a bullet point with no tab, then start a new item.
			if (line.match(/^- /)) { 
                // Push the old element if it exists
				if (currElement && currItem) currItem.items.push(currElement);

				// Push the old item if it exists
				if (currItem) itemData[currItem.id] = currItem;
				
				// Reset for new item
				currElement = null;
				
				// Initialize the new item
				let text = line.replace(/^- (\[.\] )?/, '').trim();
				
				// Parse time commitment from pattern: Action Item (2 hr|30 mins)
				let timeCommitment = 60; // default
				const timeMatch = text.match(/\((\d+)\s*(h|hr|hrs|m|min|mins)\)/);
				if (timeMatch) {
					const [fullMatch, rawDuration, units] = timeMatch;
					const duration = parseInt(rawDuration);
					// Convert to minutes
					timeCommitment = units.startsWith('h') ? duration * 60 : duration;
					// Remove the time commitment from the text
					text = text.replace(fullMatch, '').trim();
				}
				
				currItem = {
					id: this.data.getItemFromLabel(this.plannerActions.getTemplateDate(date), text),
					time: timeCommitment,
					items: [],
				}
				
			} else if (line.match(/^\t- /)) {
				// Push the old element if it exists
				if (currElement && currItem) currItem.items.push(currElement);
				
				// Initialize the new element
				currElement = PlannerParser.parseElementLine(line);
				
			} else if (line.match(/^\t\t- /)) {
				if (currElement) {
					const text = line.replace(/^\t\t- /, '').trim();
					currElement.children.push(text);
				}
			}
		}

        // Push the old element if it exists
        if (currElement && currItem) currItem.items.push(currElement);

        // Push the old item if it exists
        if (currItem) itemData[currItem.id] = currItem;

        return itemData;
    }
    
    private static parseElementLine(line: string): Element {
	    // Try to match with time information
	    const withTimeMatch = line.match(/^\t(- \[(.?)\] |- )(.*?) @ (.*)/);
	    
	    if (withTimeMatch) {
	        const [, id, checkmark, text, timeStr] = withTimeMatch;
	        
	        // Parse time: format like "10:00 (2 hr)" or "12:00 (30 min)" or just "10:00"
	        const timeWithDurationMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*\((\d+)\s*(h|hr|hrs|m|min|mins)\)/);
	        const timeOnlyMatch = timeStr.match(/(\d{1,2}):(\d{2})$/);
	        
	        const element: Element = {
	            raw: line,
	            text: text.trim(),
	            children: [],
	            isTask: id.includes('[ ]') || id.includes('[x]'),
	            checked: id.includes('[x]'),
	        };
	        
	        if (timeWithDurationMatch) {
	            const [, hours, minutes, rawDuration, units] = timeWithDurationMatch;
	            element.startTime = { hours: parseInt(hours), minutes: parseInt(minutes) };
	            element.duration = parseInt(rawDuration);
	            element.durationUnit = units.startsWith('h') ? 'hr' : 'min';
	        } else if (timeOnlyMatch) {
	            const [, hours, minutes] = timeOnlyMatch;
	            element.startTime = { hours: parseInt(hours), minutes: parseInt(minutes) };
	        }
	        
	        return element;
	    }
	    
	    // Try to match with start time only (no duration) - fallback if @ doesn't have time after it
	    const startTimeOnlyMatch = line.match(/^\t(- \[(.?)\] |- )(.*?) @ (\d{1,2}):(\d{2})$/);
	    
	    if (startTimeOnlyMatch) {
	        const [, id, checkmark, text, hours, minutes] = startTimeOnlyMatch;
	        return {
	            raw: line,
	            text: text.trim(),
	            children: [],
	            isTask: id.includes('[ ]') || id.includes('[x]'),
	            checked: id.includes('[x]'),
	            startTime: { hours: parseInt(hours), minutes: parseInt(minutes) },
	        };
	    }
	    
	    // Try to match with duration only (no start time)
	    const durationOnlyMatch = line.match(/^\t(- \[(.?)\] |- )(.*?)\s*\((\d+)\s*(h|hr|hrs|m|min|mins)\)/);
	    
	    if (durationOnlyMatch) {
	        const [, id, checkmark, text, rawDuration, units] = durationOnlyMatch;
	        return {
	            raw: line,
	            text: text.trim(),
	            children: [],
	            isTask: id.includes('[ ]') || id.includes('[x]'),
	            checked: id.includes('[x]'),
	            duration: parseInt(rawDuration),
	            durationUnit: units.startsWith('h') ? 'hr' : 'min',
	        };
	    }
	    
	    // Handle without time information
	    const noTimeMatch = line.match(/^\t(- \[(.?)\] |- )(.*)/);
	    
	    if (noTimeMatch) {
	        const [, id, checkmark, text] = noTimeMatch;
	        return {
	            raw: line,
	            text: text.trim(),
	            children: [],
	            isTask: id.includes('[ ]') || id.includes('[x]'),
	            checked: id.includes('[x]'),
	        };
	    }
	    
	    // Fallback for malformed lines
	    return {
	        raw: line,
	        text: line.replace(/^\t- /, '').trim(),
	        children: [],
	        isTask: false,
	    };
    }

    // Serialize an Element back to a string
    private static serializeElement(element: Element): string {
        let line = '\t';
        
        // Add task checkbox if needed
        if (element.isTask) {
            line += element.checked ? '- [x] ' : '- [ ] ';
        } else {
            line += '- ';
        }
        
        // Add text
        line += element.text;
        
        // Add time information if available
        if (element.startTime && element.duration && element.durationUnit) {
            const hours = element.startTime.hours.toString().padStart(2, '0');
            const minutes = element.startTime.minutes.toString().padStart(2, '0');
            line += ` @ ${hours}:${minutes} (${element.duration} ${element.durationUnit})`;
        } else if (element.startTime) {
            const hours = element.startTime.hours.toString().padStart(2, '0');
            const minutes = element.startTime.minutes.toString().padStart(2, '0');
            line += ` @ ${hours}:${minutes}`;
        } else if (element.duration && element.durationUnit) {
            line += ` (${element.duration} ${element.durationUnit})`;
        }
        
        let result = line + '\n';
        
        // Add children
        for (const child of element.children) {
            result += `\t\t- ${child}\n`;
        }
        
        return result;
    }
    
    // Serialize a single ItemData back to string
    private static serializeItem(itemMeta: any, itemData: ItemData): string {
        let result = '';
        
        // Add item header with label
        result += `- ${itemMeta.label}`;
        
        // Add time commitment if not default (60 minutes)
        if (itemData.time && itemData.time !== 60) {
            if (itemData.time % 60 === 0) {
                // Display in hours if it's a whole number of hours
                result += ` (${itemData.time / 60} hr)`;
            } else {
                // Display in minutes
                result += ` (${itemData.time} min)`;
            }
        }
        
        result += '\n';
        
        // Add all elements
        for (const element of itemData.items) {
            result += PlannerParser.serializeElement(element);
        }
        
        return result;
    }
    
    // Serialize entire section back to string
    public serializeSection(date: ISODate, items: Record<ItemID, ItemData>): string {
        const templateDate = this.plannerActions.getTemplateDate(date);
        const template = this.data.getTemplate(templateDate);
        
        // Sort items by order from template
        const sortedItemIds = Object.keys(items).sort((a, b) => {
            const orderA = template[a]?.order ?? 999;
            const orderB = template[b]?.order ?? 999;
            return orderA - orderB;
        });
        
        let result = '';
        
        for (const itemId of sortedItemIds) {
            const itemMeta = template[itemId];
            const itemData = items[itemId];
            
            if (itemMeta && itemData) {
                result += PlannerParser.serializeItem(itemMeta, itemData);
            }
        }
        
        return result;
    }
    
    // Replace a section in the full file content
    public static replaceSection(content: string, sectionHeading: string, newSectionContent: string): string {
        const lines = content.split('\n');
        let result: string[] = [];
        let inSection = false;
        let sectionAdded = false;
        
        for (const line of lines) {
            // Check if we hit our target heading
            if (line.trim() === `## ${sectionHeading}`) {
                result.push(line);
                result.push(newSectionContent);
                inSection = true;
                sectionAdded = true;
                continue;
            }
            
            // If we hit another heading of the same or higher level, stop skipping
            if (inSection && line.startsWith('##')) {
                inSection = false;
            }
            
            // Skip lines that are in the section (they'll be replaced)
            if (inSection) continue;
            
            result.push(line);
        }
        
        // If section wasn't found, add it at the end
        if (!sectionAdded) {
            result.push('');
            result.push(`## ${sectionHeading}`);
            result.push(newSectionContent);
        }
        
        return result.join('\n');
    }
}