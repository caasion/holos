<script lang="ts">
	import CircularProgress from "src/planner/ui/grid/CircularProgress.svelte";
	import ProjectCard from "./ProjectCard.svelte";
	import HabitBlock from "./HabitElement.svelte";
	import type { Habit, Project, Track } from "src/plugin/types";

  interface TrackCardProps {
    track: Track;
    onHabitRRuleEdit: (habitId: string, label: string) => void;
    onHabitLabelEdit: (habitId: string, label: string) => void;
    onHabitDelete: (habitId: string) => void;
    onHabitAdd: () => void;
    onProjectEdit: (project: Project) => void;
    onTrackLabelClick: () => void;
    onJournalHeaderDoubleClick: () => void;
    onTimeCommitmentDoubleClick: () => void;
  }

  let { 
    track,
    onHabitRRuleEdit, 
    onHabitLabelEdit, 
    onHabitDelete, 
    onHabitAdd,
    onProjectEdit,
    onTrackLabelClick,
    onJournalHeaderDoubleClick,
    onTimeCommitmentDoubleClick
  }: TrackCardProps = $props();

  // Convert habits record to array for iteration
  let habitsArray = $derived(Object.values(track.habits));
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
        onclick={onJournalHeaderDoubleClick}
        title="Double-click to edit journal header"
      >
        📜
      </button>
      <button 
        class="clickable time-display"
        onclick={onTimeCommitmentDoubleClick}
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
          onRRuleEdit={(rrule) => onHabitRRuleEdit(habit.id, rrule)}
          onLabelEdit={(label) => onHabitLabelEdit(habit.id, label)}
        />
      {/each}
    {:else}
      <div class="empty-habits-state">No habits yet. Click + to add one.</div>
    {/if}
  </div>
  
  <!-- Active Project Section -->
  {#if track.activeProject}
    <div class="section">
      <h4 class="section-title">Active Project</h4>
      <ProjectCard
        project={track.activeProject}
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