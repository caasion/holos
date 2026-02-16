<script lang="ts">
	import type { Habit, Track } from "src/plugin/types";
	import TrackCard, { type TrackCardFunctions } from "./TrackCard.svelte";
  import type { TrackNoteService } from "../logic/trackNote";
	import { ConfirmationModal } from "src/plugin/ConfirmationModal";
	import { App, Notice } from "obsidian";
	import ProjectCard, { type ProjectCardFunctions } from "./ProjectCard.svelte";
	import type { HabitFunctions } from "./HabitElement.svelte";

  interface TracksProps {
    app: App;
    trackNoteService: TrackNoteService;
  }

  let { app, trackNoteService }: TracksProps = $props();

  const trackStore = trackNoteService.parsedTracksContent;

  const parsedTracks = $derived($trackStore);

  // Load track content when component mounts
  $effect(() => {
    trackNoteService.loadAllTrackContent();
  });

  // Setup file watcher with cleanup
  $effect(() => {
    trackNoteService.setupFileWatchers();
    
    return () => {
      trackNoteService.cleanupFileWatchers();
    };
  });

  function handleRemoveTrack(trackId: string) {
    new ConfirmationModal(
      app, 
      async () => {
        const success = await trackNoteService.deleteTrack(trackId);
        if (success) {
          await trackNoteService.invalidateCache();
          new Notice('Track deleted successfully');
        }
      },
      "Remove",
      "Removing the track will delete the entire track folder and all its projects."
   ).open();
  }

  // Create track-level functions for a specific track
  function createTrackFunctions(trackId: string): TrackCardFunctions {
    return {
      onLabelEdit: (label: string) => trackNoteService.updateTrackLabel(trackId, label),
      onDescriptionEdit: (description: string) => trackNoteService.updateTrackDescription(trackId, description),
      onFrontmatterEdit: (frontmatter) => trackNoteService.updateTrackFrontmatter(trackId, frontmatter),
      onDelete: () => handleRemoveTrack(trackId),
      onProjectAdd: () => {
        // TODO: Implement project add
        console.log('Add project to track:', trackId);
      },
    };
  }

  // Create project-level functions factory for a specific track
  // Returns a function that takes projectId and returns ProjectCardFunctions
  function createProjectFunctionsFactory(trackId: string) {
    return (projectId: string): ProjectCardFunctions => ({
      onLabelEdit: (label: string) => trackNoteService.updateProjectLabel(trackId, projectId, label),
      onDescriptionEdit: (description: string) => trackNoteService.updateProjectDescription(trackId, projectId, description),
      onStartDateEdit: (date) => trackNoteService.updateProjectStartDate(trackId, projectId, date),
      onEndDateEdit: (date) => trackNoteService.updateProjectEndDate(trackId, projectId, date),
      onDelete: () => trackNoteService.deleteProject(trackId, projectId),
      onHabitAdd: () => trackNoteService.addProjectHabit(trackId, projectId),
      onElementAdd: () => trackNoteService.addProjectElement(trackId, projectId),
    });
  }

  // Create habit-level functions factory for a specific track
  // Returns a function that takes projectId, which returns a function that takes habitId
  function createHabitFunctionsFactory(trackId: string) {
    return (projectId: string) => (habitId: string): HabitFunctions => ({
      onEdit: (habit) => trackNoteService.updateProjectHabit(trackId, projectId, habitId, habit),
      onDelete: () => trackNoteService.deleteProjectHabit(trackId, projectId, habitId),
    });
  }
</script>

<pre>
  {JSON.stringify(parsedTracks, null, 2)}
</pre>

<div class="container">
	<h1>Tracks View</h1>
  <div class="header-row">
    <h2>Manage Tracks</h2>
    <button 
      class="add-track-button"
      onclick={() => trackNoteService.handleNewTrack()}
    >
      + New Track
    </button>
  </div>
	<div class="card-container">
    {#each Object.values(parsedTracks) as track}
      <TrackCard
        {track}
        trackFunctions={createTrackFunctions(track.id)}
        createProjectFunctions={createProjectFunctionsFactory(track.id)}
        createHabitFunctions={createHabitFunctionsFactory(track.id)}
      />
    {/each}
  </div>

  <h2>Schedule Tracks</h2>

</div>

<style>
    .container {
      margin: 5%;
      max-height: 80vh;
    }

		.card-container {
			display: flex;
      flex-direction: column;
		}

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1em;
    }

    .add-track-button {
      padding: 8px 16px;
      background-color: var(--interactive-accent);
      color: var(--text-on-accent);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }

    .add-track-button:hover {
      background-color: var(--interactive-accent-hover);
    }
</style>