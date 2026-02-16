<script lang="ts">
	import CircularProgress from "src/planner/ui/grid/CircularProgress.svelte";
	import ProjectCard, { type ProjectCardFunctions } from "./ProjectCard.svelte";
	import type { Habit, Project, Track, TrackFileFrontmatter } from "src/plugin/types";
	import { EditTrackTimeModal } from "./EditTrackTimeModal";
	import { EditJournalHeaderModal } from "./EditJournalHeaderModal";
	import type { HabitFunctions } from "./HabitElement.svelte";

  export interface TrackCardFunctions {
    onLabelEdit: (label: string) => void;
    onDescriptionEdit: (label: string) => void;
    onFrontmatterEdit: (frontmatter: Partial<TrackFileFrontmatter>) => void;
    onDelete: () => void;
    onProjectAdd: () => void;
  }

  interface TrackCardProps {
    track: Track;
    trackFunctions: TrackCardFunctions;
    createProjectFunctions: (projectId: string) => ProjectCardFunctions;
    createHabitFunctions: (projectId: string) => ((habitId: string) => HabitFunctions);
  }

  let { 
    track,
    trackFunctions,
    createProjectFunctions,
    createHabitFunctions
  }: TrackCardProps = $props();

  // Get active project if one is set
  let activeProjects = $derived.by(() => {
    const today = new Date().toISOString();
    return Object.values(track.projects).filter(project => today >= project.startDate && project.endDate ? today <= project.endDate : true);
  })

  function onTrackLabelClick() {
    console.log("Planning to implement an editable textbox here, but not yet implemented!")
  }

  function handleJournalHeaderEdit() {
    new EditJournalHeaderModal(
      this.app,
      track.journalHeader,
      (journalHeader) => trackFunctions.onFrontmatterEdit({ journalHeader })
    ).open();
  }

  function handleTimeCommitmentEdit() {
    new EditTrackTimeModal(
      this.app,
      track.timeCommitment,
      (timeMinutes) => trackFunctions.onFrontmatterEdit({ timeCommitment: timeMinutes })
    ).open();
  }
  
  
</script>

<div class="card" style={`background-color: ${track.color}10;`}>
  <div class="card-header-container">
    <div class="card-data-container">
      <button 
        class="card-header clickable track-title" 
        style={`color: ${track.color};`}
        ondblclick={onTrackLabelClick}
        title="Click to edit track name or delete"
      >
        {track.label}
      </button>
    </div>
    
    <div class="card-data-container">
      <button 
        class="card-header clickable journal-icon" 
        onclick={handleJournalHeaderEdit}
        title="Double-click to edit journal header"
      >
        📜
      </button>
      <button 
        class="clickable time-display"
        onclick={handleTimeCommitmentEdit}
        title="Double-click to edit time commitment"
      >
        <CircularProgress 
          duration={track.timeCommitment}
          unit={'hr'}
        />
      </button>
        <button class="delete-btn" onclick={trackFunctions.onDelete} title="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  </div>
  
  <!-- Projects Section -->
  <div class="section">
    <div class="section-header">
      <h4 class="section-title">Projects</h4>
      <button 
        class="add-button" 
        onclick={trackFunctions.onProjectAdd}
        title="Add a new project"
      >
        +
      </button>
    </div>
    <div class="projects-section">
      {#if activeProjects.length > 0}
      <div class="active-projects-section">
        {#each activeProjects as project}
        <ProjectCard
          project={project}
          color={track.color}
          projectFunctions={createProjectFunctions(project.id)}
          createHabitFunctions={createHabitFunctions(project.id)}
        />
        {/each}
      </div>
      <!-- Project Creation Section -->
      {:else}
        <div class="section-empty-state empty-projects-section">No active project. Click + to add one.</div>
      {/if}
      
    </div>
    
  </div>
  
</div>


<style>
  .card {
    border: 2px solid #acacac;
    border-style: solid;
    border-radius: 1rem;
    width: 100%;
    height: 100%;
    padding: 12px;
    margin: 0px 5px;
    overflow-y: auto;
    max-height: 70vh;
  }

  .card-header {
    margin: auto 0px;
  }

  .card-header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .card-data-container {
    display: flex;
    align-items: center;
  }

  .section {
    margin-top: 16px;
    margin-bottom: 12px;
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

  .add-button {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border: none;
    border-radius: 50%;
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
  }

  .add-button:hover {
    opacity: 0.8;
  }

  .section-empty-state {
    color: var(--text-muted);
    font-size: 0.9em;
    font-style: italic;
    padding: 12px;
    text-align: center;
  }

  .clickable {
    cursor: pointer;
    user-select: none;
  }

  .clickable:hover {
    opacity: 0.8;
  }

  .track-title {
    background: none;
    border: none;
    padding: 0;
    font-size: 1.17em;
    font-weight: bold;
    text-align: left;
  }

  .journal-icon {
    background: none;
    border: none;
    padding: 0;
    font-size: 1.17em;
    font-weight: bold;
  }

  .time-display {
    background: none;
    border: none;
    padding: 0;
  }

  .delete-btn {
    background: transparent;
		border: none;
		color: var(--text-normal);
		cursor: pointer;
		font-size: 1.2em;
		padding: 0 4px;
		line-height: 1;
	}

	.delete-btn:hover {
		color: var(--text-error);
	}

  .projects-section {
    display: grid;
    grid-template-columns: 2fr 1fr;
  }

  .empty-projects-section {
    grid-column: 1 / span 2;
  }

  .active-projects-section {
    overflow-x: scroll;
    display: flex;
    gap: 4px;
  }
</style>