<script lang="ts">
	import type { Habit, Track } from "src/plugin/types";
	import type { TrackActions } from "./trackActions";
	import TrackCard from "./TrackCard.svelte";
  import { sampleTemplateData } from "src/templates/sampleTemplateData";
	import { templates } from "src/templates/templatesStore";
  import type { App } from "obsidian";

  interface TracksProps {
    trackAct: TrackActions;
    app: App;
  }

  let { trackAct, app }: TracksProps = $props();

  const tDate = "2026-02-01";

  const tracks = $derived($templates ? Object.values($templates[tDate].tracks) : [])
</script>

<div class="container">
	<h1>Tracks View</h1>
  <div class="header-row">
    <h2>Manage Tracks</h2>
    <button 
      class="add-track-button"
      onclick={() => trackAct.handleNewTrack(app, tDate)}
    >
      + New Track
    </button>
  </div>
	<div class="card-container">
    {#each tracks as track}
    <TrackCard
      {track}
      onHabitRRuleEdit={(habitId, rrule) => trackAct.updateHabitRRule(tDate, track.id, habitId, rrule)}
      onHabitLabelEdit={(habitId, label) => trackAct.updateHabitLabel(tDate, track.id, habitId, label)}
      onHabitDelete={(habitId) => trackAct.removeHabitFromTrack(tDate, track.id, habitId)}
      onHabitAdd={() => trackAct.addHabitToTrack(app, tDate, track.id)}
      onProjectEdit={(project) => trackAct.updateTrackProject(tDate, track.id, project)}
      onTrackLabelClick={() => trackAct.handleEditTrackLabel(app, tDate, track.id, track.label)}
      onJournalHeaderDoubleClick={() => trackAct.handleEditJournalHeader(app, tDate, track.id, track.journalHeader)}
      onTimeCommitmentDoubleClick={() => trackAct.handleEditTrackTime(app, tDate, track.id, track.timeCommitment)}
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