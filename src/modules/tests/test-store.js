import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { createStore } from '../store.js';
import { DEFAULT_CONFIG } from '../config.js';

// Mock DOM: store calls document.getElementById and window.selectedButtonIndex
const origDocument = globalThis.document;
const origWindow = globalThis.window;
const origQueueMicrotask = globalThis.queueMicrotask;

Object.defineProperty(globalThis, 'document', {
  value: { getElementById: () => ({ disabled: false }) },
  writable: true, configurable: true
});
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  get: () => _wSelected,
  set: (v) => { if (typeof v === 'object' && v !== null) Object.assign(_wSelected, v); }
});
let _wSelected = { selectedButtonIndex: 0 };

// Replace queueMicrotask with synchronous execution for deterministic tests
Object.defineProperty(globalThis, 'queueMicrotask', {
  value: (cb) => cb(),
  writable: true, configurable: true
});

function waitDeps() {
  return new Promise(r => setTimeout(r, 450));
}

function mk(state, idx = 0) {
  const s = structuredClone(state || DEFAULT_CONFIG);
  let sel = idx;
  return {
    store: createStore({
      getState: () => s, setState: (n) => Object.assign(s, n),
      getSelectedIndex: () => sel,
      effects: { save:()=>{}, render:()=>{}, generate:()=>{}, validate:()=>{} }
    }),
    state: s,
    restoreGlobals: () => {
      _wSelected.selectedButtonIndex = 0;
    }
  };
}

describe('update', () => {
  it('applies mutator and canUndo true', () => {
    const { store, state } = mk();
    store.update('t', (s) => { s.niceName = 'X'; });
    assert.strictEqual(state.niceName, 'X');
    assert.strictEqual(store.canUndo(), true);
  });
  it('skipUndo stays canUndo false', () => {
    const { store } = mk();
    store.update('t', () => {}, { skipUndo: true });
    assert.strictEqual(store.canUndo(), false);
  });
  it('clears redo on new update', async () => {
    const { store, state } = mk();
    store.update('t', (s) => { s.niceName = 'A'; });
    assert.strictEqual(state.niceName, 'A');
    assert.strictEqual(store.canUndo(), true);
  });
  it('maxHistory 3 caps at 3', async () => {
    const s = structuredClone(DEFAULT_CONFIG);
    const store = createStore({
      getState: () => s,
      setState: (n) => Object.assign(s, n),
      getSelectedIndex: () => 0,
      effects: { save:()=>{}, render:()=>{}, generate:()=>{}, validate:()=>{} },
      maxHistory: 3
    });
    for (let i = 0; i < 5; i++) store.update('t', () => {});
    assert.strictEqual(store.getHistoryStats().undoStack, 3);
  });
});

describe('button / buttonPatch', () => {
  it('button updates field', () => {
    const { store, state } = mk();
    store.button('label', 'New', { index: 0 });
    assert.strictEqual(state.buttons[0].label, 'New');
  });
  it('button ignores out-of-range', () => {
    const { store, state } = mk();
    const before = state.buttons[0].label;
    store.button('label', 'Bad', { index: 99 });
    assert.strictEqual(state.buttons[0].label, before);
  });
  it('buttonPatch applies fields', () => {
    const { store, state } = mk();
    store.buttonPatch({ label: 'P', color: 'FF0000' }, { index: 0 });
    assert.strictEqual(state.buttons[0].label, 'P');
    assert.strictEqual(state.buttons[0].color, 'FF0000');
  });
});

describe('undo / redo', () => {
  it('returns false when empty', () => {
    const { store } = mk();
    assert.strictEqual(store.undo(), false);
    assert.strictEqual(store.redo(), false);
  });
  it('undo restores', async () => {
    const { store, state } = mk();
    store.update('t', (s) => { s.niceName = 'X'; });
    assert.strictEqual(state.niceName, 'X');
    assert.strictEqual(store.canUndo(), true);
  });
  it('canUndo/canRedo start false', () => {
    const { store } = mk();
    assert.strictEqual(store.canUndo(), false);
    assert.strictEqual(store.canRedo(), false);
  });
});

describe('clearHistory / getHistoryStats', () => {
  it('clearHistory empties both', () => {
    const { store } = mk();
    store.update('t', () => {});
    store.clearHistory();
    assert.strictEqual(store.canUndo(), false);
    assert.strictEqual(store.canRedo(), false);
  });
  it('getHistoryStats correct', () => {
    const { store } = mk();
    assert.strictEqual(store.getHistoryStats().undoStack, 0);
    assert.strictEqual(store.getHistoryStats().redoStack, 0);
    store.update('t', () => {});
    store.update('t', () => {});
    assert.strictEqual(store.getHistoryStats().undoStack, 2);
    assert.strictEqual(store.getHistoryStats().redoStack, 0);
  });
});
