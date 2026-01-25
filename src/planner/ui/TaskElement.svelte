<script lang="ts">
	import type { Element, ItemMeta, Time } from "src/plugin/types";
	import CircularProgress from "./CircularProgress.svelte";
	import { formatTime } from "src/plugin/helpers";

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
		editText = element.raw.replace(/^\t- /, '').trim();
	}

	function cancelEdit() {
		isEditing = false;
		editText = "";
		skipBlur = false;
	}

	function saveEdit() {
		if (skipBlur) {
			skipBlur = false;
			return;
		}

		let isTask = false;
		let taskStatus: ' ' | 'x' | '-' | undefined;
		let startTime: Time | undefined;
		let progress: number | undefined;
		let duration: number | undefined;
		let timeUnit: 'min' | 'hr' | undefined;

		const taskStatusRegex = /^\[([ x-])\]/;
		const startTimeRegex = /@\s*(\d{1,2}):(\d{2})/;
		const progressDurationRegex = /\[(?:(\d+)?(\/))?(\d+)\s*(hr|min)\]/;

		const taskStatusMatch = editText.match(taskStatusRegex);
		if (taskStatusMatch) {
			const [fullMatch, checkmark] = taskStatusMatch;
			editText = editText.replace(fullMatch, '').trim();
			isTask = true;
			taskStatus = checkmark as typeof taskStatus;
		}

		const startTimeMatch = editText.match(startTimeRegex);
		if (startTimeMatch) {
			const [fullMatch, hours, minutes] = startTimeMatch;
			editText = editText.replace(fullMatch, '').trim();
			startTime = { hours: parseInt(hours), minutes: parseInt(minutes) };
		}

		const progressDurationMatch = editText.match(progressDurationRegex);
		if (progressDurationMatch) {
			const [fullMatch, progressMatch, hasProgress, durationMatch, unitMatch] = progressDurationMatch;
			editText = editText.replace(fullMatch, '');
			progress = hasProgress ? (parseInt(progressMatch) || 0) : undefined;
			duration = parseInt(durationMatch);
			timeUnit = unitMatch as 'min' | 'hr';
		}

		const updatedElement: Element = {
			...element,
			text: editText.trim(),
			isTask,
			taskStatus,
			startTime,
			progress,
			duration,
			timeUnit,
		}
		
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
			<input
				type="text"
				bind:value={editText}
				onkeydown={handleKeydown}
				onblur={saveEdit}
				class="element-input"
			/>
		{:else}
			<div class="element-content" ondblclick={startEdit} role="button" tabindex="0">
				{#if element.duration && element.timeUnit}
				<CircularProgress 
					progress={element.progress}
					duration={element.duration} 
					unit={element.timeUnit}
					size={20}
				/>
				{:else if element.taskStatus}
					<input
						type="checkbox"
						checked={element.taskStatus == "x"}
						onchange={toggleTask}
						class="task-checkbox"
					/>
				{/if}
				<span 
					class:checked={element.taskStatus == "x" || (!element.progress && element.duration) || (element.progress && element.duration && element.progress >= element.duration)} 
					class:cancelled={element.taskStatus == "-"}	
				>
					{element.text}
				</span>
				<div class="time-badge-container">
					{#if element.duration && element.timeUnit}
						<span class="time-badge" style={`background-color: ${itemMeta.color}80;`}>
							{element.duration} {element.timeUnit}
						</span>
					{/if}
					{#if element.startTime}
						<span class="time-badge" style={`background-color: ${itemMeta.color}80;`}>
							{formatTime(element.startTime)}
						</span>
					{/if}
				</div>
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

	.cancelled {
		text-decoration: line-through;
		opacity: 0.6;
	}

	.time-badge-container {
		margin-left: auto;
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		justify-content: flex-end;
		align-items: center;
	}

	.time-badge {
		font-size: 0.85em;
		background-color: var(--interactive-accent);
		color: white;
		padding: 2px 6px;
		border-radius: 3px;
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