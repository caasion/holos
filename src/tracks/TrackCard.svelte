<script lang="ts">
	import CircularProgress from "src/planner/ui/grid/CircularProgress.svelte";
	import ProjectCard from "./ProjectCard.svelte";
	import HabitBlock from "./HabitElement.svelte";
	import type { Habit, Project, Track } from "src/plugin/types";

  interface TrackCardProps {
    track: Track;
    onHabitLabelEdit: (habitId: string, label: string) => void;
    onHabitDelete: (habitId: string) => void;
    onProjectEdit: (project: Project) => void;
  }

  let { track, onHabitLabelEdit, onHabitDelete, onProjectEdit }: TrackCardProps = $props();

  // Convert habits record to array for iteration
  let habitsArray = $derived(Object.values(track.habits));
</script>

<div class="card" style={`background-color: ${track.color}10;`}>
  <div class="card-header-container">
    <h3 class="card-header" style={`color: ${track.color};`}>{track.label}</h3>
    <div class="card-data-container">
      <h3 class="card-header">📜</h3>
      <div>
        <CircularProgress 
          duration={track.timeCommitment}
          unit={'hr'}
        />
      </div>
    </div>
  </div>
  
  <!-- Habits Section -->
  {#if habitsArray.length > 0}
    <div class="section">
      <h4 class="section-title">Habits</h4>
      {#each habitsArray as habit}
        <HabitBlock
          {habit}
          color={track.color}
          onDelete={() => onHabitDelete(habit.id)}
          onLabelEdit={(label) => onHabitLabelEdit(habit.id, label)}
        />
      {/each}
    </div>
  {/if}
  
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

  .section-title {
    font-size: 0.9em;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 0px;
    margin-bottom: 8px;

  }
</style>