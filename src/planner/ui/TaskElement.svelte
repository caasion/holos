<script lang="ts">
	import type { Element, ItemMeta } from "src/plugin/types";
	import CircularProgress from "./CircularProgress.svelte";

	interface TaskElementProps {
		element: Element;
		index: number;
		itemMeta: ItemMeta;
		onUpdate: (index: number, updatedElement: Element) => void;
		onDelete: (index: number) => void;
		onToggle: (index: number) => void;
	}

	let { element, index, itemMeta, onUpdate, onDelete, onToggle }: TaskElementProps = $props();

	let isEditing = $state<boolean>(false);
	let editText = $state<string>("");

	function startEdit() {
		isEditing = true;
		
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
		editText = "";
	}

	function saveEdit() {
		if (editText.trim() === "") {
			cancelEdit();
			return;
		}

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
		
		const updatedElement: Element = { ...element };
		
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
		
		onUpdate(index, updatedElement);
		cancelEdit();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			saveEdit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEdit();
		}
	}

	function toggleTask() {
		if (element.isTask) {
			onToggle(index);
		}
	}

	function deleteElement() {
		onDelete(index);
	}
</script>

<div class="task-element">
	<div class="element-row">
		{#if isEditing}
			{#if element.isTask}
				<input
					type="checkbox"
					checked={element.checked}
					onchange={toggleTask}
					class="task-checkbox"
				/>
			{/if}
			<input
				type="text"
				bind:value={editText}
				onkeydown={handleKeydown}
				onblur={saveEdit}
				class="element-input"
			/>
		{:else}
			<div class="element-content" ondblclick={startEdit} role="button" tabindex="0">
				{#if element.isTask}
					<input
						type="checkbox"
						checked={element.checked}
						onchange={toggleTask}
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
			<button class="delete-btn" onclick={deleteElement} title="Delete">×</button>
		{/if}
	</div>
	
	{#if element.children.length > 0}
		<div class="children">
			{#each element.children as child}
				<div class="child-item">• {child}</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.task-element {
		width: 100%;
	}

	.element-row {
		display: flex;
		align-items: center;
		gap: 4px;
		cursor: move; /* For drag and drop */
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
</style>