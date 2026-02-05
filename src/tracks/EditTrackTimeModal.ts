import { Modal, App, Setting } from "obsidian";

export class EditTrackTimeModal extends Modal {
    constructor(
        app: App, 
        currentTimeMinutes: number, 
        onSave: (timeMinutes: number) => void
    ) {
        super(app);

        const { contentEl } = this;
        let timeMinutes = currentTimeMinutes;
        
        new Setting(contentEl).setName("Edit Time Commitment").setHeading();

        new Setting(contentEl)
            .setName("Time Commitment")
            .setDesc("The planned daily commitment (in hours) per day. Set to 0 for none.")
            .addSlider(s => {
                s.setValue(currentTimeMinutes / 60)
                s.setLimits(0, 12, 0.5)
                s.setDynamicTooltip()
                s.onChange(v => timeMinutes = v * 60)
            })

        new Setting(contentEl)
            .addButton((b) => b.setButtonText("Save").setCta().onClick(() => {
                onSave(timeMinutes);
                this.close();
            }))
            .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
    }
}
