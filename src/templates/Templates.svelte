<script lang="ts">
	import { type App } from "obsidian";
	import { sortedTemplateDates, templates } from "src/templates/templatesStore";
	import type { ISODate } from "src/plugin/types";
	import { getISODate } from "src/plugin/helpers";
	import type { TemplateActions } from "./templateActions";
	import Tracks from "src/tracks/ui/Tracks.svelte";

    interface ViewProps {
        app: App;
        templatesAct: TemplateActions;
    }

    let { app, templatesAct }: ViewProps = $props();

    // TODO: Current tracks

</script>

<div class="container">
    <Tracks />
</div>

<style>
    .container {
        margin: 5%;
        display: flex;
        max-height: 80vh;
    }

    .section {
        border: 2px solid #acacac;
        border-style: solid;
        border-radius: 4px;
        width: 100%;
        height: 100%;
        padding: 10px;
        margin: 0px 5px;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
    }

    .template {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 5px;
    }   

    .template:hover {
        background-color: var(--theme-color-translucent-01);
        
    }

    .items-container {
        display: flex;
        flex-direction: column;
    }

    .item {
        border: 2px solid #acacac;
        border-style: solid;
        border-radius: 4px;
        width: 100%;
        padding: 5px;
        margin: 5px 0px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .item-label {
        flex-grow: 2;
    }

    .item:hover {
        background-color: var(--theme-color-translucent-01);
    }
</style>