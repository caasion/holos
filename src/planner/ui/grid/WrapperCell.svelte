<script lang="ts">
	import type { ISODate, ItemData, ItemID, ItemMeta } from 'src/plugin/types';
    import EditableCell from './EditableCell.svelte';
    import EmptyCell from './EmptyCell.svelte';
    import { calculateTotalTimeSpent, formatTotalTime } from 'src/plugin/helpers';
    
    interface Props {
        date: ISODate;
        showLabel: boolean;
        itemMeta: ItemMeta;
        itemId: ItemID;
        itemData: ItemData | undefined;
        onUpdate: (date: ISODate, itemId: ItemID, updatedData: ItemData) => void;
        onAdd: (date: ISODate, itemId: ItemID, itemMeta: ItemMeta) => void;
    }
    
    let {date, showLabel, itemMeta, itemId, itemData, onUpdate, onAdd}: Props = $props();
    
    const totalTimeSpent = $derived(itemData ? calculateTotalTimeSpent(itemData.items) : 0);
    const totalTimeFormatted = $derived(formatTotalTime(totalTimeSpent));
</script>

<div class="cell" style={`background-color: ${itemMeta.color}10;`}>
{#if showLabel}
    <div class="row-label" style={`background-color: ${itemMeta.color}80; color: white;`}>
        {itemMeta.type == "calendar" ? "📅" : ""} {itemMeta.label}
        {#if totalTimeSpent > 0}
            <span class="time-total">({totalTimeFormatted})</span>
        {/if}
    </div>
{/if}

{#if itemData}
    <EditableCell {date} showLabel={false} {itemMeta} {itemId} {itemData} {onUpdate} />
{:else}
    <EmptyCell onAdd={() => onAdd(date, itemId, itemMeta)} label="+ Add" color={itemMeta.color} />
{/if}
</div>

<style>
    .row-label {
		padding: 4px 8px;
		border-radius: 4px;
		font-weight: 600;
		margin-bottom: 4px;
		font-size: 0.9em;
		width: fit-content;
	}

    .cell {
		padding: 4px;
		border-right: 1px dotted #ccc;
		border-bottom: 1px dashed #ccc;
		border-collapse: collapse;
		min-height: 40px; 
	}
</style>