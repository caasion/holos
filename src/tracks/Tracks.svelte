<script lang="ts">
	import TrackCard from "./TrackCard.svelte";
  import { sampleTemplateData } from "src/templates/sampleTemplateData";

  const tracks = Object.values(sampleTemplateData["2026-02-01"].tracks)
</script>

<div class="container">
	<h1>Tracks View</h1>
  <h2>Manage Tracks</h2>
	<div class="card-container">
    {#each tracks as track}
    <TrackCard
      {track}
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
      grid-column-gap: 6px;
		}
	


</style>