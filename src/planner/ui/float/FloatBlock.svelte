<script lang="ts">
    import { getISODate } from "src/plugin/helpers";
    import { setFloatCell, getFloatCell } from "src/planner/plannerStore";
    import InputCell from "src/planner/ui/float/InputCell.svelte";
    import type { ItemID, ISODate, ItemMeta } from "src/plugin/types";
    import { format } from "path";

    interface RenderItem {
        id: ItemID;
        meta: ItemMeta;
    }

    interface BlockProps {
        templates: Record<ISODate, RenderItem[]>;
        contextMenu: (e: MouseEvent, tDate: ISODate, id: ItemID, meta: ItemMeta) => void;
        focusCell: (opt: boolean) => false; // Not implemeneted
    }

    let { templates, contextMenu, focusCell }: BlockProps = $props();
</script>

<div class="float-block-container">
    {#each Object.entries(templates) as [tDate, template], block (tDate)}
    <div class="float-block">
        <div class="header-row">
            <div class="header-cell">
                {tDate}
            </div>
        </div>
        <div class="float-columns-container">
            {#each template as {id, meta}, col (id)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
                class="float-cell"
                oncontextmenu={(e) => contextMenu(e, tDate, id, meta)}
                style={`background-color: ${meta.color}10;`}
            >
                <div class="column-label" style={`background-color: ${meta.color}80; color: white;`}>
                    {meta.type == "calendar" ? "📅" : ""} {meta.label}
                </div>
                <InputCell 
                    id={`${id}-${block}-${col}`} 
                    getCell={() => getFloatCell(tDate, id)} 
                    setCell={(value: string) => setFloatCell(tDate, id, value)} 
                    {focusCell}
                />
            </div>
            {/each}
        </div>
    </div>
    {/each}
</div>

<style>
    .float-block-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        justify-content: center;
        align-items: center;
        padding-bottom: 1em;
        width: 100%;
    }

    .float-block {
        border: 1px solid #ccc;
        max-width: 100%;
    }

    .header-row {
        border-bottom: 2px solid #ccc;
        padding: 8px 0;
        background-color: var(--background-primary);
    }

    .header-cell {
        text-align: center;
        padding: 4px;
    }

    .float-columns-container {
        display: flex;
        align-items: stretch;
        overflow-x: auto;
        overflow-y: hidden;
        width: fit-content;
        max-width: 100%;
        min-height: 40px;
    }

    .column-label {
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 600;
        margin-bottom: 4px;
        font-size: 0.9em;
        width: fit-content;
    }

    .float-cell {
        border-right: 1px dotted #ccc;
        border-bottom: 1px dashed #ccc;
        padding: 4px;
        min-width: 10em;
        min-height: 40px;
    }
</style>