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

    static parseRRule(rrule: string): Set<number> {
        const dowToNum: Record<string, number> = {
            'MO': 1,
            'TU': 2,
            'WE': 3,
            'TH': 4,
            'FR': 5,
            'SA': 6,
            'SU': 7
        }

        console.log(rrule)

        const parts = rrule.split(';');
        if (!parts) return new Set([-1]);

        const [freqPart, dayPart] = parts;
        if (!dayPart) return new Set([-1]);

        const dayCode = dayPart.split('=')[1];
        if (!dayCode) return new Set([-1]);

        const days = dayCode.split(',').map(d => dowToNum[d]);

        return new Set(days);
    }
}
