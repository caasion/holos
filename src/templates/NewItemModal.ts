import { Modal, App, Setting } from "obsidian";
import { generateID } from "src/plugin/helpers";
import type { ISODate, CalendarMeta, ItemType, ItemMeta } from "src/plugin/types";

export class NewItemModal extends Modal {
    constructor(app: App, type: ItemType, tDate: ISODate, onSubmit: (date: ISODate, meta: ItemMeta) => void) {
        super(app);

        const { contentEl } = this;
        let date: ISODate = tDate;
        let meta: ItemMeta = {
                id: generateID("ai-"),
                type: "action",
                order: -1, // We set the order in when newItem is called
                label: "",
                color: "#cccccc",
                floatCell: "",
                innerMeta: {
                    timeCommitment: 0,
                    habits: [],
                    journalHeader: ""
                },
            } as ItemMeta;

        if (type === "calendar") {
            meta = meta as CalendarMeta;
            meta.type = "calendar"
            meta.url = ""
        }
        
        new Setting(contentEl).setName("Create New Item").setHeading();

        new Setting(contentEl)
            .setName("Name")
            .setDesc("The display name of the item (cannot be empty).")
            .addText((t) => t.onChange((v) => (meta.label = v)));

        // Create error label (hidden by default)
        const errorLabel = document.createElement("label");
            errorLabel.textContent = "Item name cannot be empty";
            errorLabel.style.color = "var(--text-error)";
            errorLabel.style.display = "none";
            errorLabel.style.marginBottom = "1em";
        
        contentEl.appendChild(errorLabel);

        new Setting(contentEl)
            .setName("ID")
            .setDesc("The ID of the item (randomly generated and unmodifiable).")
            .addText((t) => {
                t.setDisabled(true);
                t.setValue(meta.id);
            });

        new Setting(contentEl)
            .setName("Color")
            .setDesc("The accent color of the item.")
            .addColorPicker(c => {
                c.setValue(meta.color);
                c.onChange((v) => meta.color = v);
            });
        
        if (type === "calendar") {
            new Setting(contentEl)
                .setName("Remote Calendar URL")
                .setDesc("The link to the remote calendar (where events are fetched from).")
                .addText((t) => t.onChange((v) => ((meta as CalendarMeta).url = v)));
        }

        new Setting(contentEl)
            .setName("Time Commitment")
            .setDesc("The planned daily commitment (in hours) per day. Set to 0 for none.")
            .addSlider(s => {
                s.setValue(0)
                s.setLimits(0, 12, 1)
                s.onChange(v => meta.innerMeta.timeCommitment = v)
            })

        const descFragment = document.createDocumentFragment();
        descFragment.appendText("The header text which the plugin should search for journal information.");
        descFragment.createEl("br");
        descFragment.appendText("Include exact markdown syntax. Leave blank if unknown.");

        new Setting(contentEl)
            .setName("Journal Header")
            .setDesc(descFragment)
            .addText(t => {
                t.setValue("")
                t.onChange(v => meta.innerMeta.journalHeader = v)
            })

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