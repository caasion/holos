<script lang="ts">
	import type { Habit } from "src/plugin/types";
	import RRuleEditor from "./RRuleEditor.svelte";
	import { RRuleService } from "../logic/rrule";

	interface HabitBlockProps {
		habit: Habit;
		color: string;
		onDelete: () => void;
		onRRuleEdit: (rrule: string) => void;
		onLabelEdit: (label: string) => void;
	}

	let { habit, color, onDelete, onRRuleEdit, onLabelEdit  }: HabitBlockProps = $props();

  let isEditing = $state<boolean>(false);
	let editText = $state<string>("");
	let skipBlur = $state<boolean>(false);

	function startEdit() {
		isEditing = true;
    editText = habit.label;
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

		onLabelEdit(editText);
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

	let showRRuleEditor = $state<boolean>(false);
	let popupPosition = $state<{ x: number; y: number; } | null>(null);

	function handleTimeBadgeClick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();

		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		
		popupPosition = {
			x: rect.left + window.scrollX,
			y: rect.bottom + window.scrollY + 4,
		}
		showRRuleEditor = true;
	}

	function handleTimeBadgeSave(selectedDays: Set<number>) {
		onRRuleEdit(RRuleService.serializeRRule(selectedDays));
		handleTimeBadgeCancel();
	}

	function handleTimeBadgeCancel() {
		popupPosition = null;
		showRRuleEditor = false;
	}

	function handleClickOutside(e: MouseEvent) {
		if (!showRRuleEditor) return;
		
		const target = e.target as HTMLElement;
		const rruleEditor = target.closest('.rrule-editor-modal');
		const timeBadge = target.closest('.time-badge');
		
		if (!rruleEditor && !timeBadge) {
			handleTimeBadgeCancel();
		}
	}
	
</script>

<svelte:window onclick={handleClickOutside} />

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
				
			</div>
			<button class="delete-btn" onclick={onDelete} title="Delete">×</button>
		{/if}
		<div class="time-badge-container">
			<div class="time-badge" style={`background-color: ${color}80;`} onclick={handleTimeBadgeClick}>
				{RRuleService.formatRRule(habit.rrule)}
			</div>
			{#if showRRuleEditor && popupPosition}
				<RRuleEditor 
					position={popupPosition}
					selectedDays={RRuleService.parseRRule(habit.rrule)}
					onSave={handleTimeBadgeSave}
					onCancel={handleTimeBadgeCancel}
				/>
			{/if}
		</div>
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