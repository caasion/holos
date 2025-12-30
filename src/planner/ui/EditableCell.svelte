<script lang="ts">
	import type { Element, ItemData, ItemID, ISODate, ItemType, ItemMeta } from "src/plugin/types";
	import CircularProgress from "./CircularProgress.svelte";

	interface EditableCellProps {
		date: ISODate;
		showLabel: boolean;
		itemMeta: ItemMeta;
		itemId: ItemID;
		itemData: ItemData;
		onUpdate: (date: ISODate, itemId: ItemID, updatedData: ItemData) => void;
	}

	let { date, showLabel, itemMeta, itemData, onUpdate }: EditableCellProps = $props();

	let isEditing = $state<boolean>(false);
	let editingIndex = $state<number | null>(null);
	let editText = $state<string>("");
    

	function startEdit(index: number, element: Element) {
        isEditing = true;
        editingIndex = index;
        
        // Build the raw text including time info
        editText = element.text;
        
        // Add task duration tracking if available
        if (element.taskProgress !== undefined && element.taskUnit) {
            if (element.taskLimit !== undefined) {
                editText += ` [${element.taskProgress}/${element.taskLimit} ${element.taskUnit}]`;
            } else {
                editText += ` [${element.taskProgress}/ ${element.taskUnit}]`;
            }
        }
        
        if (element.startTime && element.duration && element.durationUnit) {
            const hours = element.startTime.hours.toString().padStart(2, '0');
            const minutes = element.startTime.minutes.toString().padStart(2, '0');
            editText += ` @ ${hours}:${minutes} (${element.duration} ${element.durationUnit})`;
        } else if (element.startTime) {
            const hours = element.startTime.hours.toString().padStart(2, '0');
            const minutes = element.startTime.minutes.toString().padStart(2, '0');
            editText += ` @ ${hours}:${minutes}`;
        } else if (element.duration && element.durationUnit) {
            editText += ` (${element.duration} ${element.durationUnit})`;
        }
    }

	function cancelEdit() {
		isEditing = false;
		editingIndex = null;
		editText = "";
	}

	function saveEdit(index: number) {
		if (editText.trim() === "") {
			cancelEdit();
			return;
		}

		const updatedItems = [...itemData.items];
		
		// Parse the text for task duration: [X/Y hr] or [X/Y min] or [X/ hr]
		let textWithoutTaskDuration = editText;
		let taskProgress: number | undefined;
		let taskLimit: number | undefined;
		let taskUnit: 'min' | 'hr' | undefined;
		
		const taskDurationMatch = textWithoutTaskDuration.match(/\[(\d+)\/\s*(\d*)\s*(hr|min)\]/);
		if (taskDurationMatch) {
			const [fullMatch, progress, limit, unit] = taskDurationMatch;
			taskProgress = parseInt(progress);
			taskLimit = limit ? parseInt(limit) : undefined;
			taskUnit = unit as 'min' | 'hr';
			textWithoutTaskDuration = textWithoutTaskDuration.replace(fullMatch, '').trim();
		} else {
			// Handle [/Y hr] or [/Y min] and refactor to [0/Y hr]
			const incompleteMatch = textWithoutTaskDuration.match(/\[\/\s*(\d+)\s*(hr|min)\]/);
			if (incompleteMatch) {
				const [fullMatch, limit, unit] = incompleteMatch;
				taskProgress = 0;
				taskLimit = parseInt(limit);
				taskUnit = unit as 'min' | 'hr';
				textWithoutTaskDuration = textWithoutTaskDuration.replace(fullMatch, '').trim();
			}
		}
		
		// Parse the text for time info: "Task @ 10:00 (2 hr)", "Task @ 10:00", or "Task (2 hr)"
		const withFullTimeMatch = textWithoutTaskDuration.match(/(.*?) @ (\d{1,2}):(\d{2})\s*\((\d+)\s*(h|hr|hrs|m|min|mins)\)/);
		const withStartTimeMatch = textWithoutTaskDuration.match(/(.*?) @ (\d{1,2}):(\d{2})/);
		const withDurationMatch = textWithoutTaskDuration.match(/(.*?)\s*\((\d+)\s*(h|hr|hrs|m|min|mins)\)/);
		
		const updatedElement: Element = {
			...updatedItems[index]
		};
		
		if (withFullTimeMatch) {
			const [, text, hours, minutes, rawDuration, units] = withFullTimeMatch;
			updatedElement.text = text.trim();
			updatedElement.startTime = { hours: parseInt(hours), minutes: parseInt(minutes) };
			updatedElement.duration = parseInt(rawDuration);
			updatedElement.durationUnit = units.startsWith('h') ? 'hr' : 'min';
		} else if (withStartTimeMatch) {
			const [, text, hours, minutes] = withStartTimeMatch;
			updatedElement.text = text.trim();
			updatedElement.startTime = { hours: parseInt(hours), minutes: parseInt(minutes) };
			delete updatedElement.duration;
			delete updatedElement.durationUnit;
		} else if (withDurationMatch) {
			const [, text, rawDuration, units] = withDurationMatch;
			updatedElement.text = text.trim();
			delete updatedElement.startTime;
			updatedElement.duration = parseInt(rawDuration);
			updatedElement.durationUnit = units.startsWith('h') ? 'hr' : 'min';
		} else {
			// No time info
			updatedElement.text = textWithoutTaskDuration.trim();
			delete updatedElement.startTime;
			delete updatedElement.duration;
			delete updatedElement.durationUnit;
		}
		
		// Set task duration tracking
		if (taskProgress !== undefined) {
			updatedElement.taskProgress = taskProgress;
			updatedElement.taskLimit = taskLimit;
			updatedElement.taskUnit = taskUnit;
		} else {
			delete updatedElement.taskProgress;
			delete updatedElement.taskLimit;
			delete updatedElement.taskUnit;
		}
		
		updatedItems[index] = updatedElement;

		const updatedData: ItemData = {
			...itemData,
			items: updatedItems
		};

		onUpdate(date, itemMeta.id, updatedData);
		cancelEdit();
	}

	function handleKeydown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			saveEdit(index);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEdit();
		}
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

		const updatedData: ItemData = {
			...itemData,
			items: [...itemData.items, newElement]
		};

		onUpdate(date, itemMeta.id, updatedData);
		
		// Start editing the new element
		setTimeout(() => {
			startEdit(itemData.items.length, newElement);
		}, 10);
	}
</script>

<div class="editable-cell">
	{#each itemData.items as element, index}
		<div class="element-row">
			{#if isEditing && editingIndex === index}
                {#if element.isTask}
                    <input
                        type="checkbox"
                        checked={element.checked}
                        onchange={() => toggleTask(index)}
                        class="task-checkbox"
                    />
                {/if}
				<input
					type="text"
					bind:value={editText}
					onkeydown={(e) => handleKeydown(e, index)}
					onblur={() => saveEdit(index)}
					class="element-input"
				/>
			{:else}
				<div class="element-content" ondblclick={() => startEdit(index, element)} role="button" tabindex="0">
					{#if element.isTask}
						<input
							type="checkbox"
							checked={element.checked}
							onchange={() => toggleTask(index)}
							class="task-checkbox"
						/>
					{/if}
					<span class:checked={element.checked}>{element.text}</span>
					{#if element.taskProgress !== undefined && element.taskUnit}
						<CircularProgress 
							progress={element.taskProgress} 
							limit={element.taskLimit} 
							unit={element.taskUnit}
							size={20}
						/>
					{/if}
					{#if element.startTime && element.duration && element.durationUnit}
						<span class="time-badge" style={`background-color: ${itemMeta.color}80;`}>
							{element.startTime.hours.toString().padStart(2, '0')}:{element.startTime.minutes.toString().padStart(2, '0')}
							({element.duration} {element.durationUnit})
						</span>
					{:else if element.startTime}
						<span class="time-badge" style={`background-color: ${itemMeta.color}80;`}>
							{element.startTime.hours.toString().padStart(2, '0')}:{element.startTime.minutes.toString().padStart(2, '0')}
						</span>
					{:else if element.duration && element.durationUnit}
						<span class="time-badge" style={`background-color: ${itemMeta.color}80;`}>
							{element.duration} {element.durationUnit}
						</span>
					{/if}
                    
				</div>
				<button class="delete-btn" onclick={() => deleteElement(index)} title="Delete">×</button>
			{/if}
		</div>
		{#if element.children.length > 0}
			<div class="children">
				{#each element.children as child}
					<div class="child-item">• {child}</div>
				{/each}
			</div>
		{/if}
	{/each}
    <div class="add-btn-container">
        <button class="add-btn" onclick={() => addNewElement(false)}>+ Add Event</button>
        <button class="add-btn" onclick={() => addNewElement(true)}>+ Add Task</button>
    </div>
	
</div>

<style>
    .add-btn-container {
        display: flex;
    }

	.editable-cell {
		min-height: 40px;
		width: 100%;
	}

	.element-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.element-content {
		flex: 1;
		cursor: text;
		padding: 2px 4px;
		border-radius: 2px;
		display: flex;
		align-items: center;
        min-height: 24px;
		gap: 4px;
	}

	.element-content:hover {
		background-color: var(--background-modifier-hover);
	}

	.task-checkbox {
		cursor: pointer;
	}

	.checked {
		text-decoration: line-through;
		opacity: 0.6;
	}

	.time-badge {
		font-size: 0.85em;
		background-color: var(--interactive-accent);
		color: white;
		padding: 2px 6px;
		border-radius: 3px;
		margin-left: auto;
	}

	.element-input {
		flex: 1;
		padding: 2px 4px;
		border: 1px solid var(--interactive-accent);
		border-radius: 2px;
		background: var(--background-primary);
		color: var(--text-normal);
	}

	.delete-btn {
		opacity: 0;
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 1.2em;
		padding: 0 4px;
		line-height: 1;
	}

	.element-row:hover .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover {
		color: var(--text-error);
	}

	.children {
		margin-left: 20px;
		font-size: 0.9em;
		color: var(--text-muted);
	}

	.child-item {
		padding: 2px 0;
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
</style>
