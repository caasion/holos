<script lang="ts">
	import { type App } from "obsidian";
	import { sortedTemplateDates, templates } from "src/templates/templatesStore";
	import type { HelperService, ISODate } from "src/plugin/types";
	import { getISODate } from "src/plugin/helpers";
	import type { TemplateActions } from "./templateActions";
	import type { TrackActions } from "src/tracks/trackActions";

    interface ViewProps {
        app: App;
        templatesAct: TemplateActions;
        trackAct: TrackActions;
        helper: HelperService;
    }

    let { app, templatesAct, trackAct, helper }: ViewProps = $props();

    let selectedTemplate = $state<ISODate>(templatesAct.getTemplateDate(getISODate(new Date())) ?? "");

    function handleNewTemplate() {
        templatesAct.handleNewTemplate(app);
    }

</script>

<div class="container">
    <div class="section">
        <div class="header">
            <h2>Templates</h2>
            <button onclick={handleNewTemplate}>+ New</button>
        </div>
        <div class="templates-selector">
            {#each $sortedTemplateDates as tDate} 
                <div class="template">
                    <div 
                    class="template-label" 
                    role="button"
                    tabindex="0"
                    onclick={() => selectedTemplate = tDate}
                    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ' && (selectedTemplate = tDate))}
                    >
                        {tDate}
                    </div>
                    <div>
                        <button
                            onclick={() => templatesAct.handleRemoveTemplate(app, tDate)}
                        >
                            ×
                        </button>
                    </div>
                </div>
                
            {/each}
        </div>

    </div>
    <div class="section">
        <h2>Template {selectedTemplate}</h2>
        <div class="items-container">
            {#if selectedTemplate !== ""}
            {#each Object.entries($templates[selectedTemplate]).sort(([, aMeta], [, bMeta]) => aMeta.order - bMeta.order) as [id, meta] (id) }
            <div class="item">
                <div 
                    class="item-label"
                    role="button"
                    tabindex="0"
                    style="color: {meta.color};"
                    onclick={(e: MouseEvent) => trackAct.openTrackMenu(app, e, selectedTemplate, id, meta)}
                    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ')}
                >
                    {meta.label}
                </div>
                <div>
                    <button onclick={() => trackAct.swapTracks(selectedTemplate, id, -1)}>▲</button>
                    <button onclick={() => trackAct.swapTracks(selectedTemplate, id, 1)}>▼</button>
                </div>
            </div>
                
            {/each}
            <button onclick={(e) => trackAct.handleNewTrack(app, selectedTemplate)}>+ Add</button>
            {:else}
            <button onclick={(e) => {
                trackAct.handleNewTrack(app, selectedTemplate);
                selectedTemplate = templatesAct.getTemplateDate(helper.getISODate(new Date()));
                }}>+ Add</button>
            {/if}
            
        </div>
    </div>
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