<script lang="ts">
	import type { App } from "obsidian";
	import type { TrackNoteService } from "src/tracks/logic/trackNote";

  interface TracksProps {
    app: App;
    trackNoteService: TrackNoteService;
  }

  let { app, trackNoteService }: TracksProps = $props();

  const startDate = "2026-01-30";
  const endDate = "2026-02-30";

  // Load tracks and projects information

  // dates selection
  // effect -> dates & projects mapping

  const tracksByDateStore = trackNoteService.tracksByDate;

  function searchForEffectiveTracks() {
    // Iterate through all tracks' effective dates
    // Add it to the day -> tracks map
  }

  // more efficient approach:
  // cache these results for a certain time frame

  // -> do it in trackNote.ts and only retrieve the necessary dates
</script>

<pre>
  {JSON.stringify($tracksByDateStore, null, 2)}
</pre>