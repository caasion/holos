import { Modal, Setting, type App } from "obsidian";
import type { CalendarMeta, ItemMeta } from "src/types";

export class GenericEditModal extends Modal {
    constructor(app: App, initial: ItemMeta, onSubmit: (meta: ItemMeta) => void) {
        super(app);

        const { contentEl } = this;
        let meta: ItemMeta = { ...initial };

        new Setting(contentEl)
            .setName("Name: ")
            .addText((t) => t.setValue(meta.label).onChange((v) => (meta.label = v)));
        
        // Create error label (hidden by default)
        const errorLabel = document.createElement("label");
            errorLabel.textContent = "Item name cannot be empty";
            errorLabel.style.color = "var(--text-error)";
            errorLabel.style.display = "none";
        
        contentEl.appendChild(errorLabel);

        new Setting(contentEl)
            .setName("ID")
            .addText((t) => {
                t.setDisabled(true);
                t.setValue(meta.id);
            });

        new Setting(contentEl)
            .setName("Color: ")
            .addColorPicker(c =>
                c.setValue(meta.color)
                 .onChange((v) => meta.color = v)
            );

        if (meta.type === "calendar") {
            new Setting(contentEl)
                .setName("Remote Calendar URL: ")
                .addText((t) => t.setValue((meta as CalendarMeta).url ?? "").onChange((v) => ((meta as CalendarMeta).url = v)));
        }

        new Setting(contentEl)
            .addButton((b) => b.setButtonText("Save").setCta().onClick(() => {
                if (meta.label == "") {
                    errorLabel.style.display = "block";
                    return;
                }
                onSubmit(meta);
                this.close();
            }))
            .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
    }
}