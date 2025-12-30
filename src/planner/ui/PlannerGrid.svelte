<script lang="ts">
	import type { ISODate, TDate, Item, BlockMeta, ItemData, ItemID, ItemMeta } from "src/plugin/types";
	import EditableCell from "./EditableCell.svelte";
	import EmptyCell from "./EmptyCell.svelte";
	import HeaderCell from "./HeaderCell.svelte";

    interface Props {
        sortedTemplateDates: Record<TDate, Item[]>;
        blocksMeta: BlockMeta[];
        columns: number;
        parsedContent: Record<ISODate, Record<ItemID, ItemData>>;
        handleCellUpdate: (date: ISODate, itemId: ItemID, updatedData: ItemData) => void;
        addNewItemToCell: (date: ISODate, itemId: ItemID, itemMeta: ItemMeta) => void;
        openDailyNote: (date: ISODate) => void;
    }

    let { sortedTemplateDates, blocksMeta, columns, parsedContent, handleCellUpdate, addNewItemToCell, openDailyNote }: Props = $props();    
</script>

<div class="main-grid-container">
    {#each blocksMeta as {rows, dateTDateMapping} (dateTDateMapping)}
    <div class="block-container">
        <!-- Header Row -->
        <div class="header-row" style={`grid-template-columns: repeat(${columns}, 1fr);`}>
            {#each dateTDateMapping as {date} (date)}
            <HeaderCell {date} {openDailyNote} />
            {/each}
        </div>

        <!-- Data Grid -->
        <div class="data-grid" style={`grid-template-columns: repeat(${columns}, 1fr);`}>
        {#each {length: rows} as _, row (row)}
            {#each dateTDateMapping as {date, tDate: tDate}, col (col)}
            {@const {id, meta} = sortedTemplateDates[tDate][row]}

            {#if row < Object.keys(sortedTemplateDates[tDate]).length && tDate != ""}
            <div class="cell" style={`background-color: ${meta.color}10;`}>
                {#if (parsedContent[date] && parsedContent[date][id])}
                <EditableCell 
                    date={date}
                    showLabel={(col == 0 && meta.label !== "") || tDate == date}
                    itemMeta={meta}
                    itemId={id}
                    itemData={parsedContent[date][id]}
                    onUpdate={handleCellUpdate}
                />
                {:else}
                    <EmptyCell onClick={() => addNewItemToCell(date, id, meta)} label="+ Add" color={meta.color} />
                {/if}
            </div>
            {:else}
            <div class="cell">-</div>
            {/if}
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
			grid-auto-rows: minmax(40px, auto); 
	}

	.cell {
		padding: 4px;
		border-right: 1px dotted #ccc;
		border-bottom: 1px dashed #ccc;
		border-collapse: collapse;
		min-height: 40px; 
	}
</style>