<script lang="ts">
	import CircularProgress from "src/planner/ui/grid/CircularProgress.svelte";
import type { Track } from "src/plugin/types";

  interface TrackCardProps {
    track: Track;
  }

  let { track }: TrackCardProps = $props();
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
  
  
  {#each track.habits as habit}
    <div>{habit.label}</div>
    <!-- Cell block like editing with tag for recurrance -->
  {/each}
  
  <!-- Project Card -->
  
</div>


<style>
  .card {
    border: 2px solid #acacac;
    border-style: solid;
    border-radius: 1rem;
    width: 100%;
    height: 100%;
    padding: 10px;
    margin: 0px 5px;
  }

  .card-header {
    margin: auto 2px;
  }

  .card-header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-data-container {
    display: flex;
    align-items: center;
  }
</style>