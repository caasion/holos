<script lang="ts">
	import TrackCard from "./TrackCard.svelte";


</script>

<div class="container">
	<h1>Manage Tracks</h1>
	<div class="card-container">
		<TrackCard
      label="Track 1"
      innerMeta={{}}
      items={["a", "b"]}
    />
    <TrackCard
      label="Track 1"
      innerMeta={{}}
      items={["a", "b"]}
    />
    <TrackCard
      label="Track 1"
      innerMeta={{}}
      items={["a", "b"]}
    />
  </div>
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