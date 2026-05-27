// ============================================================
// BUTTON OPERATIONS MODULE
// ============================================================

/**
 * Factory for button copy/paste/reset operations.
 * @param {Function} getState - Getter returning current appState
 * @param {Function} getSelectedIndex - Getter returning selectedButtonIndex
 * @param {object} store - Store with .update() method
 * @param {Function} showToast - Toast notification function
 */
export function createButtonOperations(getState, getSelectedIndex, store, showToast) {
  let copiedButtonConfig = null;

  function copySelectedButton() {
    const state = getState();
    const idx = getSelectedIndex();
    copiedButtonConfig = structuredClone(state.buttons[idx]);
    showToast('Button config copied', 'success');
  }

  function pasteToSelectedButton() {
    if (!copiedButtonConfig) {
      showToast('No button config to paste', 'warning');
      return;
    }
    const idx = getSelectedIndex();
    store.update('Paste button config', state => {
      const pasted = structuredClone(copiedButtonConfig);
      pasted.id = state.buttons[idx].id;
      pasted.col = state.buttons[idx].col;
      pasted.row = state.buttons[idx].row;
      state.buttons[idx] = pasted;
    });
    showToast('Button config pasted', 'success');
  }

  function resetSelectedButton() {
    const state = getState();
    const idx = getSelectedIndex();
    const btn = state.buttons[idx];
    store.update('Reset button', next => {
      next.buttons[idx] = {
        id: btn.id,
        name: btn.name,
        col: btn.col,
        row: btn.row,
        empty: true
      };
    });
    showToast('Button slot cleared', 'success');
  }

  return { copySelectedButton, pasteToSelectedButton, resetSelectedButton };
}
