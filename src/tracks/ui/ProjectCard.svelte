<script lang="ts">
	import type { ISODate, Project } from "src/plugin/types";
	import TaskElement from "src/planner/ui/grid/TaskElement.svelte";
	import HabitElement, { type HabitFunctions } from "./HabitElement.svelte";

	export interface ProjectCardFunctions {
		onLabelEdit: (label: string) => void;
		onDescriptionEdit: (description: string) => void;
		onStartDateEdit: (date: ISODate) => void;
		onEndDateEdit: (date: ISODate) => void;
		onDelete: () => void;
		
		// These are not project-specific, but handled at the project level
		onHabitAdd: () => void;
		onElementAdd: () => void;
	}

	interface ProjectCardProps {
		project: Project;
		color: string;
		projectFunctions: ProjectCardFunctions;
		createHabitFunctions: (habitId: string) => HabitFunctions;
	}

	let { 
		project, 
		color, 
		projectFunctions,
		createHabitFunctions,
	}: ProjectCardProps = $props();

	// Check if project is currently active
	function isProjectActive(): boolean {
		const now = new Date().toISOString();
		return now >= project.startDate && project.endDate ? now <= project.endDate : true 
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
				<div ondblclick={() => projectFunctions.onLabelEdit(project.label)} aria-label="Double click to edit" role="button" tabindex="0">
					{project.label}
				</div>
				
			</h4>
			<button class="icon-button" onclick={projectFunctions.onDelete} aria-label="Delete project">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
			</button>
		</div>
	</div>

	<!-- Habits Section -->
  <div class="section">
    <div class="section-header">
      <h4 class="section-title">Habits</h4>
      <button 
        class="add-button" 
        onclick={projectFunctions.onHabitAdd}
        title="Add a new habit"
      >
        +
      </button>
    </div>
    {#if Object.entries(project.habits).length > 0}
      {#each Object.values(project.habits) as habit}
        <HabitElement
          {habit}
          {color}
          habitFunctions={createHabitFunctions(habit.id)}
        />
      {/each}
    {:else}
      <div class="section-empty-state">No habits yet. Click + to add one.</div>
    {/if}
  </div>

	<!-- Tasks Section -->
  <div class="section">
    <div class="section-header">
      <h4 class="section-title">Tasks</h4>
      <button 
        class="add-button" 
        onclick={projectFunctions.onElementAdd}
        title="Add a new task"
      >
        +
      </button>
    </div>
    {#if project.data.length > 0}
			{#each project.data as element, index}
        <TaskElement
          element={element}
          index={index}
          color={color}
          onUpdate={() => {}}
          onToggle={() => {}}
          onCancel={() => {}}
          onDelete={() => {}}
        />
			{/each}
		{:else}
			<div class="section-empty-state">No tasks yet</div>
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

	.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .section-title {
    font-size: 0.9em;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 0px;
    margin-bottom: 0px;
  }

	.section-empty-state {
		padding: 12px;
		text-align: center;
		color: var(--text-muted);
		font-style: italic;
		font-size: 0.9em;
	}

	.add-button {
		background: transparent;
    color: var(--text-muted);
    border: none;
    border-radius: 25%;
    width: 24px;
    height: 24px;
    font-size: 1.2em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
    transition: opacity 0.2s ease;
		opacity: 0.8;
  }

  .add-button:hover {
    opacity: 1;
  }
</style>