import { Modal, App, Setting, Menu } from "obsidian";

export class EditTrackLabelModal extends Modal {
    constructor(
        app: App, 
        currentLabel: string, 
        onSave: (label: string) => void,
        onDelete?: () => void
    ) {
        super(app);

        const { contentEl } = this;
        let label = currentLabel;
        
        new Setting(contentEl).setName("Edit Track Name").setHeading();

        new Setting(contentEl)
            .setName("Name")
            .setDesc("The display name of the track (cannot be empty).")
            .addText((t) => {
                t.setValue(currentLabel);
                t.onChange((v) => (label = v));
                // Focus the input and select all text
                setTimeout(() => {
                    t.inputEl.focus();
                    t.inputEl.select();
                }, 10);
            });

        // Create error label (hidden by default)
        const errorLabel = document.createElement("label");
            errorLabel.textContent = "Track name cannot be empty";
            errorLabel.style.color = "var(--text-error)";
            errorLabel.style.display = "none";
            errorLabel.style.marginBottom = "1em";
        
        contentEl.appendChild(errorLabel);

        const buttonSetting = new Setting(contentEl)
            .addButton((b) => b.setButtonText("Save").setCta().onClick(() => {
                if (label == "") {
                    errorLabel.style.display = "block";
                    return;
                }
                onSave(label);
                this.close();
            }))
            .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));

        // Add delete button if onDelete callback is provided
        if (onDelete) {
            buttonSetting.addButton((b) => 
                b.setButtonText("Delete")
                 .setWarning()
                 .onClick(() => {
                    onDelete();
                    this.close();
                 })
            );
        }
    }
}
