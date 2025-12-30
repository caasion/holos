<script lang="ts">
	import { format, parseISO } from "date-fns";
	import { getISODate } from "src/plugin/helpers";
	import type { ISODate } from "src/plugin/types";

    interface ViewProps {
        date: ISODate;
        openDailyNote: (date: ISODate) => void;
    }

    let {date, openDailyNote} = $props();

    // Check if a date is today
	function isToday(date: ISODate): boolean {
		return date === getISODate(new Date());
	}
</script>

<div class="header-cell">
    <button 
        class="date-card" 
        class:today={isToday(date)}
        onclick={() => openDailyNote(date)}
        title="Click to open daily note"
    >
        <div class="dow-label">{format(parseISO(date), "E")}</div>
        <div class="date-label">{format(parseISO(date), "dd")}</div>
    </button>
</div>

<style>
    /* Table Header */
	.header-cell {
		padding: 8px;
		display: flex;
		justify-content: center;
		align-items: center;
		border-right: 1px solid #ccc; 
	}

	.header-cell:last-child {
		border-right: none;
	}

	.date-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background-color: var(--interactive-accent);
		opacity: 0.7;
		border-radius: 8px;
		padding: 4px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		transition: all 0.2s;
		border: none;
		cursor: pointer;
		width: 100%;
		height: 100%;
	}

	.date-card:hover {
		opacity: 1;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
		transform: translateY(-2px);
	}

	.date-card.today {
		opacity: 1;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
		border: 2px solid var(--text-accent);
	}

	.date-card.today:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.dow-label {
		text-align: center;
		font-size: 0.9em;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 4px;
		opacity: 0.9;
	}

	.date-label {
		text-align: center;
		font-size: 1.8em;
		font-weight: 700;
		color: white;
		line-height: 1;
	}
</style>