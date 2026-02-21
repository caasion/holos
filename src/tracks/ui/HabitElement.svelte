<script lang="ts">
	import type { Habit } from "src/plugin/types";
	import { RRuleService } from "../logic/rrule";

	export interface HabitFunctions {
		onEdit: (habit: Habit) => void;
		onDelete: () => void;
	}

	interface HabitBlockProps {
		habit: Habit;
		color: string;
		habitFunctions: HabitFunctions;
	}

	let { habit, color, habitFunctions }: HabitBlockProps = $props();

  let isEditing = $state<boolean>(false);
	let editText = $state<string>("");
	let skipBlur = $state<boolean>(false);

	function startEdit() {
		isEditing = true;
    editText = habit.raw.replace(/^- /, '').trim()
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

		let label: string = editText;
		let rrule: string = habit.rrule; // Default to existing rrule

		const rruleRegex = /\[([^\]]*)\]\s*$/;

		const rruleMatch = editText.match(rruleRegex);
		if (rruleMatch) {
			console.log('matched!')
			const [fullMatch, rruleContent] = rruleMatch;
			label = editText.replace(fullMatch, '').trim();
			rrule = RRuleService.parseRRule(rruleContent);
		}

		const newHabit: Habit = {
			...habit,
			raw: "- " + editText,
			label,
			rrule
		};

		habitFunctions.onEdit(newHabit);
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
				<span>↻ {habit.label}</span>

				<div class="time-badge-container">
					<div class="time-badge" style={`background-color: ${color}80;`}>
						{RRuleService.formatRRule(habit.rrule)}
					</div>
				</div>
			</div>
			<button class="delete-btn" onclick={habitFunctions.onDelete} title="Delete">×</button>
		{/if}
		
	</div>
</div>

<style>
	.task-element {
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

	.element-checkbox-container {
		height: 20px;
		width: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.task-checkbox {
		cursor: pointer;
		margin: 0;
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
		position: relative;
	}

	.time-badge {
		font-size: 0.85em;
		background-color: var(--interactive-accent);
		color: white;
		padding: 2px 6px;
		border-radius: 3px;
		cursor: pointer;
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