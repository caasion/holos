<script lang="ts">
	import type { Project } from "src/plugin/types";
	import ProjectCard, { type ProjectCardFunctions } from "./ProjectCard.svelte";
	import type { HabitFunctions } from "./HabitElement.svelte";
	import { getISODate } from "src/plugin/helpers";

  interface ProjectsSectionProps {
    projects: Record<string, Project>;
    color: string;
    onProjectAdd: () => void;
    createProjectFunctions: (projectId: string) => ProjectCardFunctions;
    createHabitFunctions: (projectId: string) => ((habitId: string) => HabitFunctions);
  }

  let { 
    projects,
    color,
    onProjectAdd,
    createProjectFunctions,
    createHabitFunctions
  }: ProjectsSectionProps = $props();

  // State for toggling inactive projects visibility
  let showInactive = $state(false);

  // Filter projects by active/inactive status
  let activeProjects = $derived.by(() => {
    const today = getISODate(new Date());
    return Object.values(projects).filter(project => {
      const isAfterStart = today >= project.startDate;
      const isBeforeEnd = !project.endDate || today <= project.endDate;
      return isAfterStart && isBeforeEnd;
    });
  });

  let inactiveProjects = $derived.by(() => {
    const today = getISODate(new Date());
    return Object.values(projects).filter(project => {
      const isAfterStart = today >= project.startDate;
      const isBeforeEnd = !project.endDate || today <= project.endDate;
      return !(isAfterStart && isBeforeEnd);
    });
  });

  let displayedProjects = $derived(showInactive ? [...activeProjects, ...inactiveProjects] : activeProjects);

  function toggleInactive() {
    showInactive = !showInactive;
  }
</script>

<div class="section">
  <div class="section-header">
    <h4 class="section-title">Projects</h4>
    <div class="section-controls">
      <button 
        class="toggle-inactive-button" 
        onclick={toggleInactive}
        title={showInactive ? "Hide inactive projects" : "Show inactive projects"}
        class:active={showInactive}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          {#if showInactive}
            <!-- Eye icon -->
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          {:else}
            <!-- Eye-off icon -->
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
            <line x1="2" y1="2" x2="22" y2="22"/>
          {/if}
        </svg>
      </button>
      <button 
        class="add-button" 
        onclick={onProjectAdd}
        title="Add a new project"
      >
        +
      </button>
    </div>
  </div>
  <div class="projects-section">
    {#if displayedProjects.length > 0}
      {#each displayedProjects as project}
        <ProjectCard
          project={project}
          color={color}
          projectFunctions={createProjectFunctions(project.id)}
          createHabitFunctions={createHabitFunctions(project.id)}
        />
      {/each}
    {:else if activeProjects.length === 0}
      <div class="section-empty-state empty-projects-section">
        No active projects. Click + to add one.
      </div>
    {:else}
      <div class="section-empty-state empty-projects-section">
        No inactive projects.
      </div>
    {/if}
  </div>
</div>

<style>
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

  .add-button {
    background: transparent;
    color: var(--text-muted);
    border: none;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    font-size: 1.2em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
    transition: all 0.2s ease;
    opacity: 0.8;
  }

  .add-button:hover {
    opacity: 1;
    background: var(--background-modifier-hover)
  }

  .section-empty-state {
    color: var(--text-muted);
    font-size: 0.9em;
    font-style: italic;
    padding: 12px;
    text-align: center;
  }

  .section-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .toggle-inactive-button {
    background: transparent;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
  }

  .toggle-inactive-button:hover {
    background: var(--background-modifier-hover);
  }

  .toggle-inactive-button.active svg {
    stroke: var(--interactive-accent);
  }

  .projects-section {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-column-gap: 8px;
    grid-row-gap: 12px;
  }

  .section-empty-state {
    padding: 24px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
    border: 1px dashed var(--background-modifier-border);
    border-radius: 8px;
  }

  
</style>
