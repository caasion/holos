<script lang="ts">
	import type { Element, ItemData, ItemID, ISODate, ItemType, ItemMeta } from "src/plugin/types";
	import TaskElement from "./TaskElement.svelte";
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from "svelte/animate";

	interface EditableCellProps {
		date: ISODate;
		showLabel: boolean;
		itemMeta: ItemMeta;
		itemId: ItemID;
		itemData: ItemData;
		onUpdate: (date: ISODate, itemId: ItemID, updatedData: ItemData) => void;
	}

	let { date, showLabel, itemMeta, itemData, onUpdate }: EditableCellProps = $props();

	function updateElement(index: number, updatedElement: Element) {
		const updatedItems = [...itemData.items];
		updatedItems[index] = updatedElement;

		const updatedData: ItemData = {
			...itemData,
			items: updatedItems
		};

		onUpdate(date, itemMeta.id, updatedData);
	}

	function toggleTask(index: number) {
		const updatedItems = [...itemData.items];
		const element = updatedItems[index];
		
		if (element.isTask) {
			updatedItems[index] = {
				...element,
				checked: !element.checked
			};

			const updatedData: ItemData = {
				...itemData,
				items: updatedItems
			};

			onUpdate(date, itemMeta.id, updatedData);
		}
	}

	function deleteElement(index: number) {
		const updatedItems = itemData.items.filter((_, i) => i !== index);
		
		const updatedData: ItemData = {
			...itemData,
			items: updatedItems
		};

		onUpdate(date, itemMeta.id, updatedData);
	}

	function addNewElement(isTask: boolean) {
		const newElement: Element = {
			raw: "",
			text: "",
			children: [],
			isTask: isTask,
		};

    items = [...items, { id: items.length, element: newElement }]

		const updatedData: ItemData = {
			...itemData,
			items: [...itemData.items, newElement]
		};

		onUpdate(date, itemMeta.id, updatedData);
	}

  /* Drag and Drop */

  let items = $state<any[]>([]);

  $effect(() => {
    items = itemData.items.map((element, index) => ({
      id: index, // Use index as unique ID for dnd
      element: element
    }));
  }) 

  function handleDndConsider(e: { detail: { items: any[]; }; }) {
    items = e.detail.items;
  }

  function handleDndFinalize(e: { detail: { items: any[]; }; }) {
    items = e.detail.items;
    
    // Update the actual itemData with the new order
    const reorderedElements = items.map(item => item.element);
    const updatedData: ItemData = {
      ...itemData,
      items: reorderedElements
    };
    
    onUpdate(date, itemMeta.id, updatedData);
  }

</script>

<div class="editable-cell">
	{#if showLabel}
		<div class="row-label" style={`background-color: ${itemMeta.color}80; color: white;`}>{itemMeta.type == "calendar" ? "📅" : ""} {itemMeta.label}</div>
	{/if}
  <div 
    class="elements-container"
    use:dndzone={{
      items,
      flipDurationMs: 200,
      dropTargetStyle: { outline: `1px dashed ${itemMeta.color}`, background: `${itemMeta.color}15` }
    }}
    onconsider={handleDndConsider}
    onfinalize={handleDndFinalize}
  >
	{#each items as {id, element}, index (id)}
    <div animate:flip={{ duration: 200 }}>
      <TaskElement 
        {element}
        {index}
        {itemMeta}
        onUpdate={updateElement}
        onDelete={deleteElement}
        onToggle={toggleTask}
      />
    </div>
		
	{/each}
  </div>
    <div class="add-btn-container">
        <button class="add-btn" onclick={() => addNewElement(false)}>+ Add Event</button>
        <button class="add-btn" onclick={() => addNewElement(true)}>+ Add Task</button>
    </div>
	
</div>

<style>
	.editable-cell {
		min-height: 40px;
		width: 100%;
	}

	.add-btn-container {
		display: flex;
	}

	.add-btn {
		width: 100%;
		padding: 4px;
		margin-top: 4px;
		background: transparent;
		border: 1px dashed var(--background-modifier-border);
		color: var(--text-muted);
		cursor: pointer;
		border-radius: 2px;
		font-size: 0.9em;
	}

	.add-btn:hover {
		background-color: var(--background-modifier-hover);
		border-color: var(--interactive-accent);
		color: var(--text-normal);
	}

	.row-label {
		padding: 4px 8px;
		border-radius: 4px;
		font-weight: 600;
		margin-bottom: 4px;
		font-size: 0.9em;
		width: fit-content;
	}
</style>
