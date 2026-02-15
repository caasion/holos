export class RRuleService {
    // Format rrule to human-readable format
    static formatRRule(rrule: string): string {
        try {
            const parts = rrule.split(';');
            let frequency = '';
            let days = '';

            for (const part of parts) {
                if (part.startsWith('FREQ=')) {
                    frequency = part.split('=')[1].toLowerCase();
                } else if (part.startsWith('BYDAY=')) {
                    const dayCode = part.split('=')[1];
                    days = RRuleService.formatDays(dayCode);
                }
            }

            if (frequency === 'daily' && !days) {
                return 'Every day';
            } else if (frequency === 'daily' && days) {
                return days;
            } else if (frequency === 'weekly') {
                return days || 'Weekly';
            } else if (frequency === 'monthly') {
                return 'Monthly';
            }

            return rrule; // Fallback to raw rrule
        } catch (e) {
            return rrule;
        }
    }

    static formatDays(dayCode: string): string {
        const dayMap: Record<string, string> = {
            'MO': 'Mon',
            'TU': 'Tue',
            'WE': 'Wed',
            'TH': 'Thu',
            'FR': 'Fri',
            'SA': 'Sat',
            'SU': 'Sun'
        };

        const days = dayCode.split(',').map(d => dayMap[d] || d);

        if (days.length === 7) {
            return 'Every day';
        } else if (days.length === 5 && !days.includes('Sat') && !days.includes('Sun')) {
            return 'Weekdays';
        } else if (days.length === 2 && days.includes('Sat') && days.includes('Sun')) {
            return 'Weekends';
        } else {
            return days.join(', ');
        }
    }

    static serializeRRule(selectedDays: Set<number>): string {
        const dayOfWeekMap: Record<number, string> = {
            1: 'MO',
            2: 'TU',
            3: 'WE',
            4: 'TH',
            5: 'FR',
            6: 'SA',
            7: 'SU'
        }

        const days = [...selectedDays].map(d => dayOfWeekMap[d]);

        return `FREQ=DAILY;BYDAY=${days.join(',')}`
    }

    static parseRRule(readableRRule: string): string {
        // Normalize to lowercase for case-insensitive matching
        const normalized = readableRRule.toLowerCase().trim();
        
        const dayMap: Record<string, string> = {
            'mo': 'MO',
            'tu': 'TU',
            'we': 'WE',
            'th': 'TH',
            'fr': 'FR',
            'sa': 'SA',
            'su': 'SU'
        };

        // Handle special cases first
        if (normalized === 'weekday' || normalized === 'weekdays') {
            return 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR';
        }
        if (normalized === 'weekend' || normalized === 'weekends') {
            return 'FREQ=DAILY;BYDAY=SA,SU';
        }

        // Parse individual days
        // Split by comma and process each day
        const dayPattern = /\b([a-z]{2,})[a-z]*/gi;
        const matches = normalized.matchAll(dayPattern);
        const days: string[] = [];

        for (const match of matches) {
            const dayStr = match[1].toLowerCase();
            
            // Check for weekday/weekend again in context
            if (dayStr.startsWith('weekday')) {
                days.push('MO', 'TU', 'WE', 'TH', 'FR');
                continue;
            }
            if (dayStr.startsWith('weekend')) {
                days.push('SA', 'SU');
                continue;
            }

            // Match first 2 characters for day names
            const first2 = dayStr.substring(0, 2);
            if (dayMap[first2]) {
                days.push(dayMap[first2]);
            }
        }

        // Remove duplicates and return
        const uniqueDays = [...new Set(days)];
        
        if (uniqueDays.length === 0) {
            // Default to daily if no days parsed
            return 'FREQ=DAILY';
        }

        return `FREQ=DAILY;BYDAY=${uniqueDays.join(',')}`;
    }
}
