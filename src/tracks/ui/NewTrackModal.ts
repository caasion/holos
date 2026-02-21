import { Modal, App, Setting } from "obsidian";
import { generateID } from "src/plugin/helpers";
import type { ISODate, Track } from "src/plugin/types";

export class NewTrackModal extends Modal {
    constructor(app: App, order: number, tDate: ISODate, onSubmit: (track: Track) => void) {
        super(app);

        const { contentEl } = this;
        
        let track: Track = {
            id: generateID("track-"),
            order: order,
            color: "#cccccc",
            effective: [{ start: tDate }],
            timeCommitment: 0,
            journalHeader: "",

            label: "",
            description: "",
            projects: {},
        };
        
        new Setting(contentEl).setName("Create New Track").setHeading();

        new Setting(contentEl)
            .setName("Name")
            .setDesc("The display name of the track (cannot be empty).")
            .addText((t) => t.onChange((v) => (track.label = v)));

        // Create error label (hidden by default)
        const errorLabel = document.createElement("label");
            errorLabel.textContent = "Track name cannot be empty";
            errorLabel.style.color = "var(--text-error)";
            errorLabel.style.display = "none";
            errorLabel.style.marginBottom = "1em";
        
        contentEl.appendChild(errorLabel);

        new Setting(contentEl)
            .setName("ID")
            .setDesc("The ID of the track (randomly generated and unmodifiable).")
            .addText((t) => {
                t.setDisabled(true);
                t.setValue(track.id);
            });

        new Setting(contentEl)
            .setName("Color")
            .setDesc("The accent color of the track.")
            .addColorPicker(c => {
                c.setValue(track.color);
                c.onChange((v) => track.color = v);
            });

        new Setting(contentEl)
            .setName("Time Commitment")
            .setDesc("The planned daily commitment (in hours) per day. Set to 0 for none.")
            .addSlider(s => {
                s.setValue(0)
                s.setLimits(0, 12, 0.25)
                s.setDynamicTooltip()
                s.onChange(v => track.timeCommitment = v * 60)
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
                t.onChange(v => track.journalHeader = v)
            })

        new Setting(contentEl)
            .addButton((b) => b.setButtonText("Add").setCta().onClick(() => {
                if (track.label == "") {
                    errorLabel.style.display = "block";
                    return;
                }
                onSubmit(track);
                this.close();
            }))
            .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
    }
}
