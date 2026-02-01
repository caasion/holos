<script lang="ts">
	import type { ItemInnerMeta } from "src/plugin/types";

  interface TrackCardProps {
    label: string;
    innerMeta: ItemInnerMeta;
    items: string[]
  }

  let { label, innerMeta, items }: TrackCardProps = $props();
</script>

<div class="card">
  <div class="card-header-container">
    <h2>{label}</h2>
    <div class="card-data-container">
      <div>📜</div>
      <div>O</div>
    </div>
  </div>
  
  <p>Habit 1 <br> Habit 2 <br> Habit 3</p>
  {#each items as item}
    <p>{item}</p>
  {/each}
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

  .card-header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-data-container {
    display: flex;
  }
</style>