<script lang="ts">
	interface EditableTextProps {
		value: string;
		onSave: (newValue: string) => void;
		placeholder?: string;
		multiline?: boolean;
		class?: string;
	}

	let { 
		value, 
		onSave, 
		placeholder = "", 
		multiline = false, 
		class: customClass = "" 
	}: EditableTextProps = $props();

	let isEditing = $state<boolean>(false);
	let editText = $state<string>("");
	let skipBlur = $state<boolean>(false);
	let inputRef = $state<HTMLInputElement | HTMLTextAreaElement>();

	// Auto-focus when entering edit mode
	$effect(() => {
		if (isEditing && inputRef) {
			inputRef.focus();
			inputRef.select();
		}
	});

	function startEdit() {
		isEditing = true;
		editText = value;
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

		const trimmedText = editText.trim();
		if (trimmedText !== value) {
			onSave(trimmedText);
		}
		
		cancelEdit();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !multiline) {
			e.preventDefault();
			saveEdit();
			skipBlur = true;
		} else if (e.key === 'Enter' && e.shiftKey && multiline) {
			// Allow Shift+Enter for new line in multiline
			return;
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEdit();
			skipBlur = true;
		}
	}
</script>

{#if isEditing}
	{#if multiline}
		<textarea
			bind:this={inputRef}
			bind:value={editText}
			onkeydown={handleKeydown}
			onblur={saveEdit}
			{placeholder}
			class={`editable-input ${customClass}`}
		></textarea>
	{:else}
		<input
			bind:this={inputRef}
			type="text"
			bind:value={editText}
			onkeydown={handleKeydown}
			onblur={saveEdit}
			{placeholder}
			class={`editable-input ${customClass}`}
		/>
	{/if}
{:else}
	<div 
		class={`editable-display ${customClass}`}
		ondblclick={startEdit} 
		role="button" 
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && startEdit()}
	>
		{value || placeholder}
	</div>
{/if}

<style>
	.editable-display {
		cursor: text;
		padding: 2px 4px;
		border-radius: 2px;
		min-height: 1.5em;
		width: 100%;
	}

	.editable-display:hover {
		background-color: var(--background-modifier-hover);
	}

	.editable-input {
		width: 100%;
		padding: 2px 4px;
		border: 1px solid var(--interactive-accent);
		border-radius: 2px;
		background: var(--background-primary);
		color: var(--text-normal);
		font-family: inherit;
		font-size: inherit;
		resize: vertical;
	}

	.editable-input:focus {
		outline: none;
		border-color: var(--interactive-accent-hover);
	}

	textarea.editable-input {
		min-height: 60px;
	}
</style>
