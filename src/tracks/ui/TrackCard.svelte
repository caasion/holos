<script lang="ts">
	import CircularProgress from "src/planner/ui/grid/CircularProgress.svelte";
	import ProjectCard, { type ProjectCardFunctions } from "./ProjectCard.svelte";
	import HabitBlock from "./HabitElement.svelte";
	import type { Habit, Project, Track, TrackFileFrontmatter } from "src/plugin/types";
	import { EditTrackTimeModal } from "./EditTrackTimeModal";
	import { EditJournalHeaderModal } from "./EditJournalHeaderModal";

  interface TrackCardFunctions {
    onLabelEdit: (label: string) => void;
    onDescriptionEdit: (label: string) => void;
    onFrontmatterEdit: (frontmatter: Partial<TrackFileFrontmatter>) => void;
    onDelete: () => void;

    onProjectAdd: () => void;

    projectFunctions: ProjectCardFunctions;
  }


  interface TrackCardProps {
    track: Track;
    
  }

  let { 
    track,
    onDelete,
    onLabelEdit,
    onDescriptionEdit,
    onFrontmatterEdit,
    onHabitsEdit,
  }: TrackCardProps = $props();

  // Convert habits record to array for iteration
  let habitsArray = $derived(Object.values(track.habits));
  
  // Get active project if one is set
  let activeProject = $derived(
    track.activeProjectId && track.projects[track.activeProjectId] 
      ? track.projects[track.activeProjectId] 
      : null
  );

  function onTrackLabelClick() {
    console.log("Planning to implement an editable textbox here, but not yet implemented!")
  }

  function onHabitAdd() {
    const newHabitId = `habit-${Date.now()}`;
    const newHabit: Habit = {
      id: newHabitId,
      raw: "- New Habit",
      label: "New Habit",
      rrule: ""
    };
    
    const updatedHabits = {
      ...track.habits,
      [newHabitId]: newHabit
    };
    
    onHabitsEdit(updatedHabits);
  }

  function onHabitDelete(habitId: string) {
    const updatedHabits = { ...track.habits };
    delete updatedHabits[habitId];
    onHabitsEdit(updatedHabits);
  }

  function onHabitEdit(habitId: string, habit: Habit) {
    const updatedHabits = {
      ...track.habits,
      [habitId]: habit
    };

    onHabitsEdit(updatedHabits);
  }

  function handleJournalHeaderEdit() {
    new EditJournalHeaderModal(
      this.app,
      track.journalHeader,
      (journalHeader) => onFrontmatterEdit({ journalHeader })
    ).open();
  }

  function handleTimeCommitmentEdit() {
    new EditTrackTimeModal(
      this.app,
      track.timeCommitment,
      (timeMinutes) => onFrontmatterEdit({ timeCommitment: timeMinutes })
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
        <button class="delete-btn" onclick={onDelete} title="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  </div>
  
  <!-- Projects Section -->
  <div class="section">
    <h4 class="section-title">Project</h4>
    
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

  .empty-habits-state {
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
</style>