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
	let skipBlur = $state<boolean>(false);

	function startEdit() {
		isEditing = true;
		editText = element.raw.replace(/^\t- (\[.\] )?/, '').trim();
	}

	function cancelEdit() {
		isEditing = false;
		editText = "";
		skipBlur = false;
	}

	function saveEdit() {
		// Parse the text for task duration
		let textWithoutTaskDuration = editText;

		let { text: elementText, startTime, progress, duration, timeUnit }: Element = element;
		
		// [X/Y hr] or [X/Y min]
		const taskDurationMatch = textWithoutTaskDuration.match(/\[(\d+)\/\s*(\d*)\s*(hr|min)\]/);
		// [/Y hr] or [/Y min]
		const incompleteMatch = textWithoutTaskDuration.match(/\[\/\s*(\d+)\s*(hr|min)\]/);
		// [X hr] or [X min]
		const plainDurationMatch = textWithoutTaskDuration.match(/\[(?![\d\/])\s*(\d+)\s*(hr|min)\]/);
		
		if (taskDurationMatch) {
			// Handle [X/Y hr] or [X/Y min]
			const [fullMatch, prog, limit, unit] = taskDurationMatch;
			progress = parseInt(prog);
			duration = limit ? parseInt(limit) : undefined;
			timeUnit = unit as 'min' | 'hr';
			textWithoutTaskDuration = textWithoutTaskDuration.replace(fullMatch, '').trim();
		} else if (incompleteMatch) {
			// Handle [/Y hr] or [/Y min] and refactor to [0/Y hr]
			const [fullMatch, limit, unit] = incompleteMatch;
			progress = 0;
			duration = parseInt(limit);
			timeUnit = unit as 'min' | 'hr';
			textWithoutTaskDuration = textWithoutTaskDuration.replace(fullMatch, '').trim();
		} else if (plainDurationMatch) {
			//Handle [Y hr] as a set task duration of Y hr
			const [fullMatch, rawDuration, units] = plainDurationMatch;
			duration = parseInt(rawDuration);
			timeUnit = units.startsWith('h') ? 'hr' : 'min';
			textWithoutTaskDuration = textWithoutTaskDuration.replace(fullMatch, '').trim();
		if (skipBlur) {
			skipBlur = false;
			return;
		}

		// Parse the text for starting time info: "Task @ 10:00"
		const withStartTimeMatch = textWithoutTaskDuration.match(/(.*?) @ (\d{1,2}):(\d{2})/);
		
		if (withStartTimeMatch) {
			const [, text, hours, minutes] = withStartTimeMatch;
			elementText = text.trim();
			startTime = { hours: parseInt(hours), minutes: parseInt(minutes) };
		} else {
			// No time info
			elementText = textWithoutTaskDuration.trim();
		}

		// Build the updated element object
		const updatedElement: Element = {
			...element,
			text: elementText,
			// Only include properties that are defined
			...(startTime && { startTime }),
			...(progress !== undefined && { progress }),
			...(duration !== undefined && { duration }),
			...(timeUnit && { timeUnit })
		};
		
		onUpdate(index, updatedElement);
		cancelEdit();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			saveEdit();
			skipBlur = true;
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEdit();
			skipBlur = true;
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
				{#if element.progress !== undefined && element.timeUnit}
					<CircularProgress 
						progress={element.progress} 
						limit={element.duration} 
						unit={element.timeUnit}
						size={20}
					/>
				{/if}
			{#if element.startTime && element.duration && element.timeUnit && element.progress === undefined}
				<span class="time-badge" style={`background-color: ${itemMeta.color}80;`}>
					{element.startTime.hours.toString().padStart(2, '0')}:{element.startTime.minutes.toString().padStart(2, '0')}
					[{element.duration} {element.timeUnit}]
				</span>
			{:else if element.startTime}
				<span class="time-badge" style={`background-color: ${itemMeta.color}80;`}>
					{element.startTime.hours.toString().padStart(2, '0')}:{element.startTime.minutes.toString().padStart(2, '0')}
				</span>
			{:else if element.duration && element.timeUnit && element.progress === undefined}
				<span class="time-badge" style={`background-color: ${itemMeta.color}80;`}>
					[{element.duration} {element.timeUnit}]
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