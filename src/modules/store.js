import { debounce } from './utils.js';

export function createStore(options) {
  const {
    getState,
    setState,
    getSelectedIndex,
    effects = {},
    maxHistory = 40
  } = options;

  const {
    save = () => {},
    render = () => {},
    generate = () => {},
    validate = () => {}
  } = effects;

  const undoStack = [];
  let redoStack = [];

  // Debounce YAML generation & validation - these are expensive and run on every keystroke.
  const scheduleExpensive = debounce(() => { generate(); validate(); }, 400);

  // Debounce render to avoid re-rendering the entire editor panel on every keystroke.
  const scheduleRender = debounce(() => { render(); }, 50);

  let effectsScheduled = false;
  function scheduleEffects() {
    if (effectsScheduled) return;
    effectsScheduled = true;
    queueMicrotask(() => {
      effectsScheduled = false;
      save();
      scheduleRender();
    });
    scheduleExpensive();
  }

  function snapshot() {
    return JSON.stringify({
      state: getState(),
      selectedIndex: getSelectedIndex()
    });
  }

  function restore(snap) {
    const parsed = JSON.parse(snap);
    setState(parsed.state);
    if (typeof window.selectedButtonIndex !== 'undefined') {
      window.selectedButtonIndex = Math.max(0, Math.min(
        parsed.selectedIndex || 0,
        getState().buttons.length - 1
      ));
    }
    scheduleExpensive.cancel();
    scheduleRender.cancel();
    save();
    render();
    generate();
    validate();
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  return {
    update(label, mutator, opts = {}) {
      if (!opts.skipUndo) {
        undoStack.push(snapshot());
        if (undoStack.length > maxHistory) undoStack.shift();
        redoStack = [];
      }

      mutator(getState());
      scheduleEffects();
      updateHistoryButtons();
    },

    button(field, value, opts = {}) {
      const idx = opts.index ?? getSelectedIndex();
      const state = getState();
      if (idx < 0 || idx >= state.buttons.length) return;
      this.update(`Update ${field}`, state => {
        state.buttons[idx][field] = value;
      }, opts);
    },

    buttonPatch(patch, opts = {}) {
      const idx = opts.index ?? getSelectedIndex();
      this.update('Update button', state => {
        Object.assign(state.buttons[idx], patch);
      }, opts);
    },

    undo() {
      if (!undoStack.length) return false;
      redoStack.push(snapshot());
      restore(undoStack.pop());
      return true;
    },

    redo() {
      if (!redoStack.length) return false;
      undoStack.push(snapshot());
      restore(redoStack.pop());
      return true;
    },

    canUndo() {
      return undoStack.length > 0;
    },

    canRedo() {
      return redoStack.length > 0;
    },

    clearHistory() {
      undoStack.length = 0;
      redoStack = [];
      updateHistoryButtons();
    },

    getHistoryStats() {
      return {
        undoStack: undoStack.length,
        redoStack: redoStack.length
      };
    }
  };
}
