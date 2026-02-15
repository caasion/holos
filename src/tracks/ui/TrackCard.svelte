<script lang="ts">
	import CircularProgress from "src/planner/ui/grid/CircularProgress.svelte";
	import ProjectCard from "./ProjectCard.svelte";
	import HabitBlock from "./HabitElement.svelte";
	import type { Habit, Project, Track, TrackFileFrontmatter } from "src/plugin/types";
	import { EditTrackTimeModal } from "./EditTrackTimeModal";
	import { EditJournalHeaderModal } from "./EditJournalHeaderModal";

  interface TrackCardProps {
    track: Track;
    onLabelEdit: (label: string) => void;
    onDescriptionEdit: (label: string) => void;
    onFrontmatterEdit: (frontmatter: Partial<TrackFileFrontmatter>) => void;
    onHabitsEdit: (habits: Record<string, Habit>) => void;
  }

  let { 
    track,
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
    <button 
      class="card-header clickable track-title" 
      style={`color: ${track.color};`}
      onclick={onTrackLabelClick}
      title="Click to edit track name or delete"
    >
      {track.label}
    </button>
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
    </div>
  </div>
  
  <!-- Habits Section -->
  <div class="section">
    <div class="section-header">
      <h4 class="section-title">Habits</h4>
      <button 
        class="add-button" 
        onclick={onHabitAdd}
        title="Add a new habit"
      >
        +
      </button>
    </div>
    {#if habitsArray.length > 0}
      {#each habitsArray as habit}
        <HabitBlock
          {habit}
          color={track.color}
          onDelete={() => onHabitDelete(habit.id)}
          onEdit={(habit) => onHabitEdit(habit.id, habit)}
        />
      {/each}
    {:else}
      <div class="empty-habits-state">No habits yet. Click + to add one.</div>
    {/if}
  </div>
  
  <!-- Active Project Section -->
  {#if activeProject}
    <div class="section">
      <h4 class="section-title">Active Project</h4>
      <ProjectCard
        project={activeProject}
        color={track.color}
        onEdit={onProjectEdit}
      />
    </div>
  {/if}
  
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
</style>