// PURPOSE: Provides tools to extract the desired section header and the information from the header section

import type { PlannerActions } from "src/planner/logic/itemActions";
import { formatProgressDuration, formatTime } from "src/plugin/helpers";
import type { DataService, Element, ISODate, ItemData, ItemID, LineInfo, Time } from "src/plugin/types";

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
    
    public static parseElementLine(line: string): Element {
		let text = line.replace(/^\s+- /, '');

	    let isTask = false;
		let taskStatus: ' ' | 'x' | '-' | undefined;
		let startTime: Time | undefined;
		let progress: number | undefined;
		let duration: number | undefined;
		let timeUnit: 'min' | 'hr' | undefined;

		const taskStatusRegex = /^\[([ x-])\]/;
		const startTimeRegex = /@\s*(\d{1,2}):(\d{2})/;
		const progressDurationRegex = /\[(?:(\d+)?(\/))?(\d+)\s*(hr|min)\]/;

		const taskStatusMatch = line.match(taskStatusRegex);
		if (taskStatusMatch) {
			const [fullMatch, checkmark] = taskStatusMatch;
			text = text.replace(fullMatch, '').trim();
			isTask = true;
			taskStatus = checkmark as typeof taskStatus;
		}

		const startTimeMatch = line.match(startTimeRegex);
		if (startTimeMatch) {
			const [fullMatch, hours, minutes] = startTimeMatch;
			text = text.replace(fullMatch, '').trim();
			startTime = { hours: parseInt(hours), minutes: parseInt(minutes) };
		}

		const progressDurationMatch = line.match(progressDurationRegex);
		if (progressDurationMatch) {
			const [fullMatch, progressMatch, hasProgress, durationMatch, unitMatch] = progressDurationMatch;
			text = text.replace(fullMatch, '');
			progress = hasProgress ? (parseInt(progressMatch) || 0) : undefined;
			duration = parseInt(durationMatch);
			timeUnit = unitMatch as 'min' | 'hr';
		}

		return {
			raw: line,
			text,
			children: [],
			isTask,
			taskStatus,
			startTime, 
			progress,
			duration,
			timeUnit,
		};
    }

    // Serialize an Element back to a string
    public static serializeElement(element: Element | Omit<Element, 'raw'>): string {
        let line = '\t- ';

		// Construct the raw string from the element properties when it is changed

		const { text, children, isTask, taskStatus, startTime, progress, duration, timeUnit } = element;

		if (isTask) 
			line += `[${taskStatus}] `
        
        line += text.trim();

		if (startTime)
			line += ' @ ' + formatTime(startTime);

		if (duration && timeUnit) 
			line += ' ' + formatProgressDuration(progress, duration, timeUnit);

		let result = line + `\n`;

		for (const child of children) {
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