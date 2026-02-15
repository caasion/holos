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
      onLabelEdit={(label) => trackNoteService.updateTrackLabel(track.id, label)}
      onDescriptionEdit={(description) => trackNoteService.updateTrackDescription(track.id, description)}
      onFrontmatterEdit={(frontmatter) => trackNoteService.updateTrackFrontmatter(track.id, frontmatter)}
      onHabitsEdit={(habits) => trackNoteService.updateTrackHabits(track.id, habits)}
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