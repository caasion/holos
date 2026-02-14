import { Modal, App, Setting } from "obsidian";

export class EditJournalHeaderModal extends Modal {
    constructor(
        app: App, 
        currentHeader: string, 
        onSave: (header: string) => void
    ) {
        super(app);

        const { contentEl } = this;
        let header = currentHeader;
        
        new Setting(contentEl).setName("Edit Journal Header").setHeading();

        const descFragment = document.createDocumentFragment();
        descFragment.appendText("The header text which the plugin should search for journal information.");
        descFragment.createEl("br");
        descFragment.appendText("Include exact markdown syntax. Leave blank if unknown.");

        new Setting(contentEl)
            .setName("Journal Header")
            .setDesc(descFragment)
            .addText(t => {
                t.setValue(currentHeader)
                t.onChange(v => header = v)
                // Focus the input
                setTimeout(() => {
                    t.inputEl.focus();
                }, 10);
            })

        new Setting(contentEl)
            .addButton((b) => b.setButtonText("Save").setCta().onClick(() => {
                onSave(header);
                this.close();
            }))
            .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
    }
}
