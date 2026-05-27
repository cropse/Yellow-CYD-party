// ============================================================
// ORCHESTRATION MODULE
// ============================================================

import { createStore } from './store.js';
import * as YamlGenerationEngine from './yaml-engine.js';
import * as ValidationEngine from './validation-engine.js';
import { normalizeColor, clampNumber, yamlDoc, yamlInclude, yamlRaw, yamlSecret } from './utils.js';
import { normalizeImportedConfig } from './import.js';
import { loadMDIData, getMdiData, getIconByCodepoint, searchIcons, searchIconsByCategory, getRecentIcons, addRecentIcon, getFavorites, toggleFavorite } from './mdi.js';

import { createStateAccessors, getPreviewFontSize } from './state-accessors.js';
import { createButtonOperations } from './button-operations.js';
import { createGridOperations } from './grid-operations.js';
import { createModalManager } from './modal-management.js';
import { createIOOperations } from './io-operations.js';
import { createIconPicker } from './icon-picker.js';
import { createUIRendering } from './ui-rendering.js';

import {
  DEFAULT_CONFIG, PRESETS, HARDWARE_CONFIG, ACTION_SCHEMAS, COLOR_SWATCHES,
  DEFAULT_BUTTON, DEFAULT_LED, BOARD_OPTIONS, DEFAULT_BOARD_ID,
  getBoardConfig, isSupportedBoard, getAllowedGridOptions,
  getDefaultGridForBoard, isGridAllowedForBoard, getBoardSupportWarnings
} from './config.js';

// ── Utilities ──────────────────────────────────────────────────────────

function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] || icons.success}</span>
    <span>${escapeHTML(message)}</span>
    <button type="button" class="toast-dismiss" aria-label="Dismiss notification">×</button>
  `;

  let removed = false;
  const removeToast = () => {
    if (removed) return;
    removed = true;
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-dismiss').addEventListener('click', removeToast);
  container.appendChild(toast);
  setTimeout(removeToast, duration);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// ── Core state ─────────────────────────────────────────────────────────

let appState = loadState();
let selectedButtonIndex = 0;

// ── State persistence ──────────────────────────────────────────────────

function loadState() {
  try {
    const saved = localStorage.getItem('cyd-config');
    if (saved) {
      const config = JSON.parse(saved);
      const { config: normalized } = normalizeImportedConfig(config);
      return normalized;
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return structuredClone(DEFAULT_CONFIG);
}

function saveState() {
  try {
    localStorage.setItem('cyd-config', JSON.stringify(appState));
  } catch (e) {
    console.error('Failed to save state:', e);
    showToast('Failed to save configuration. Storage may be full.', 'error');
  }
}

// ── State accessors ────────────────────────────────────────────────────

const { getBoardId, getGridColumns, getGridRows, getIconSize } =
  createStateAccessors(() => appState, DEFAULT_CONFIG, DEFAULT_BOARD_ID);

// ── Store (created first — effects reference ui/orch via optional chaining) ─

const store = createStore({
  getState: () => appState,
  setState: (next) => { appState = next; },
  getSelectedIndex: () => selectedButtonIndex,
  effects: {
    save: saveState,
    render: () => {
      ui?.renderGridPreview();
      ui?.renderEditorPanel();
      ui?.updateGlobalSettings();
    },
    generate: generateYAML,
    validate: () => runValidation({ showSummary: false })
  },
  maxHistory: 40
});

// ── UI module ──────────────────────────────────────────────────────────
// selectButton is hoisted so grid-ops can reference it; ui captures it by closure.

let gridOps;

function selectButton(index) {
  const clamped = Math.max(0, Math.min(index, appState.buttons.length - 1));
  const btn = appState.buttons[clamped];

  if (btn?.empty) {
    store.update('Initialize empty button', state => {
      const b = state.buttons[clamped];
      Object.assign(b, structuredClone(DEFAULT_BUTTON));
      b.id = btn.id;
      b.name = btn.name;
      b.col = btn.col;
      b.row = btn.row;
      b.label = `Btn ${clamped + 1}`;
      delete b.empty;
    });
  }

  selectedButtonIndex = clamped;
  window.selectedButtonIndex = clamped;
  ui?.renderGridPreview();
  ui?.renderEditorPanel();
}

const ui = createUIRendering({
  getState: () => appState,
  getSelectedIndex: () => selectedButtonIndex,
  store,
  getIconByCodepoint,
  escapeHTML,
  ACTION_SCHEMAS, DEFAULT_LED, DEFAULT_CONFIG, BOARD_OPTIONS, DEFAULT_BOARD_ID, COLOR_SWATCHES,
  getBoardConfig, isGridAllowedForBoard, getDefaultGridForBoard, getAllowedGridOptions, getBoardSupportWarnings,
  selectButton,
  handleGridKeydown: (e, col, row, btnIndex) => gridOps?.handleGridKeydown(e, col, row, btnIndex),
  handleEmptyCellClick: (col, row) => gridOps?.handleEmptyCellClick(col, row),
  attachGridDragListeners: (cell, btnIndex) => gridOps?.attachGridDragListeners(cell, btnIndex),
  applyGridDragAttributes: (cell, btnIndex) => gridOps?.applyGridDragAttributes(cell, btnIndex),
  getPreviewFontSize,
  getGridColumns, getGridRows, getIconSize, getBoardId,
  openModal: (...args) => modal.openModal(...args),
  showToast
});

// ── Grid operations ────────────────────────────────────────────────────

gridOps = createGridOperations({
  getState: () => appState,
  getSelectedIndex: () => selectedButtonIndex,
  getGridColumns, getGridRows,
  store, selectButton, showToast,
  renderGridPreview: () => ui.renderGridPreview(),
  renderEditorPanel: () => ui.renderEditorPanel(),
  DEFAULT_BUTTON
});

// ── Button copy/paste/reset ────────────────────────────────────────────

const { copySelectedButton, pasteToSelectedButton, resetSelectedButton } =
  createButtonOperations(() => appState, () => selectedButtonIndex, store, showToast);

// ── I/O operations ─────────────────────────────────────────────────────

function generateYAML() {
  const preview = document.getElementById('yaml-preview');
  const result = ValidationEngine.validateConfig(appState, { selectedButtonIndex, ACTION_SCHEMAS });

  if (result.errors.length > 0) {
    const errorList = result.errors.map(e => `# - ${e.message}`).join('\n');
    preview.textContent = `# YAML generation blocked by ${result.errors.length} critical validation error${result.errors.length === 1 ? '' : 's'}:\n${errorList}`;
    return '';
  }

  try {
    if (!appState.apPassword) {
      appState.apPassword = YamlGenerationEngine.generateRandomPassword(12);
      saveState();
    }

    const yaml = YamlGenerationEngine.generateFullYAML(appState, {
      actionSchemas: ACTION_SCHEMAS,
      hardwareConfig: HARDWARE_CONFIG,
      defaultButton: DEFAULT_BUTTON,
      defaultConfig: DEFAULT_CONFIG,
      BOARD_OPTIONS, DEFAULT_BOARD_ID,
      getBoardConfig, isSupportedBoard,
      normalizeColor, clampNumber, normalizeImportedConfig,
      yamlDoc, yamlSecret, yamlInclude, yamlRaw
    });

    preview.innerHTML = YamlGenerationEngine.highlightYAML(yaml);
    return yaml;
  } catch (error) {
    console.error('YAML generation failed:', error);
    preview.textContent = '# YAML generation failed.';
    return '';
  }
}

const io = createIOOperations(
  () => appState, store, generateYAML, showToast,
  normalizeImportedConfig, DEFAULT_BOARD_ID
);

// ── Modal management ──────────────────────────────────────────────────

const modal = createModalManager();

// ── Icon picker ────────────────────────────────────────────────────────

const iconPicker = createIconPicker({
  store,
  updateIconPreview: (t, c) => ui.updateIconPreview(t, c),
  openModal: (id, focus) => modal.openModal(id, focus),
  closeModal: (id) => modal.closeModal(id),
  escapeHTML,
  getMdiData, getIconByCodepoint, searchIcons, searchIconsByCategory,
  getRecentIcons, addRecentIcon, getFavorites, toggleFavorite
});

// ── Validation helpers ─────────────────────────────────────────────────

function setValueAtPath(path, newValue) {
  store.update('Set value', state => {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((obj, part) => obj?.[part], state);
    if (target && last) target[last] = newValue;
  });
  ui.renderEditorPanel();
  runValidation({ showSummary: false });
}

function runValidation(opts = {}) {
  const result = ValidationEngine.validateConfig(appState, { selectedButtonIndex, ACTION_SCHEMAS });
  if (opts.showSummary) {
    ui.renderValidationSummary(result, (path, ref) => {
      setValueAtPath(path, ref);
      showToast('Converted to secret reference', 'success');
    });
    modal.openModal('validation-modal', document.getElementById('validation-modal-close'));
  }
  return result;
}

function pushHistory() {
  store.update('Before edit', () => {}, { skipUndo: false });
}

async function withLoading(buttonId, task) {
  const btn = document.getElementById(buttonId);
  const originalText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Loading...';
  }
  try {
    await task();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

// ── Setup functions ────────────────────────────────────────────────────

function setupEventListeners() {
  setupThemeToggle();
  setupHeaderActions();
  setupGlobalSettings();
  setupPresets();
  setupGridControls();
  setupButtonEditor();
  setupLedControl();
  setupColorPickers();
  setupIconPickers();
  setupModals();
  setupKeyboardShortcuts();
  setupActionFields();
  ui.updateHistoryButtons();
}

function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = !document.documentElement.hasAttribute('data-theme');
      if (isDark) {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      themeToggle.textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('cyd-theme', isDark ? 'light' : 'dark');
    });

    const savedTheme = localStorage.getItem('cyd-theme');
    if (savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.textContent = '☀️';
    }
  }
}

function setupHeaderActions() {
  const importFile = document.getElementById('import-file');
  if (importFile) {
    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) io.importConfig(file);
      e.target.value = '';
    });
  }

  document.getElementById('export-btn')?.addEventListener('click', () => withLoading('export-btn', io.exportConfig));
  document.getElementById('copy-yaml-header-btn')?.addEventListener('click', () => withLoading('copy-yaml-header-btn', io.copyYAMLToClipboard));
  document.getElementById('validate-btn')?.addEventListener('click', () => withLoading('validate-btn', () => runValidation({ showSummary: true })));
  document.getElementById('download-yaml-btn')?.addEventListener('click', () => withLoading('download-yaml-btn', io.downloadYAML));
  document.getElementById('copy-yaml-btn')?.addEventListener('click', () => withLoading('copy-yaml-btn', io.copyYAMLToClipboard));
}

function setupGlobalSettings() {
  ['device-name', 'nice-name', 'display-timeout'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('focus', () => pushHistory());
  });

  document.getElementById('device-name')?.addEventListener('input', (e) => {
    const sanitized = e.target.value.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    document.getElementById('device-name-hint').textContent = sanitized ? `hostname: ${sanitized}` : '';
    store.update('Change device name', state => { state.deviceName = sanitized; });
  });

  document.getElementById('nice-name')?.addEventListener('input', (e) => {
    store.update('Change nice name', state => { state.niceName = e.target.value; });
  });

  document.getElementById('display-timeout')?.addEventListener('input', (e) => {
    const timeout = Math.max(90, Math.min(3600, parseInt(e.target.value, 10) || 600));
    store.update('Change display timeout', state => { state.displayTimeout = timeout; });
  });

  document.getElementById('board-select')?.addEventListener('change', (e) => {
    const nextBoard = e.target.value || DEFAULT_BOARD_ID;
    store.update('Change board', state => {
      state.board = nextBoard;
      const boardConfig = getBoardConfig(nextBoard) || getBoardConfig(DEFAULT_BOARD_ID);
      const grid = ui.getNormalizedGridForBoard(boardConfig, state.gridColumns || DEFAULT_CONFIG.gridColumns, state.gridRows || DEFAULT_CONFIG.gridRows);
      state.gridColumns = grid.columns;
      state.gridRows = grid.rows;
      state.buttons.forEach(btn => {
        btn.col = Math.max(0, Math.min(state.gridColumns - 1, btn.col));
        btn.row = Math.max(0, Math.min(state.gridRows - 1, btn.row));
      });
      const occupied = new Map();
      const removed = [];
      state.buttons.forEach((btn, i) => {
        if (btn.empty) return;
        const pos = `${btn.col},${btn.row}`;
        if (occupied.has(pos)) {
          removed.push(i + 1);
          btn.empty = true;
        } else {
          occupied.set(pos, i);
        }
      });
      if (removed.length > 0) {
        showToast(`Removed overlapping buttons: ${removed.map(n => `#${n}`).join(', ')}. Assign them to free slots to restore.`, 'warning', 6000);
      }
    });
  });

  document.getElementById('grid-size-select')?.addEventListener('change', (e) => {
    const [columns, rows] = e.target.value.split('x').map(Number);
    const boardConfig = ui.getCurrentBoardConfig();
    if (!isGridAllowedForBoard(boardConfig, columns, rows)) {
      ui.populateGridSelector();
      return;
    }
    store.update('Change grid size', state => {
      state.gridColumns = columns;
      state.gridRows = rows;
      state.buttons.forEach(btn => {
        btn.col = Math.max(0, Math.min(columns - 1, btn.col));
        btn.row = Math.max(0, Math.min(rows - 1, btn.row));
      });
      const occupied = new Map();
      const removed = [];
      state.buttons.forEach((btn, i) => {
        if (btn.empty) return;
        const pos = `${btn.col},${btn.row}`;
        if (occupied.has(pos)) {
          removed.push(i + 1);
          btn.empty = true;
        } else {
          occupied.set(pos, i);
        }
      });
      if (removed.length > 0) {
        showToast(`Removed overlapping buttons: ${removed.map(n => `#${n}`).join(', ')}. Assign them to free slots to restore.`, 'warning', 6000);
      }
    });
  });

  document.getElementById('rotate-180')?.addEventListener('change', (e) => {
    store.update('Toggle 180° rotation', state => { state.rotate180 = e.target.checked; });
  });

  document.getElementById('icon-size')?.addEventListener('input', (e) => {
    const iconSize = Math.max(16, Math.min(96, parseInt(e.target.value, 10) || 48));
    store.update('Change icon size', state => { state.iconSize = iconSize; });
  });
}

function setupPresets() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      if (PRESETS[preset]) {
        store.update(`Load ${preset} preset`, state => {
          const newConfig = PRESETS[preset]();
          Object.assign(state, newConfig);
          state.board = newConfig.board || DEFAULT_BOARD_ID;
        });
        ui.renderLedControl();
        ui.updateLEDCompatibility();
        ui.updateBoardSupportWarning(getBoardId());
      }
    });
  });
}

function setupGridControls() {
  document.getElementById('undo-btn')?.addEventListener('click', () => store.undo());
  document.getElementById('redo-btn')?.addEventListener('click', () => store.redo());
  document.getElementById('copy-button-btn')?.addEventListener('click', copySelectedButton);
  document.getElementById('paste-button-btn')?.addEventListener('click', pasteToSelectedButton);
  document.getElementById('reset-button-btn')?.addEventListener('click', resetSelectedButton);
}

function setupButtonEditor() {
  document.getElementById('btn-label')?.addEventListener('input', (e) => {
    store.button('label', e.target.value);
  });

  document.getElementById('btn-font')?.addEventListener('change', (e) => {
    store.button('font', e.target.value);
  });

  document.querySelectorAll('.type-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      store.update('Change button type', state => {
        state.buttons[selectedButtonIndex].type = type;
      });
      document.querySelectorAll('.type-toggle button').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      const hasHomeAssistantEntity = type === 'checkable' || type === 'timer_sync' || type === 'sensor_sync';
      const hasCheckableIcons = type === 'checkable' || type === 'timer_sync';
      document.getElementById('checkable-options').classList.toggle('hidden', !hasHomeAssistantEntity);
      document.getElementById('checkable-icons').classList.toggle('hidden', !hasCheckableIcons);
      document.getElementById('timer-default-label-group')?.classList.toggle('hidden', type !== 'timer_sync');
    });
  });

  document.getElementById('ha-entity')?.addEventListener('input', (e) => {
    store.button('haEntity', e.target.value);
  });

  document.getElementById('on-state')?.addEventListener('input', (e) => {
    store.button('onState', e.target.value);
  });

  document.getElementById('timer-default-label')?.addEventListener('input', (e) => {
    store.button('timerDefaultLabel', e.target.value);
  });
}

function setupLedControl() {
  document.getElementById('led-control')?.addEventListener('change', (e) => {
    ui.setLed({ enabled: e.target.checked });
  });

  document.getElementById('led-effect')?.addEventListener('change', (e) => {
    ui.setLed({ effect: e.target.value });
  });

  document.getElementById('led-entity')?.addEventListener('input', (e) => {
    ui.setLed({ entity: e.target.value });
  });

  document.getElementById('led-on-state')?.addEventListener('input', (e) => {
    ui.setLed({ onState: e.target.value });
  });

  document.getElementById('led-brightness')?.addEventListener('input', (e) => {
    const v = Number(e.target.value);
    ui.setLed({ brightness: v });
    const val = document.querySelector('.led-slider-value');
    if (val) val.textContent = `${v}%`;
  });

  const ledPresets = [
    { r: 0, g: 255, b: 0 },
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 152, b: 0 },
    { r: 74, g: 158, b: 255 },
    { r: 255, g: 255, b: 255 }
  ];

  document.querySelectorAll('.led-color-chip').forEach((chip, i) => {
    chip.addEventListener('click', () => {
      const preset = ledPresets[i];
      if (preset) ui.setLed({ color: { r: preset.r, g: preset.g, b: preset.b } });
    });
  });
}

function setupColorPickers() {
  document.getElementById('color-native')?.addEventListener('input', (e) => {
    const hex = e.target.value.replace('#', '');
    store.button('color', hex);
    ui.updateColorDisplay(hex);
  });

  document.getElementById('color-hex')?.addEventListener('input', (e) => {
    let hex = e.target.value.replace(/^#/, '').toUpperCase();
    e.target.value = hex;
    if (/^[0-9A-F]{6}$/.test(hex)) {
      store.button('color', hex);
      ui.updateColorDisplay(hex);
    }
  });
}

function setupIconTrigger(triggerId, target) {
  const trigger = document.getElementById(triggerId);
  trigger?.addEventListener('click', () => iconPicker.openIconPicker(target));
  trigger?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      iconPicker.openIconPicker(target);
    }
  });
}

function setupIconPickers() {
  setupIconTrigger('icon-picker-trigger', 'main');
  setupIconTrigger('icon-on-trigger', 'on');
  setupIconTrigger('icon-off-trigger', 'off');
}

function setupModals() {
  document.getElementById('icon-modal-close')?.addEventListener('click', () => iconPicker.closeIconPicker());
  document.getElementById('icon-cancel-btn')?.addEventListener('click', () => iconPicker.closeIconPicker());
  document.getElementById('validation-modal-close')?.addEventListener('click', () => modal.closeModal('validation-modal'));
  document.getElementById('validation-close-btn')?.addEventListener('click', () => modal.closeModal('validation-modal'));

  let iconSearchTimer = null;
  document.getElementById('icon-search')?.addEventListener('input', (e) => {
    clearTimeout(iconSearchTimer);
    iconSearchTimer = setTimeout(() => iconPicker.renderIconResults(e.target.value), 150);
  });

  document.getElementById('icon-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstResult = document.querySelector('.icon-result');
      if (firstResult) firstResult.click();
    }
  });

  document.getElementById('icon-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'icon-modal') iconPicker.closeIconPicker();
  });

  document.getElementById('icon-modal')?.addEventListener('keydown', (e) => {
    modal.trapModalFocus(e, e.currentTarget);
  });

  document.getElementById('validation-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'validation-modal') modal.closeModal('validation-modal');
  });

  document.getElementById('validation-modal')?.addEventListener('keydown', (e) => {
    modal.trapModalFocus(e, e.currentTarget);
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const iconModal = document.getElementById('icon-modal');
      const validationModal = document.getElementById('validation-modal');
      if (iconModal?.classList.contains('active')) {
        iconPicker.closeIconPicker();
      } else if (validationModal?.classList.contains('active')) {
        modal.closeModal('validation-modal');
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      io.exportConfig();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      io.downloadYAML();
    }
  });
}

function setupActionFields() {
  document.getElementById('short-action-type')?.addEventListener('change', (e) => {
    store.update('Change short press action', state => {
      const btn = state.buttons[selectedButtonIndex];
      btn.shortPress = btn.shortPress || {};
      btn.shortPress.actionType = e.target.value;
      btn.shortPress.enabled = !!e.target.value;
      btn.shortPress.data = {};
    });
    ui.renderActionFields('short-action-fields', e.target.value, {}, false);
  });

  document.getElementById('long-press-enabled')?.addEventListener('change', (e) => {
    store.update('Toggle long press', state => {
      const btn = state.buttons[selectedButtonIndex];
      btn.longPress = btn.longPress || {};
      btn.longPress.enabled = e.target.checked;
    });
    document.getElementById('long-press-builder').classList.toggle('hidden', !e.target.checked);
  });

  document.getElementById('long-min-len')?.addEventListener('change', (e) => {
    store.update('Change min length', state => {
      state.buttons[selectedButtonIndex].longPress.minLength = e.target.value;
    });
  });

  document.getElementById('long-max-len')?.addEventListener('change', (e) => {
    store.update('Change max length', state => {
      state.buttons[selectedButtonIndex].longPress.maxLength = e.target.value;
    });
  });

  document.getElementById('long-action-type')?.addEventListener('change', (e) => {
    store.update('Change long press action', state => {
      const btn = state.buttons[selectedButtonIndex];
      btn.longPress = btn.longPress || {};
      btn.longPress.actionType = e.target.value;
      btn.longPress.data = {};
    });
    ui.renderActionFields('long-action-fields', e.target.value, {}, true);
  });
}

// ── Initialization ─────────────────────────────────────────────────────

async function init() {
  console.log('Initializing CYD Config Generator...');

  document.getElementById('icon-loading')?.classList.remove('hidden');
  await loadMDIData();
  document.getElementById('icon-loading')?.classList.add('hidden');

  ui.renderColorThemePresets();
  ui.renderColorSwatches();
  ui.populateBoardSelector();
  ui.updateBoardSupportWarning(getBoardId());
  ui.renderGridPreview();
  ui.renderEditorPanel();
  ui.updateGlobalSettings();
  generateYAML();

  setupEventListeners();

  console.log('Initialization complete!');
}

function getAppState() { return appState; }
function setAppState(val) { appState = val; }

function setSelectedButtonIndex(val) {
  selectedButtonIndex = val;
  window.selectedButtonIndex = val;
}

// ── Public API ─────────────────────────────────────────────────────────

export {
  init, store, generateYAML, runValidation, selectButton, setValueAtPath,
  withLoading, pushHistory, loadState, saveState,
  ui, io, modal, iconPicker, gridOps,
  getAppState, setAppState, setSelectedButtonIndex,
  getBoardId, getGridColumns, getGridRows, getIconSize, getPreviewFontSize,
  escapeHTML, showToast,
  copySelectedButton, pasteToSelectedButton, resetSelectedButton
};
