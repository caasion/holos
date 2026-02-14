<script lang="ts">
	import type { Habit, Track } from "src/plugin/types";
	import TrackCard from "./TrackCard.svelte";
  import type { TrackNoteService } from "../logic/trackNote";

  interface TracksProps {
    trackNoteService: TrackNoteService;
  }

  let { trackNoteService }: TracksProps = $props();

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
</script>

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
      onHabitRRuleEdit={(habitId, rrule) => trackNoteService.updateHabitRRule(track.id, habitId, rrule)}
      onHabitLabelEdit={(habitId, label) => trackNoteService.updateHabitLabel(track.id, habitId, label)}
      onHabitDelete={(habitId) => trackNoteService.removeHabitFromTrack(track.id, habitId)}
      onHabitAdd={() => trackNoteService.addHabitToTrack(track.id)}
      onProjectEdit={(project) => {/* TODO: Implement project switching */}}
      onTrackLabelClick={() => trackNoteService.handleEditTrackLabel(track.id, track.label)}
      onJournalHeaderDoubleClick={() => trackNoteService.handleEditJournalHeader(track.id, track.journalHeader)}
      onTimeCommitmentDoubleClick={() => trackNoteService.handleEditTrackTime(track.id, track.timeCommitment)}
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
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			grid-template-rows: auto;
      grid-column-gap: 8px;
      grid-row-gap: 12px;
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