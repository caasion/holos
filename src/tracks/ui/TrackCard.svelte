<script lang="ts">
	import CircularProgress from "src/planner/ui/grid/CircularProgress.svelte";
	import ProjectCard, { type ProjectCardFunctions } from "./ProjectCard.svelte";
	import ProjectsSection from "./ProjectsSection.svelte";
	import type { Habit, Project, Track, TrackFileFrontmatter } from "src/plugin/types";
	import { EditTrackTimeModal } from "./EditTrackTimeModal";
	import { EditJournalHeaderModal } from "./EditJournalHeaderModal";
	import type { HabitFunctions } from "./HabitElement.svelte";
	import { Notice, type App } from "obsidian";
	import { ConfirmationModal } from "src/plugin/ConfirmationModal";

  export interface TrackCardFunctions {
    onLabelEdit: (label: string) => void;
    onDescriptionEdit: (label: string) => void;
    onFrontmatterEdit: (frontmatter: Partial<TrackFileFrontmatter>) => void;
    onDelete: () => void;
    onProjectAdd: () => void;
  }

  interface TrackCardProps {
    app: App;
    track: Track;
    trackFunctions: TrackCardFunctions;
    createProjectFunctions: (projectId: string) => ProjectCardFunctions;
    createHabitFunctions: (projectId: string) => ((habitId: string) => HabitFunctions);
  }

  let { 
    app,
    track,
    trackFunctions,
    createProjectFunctions,
    createHabitFunctions
  }: TrackCardProps = $props();

  function onTrackLabelClick() {
    console.log("Planning to implement an editable textbox here, but not yet implemented!")
  }

  function handleJournalHeaderEdit() {
    new EditJournalHeaderModal(
      app,
      track.journalHeader,
      (journalHeader) => trackFunctions.onFrontmatterEdit({ journalHeader })
    ).open();
  }

  function handleTimeCommitmentEdit() {
    new EditTrackTimeModal(
      app,
      track.timeCommitment,
      (timeMinutes) => trackFunctions.onFrontmatterEdit({ timeCommitment: timeMinutes })
    ).open();
  }
  
  function handleRemoveTrack() {
    new ConfirmationModal(
      app, 
      () => trackFunctions.onDelete(),
      "Remove",
      "Removing the track will delete the entire track folder and all its projects."
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
          duration={track.timeCommitment / 60}
          unit={'hr'}
        />
      </button>
        <button class="delete-btn" onclick={handleRemoveTrack} title="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  </div>
  
  <!-- Projects Section -->
  <ProjectsSection
    projects={track.projects}
    color={track.color}
    onProjectAdd={trackFunctions.onProjectAdd}
    createProjectFunctions={createProjectFunctions}
    createHabitFunctions={createHabitFunctions}
  />
  
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

</style>