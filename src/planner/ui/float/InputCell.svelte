<script lang="ts">
    import { onMount } from "svelte";
    import { Editor, rootCtx, defaultValueCtx } from "@milkdown/core";
    import { nord } from "@milkdown/theme-nord";
    import { history } from "@milkdown/kit/plugin/history";
    import { listener, listenerCtx } from "@milkdown/kit/plugin/listener"
    import { commonmark } from "@milkdown/preset-commonmark";
    import { keymap } from '@milkdown/prose/keymap';
    import { prosePluginsCtx } from "@milkdown/core";

    interface CellProps {
        id: string;
        getCell: () => string;
        setCell: (value: string) => void | boolean;
        focusCell: (opt: boolean) => false; // Not implemented
    }

    let { id, getCell, setCell, focusCell }: CellProps = $props();

    let container: HTMLDivElement;
    let editorInstance: Editor | null = null;
    let alive = true;

    onMount(() => {
        Editor.make()
            .config(nord)
            .use(listener)
            .config((ctx) => {
                ctx.set(rootCtx, container);
                ctx.set(defaultValueCtx, getCell());

                // Listen for changes
                ctx.get(listenerCtx)
                    .focus(() => {
                        focusCell(true);
                    })
                    .markdownUpdated((_, markdown) => {
                        setCell(markdown);
                    });

                ctx.update(prosePluginsCtx, (plugins) => [
                    keymap({
                        Tab: () => {
                            const moved = focusCell(false);
                            return !!moved; 
                        },
                        "Shift-Tab": () => {
                            const moved = focusCell(false);
                            return !!moved;
                        },
                    }),
                    ...plugins,
                ])
            })
            .use(commonmark)
            .use(history)
            .create()
            .then((editor) => {
                if (!alive) {
                    editor.destroy();
                    return;
                }
                editorInstance = editor;
            });
        
        return () => {
            alive = false;
            if (editorInstance) {
                editorInstance.destroy();
                editorInstance = null;
            }
        }
    })
</script>

<div 
    id={`cell-${id}`} 
    bind:this={container}
    tabIndex="0"
    class="milkdown-editor"
></div>

<style>
	.milkdown-editor {
		background-color: none;
        height: 100%;
	}

    
</style>
