// PURPOSE: Provides tools to extract the desired section header and the information from the header section

import { formatProgressDuration, formatTime } from "src/plugin/helpers";
import type { DataService, Element, Habit, ISODate, ItemData, ItemID, LineInfo, Time } from "src/plugin/types";
import type { TemplateActions } from "src/templates/templateActions";

export interface ParserDeps {
	data: DataService;
	plannerActions: TemplateActions | null;
}

export class PlannerParser {
	private data: DataService;
	private plannerActions: TemplateActions | null;

	constructor(deps: ParserDeps) {
		this.data = deps.data;
		this.plannerActions = deps.plannerActions;
	}

    // ===== Reading - Extraction ===== //

    static extractFirstSection(content: string): string {
        const lines = content.replace(/^---[\s\S]*?---\s*/, '').split('\n');
        let sectionLines: string[] = [];

        for (const line of lines) {
            const headerMatch = line.match(/^(#{1,6})\s+(.*)/);

            if (headerMatch) break;

            sectionLines.push(line);
        }

        return sectionLines.join('\n')
        
    }

    static extractSection(content: string, headerText: string): string {
        const lines = content.split('\n');
        let sectionLines: string[] = [];
        let inSection = false;
        let currentLevel = 0;

        for (const line of lines) {
            // Detect header of any level
            const headerMatch = line.match(/^(#{1,6})\s+(.*)/);

            if (headerMatch) {
                const level = headerMatch[1].length;
                const text = headerMatch[2].trim();

                if (inSection && level <= currentLevel) break;

                if (text === headerText) {
                    inSection = true;
                    currentLevel = level;
                    continue;
                }
            }
            
            if (inSection) sectionLines.push(line);
        }
        return sectionLines.join('\n');
    }

    // ===== Reading - Parsing ===== //

    static parseJournalSection(section: string): Record<string, string> {
        const lines = section.split('\n');
        const journalData: Record<string, string> = {};
        let currJournal: string | null = null;
        let currJournalData: string[] = [];

        for (const line of lines) {
            // Skip empty lines or lines that aren't bullet points
			if (!line || !line.match(/^\t*- /)) continue;

            if (line.match(/^- /)) {
                if (currJournal && currJournalData) journalData[currJournal] = currJournalData.join('\n');
                if (currJournal && !currJournalData) journalData[currJournal] = "";

                currJournal = null;
                currJournalData = [];
                
                let text = line.replace(/^- /, '').trim();
                currJournal = text;
            } else if (line.match(/^\t+- /)) {
                if (!currJournal) continue;

                let text = line.replace(/^\t- /, '').trim();
                currJournalData.push(text);
            }
        }

        if (currJournal) journalData[currJournal] = currJournalData.join('\n');

        return journalData;
    }

    static parseHabitSection(section: string): Record<string, { id: string; label: string; rrule: string }> {
        const lines = section.split('\n');
        const habits: Record<string, { id: string; label: string; rrule: string }> = {};

        for (const line of lines) {
            // Skip empty lines or lines that aren't bullet points
            if (!line || !line.match(/^- /)) continue;

            let text = line.replace(/^- /, '').trim();
            
            // Extract rrule from pattern: Label (FREQ=DAILY;BYDAY=MO,WE,FR)
            const rruleMatch = text.match(/\(([^)]+)\)$/);
            let rrule = "";
            
            if (rruleMatch) {
                rrule = rruleMatch[1];
                text = text.replace(rruleMatch[0], '').trim();
            }

            // Generate ID from label (lowercase, replace spaces with hyphens)
            const id = 'habit-' + crypto.randomUUID();
            
            habits[id] = {
                id,
                label: text,
                rrule
            };
        }

        return habits;
    }

    static parseDataSection(section: string): Element[] {
        const lines = section.split('\n');
        const data: Element[] = [];
        let currentElement: Element | null = null;

        for (const line of lines) {
            // Skip empty lines
            if (!line.trim()) continue;

            // Top-level element (no tabs or single-level tabs)
            if (line.match(/^\t?- /)) {
                // Push previous element if exists
                if (currentElement) {
                    data.push(currentElement);
                }
                
                // Parse new element
                currentElement = PlannerParser.parseElementLine(line);
            } else if (line.match(/^\t\t- /) && currentElement) {
                // Child item
                const text = line.replace(/^\t\t- /, '').trim();
                currentElement.children.push(text);
            }
        }

        // Push last element
        if (currentElement) {
            data.push(currentElement);
        }

        return data;
    }
    
    parseSection(date: ISODate, section: string): Record<ItemID, ItemData> {
	    const lines = section.split('\n');
		const itemData: Record<ItemID, ItemData> = {};
		let currItem: ItemData | null = null;
		let currElement: Element | null = null; 
		
		for (let line of lines) {
			// Skip empty lines or lines that aren't bullet points
			if (!line || !line.match(/^\t*- /)) continue;
			
			// If the line starts with a bullet point with no tab, then start a new item.
			if (line.match(/^- /)) { 
				// Push the old element or item if it exists
				if (currElement && currItem) currItem.items.push(currElement);
				if (currItem) itemData[currItem.id] = currItem;
				
				// Prepare for new item: reset & initialize
				currElement = null;
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
				
				const templateDate = this.plannerActions?.getTemplateDate(date) ?? date;
				currItem = {
					id: this.data.getItemFromLabel(templateDate, text),
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
    
    static parseElementLine(line: string): Element {
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

		const taskStatusMatch = text.match(taskStatusRegex);
		if (taskStatusMatch) {
			const [fullMatch, checkmark] = taskStatusMatch;
			text = text.replace(fullMatch, '').trim();
			isTask = true;
			taskStatus = checkmark as typeof taskStatus;
		}

		const startTimeMatch = text.match(startTimeRegex);
		if (startTimeMatch) {
			const [fullMatch, hours, minutes] = startTimeMatch;
			text = text.replace(fullMatch, '').trim();
			startTime = { hours: parseInt(hours), minutes: parseInt(minutes) };
		}

		const progressDurationMatch = text.match(progressDurationRegex);
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

    // ===== Writing - Serialization ===== // 

    // Serialize an Element back to a string
    static serializeElement(element: Element | Omit<Element, 'raw'>): string {
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
    serializeSection(date: ISODate, items: Record<ItemID, ItemData>): string {
        const templateDate = this.plannerActions?.getTemplateDate(date) ?? date;
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

    static serializeHabits(habits: Record<string, Habit>): string {
            let result = '';
            for (const habit of Object.values(habits)) {
                const rruleStr = habit.rrule ? ` (${habit.rrule})` : '';
                result += `- ${habit.label}${rruleStr}\n`;
            }
            return result;
        }

    // ===== Writing - Replacing ===== //
    
    // Replace a section in the full file content
    static replaceSection(content: string, sectionHeading: string, newSectionContent: string): string {
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

    static replaceFirstSection(content: string, newSectionContent: string) {
        const lines = content.split('\n');
        let result: string[] = [];
        let frontmatterEnd = -1;
        let inFrontmatter = false;
        
        // Find frontmatter end
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === '---') {
                if (!inFrontmatter) {
                    inFrontmatter = true;
                } else {
                    frontmatterEnd = i;
                    break;
                }
            }
        }
        
        if (frontmatterEnd === -1) {
            console.warn('No frontmatter found');
            return content;
        }
        
        // Add frontmatter
        result.push(...lines.slice(0, frontmatterEnd + 1));
        result.push('');
        
        // Add new description
        result.push(newDescription);
        result.push('');
        
        // Find and add first section (and everything after)
        let firstSectionIndex = -1;
        for (let i = frontmatterEnd + 1; i < lines.length; i++) {
            if (lines[i].match(/^#{1,6}\s+/)) {
                firstSectionIndex = i;
                break;
            }
        }
        
        if (firstSectionIndex !== -1) {
            result.push(...lines.slice(firstSectionIndex));
        }
        
        return result.join('\n');
    }
}