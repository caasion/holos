<script lang="ts">
	import CircularProgress from "src/planner/ui/grid/CircularProgress.svelte";
	import ProjectCard from "./ProjectCard.svelte";
	import HabitBlock from "./HabitElement.svelte";
	import type { Track } from "src/plugin/types";

  interface TrackCardProps {
    track: Track;
  }

  let { track }: TrackCardProps = $props();

  // Handlers for habit actions (can be implemented later)
  function handleHabitEdit(habit: any) {
    console.log('Edit habit:', habit);
    // TODO: Implement habit editing modal
  }

  function handleHabitDelete(habitId: string) {
    console.log('Delete habit:', habitId);
    // TODO: Implement habit deletion
  }

  function handleHabitToggle(habitId: string) {
    console.log('Toggle habit:', habitId);
    // TODO: Implement habit completion tracking
  }

  function handleProjectEdit(project: any) {
    console.log('Edit project:', project);
    // TODO: Implement project editing modal
  }
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
  {#if track.habits.length > 0}
    <div class="section">
      <h4 class="section-title">Habits</h4>
      {#each track.habits as habit}
        <HabitBlock
          {habit}
          color={track.color}
          onEdit={handleHabitEdit}
          onDelete={handleHabitDelete}
          onToggle={handleHabitToggle}
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
        onEdit={handleProjectEdit}
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