<script lang="ts">
	import type { Element, ItemData, ItemID, ISODate, ItemType, ItemMeta } from "src/plugin/types";
	import TaskElement from "./TaskElement.svelte";
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from "svelte/animate";
	import { reconstructRawText } from "src/plugin/helpers";

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
		
		// Reconstruct raw text from element properties
		const raw = reconstructRawText(
			updatedElement.text,
			updatedElement.isTask,
			updatedElement.taskStatus,
			updatedElement.startTime,
			updatedElement.progress,
			updatedElement.duration,
			updatedElement.timeUnit
		);
		
		updatedItems[index] = {
			...updatedElement,
			raw
		};

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
			const newTaskStatus = element.taskStatus == ' ' ? 'x' : ' ';
			
			// Reconstruct raw text with new task status
			const raw = reconstructRawText(
				element.text,
				element.isTask,
				newTaskStatus,
				element.startTime,
				element.progress,
				element.duration,
				element.timeUnit
			);
			
			updatedItems[index] = {
				...element,
				taskStatus: newTaskStatus,
				raw
			};

			const updatedData: ItemData = {
				...itemData,
				items: updatedItems
			};

			onUpdate(date, itemMeta.id, updatedData);
		}
	}

	function cancelTask(index: number) {
		const updatedItems = [...itemData.items];
		const element = updatedItems[index];
		
		if (element.isTask) {
			const newTaskStatus = '-';
			
			// Reconstruct raw text with new task status
			const raw = reconstructRawText(
				element.text,
				element.isTask,
				newTaskStatus,
				element.startTime,
				element.progress,
				element.duration,
				element.timeUnit
			);
			
			updatedItems[index] = {
				...element,
				taskStatus: newTaskStatus,
				raw
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

		const updatedData: ItemData = {
			...itemData,
			items: [...itemData.items, newElement]
		};

		onUpdate(date, itemMeta.id, updatedData);
	}

  /* Drag and Drop */
  let items = $state<any[]>([]);
  let elementToId = $state(new Map<Element, number>());
  let nextId = $state(0);

  $effect(() => {
	const currentElements = new Set(items.map(item => item.element));
	const newElements = itemData.items.filter(el => !currentElements.has(el));
	
	if (newElements.length > 0 || items.length === 0) {
		const newItems = itemData.items.map((element) => {
			const existingItem = items.find(item => item.element === element);
			if (existingItem) {
				return existingItem;
			}
			
			if (!elementToId.has(element)) {
				elementToId.set(element, nextId++);
			}
			return {
				id: elementToId.get(element)!,
				element: element
			};
		});
		items = newItems;
	}
	});

  function handleDndConsider(e: { detail: { items: any[]; }; }) {
    items = e.detail.items;
  }

  function handleDndFinalize(e: { detail: { items: any[]; }; }) {
    items = e.detail.items;
    
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
				onCancel={cancelTask}
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
  
  .elements-container {
    min-height: 1em;
  }
</style>
