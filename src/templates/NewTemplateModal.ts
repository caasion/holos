import { Modal, App, Setting } from "obsidian";
import { templates } from "src/templates/templatesStore";
import type { ISODate } from "src/plugin/types";
import { get } from "svelte/store";

export class NewTemplateModal extends Modal {
    constructor(app: App, date: ISODate, onSubmit: (tDate: ISODate, copyFrom: ISODate) => void) {
        super(app);

        const { contentEl } = this

        new Setting(contentEl).setName("Create New Template").setHeading();

        const dateContainer = document.createElement("div");
            dateContainer.setCssStyles({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                margin: "10px 0px",
            })
        const dateLabel = document.createElement("label");
            dateLabel.textContent = "Date: ";
        const dateInput = document.createElement("input");
            dateInput.type = "date";
            dateInput.value = date;
            dateInput.addEventListener("input", (e) => {
                date = (e.target as HTMLInputElement).value;
            });
        dateContainer.appendChild(dateLabel);
        dateContainer.appendChild(dateInput);

        contentEl.appendChild(dateContainer);

        let copyFrom = '';
        
        new Setting(contentEl).setName("Create from Template")
            .addDropdown((dropdown) => {
                dropdown.addOption('', 'none');
                const templs = get(templates);
                for (const key in templs) {
                    dropdown.addOption(key, key);
                }
                dropdown.onChange(v => copyFrom = v)
            })

        new Setting(contentEl)
            .addButton((b) => b.setButtonText("Add").setCta().onClick(() => {
                onSubmit(date, copyFrom);
                this.close();
            }))
            .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
    }
}