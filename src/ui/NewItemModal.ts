import { Modal, App, Setting } from "obsidian";
import { generateID } from "src/actions/helpers";
import { templates } from "src/state/plannerStore";
import type { ISODate, CalendarMeta, ItemType, ItemMeta } from "src/types";
import { get } from "svelte/store";

export class NewItemModal extends Modal {
    constructor(app: App, type: ItemType, tDate: ISODate, onSubmit: (date: ISODate, meta: ItemMeta) => void) {
        super(app);

        const { contentEl } = this;
        let date: ISODate = tDate;
        let meta: ItemMeta;

        if (type === "action") {
            meta = {
                id: generateID("ai-"),
                type: "action",
                order: -1, // We set the order in when newItem is called
                label: "",
                color: "#cccccc",
            } as ItemMeta;
        } else if (type === "calendar") {
            meta = {
                id: generateID("cal-"),
                type: "calendar",
                order: -1,
                label: "",
                color: "#cccccc",
                url: "",
            } as ItemMeta;
        }
        
        new Setting(contentEl).setName("Create New Item").setHeading();

        new Setting(contentEl)
            .setName("Name: ")
            .addText((t) => t.onChange((v) => (meta.label = v)));

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
            .addColorPicker(c => {
                c.setValue(meta.color);
                c.onChange((v) => meta.color = v);
            }
            );

        if (type === "calendar") {
            new Setting(contentEl)
                .setName("Remote Calendar URL: ")
                .addText((t) => t.onChange((v) => ((meta as CalendarMeta).url = v)));
        }

        new Setting(contentEl)
            .addButton((b) => b.setButtonText("Add").setCta().onClick(() => {
                if (meta.label == "") {
                    errorLabel.style.display = "block";
                    return;
                }
                onSubmit(date, meta);
                this.close();
            }))
            .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
    }
}