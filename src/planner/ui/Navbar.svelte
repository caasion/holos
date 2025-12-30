<script lang="ts">
	import { addDaysISO, getISODate } from "src/plugin/helpers";
	import type { HelperService, ISODate, PluginSettings } from "src/plugin/types";
    import { addDays } from "date-fns";

    interface ViewProps {
        goTo: (date: ISODate) => void;
        incrementAmount: number;

        label: string;
        anchor: ISODate;

        view: string;
        toggleView: () => void;
    }

    let {goTo, incrementAmount, label, anchor, view, toggleView}: ViewProps = $props();

    const today = getISODate(new Date());

	// Initialize an internal anchor (for the date input)
	let navBarAnchor = $state<ISODate>(anchor);
	
	// Keep internal anchor in sync
	$effect(() => {
		navBarAnchor = anchor;
	})

	$effect(() => {
		if (navBarAnchor !== anchor)
		goTo(navBarAnchor);
	})

</script>

<div class="header">
	<div class="nav-buttons">
		<button onclick={() => goTo(today)}>Today</button>
    	<button onclick={() => goTo(addDaysISO(anchor, -incrementAmount))}>&lt;</button>
		<button onclick={() => goTo(addDaysISO(anchor, incrementAmount))}>&gt;</button>
	</div>
	<div class="week">
		<span class="week-label">{label}</span>
		<input type="date" bind:value={navBarAnchor} />
	</div>
	<div class="view-switcher">
		<button onclick={toggleView}>{view}</button>
	</div>
</div>

<style>
		/* Navigation Menu */
	.header {
		display: grid;
    	grid-template-columns: 1fr 1fr 1fr;
	}

	.week {
		display: flex;
		justify-content: center; 
		position: relative;
	}

	.week-label {
		font-weight: 600;
		font-size: x-large;
		text-align: center;
		padding: .25rem .5rem;
		display: inline-block;
		pointer-events: none;  
	}

	.week input[type="date"] {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);

		width: 100%;
		height: 100%;
		z-index: 1;

		opacity: 0;
		cursor: pointer;
	}

	.week input[type="date"]::-webkit-calendar-picker-indicator {
		width: 100%;
		cursor: pointer;
	}

	.week input[type="date"]::-webkit-datetime-edit {
		display: none;
	}

	.view-switcher {
		display: flex;
		justify-content: flex-end;
	}
</style>