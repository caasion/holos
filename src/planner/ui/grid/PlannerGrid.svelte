<script lang="ts">
	import type { ISODate, Track } from "src/plugin/types";
	import HeaderCell from "./HeaderCell.svelte";

    interface Props {
        dates: ISODate[];
        tracksByDate: Record<ISODate, string[]>;
        parsedTracks: Record<string, Track>;
        blocks: number;
        columns: number;
        openDailyNote: (date: ISODate) => void;
    }

    const ROWS = 5;

    let { dates, tracksByDate, parsedTracks, columns, blocks, openDailyNote }: Props = $props();    
</script>

<div class="main-grid-container">
    {#each {length: blocks} as _, block (block)} 
    {@const blockDates = dates.slice(block * columns, (block + 1) * columns)}
    <div class="block-container">
        <!-- Header Row -->
        <div class="header-row" style={`grid-template-columns: repeat(${columns}, 1fr);`}>
            {#each blockDates as date (date)}
            <HeaderCell {date} {openDailyNote} />
            {/each}
        </div>

        <!-- Data Grid -->
        <div class="data-grid" style={`grid-template-columns: repeat(${columns}, 1fr); grid-template-rows: repeat(${ROWS}, minmax(40px, auto)); grid-auto-flow: column;`}>
            {#each blockDates as date (date)}
            {#each {length: ROWS} as _, row (row)}
            {@const trackId = tracksByDate[date]?.[row]}
            {@const track = trackId ? parsedTracks[trackId] : undefined}

            <div class="cell">{track?.label ?? "-"}</div>
            {/each}
            {/each}
        </div>
    </div>
    {/each}
</div>

<style>
	/* Grid Layout */
	.main-grid-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.block-container {
		border: 1px solid #ccc; 
	}

	.header-row {
		display: grid;
		/* grid-template-columns is set dynamically in the Svelte component */
		border-bottom: 2px solid #ccc;
		padding: 8px 0;
		background-color: var(--background-primary);
	}

	.data-grid {
		display: grid;
		/* grid-template-columns is set dynamically in the Svelte component */
	}

	.cell {
		padding: 4px;
		border-right: 1px dotted #ccc;
		border-bottom: 1px dashed #ccc;
		border-collapse: collapse;
		min-height: 40px; 
	}
</style>