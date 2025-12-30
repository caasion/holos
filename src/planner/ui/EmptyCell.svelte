<script lang="ts">
    interface ViewProps {
        onClick: () => void;
        label: string;
        color: string;
    }

    let {onClick, label, color}: ViewProps = $props();
</script>

<div class="empty-cell">
    <button 
        class="add-new-btn" 
        style={`border-color: ${color}; color: ${color};`}
        onclick={onClick}
        title="Add new item"
    >
        {label}
    </button>
</div>

<style>
    .empty-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 8px;
		height: 100%;
	}

	.add-new-btn {
		padding: 4px 12px;
		background: transparent;
		border: 1px dashed;
		cursor: pointer;
		border-radius: 4px;
		font-size: 0.85em;
		transition: all 0.2s;
	}

	.add-new-btn:hover {
		opacity: 0.8;
	}
</style>