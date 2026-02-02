<script lang="ts">
	import type { Project } from "src/plugin/types";
	import TaskElement from "src/planner/ui/grid/TaskElement.svelte";

	interface ProjectCardProps {
		project: Project;
		color: string;
		onEdit?: (project: Project) => void;
	}

	let { project, color, onEdit }: ProjectCardProps = $props();

	function handleEditProject() {
		if (onEdit) {
			onEdit(project);
		}
	}

	// Format date range for display
	function formatDateRange(startDate: string, endDate: string): string {
		const start = new Date(startDate);
		const end = new Date(endDate);
		const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
		return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
	}

	// Check if project is currently active
	function isProjectActive(): boolean {
		const now = new Date();
		return project.active.some(interval => {
			const start = new Date(interval.startDate);
			const end = new Date(interval.endDate);
			return now >= start && now <= end;
		});
	}
</script>

<div class="project-card" style={`border-color: ${color};`}>
	<div class="project-header">
		<div class="project-title-row">
			<h4 class="project-title" style={`color: ${color};`}>
				{#if isProjectActive()}
					<span class="status-indicator active">●</span>
				{:else}
					<span class="status-indicator inactive">○</span>
				{/if}
				{project.label}
			</h4>
			<button class="icon-button" onclick={handleEditProject} aria-label="Edit project">
				✏️
			</button>
		</div>
		
		<div class="project-meta">
			{#each project.active as interval}
				<div class="date-range">
					📅 {formatDateRange(interval.startDate, interval.endDate)}
					{#if interval.rrule}
						<span class="rrule-tag">🔄</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div class="project-tasks">
		{#if project.data.length > 0}
			{#each project.data as element, index}
				<div class="task-row">
					<TaskElement
						element={element}
						index={index}
            color={color}
						onUpdate={() => {}}
						onToggle={() => {}}
						onCancel={() => {}}
						onDelete={() => {}}
						disabled={true}
					/>
				</div>
			{/each}
		{:else}
			<div class="empty-state">No tasks yet</div>
		{/if}
	</div>
</div>

<style>
	.project-card {
		background-color: var(--background-primary);
		border: 1.5px solid;
		border-radius: 8px;
		padding: 12px;
		margin: 8px 0;
		transition: box-shadow 0.2s ease;
	}

	.project-card:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.project-header {
		margin-bottom: 10px;
	}

	.project-title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}

	.project-title {
		margin: 0;
		font-size: 1.1em;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.status-indicator {
		font-size: 0.8em;
	}

	.status-indicator.active {
		color: #4CAF50;
	}

	.status-indicator.inactive {
		color: #999;
	}

	.icon-button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 1em;
		opacity: 0.6;
		transition: opacity 0.2s ease, background-color 0.2s ease;
	}

	.icon-button:hover {
		opacity: 1;
		background-color: var(--background-modifier-hover);
	}

	.project-meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 0.85em;
		color: var(--text-muted);
	}

	.date-range {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.rrule-tag {
		font-size: 0.9em;
	}

	.project-tasks {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.task-row {
		padding: 4px 0;
	}

	.empty-state {
		padding: 12px;
		text-align: center;
		color: var(--text-muted);
		font-style: italic;
		font-size: 0.9em;
	}
</style>