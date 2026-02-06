<script lang="ts">
  interface RRuleEditorProps {
    position: { x: number; y: number; };
    selectedDays: Set<number>;
    onSave: (selectedDays: Set<number>) => void;
    onCancel: () => void;
  }

  let { position, selectedDays, onSave, onCancel }: RRuleEditorProps = $props();
    
  const daysOfWeek = [
    { label: 'Su', full: 'Sunday', value: 0 },
    { label: 'Mo', full: 'Monday', value: 1 },
    { label: 'Tu', full: 'Tuesday', value: 2 },
    { label: 'We', full: 'Wednesday', value: 3 },
    { label: 'Th', full: 'Thursday', value: 4 },
    { label: 'Fr', full: 'Friday', value: 5 },
    { label: 'Sa', full: 'Saturday', value: 6 }
  ];
  
  let localSelectedDays = $state<Set<number>>(selectedDays);
  
  function toggleDay(day: number) {
    if (localSelectedDays.has(day)) {
      localSelectedDays.delete(day);
    } else {
      localSelectedDays.add(day);
    }
    localSelectedDays = new Set(localSelectedDays);
  }
  
  function handleSave() {
    onSave(localSelectedDays);
  }
  
  function handleCancel() {
    onCancel();
  }
</script>

<div 
  class="rrule-editor-modal" 
  style={position ? `left: ${position.x}px; top: ${position.y}px;` : ''}
>
  <div class="rrule-editor-content">
    <h3 class="rrule-title">Recurrence</h3>
    
    <div class="dow-selector">
      {#each daysOfWeek as day}
        <button
          class="day-circle"
          class:selected={localSelectedDays.has(day.value)}
          onclick={() => toggleDay(day.value)}
          title={day.full}
          aria-label={day.full}
        >
          {day.label}
        </button>
      {/each}
    </div>
    
    <div class="button-row">
      <button class="cancel-button" onclick={handleCancel}>Cancel</button>
      <button class="save-button" onclick={handleSave}>Save</button>
    </div>
  </div>
</div>

<style>
  .rrule-editor-modal {
    position: fixed;
    z-index: 1000;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 16px;
    min-width: 300px;
  }
  
  .rrule-editor-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .rrule-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-normal);
  }
  
  .dow-selector {
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;
  }
  
  .day-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid var(--background-modifier-border);
    background: var(--background-secondary);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .day-circle:hover {
    border-color: var(--interactive-accent);
    background: var(--background-primary-alt);
  }
  
  .day-circle.selected {
    background: var(--interactive-accent);
    border-color: var(--interactive-accent);
    color: var(--text-on-accent);
  }
  
  .button-row {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  
  .cancel-button,
  .save-button {
    padding: 6px 16px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }
  
  .cancel-button {
    background: var(--background-secondary);
    color: var(--text-normal);
  }
  
  .cancel-button:hover {
    background: var(--background-modifier-hover);
  }
  
  .save-button {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
  }
  
  .save-button:hover {
    background: var(--interactive-accent-hover);
  }
</style>

