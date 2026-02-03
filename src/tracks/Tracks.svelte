<script lang="ts">
	import type { Habit, Track } from "src/plugin/types";
	import type { TrackActions } from "./trackActions";
	import TrackCard from "./TrackCard.svelte";
  import { sampleTemplateData } from "src/templates/sampleTemplateData";
	import { templates } from "src/templates/templatesStore";

  interface TracksProps {
    trackAct: TrackActions;
  }

  let { trackAct }: TracksProps = $props();

  const tDate = "2026-02-01";

  const tracks = $derived($templates ? Object.values($templates[tDate].tracks) : [])
</script>

<div class="container">
	<h1>Tracks View</h1>
  <h2>Manage Tracks</h2>
	<div class="card-container">
    {#each tracks as track}
    <TrackCard
      {track}
      onTrackEdit={(updates: Partial<Track>) => trackAct.updateTrack(tDate, track.id, updates)}
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
	


</style>