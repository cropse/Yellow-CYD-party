import './styles/main.css';
import { DEFAULT_CONFIG, PRESETS, HARDWARE_CONFIG, ACTION_SCHEMAS, COLOR_SWATCHES, DEFAULT_BUTTON, DEFAULT_LED, BOARD_OPTIONS, DEFAULT_BOARD_ID, getBoardConfig, isSupportedBoard, getAllowedGridOptions, getDefaultGridForBoard, isGridAllowedForBoard, getBoardSupportWarnings } from './modules/config.js';
import { createStore } from './modules/store.js';
import * as YamlGenerationEngine from './modules/yaml-engine.js';
import * as ValidationEngine from './modules/validation-engine.js';
import { normalizeColor, clampNumber, yamlDoc, yamlInclude, yamlRaw, yamlSecret } from './modules/utils.js';
import { normalizeImportedConfig } from './modules/import.js';
import { loadMDIData, getMdiData, getIconByCodepoint, searchIcons, searchIconsByCategory, getRecentIcons, addRecentIcon, getFavorites, toggleFavorite, isFavorite } from './modules/mdi.js';

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
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
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

const COLOR_THEMES = {
  basic: COLOR_SWATCHES,
  warm: ['FF6B6B', 'FF8E72', 'FFA94D', 'FFD93D', 'FFE066', 'FFF3B0', 'FFB4B4', 'FF8585'],
  cool: ['4ECDC4', '45B7D1', '5C7AEA', '7C83FD', '9B5DE5', 'F15BB5', '00BBF9', '00F5D4'],
  nature: ['2D5A27', '4A7C23', '6B8E23', '8FBC8F', '90EE90', '98FB98', 'ADFF2F', '00FA9A'],
  vibrant: ['FF0080', 'FF4D4D', 'FF8C00', 'FFD700', '7FFF00', '00FF7F', '00CED1', '8A2BE2'],
  pastel: ['FFB3BA', 'FFDFBA', 'FFFFBA', 'BAFFC9', 'BAE1FF', 'E8BAFF', 'FFB3DE', 'B3FFE8'],
  neon: ['FF073A', 'FF61F6', 'A020F0', '00FF00', '39FF14', '00FFFF', 'FF00FF', 'FFFF00']
};

// Category structure matching pictogrammers.com layout.
// Each entry: { key, label, icon (emoji shorthand), mdiTag (the MDI tag to match) }
const MDI_CATEGORIES = [
  { key: 'home-automation', label: 'Home Automation', icon: '🏠', tag: 'Home Automation' },
  { key: 'account-user', label: 'Account / User', icon: '👤', tag: 'Account / User' },
  { key: 'arrow', label: 'Arrow', icon: '➡️', tag: 'Arrow' },
  { key: 'alert-error', label: 'Alert / Error', icon: '⚠️', tag: 'Alert / Error' },
  { key: 'automotive', label: 'Automotive', icon: '🚗', tag: 'Automotive' },
  { key: 'battery', label: 'Battery', icon: '🔋', tag: 'Battery' },
  { key: 'banking', label: 'Banking', icon: '🏦', tag: 'Banking' },
  { key: 'brand-logo', label: 'Brand / Logo', icon: '🏷️', tag: 'Brand / Logo' },
  { key: 'weather', label: 'Weather', icon: '☀️', tag: 'Weather' },
  { key: 'settings', label: 'Settings', icon: '⚙️', tag: 'Settings' },
  { key: 'lock', label: 'Lock', icon: '🔒', tag: 'Lock' },
  { key: 'device-tech', label: 'Device / Tech', icon: '📱', tag: 'Device / Tech' },
  { key: 'files-folders', label: 'Files / Folders', icon: '📁', tag: 'Files / Folders' },
  { key: 'food-drink', label: 'Food / Drink', icon: '🍕', tag: 'Food / Drink' },
  { key: 'gaming-rpg', label: 'Gaming / RPG', icon: '🎮', tag: 'Gaming / RPG' },
  { key: 'music', label: 'Music', icon: '🎵', tag: 'Music' },
  { key: 'navigation', label: 'Navigation', icon: '🧭', tag: 'Navigation' },
  { key: 'text-format', label: 'Text / Format', icon: '✏️', tag: 'Text / Content / Format' },
  { key: 'transport-road', label: 'Transport + Road', icon: '🛣️', tag: 'Transportation + Road' },
  { key: 'video-movie', label: 'Video / Movie', icon: '🎬', tag: 'Video / Movie' },
  { key: 'medical', label: 'Medical / Hospital', icon: '🏥', tag: 'Medical / Hospital' },
  { key: 'sport', label: 'Sport', icon: '⚽', tag: 'Sport' },
  { key: 'shopping', label: 'Shopping', icon: '🛒', tag: 'Shopping' },
  { key: 'math', label: 'Math', icon: '🔢', tag: 'Math' },
  { key: 'nature', label: 'Nature', icon: '🌿', tag: 'Nature' },
  { key: 'photography', label: 'Photography', icon: '📷', tag: 'Photography' },
  { key: 'edit-modify', label: 'Edit / Modify', icon: '📝', tag: 'Edit / Modify' },
  { key: 'audio', label: 'Audio', icon: '🔊', tag: 'Audio' },
  { key: 'shape', label: 'Shape', icon: '⬜', tag: 'Shape' },
];

let appState = loadState();
let selectedButtonIndex = 0;
let copiedButtonConfig = null;

function getLed() {
  const led = appState.led;
  if (led && typeof led === 'object' && 'enabled' in led) return led;
  return { ...DEFAULT_LED, enabled: Boolean(led) };
}

function setLed(patch) {
  store.update('LED changed', next => {
    const current = next.led && typeof next.led === 'object' ? next.led : DEFAULT_LED;
    next.led = {
      ...current,
      ...patch,
      color: patch.color ? { ...patch.color } : { ...current.color }
    };
  });
}
let currentIconTarget = 'main';
let selectedIconInModal = null;
let selectedIconCategory = 'all';
let activeColorTheme = 'basic';
let lastModalTrigger = null;

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const store = createStore({
  getState: () => appState,
  setState: (next) => { appState = next; },
  getSelectedIndex: () => selectedButtonIndex,
  effects: {
    save: saveState,
    render: () => {
      renderGridPreview();
      renderEditorPanel();
      updateGlobalSettings();
    },
    generate: generateYAML,
    validate: () => runValidation({ showSummary: false })
  },
  maxHistory: 40
});

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

async function init() {
  console.log('Initializing CYD Config Generator...');

  document.getElementById('icon-loading')?.classList.remove('hidden');
  await loadMDIData();
  document.getElementById('icon-loading')?.classList.add('hidden');

  renderColorThemePresets();
  renderColorSwatches();
  populateBoardSelector();
  updateBoardSupportWarning(getBoardId());
  renderGridPreview();
  renderEditorPanel();
  updateGlobalSettings();
  generateYAML();

  setupEventListeners();

  console.log('Initialization complete!');
}

let gridCellCache = null;

// ── State accessor helpers (consolidate repeated fallback patterns) ─────
const getBoardId = () => appState.board || DEFAULT_BOARD_ID;
const getGridColumns = () => appState.gridColumns || DEFAULT_CONFIG.gridColumns;
const getGridRows = () => appState.gridRows || DEFAULT_CONFIG.gridRows;
const getIconSize = () => appState.iconSize || DEFAULT_CONFIG.iconSize;

function getPreviewFontSize(font) {
  return font === 'roboto_12' ? '18px' : font === 'arimo14' ? '20px' : '22px';
}

function getGridDragButtonIndex(cell) {
  if (!cell || cell.dataset.btnIndex === 'empty') return -1;
  const index = Number.parseInt(cell.dataset.btnIndex, 10);
  return Number.isInteger(index) ? index : -1;
}

function clearGridDragState() {
  document.querySelectorAll('.grid-cell.dragging, .grid-cell.drag-over').forEach(cell => {
    cell.classList.remove('dragging', 'drag-over');
    cell.removeAttribute('aria-dropeffect');
  });
}

function handleGridDragStart(e, btnIndex) {
  if (btnIndex < 0) {
    e.preventDefault();
    return;
  }

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(btnIndex));
  e.currentTarget.classList.add('dragging');
  e.currentTarget.setAttribute('aria-grabbed', 'true');
}

function handleGridDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleGridDragEnter(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
  e.currentTarget.setAttribute('aria-dropeffect', 'move');
}

function handleGridDragLeave(e) {
  if (e.currentTarget.contains(e.relatedTarget)) return;
  e.currentTarget.classList.remove('drag-over');
  e.currentTarget.removeAttribute('aria-dropeffect');
}

function handleGridDrop(e) {
  e.preventDefault();

  const sourceIndex = Number.parseInt(e.dataTransfer.getData('text/plain'), 10);
  const targetCell = e.currentTarget;
  const targetCol = Number.parseInt(targetCell.dataset.col, 10);
  const targetRow = Number.parseInt(targetCell.dataset.row, 10);

  if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetCol) || !Number.isInteger(targetRow)) {
    clearGridDragState();
    return;
  }

  const sourceButton = appState.buttons[sourceIndex];
  if (!sourceButton || (sourceButton.col === targetCol && sourceButton.row === targetRow)) {
    clearGridDragState();
    return;
  }

  const targetIndex = getGridDragButtonIndex(targetCell);
  store.update('Move grid button', state => {
    const source = state.buttons[sourceIndex];
    if (!source) return;

    const sourceCol = source.col;
    const sourceRow = source.row;
    source.col = targetCol;
    source.row = targetRow;

    if (targetIndex >= 0 && targetIndex !== sourceIndex) {
      const target = state.buttons[targetIndex];
      if (target) {
        target.col = sourceCol;
        target.row = sourceRow;
      }
    }
  });

  selectButton(sourceIndex);
  clearGridDragState();
}

function handleGridDragEnd(e) {
  e.currentTarget.setAttribute('aria-grabbed', 'false');
  clearGridDragState();
}

function applyGridDragAttributes(cell, btnIndex) {
  const hasButton = btnIndex >= 0;
  cell.draggable = hasButton;
  cell.setAttribute('aria-grabbed', 'false');
  cell.setAttribute('aria-dropeffect', 'move');
}

function attachGridDragListeners(cell, btnIndex) {
  cell.addEventListener('dragstart', (e) => handleGridDragStart(e, btnIndex));
  cell.addEventListener('dragover', handleGridDragOver);
  cell.addEventListener('dragenter', handleGridDragEnter);
  cell.addEventListener('dragleave', handleGridDragLeave);
  cell.addEventListener('drop', handleGridDrop);
  cell.addEventListener('dragend', handleGridDragEnd);
}

function renderGridPreview() {
  const container = document.getElementById('grid-preview');
  if (!container) return;

  const gridColumns = getGridColumns();
  const gridRows = getGridRows();
  const iconSize = getIconSize();
  if (typeof container.style?.setProperty === 'function') {
    container.style.setProperty('--grid-columns', gridColumns);
    container.style.setProperty('--grid-rows', gridRows);
    container.style.setProperty('--icon-size', `${iconSize}px`);
  }

  const positionMap = new Map();
  appState.buttons.forEach((btn, idx) => {
    const key = `${btn.col},${btn.row}`;
    if (!positionMap.has(key)) positionMap.set(key, []);
    positionMap.get(key).push(idx);
  });

  const expectedCellCount = gridColumns * gridRows;
  const hasGridChanges = container.children.length !== expectedCellCount
    || gridCellCache?.gridColumns !== gridColumns
    || gridCellCache?.gridRows !== gridRows
    || gridCellCache?.buttonCount !== appState.buttons.length;

  const needsFullRebuild = !gridCellCache || hasGridChanges;
  if (needsFullRebuild) {
    container.innerHTML = '';
    gridCellCache = new Array(appState.buttons.length);
    gridCellCache.gridColumns = gridColumns;
    gridCellCache.gridRows = gridRows;
    gridCellCache.buttonCount = appState.buttons.length;
  }

  const createGridCell = (col, row, btnIndex, hasConflict) => {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.dataset.col = col;
    cell.dataset.row = row;
    cell.dataset.btnIndex = btnIndex >= 0 ? String(btnIndex) : 'empty';

    if (btnIndex >= 0) {
      const btn = appState.buttons[btnIndex];
      const iconData = getIconByCodepoint(btn.icon);

      cell.innerHTML = `
        <span class="position-badge">${col + 1},${row + 1}</span>
        <span class="icon" style="font-family: 'Material Design Icons'; font-size: ${getPreviewFontSize(btn.font)}; color: #${btn.color};">${iconData?.char || ''}</span>
        <span class="label">${escapeHTML(btn.label)}</span>
      `;

      if (btnIndex === selectedButtonIndex) cell.classList.add('selected');
      if (hasConflict) cell.classList.add('position-conflict');

      cell.addEventListener('click', () => selectButton(btnIndex));
      cell.addEventListener('keydown', (e) => handleGridKeydown(e, col, row, btnIndex));
      attachGridDragListeners(cell, btnIndex);
      applyGridDragAttributes(cell, btnIndex);
      cell.tabIndex = 0;
      cell.setAttribute('role', 'button');
      cell.setAttribute('aria-label', `Edit ${btn.label}`);
    } else {
      cell.innerHTML = `
        <span class="position-badge">${col + 1},${row + 1}</span>
        <span class="label text-muted">Empty</span>
      `;
      cell.classList.add('empty');
      applyGridDragAttributes(cell, btnIndex);
      cell.tabIndex = -1;
      cell.addEventListener('keydown', (e) => handleGridKeydown(e, col, row, btnIndex));
      attachGridDragListeners(cell, btnIndex);
    }

    return cell;
  };

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridColumns; col++) {
      const slotIndex = row * gridColumns + col;
      const btnIndex = appState.buttons.findIndex(b => b.col === col && b.row === row);
      const hasConflict = positionMap.get(`${col},${row}`)?.length > 1;

      let cell = container.children[slotIndex];
      const cellMatchesSlot = cell?.dataset.col === String(col) && cell?.dataset.row === String(row);
      const expectedBtnIndex = btnIndex >= 0 ? String(btnIndex) : 'empty';

      if (needsFullRebuild || !cell || !cellMatchesSlot) {
        cell = createGridCell(col, row, btnIndex, hasConflict);
        container.appendChild(cell);
      } else if (cell.dataset.btnIndex !== expectedBtnIndex) {
        const replacement = createGridCell(col, row, btnIndex, hasConflict);
        cell.replaceWith(replacement);
        cell = replacement;
      } else if (btnIndex >= 0) {
        const btn = appState.buttons[btnIndex];
        const iconData = getIconByCodepoint(btn.icon);
        const fontSize = getPreviewFontSize(btn.font);
        const iconSpan = cell.querySelector('.icon');
        if (iconSpan) {
          iconSpan.style.fontSize = fontSize;
          iconSpan.style.color = `#${btn.color}`;
          iconSpan.textContent = iconData?.char || '';
        }
        const labelSpan = cell.querySelector('.label');
        if (labelSpan) labelSpan.textContent = btn.label;
        cell.classList.toggle('selected', btnIndex === selectedButtonIndex);
        cell.classList.toggle('position-conflict', !!hasConflict);
        cell.classList.remove('empty');
        applyGridDragAttributes(cell, btnIndex);
        cell.setAttribute('aria-label', `Edit ${btn.label}`);
        if (cell.dataset.btnIndex !== String(btnIndex)) {
          cell.dataset.btnIndex = String(btnIndex);
          cell.onclick = () => selectButton(btnIndex);
        }
      } else {
        cell.classList.toggle('selected', false);
        cell.classList.toggle('position-conflict', !!hasConflict);
        cell.classList.add('empty');
        applyGridDragAttributes(cell, btnIndex);
      }

      if (btnIndex >= 0) {
        gridCellCache[btnIndex] = { col, row };
      }
    }
  }
}

function handleGridKeydown(e, col, row, btnIndex) {
  const keyMap = {
    'ArrowRight': [1, 0],
    'ArrowLeft': [-1, 0],
    'ArrowDown': [0, 1],
    'ArrowUp': [0, -1]
  };
  
  const delta = keyMap[e.key];
  if (!delta) return;
  
  e.preventDefault();
  const maxCol = getGridColumns() - 1;
  const maxRow = getGridRows() - 1;
  const newCol = Math.max(0, Math.min(maxCol, col + delta[0]));
  const newRow = Math.max(0, Math.min(maxRow, row + delta[1]));
  
  const targetCell = document.querySelector(`.grid-cell[data-col="${newCol}"][data-row="${newRow}"]`);
  
  if (targetCell) {
    targetCell.focus();
    const targetBtnIndex = appState.buttons.findIndex(b => b.col === newCol && b.row === newRow);
    if (targetBtnIndex >= 0) {
      selectButton(targetBtnIndex);
    }
  }
}

const LED_COLOR_PRESETS = [
  { name: 'Green', r: 0, g: 255, b: 0 },
  { name: 'Red', r: 255, g: 0, b: 0 },
  { name: 'Amber', r: 255, g: 152, b: 0 },
  { name: 'Blue', r: 74, g: 158, b: 255 },
  { name: 'White', r: 255, g: 255, b: 255 }
];

function colorMatchIndex(color) {
  if (!color || typeof color !== 'object') return -1;
  return LED_COLOR_PRESETS.findIndex(p => p.r === color.r && p.g === color.g && p.b === color.b);
}

function renderLedControl() {
  const led = getLed();
  const cb = document.getElementById('led-control');
  if (cb) cb.checked = led.enabled;

  const effect = document.getElementById('led-effect');
  if (effect) effect.value = led.effect || 'on-entity';

  const entityInput = document.getElementById('led-entity');
  if (entityInput) entityInput.value = led.entity || '';

  const onStateInput = document.getElementById('led-on-state');
  if (onStateInput) onStateInput.value = led.onState || '';

  const brightness = document.getElementById('led-brightness');
  if (brightness) brightness.value = led.brightness ?? 100;

  const val = document.querySelector('.led-slider-value');
  if (val) val.textContent = `${led.brightness ?? 100}%`;

  const dot = document.querySelector('.led-dot');
  if (dot) {
    const c = led.color || DEFAULT_LED.color;
    dot.style.background = `rgb(${c.r},${c.g},${c.b})`;
    dot.style.boxShadow = led.enabled ? `0 0 8px rgba(${c.r},${c.g},${c.b},0.5)` : 'none';
  }

  const status = document.querySelector('.led-status');
  if (status) status.textContent = led.enabled ? 'LED active on entity sync' : 'LED disabled';

  document.querySelectorAll('.led-color-chip').forEach((chip, i) => {
    chip.classList.toggle('active', colorMatchIndex(led.color) === i);
  });
}

function renderEditorPanel() {
  const btn = appState.buttons[selectedButtonIndex];
  if (!btn) return;

  document.getElementById('btn-number').textContent = selectedButtonIndex + 1;
  document.getElementById('btn-label').value = btn.label;
  document.getElementById('btn-font').value = btn.font;

  document.querySelectorAll('.type-toggle button').forEach(b => {
    const isActive = b.dataset.type === btn.type;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });

  const hasHomeAssistantEntity = btn.type === 'checkable' || btn.type === 'timer_sync' || btn.type === 'sensor_sync';
  const hasCheckableIcons = btn.type === 'checkable' || btn.type === 'timer_sync';
  document.getElementById('checkable-options').classList.toggle('hidden', !hasHomeAssistantEntity);
  document.getElementById('checkable-icons').classList.toggle('hidden', !hasCheckableIcons);
  document.getElementById('timer-default-label-group')?.classList.toggle('hidden', btn.type !== 'timer_sync');
  document.getElementById('ha-entity').value = btn.haEntity || '';
  document.getElementById('on-state').value = btn.onState || 'on';
  document.getElementById('timer-default-label').value = btn.timerDefaultLabel || '';

  updateColorDisplay(btn.color);
  updateIconPreview('icon', btn.icon);
  updateIconPreview('icon-on', btn.iconOn || btn.icon);
  updateIconPreview('icon-off', btn.iconOff || btn.icon);

  document.getElementById('short-action-type').value = btn.shortPress?.actionType || '';
  renderActionFields('short-action-fields', btn.shortPress?.actionType || '', btn.shortPress?.data || {}, false);

  const hasLongPress = btn.longPress?.enabled;
  document.getElementById('long-press-enabled').checked = hasLongPress;
  document.getElementById('long-press-builder').classList.toggle('hidden', !hasLongPress);
  document.getElementById('long-min-len').value = btn.longPress?.minLength || '1000ms';
  document.getElementById('long-max-len').value = btn.longPress?.maxLength || '5000ms';
  document.getElementById('long-action-type').value = btn.longPress?.actionType || '';
  renderActionFields('long-action-fields', btn.longPress?.actionType || '', btn.longPress?.data || {}, true);
}

function renderActionFields(containerId, actionType, data, isLong) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const schema = ACTION_SCHEMAS[actionType];
  if (!schema || !schema.fields) return;

  const hasConditional = schema.fields.some(f => f.conditional);

  schema.fields.forEach(field => {
    if (field.conditional && !field.conditional(data)) return;

    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = field.label;

    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (data[field.name] === opt) option.selected = true;
        input.appendChild(option);
      });
    } else if (field.type === 'number') {
      input = document.createElement('input');
      input.type = 'number';
      input.min = field.min;
      input.max = field.max;
      input.value = data[field.name] ?? '';
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.placeholder = field.placeholder || '';
      input.value = data[field.name] ?? '';
    }

    input.id = `${containerId}-${field.name}`;
    label.htmlFor = input.id;
    group.appendChild(label);
    input.classList.add('form-control');
    input.addEventListener('input', (e) => {
      const pressKey = isLong ? 'longPress' : 'shortPress';
      store.update(`Update ${field.name}`, state => {
        state.buttons[selectedButtonIndex][pressKey].data[field.name] = e.target.value;
      });
      if (hasConditional) {
        renderActionFields(containerId, actionType, { ...data, [field.name]: e.target.value }, isLong);
      }
    });

    group.appendChild(input);
    container.appendChild(group);
  });
}

function renderColorThemePresets() {
  const container = document.getElementById('color-theme-presets');
  if (!container) return;

  container.innerHTML = Object.keys(COLOR_THEMES).map(theme => `
    <button type="button" class="btn btn-sm ${theme === activeColorTheme ? 'active' : ''}" data-theme="${theme}">
      ${theme.charAt(0).toUpperCase() + theme.slice(1)}
    </button>
  `).join('');

  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeColorTheme = btn.dataset.theme;
      renderColorSwatches();
    });
  });
}

function renderColorSwatches() {
  const container = document.getElementById('color-swatches');
  if (!container) return;

  const colors = COLOR_THEMES[activeColorTheme] || COLOR_SWATCHES;
  container.innerHTML = '';

  colors.forEach(color => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch';
    btn.style.backgroundColor = `#${color}`;
    btn.setAttribute('aria-label', `Select color #${color}`);
    btn.dataset.color = color;
    btn.addEventListener('click', () => {
      store.button('color', color);
      updateColorDisplay(color);
    });
    container.appendChild(btn);
  });
}

function updateColorDisplay(color) {
  const nativeInput = document.getElementById('color-native');
  const hexInput = document.getElementById('color-hex');

  if (nativeInput) nativeInput.value = `#${color}`;
  if (hexInput) hexInput.value = color;

  document.querySelectorAll('.color-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.color === color);
  });
}

function updateIconPreview(target, iconCode) {
  const iconData = getIconByCodepoint(iconCode);
  const prefix = target === 'icon' ? 'icon-' : `${target}-`;

  const previewEl = document.getElementById(`${prefix}preview`);
  const nameEl = document.getElementById(`${prefix}name`);
  const codeEl = document.getElementById(`${prefix}code`);

  if (previewEl) previewEl.textContent = iconData?.char || '?';
  if (nameEl) nameEl.textContent = iconData?.name || 'Unknown';
  if (codeEl) codeEl.textContent = iconData?.codepoint || (iconCode || '');
}

function populateBoardSelector() {
  const select = document.getElementById('board-select');
  if (!select) return;

  select.innerHTML = BOARD_OPTIONS.map(opt =>
    `<option value="${escapeHTML(opt.id)}">${escapeHTML(opt.label)}</option>`
  ).join('');
  select.value = getBoardId();
  populateGridSelector();
}

function getCurrentBoardConfig(state = appState) {
  return getBoardConfig(state.board || DEFAULT_BOARD_ID) || getBoardConfig(DEFAULT_BOARD_ID);
}

function gridOptionValue(option) {
  return `${option.columns}x${option.rows}`;
}

function getNormalizedGridForBoard(boardConfig, columns, rows) {
  if (isGridAllowedForBoard(boardConfig, columns, rows)) {
    return { columns, rows };
  }
  return getDefaultGridForBoard(boardConfig);
}

function updateGridSizePreview(columns, rows) {
  const preview = document.getElementById('grid-size-preview');
  if (!preview || typeof preview.style?.setProperty !== 'function') return;

  preview.style.setProperty('--preview-columns', columns);
  preview.style.setProperty('--preview-rows', rows);
  preview.setAttribute('title', `${columns}×${rows} grid`);
  preview.innerHTML = Array.from({ length: columns * rows }, () => '<span class="grid-size-preview-cell"></span>').join('');
}

function populateGridSelector() {
  const select = document.getElementById('grid-size-select');
  const hint = document.getElementById('grid-size-hint');
  if (!select) return;

  const boardConfig = getCurrentBoardConfig();
  const options = getAllowedGridOptions(boardConfig);
  const isLocked = options.length === 1;
  const current = getNormalizedGridForBoard(boardConfig, getGridColumns(), getGridRows());

  select.innerHTML = options.map(option => {
    const label = `${option.columns}×${option.rows}${isLocked ? ' (locked)' : ''}`;
    return `<option value="${gridOptionValue(option)}">${label}</option>`;
  }).join('');
  select.value = gridOptionValue(current);
  select.disabled = isLocked;
  updateGridSizePreview(current.columns, current.rows);

  if (hint) {
    const warnings = getBoardSupportWarnings(boardConfig);
    const warningText = warnings.length ? ` ${warnings.map(w => w.message).join(' ')}` : '';
    hint.textContent = isLocked
      ? `320×240 boards use a fixed 4×3 grid.${warningText}`
      : `Choose the grid density for larger displays.${warningText}`;
  }
}

function updateLEDCompatibility() {
  const boardConfig = getBoardConfig(getBoardId());
  const hasRgb = boardConfig?.capabilities?.rgbLed === true;
  const rgbSection = document.getElementById('rgb-led-controls') || document.querySelector('[data-rgb-led]');
  if (!rgbSection) return;

  rgbSection.classList.toggle('hidden', !hasRgb);
  rgbSection.setAttribute('aria-hidden', hasRgb ? 'false' : 'true');
  rgbSection.querySelectorAll('input, select, button, textarea').forEach(control => {
    control.disabled = !hasRgb;
  });
}

function updateBoardSupportWarning(boardId) {
  const warningEl = document.getElementById('board-support-warning');
  if (!warningEl) return;

  const warnings = getBoardSupportWarnings(getBoardConfig(boardId || DEFAULT_BOARD_ID));
  const message = warnings.find(warning => warning?.message)?.message || '';

  warningEl.textContent = message;
  warningEl.classList.toggle('hidden', !message);
  warningEl.setAttribute('aria-hidden', message ? 'false' : 'true');
}

function updateGlobalSettings() {
  document.getElementById('device-name').value = appState.deviceName || '';
  document.getElementById('nice-name').value = appState.niceName || '';
  document.getElementById('display-timeout').value = appState.displayTimeout || 600;
  const boardSelect = document.getElementById('board-select');
  if (boardSelect) boardSelect.value = getBoardId();
  const rotate180Checkbox = document.getElementById('rotate-180');
  if (rotate180Checkbox) rotate180Checkbox.checked = Boolean(appState.rotate180);
  const iconSizeInput = document.getElementById('icon-size');
  if (iconSizeInput) iconSizeInput.value = getIconSize();
  populateGridSelector();
  document.getElementById('device-name-hint').textContent = appState.deviceName ? `hostname: ${appState.deviceName}` : '';
  renderLedControl();
  updateLEDCompatibility();
  updateBoardSupportWarning(getBoardId());
}

function generateYAML() {
  const preview = document.getElementById('yaml-preview');
  const result = ValidationEngine.validateConfig(appState, { selectedButtonIndex, ACTION_SCHEMAS });

  if (result.errors.length > 0) {
    preview.textContent = `# YAML generation blocked by ${result.errors.length} critical validation error${result.errors.length === 1 ? '' : 's'}.`;
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
      BOARD_OPTIONS,
      DEFAULT_BOARD_ID,
      getBoardConfig,
      isSupportedBoard,
      normalizeColor,
      clampNumber,
      normalizeImportedConfig,
      yamlDoc,
      yamlSecret,
      yamlInclude,
      yamlRaw
    });

    preview.innerHTML = YamlGenerationEngine.highlightYAML(yaml);
    return yaml;
  } catch (error) {
    console.error('YAML generation failed:', error);
    preview.textContent = '# YAML generation failed.';
    return '';
  }
}

function selectButton(index) {
  const clamped = Math.max(0, Math.min(index, appState.buttons.length - 1));
  selectedButtonIndex = clamped;
  window.selectedButtonIndex = clamped;
  renderGridPreview();
  renderEditorPanel();
}

function pushHistory() {
  store.update('Before edit', () => {}, { skipUndo: false });
}

function runValidation(opts = {}) {
  const result = ValidationEngine.validateConfig(appState, { selectedButtonIndex, ACTION_SCHEMAS });
  if (opts.showSummary) {
    renderValidationSummary(result);
    openModal('validation-modal', document.getElementById('validation-modal-close'));
  }
  return result;
}

function renderValidationSummary(result) {
  const container = document.getElementById('validation-summary');
  if (!container) return;

  let html = '';

  if (result.errors.length > 0) {
    html += `<div class="validation-summary-card error"><h4>Errors (${result.errors.length})</h4><ul>`;
    result.errors.forEach(err => {
      html += `<li>${escapeHTML(err.message)}</li>`;
    });
    html += '</ul></div>';
  }

  const secretWarnings = result.warnings.filter(w => w.secretPath);
  if (secretWarnings.length > 0) {
    html += `<div class="validation-summary-card warning"><h4>Secret Suggestions</h4><ul>`;
    secretWarnings.forEach((warn, idx) => {
      html += `<li>${escapeHTML(warn.message)} <button type="button" class="btn btn-sm" data-secret-index="${idx}">Convert</button></li>`;
    });
    html += '</ul></div>';
  }

  const otherWarnings = result.warnings.filter(w => !w.secretPath);
  if (otherWarnings.length > 0) {
    html += `<div class="validation-summary-card warning"><h4>Warnings (${otherWarnings.length})</h4><ul>`;
    otherWarnings.forEach(warn => {
      html += `<li>${escapeHTML(warn.message)}</li>`;
    });
    html += '</ul></div>';
  }

  if (!html) {
    html = '<div class="validation-summary-card success"><h4>✓ Configuration is valid</h4></div>';
  }

  container.innerHTML = html;

  container.querySelectorAll('[data-secret-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.secretIndex, 10);
      const warn = secretWarnings[idx];
      if (warn && warn.secretPath) {
        setValueAtPath(warn.secretPath, warn.secretRef);
        showToast('Converted to secret reference', 'success');
      }
    });
  });
}

function setValueAtPath(path, newValue) {
  store.update('Set value', state => {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((obj, part) => obj?.[part], state);
    if (target && last) target[last] = newValue;
  });
  renderEditorPanel();
  runValidation({ showSummary: false });
}

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
  updateHistoryButtons();
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
      if (file) importConfig(file);
      e.target.value = '';
    });
  }

  document.getElementById('export-btn')?.addEventListener('click', () => withLoading('export-btn', exportConfig));
  document.getElementById('copy-yaml-header-btn')?.addEventListener('click', () => withLoading('copy-yaml-header-btn', copyYAMLToClipboard));
  document.getElementById('validate-btn')?.addEventListener('click', () => withLoading('validate-btn', () => runValidation({ showSummary: true })));
  document.getElementById('download-yaml-btn')?.addEventListener('click', () => withLoading('download-yaml-btn', downloadYAML));
  document.getElementById('copy-yaml-btn')?.addEventListener('click', () => withLoading('copy-yaml-btn', copyYAMLToClipboard));
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
      const grid = getNormalizedGridForBoard(boardConfig, state.gridColumns || DEFAULT_CONFIG.gridColumns, state.gridRows || DEFAULT_CONFIG.gridRows);
      state.gridColumns = grid.columns;
      state.gridRows = grid.rows;
      // Clamp button positions to new grid bounds
      state.buttons.forEach(btn => {
        btn.col = Math.max(0, Math.min(state.gridColumns - 1, btn.col));
        btn.row = Math.max(0, Math.min(state.gridRows - 1, btn.row));
      });
    });
  });

  document.getElementById('grid-size-select')?.addEventListener('change', (e) => {
    const [columns, rows] = e.target.value.split('x').map(Number);
    const boardConfig = getCurrentBoardConfig();
    if (!isGridAllowedForBoard(boardConfig, columns, rows)) {
      populateGridSelector();
      return;
    }
    store.update('Change grid size', state => {
      state.gridColumns = columns;
      state.gridRows = rows;
      // Clamp button positions to new grid bounds
      state.buttons.forEach(btn => {
        btn.col = Math.max(0, Math.min(columns - 1, btn.col));
        btn.row = Math.max(0, Math.min(rows - 1, btn.row));
      });
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
        renderLedControl();
        updateLEDCompatibility();
        updateBoardSupportWarning(getBoardId());
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
    setLed({ enabled: e.target.checked });
  });

  document.getElementById('led-effect')?.addEventListener('change', (e) => {
    setLed({ effect: e.target.value });
  });

  document.getElementById('led-entity')?.addEventListener('input', (e) => {
    setLed({ entity: e.target.value });
  });

  document.getElementById('led-on-state')?.addEventListener('input', (e) => {
    setLed({ onState: e.target.value });
  });

  document.getElementById('led-brightness')?.addEventListener('input', (e) => {
    const v = Number(e.target.value);
    setLed({ brightness: v });
    const val = document.querySelector('.led-slider-value');
    if (val) val.textContent = `${v}%`;
  });

  document.querySelectorAll('.led-color-chip').forEach((chip, i) => {
    chip.addEventListener('click', () => {
      const preset = LED_COLOR_PRESETS[i];
      if (preset) setLed({ color: { r: preset.r, g: preset.g, b: preset.b } });
    });
  });
}

function setupColorPickers() {
  document.getElementById('color-native')?.addEventListener('input', (e) => {
    const hex = e.target.value.replace('#', '');
    store.button('color', hex);
    updateColorDisplay(hex);
  });

  document.getElementById('color-hex')?.addEventListener('input', (e) => {
    let hex = e.target.value.replace(/^#/, '').toUpperCase();
    e.target.value = hex;
    if (/^[0-9A-F]{6}$/.test(hex)) {
      store.button('color', hex);
      updateColorDisplay(hex);
    }
  });
}

function setupIconTrigger(triggerId, target) {
  const trigger = document.getElementById(triggerId);
  trigger?.addEventListener('click', () => openIconPicker(target));
  trigger?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openIconPicker(target);
    }
  });
}

function setupIconPickers() {
  setupIconTrigger('icon-picker-trigger', 'main');
  setupIconTrigger('icon-on-trigger', 'on');
  setupIconTrigger('icon-off-trigger', 'off');
}

let iconSearchTimer = null;

function setupModals() {
  document.getElementById('icon-modal-close')?.addEventListener('click', closeIconPicker);
  document.getElementById('icon-cancel-btn')?.addEventListener('click', closeIconPicker);
  document.getElementById('validation-modal-close')?.addEventListener('click', closeValidationModal);
  document.getElementById('validation-close-btn')?.addEventListener('click', closeValidationModal);

  document.getElementById('icon-search')?.addEventListener('input', (e) => {
    clearTimeout(iconSearchTimer);
    iconSearchTimer = setTimeout(() => renderIconResults(e.target.value), 150);
  });

  document.getElementById('icon-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstResult = document.querySelector('.icon-result');
      if (firstResult) firstResult.click();
    }
  });

  document.getElementById('icon-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'icon-modal') closeIconPicker();
  });

  document.getElementById('icon-modal')?.addEventListener('keydown', (e) => {
    trapModalFocus(e, e.currentTarget);
  });

  document.getElementById('validation-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'validation-modal') closeValidationModal();
  });

  document.getElementById('validation-modal')?.addEventListener('keydown', (e) => {
    trapModalFocus(e, e.currentTarget);
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const iconModal = document.getElementById('icon-modal');
      const validationModal = document.getElementById('validation-modal');
      if (iconModal?.classList.contains('active')) {
        closeIconPicker();
      } else if (validationModal?.classList.contains('active')) {
        closeValidationModal();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      exportConfig();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      downloadYAML();
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
    renderActionFields('short-action-fields', e.target.value, {}, false);
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
    renderActionFields('long-action-fields', e.target.value, {}, true);
  });
}

function updateHistoryButtons() {
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  if (undoBtn) undoBtn.disabled = !store.canUndo();
  if (redoBtn) redoBtn.disabled = !store.canRedo();
}

function openModal(modalId, initialFocus) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  lastModalTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  initialFocus?.focus();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  if (lastModalTrigger?.isConnected) lastModalTrigger.focus();
  lastModalTrigger = null;
}

function trapModalFocus(e, modal) {
  if (e.key !== 'Tab') return;

  const focusable = Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter(el => !el.disabled && el.offsetParent !== null);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function openIconPicker(target) {
  currentIconTarget = target;
  const search = document.getElementById('icon-search');
  if (search) search.value = '';
  renderIconCategories();
  renderIconResults('');
  openModal('icon-modal', search);
}

function closeIconPicker() {
  clearTimeout(iconSearchTimer);
  iconSearchTimer = null;
  closeModal('icon-modal');
  selectedIconInModal = null;
}

function closeValidationModal() {
  closeModal('validation-modal');
}

const iconCategoryTimers = new WeakMap();

function renderIconCategories() {
  const container = document.getElementById('icon-category-tabs');
  if (!container) return;

  const mdiData = getMdiData();
  const categoryCounts = new Map();
  for (const [, icon] of mdiData) {
    for (const cat of icon.categories || []) {
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }
  }

  const tabs = [
    { key: 'recent', name: 'Recent', icon: '⏱' },
    { key: 'favorites', name: 'Favorites', icon: '★' },
    { key: 'all', name: 'All', icon: '🔀' },
    ...MDI_CATEGORIES.filter(cat => categoryCounts.has(cat.tag))
      .map(cat => ({ key: cat.key, name: cat.label, icon: cat.icon }))
  ];

  if (!tabs.some(tab => tab.key === selectedIconCategory)) {
    selectedIconCategory = 'all';
  }

  container.className = 'icon-category-tabs';
  container.innerHTML = tabs.map(tab => `
    <button type="button" class="icon-cat-btn ${tab.key === selectedIconCategory ? 'active' : ''}"
            data-category="${escapeHTML(tab.key)}">
      ${tab.icon ? `<span class="cat-icon">${tab.icon}</span>` : ''}${escapeHTML(tab.name)}
    </button>
  `).join('');

  container.querySelectorAll('.icon-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedIconCategory = btn.dataset.category;
      renderIconCategories();
      renderIconResults(document.getElementById('icon-search')?.value || '');
    });
  });
}

function renderIconResults(query) {
  const container = document.getElementById('icon-results');
  if (!container) return;

  let icons = [];

  if (query) {
    icons = searchIcons(query, 200);
  } else if (selectedIconCategory === 'recent') {
    const recentCodepoints = getRecentIcons();
    icons = recentCodepoints
      .map(cp => getIconByCodepoint(cp))
      .filter(Boolean);
  } else if (selectedIconCategory === 'favorites') {
    const favCodepoints = getFavorites();
    icons = favCodepoints
      .map(cp => getIconByCodepoint(cp))
      .filter(Boolean);
  } else if (selectedIconCategory !== 'all') {
    const catDef = MDI_CATEGORIES.find(c => c.key === selectedIconCategory);
    if (catDef) {
      icons = searchIconsByCategory(catDef.tag, 200);
    }
  } else {
    icons = searchIcons('', 200);
  }

  if (icons.length === 0) {
    const emptyMsg = selectedIconCategory === 'favorites'
      ? 'No favorites yet. Double-click any icon to pin it here.'
      : selectedIconCategory === 'recent'
        ? 'No recent icons. Select icons and they appear here.'
        : (query ? 'No icons match your search.' : 'No icons available.');
    container.innerHTML = `<div class="icon-empty"><p>${emptyMsg}</p></div>`;
    return;
  }

  // Batch favorite lookups instead of per-icon localStorage reads.
  const favSet = new Set(getFavorites());

  const countLabel = document.createElement('div');
  countLabel.className = 'icon-count';
  countLabel.textContent = `${icons.length} icon${icons.length === 1 ? '' : 's'}`;

  const grid = document.createElement('div');
  grid.className = 'icon-grid';
  grid.innerHTML = icons.map(icon => {
    const fav = favSet.has(icon.codepoint);
    return `
      <button type="button" class="icon-result ${selectedIconInModal === icon.codepoint ? 'selected' : ''}"
              data-codepoint="${icon.codepoint}" data-name="${escapeHTML(icon.name)}">
        <span class="icon-char" style="font-family: 'Material Design Icons'">${icon.char}</span>
        <span class="icon-name">${escapeHTML(icon.name)}</span>
        ${fav ? '<span class="icon-fav-badge" title="Favorited">★</span>' : ''}
      </button>
    `;
  }).join('');

  container.innerHTML = '';
  container.appendChild(countLabel);
  container.appendChild(grid);

  // Single delegated listener on the grid instead of one per button (up to 200).
  const clickTimers = new Map();
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.icon-result');
    if (!btn) return;
    const codepoint = btn.dataset.codepoint;
    const timer = clickTimers.get(codepoint);
    if (timer) {
      clearTimeout(timer);
      clickTimers.delete(codepoint);
      toggleFavorite(codepoint);
      renderIconResults(document.getElementById('icon-search')?.value || '');
      return;
    }
    clickTimers.set(codepoint, setTimeout(() => {
      clickTimers.delete(codepoint);
      selectIcon(codepoint);
    }, 250));
  });
}

function selectIcon(codepoint) {
  if (currentIconTarget === 'main') {
    store.button('icon', codepoint);
    updateIconPreview('icon', codepoint);
  } else if (currentIconTarget === 'on') {
    store.button('iconOn', codepoint);
    updateIconPreview('icon-on', codepoint);
  } else if (currentIconTarget === 'off') {
    store.button('iconOff', codepoint);
    updateIconPreview('icon-off', codepoint);
  }
  addRecentIcon(codepoint);
  closeIconPicker();
}

function copySelectedButton() {
  copiedButtonConfig = structuredClone(appState.buttons[selectedButtonIndex]);
  showToast('Button config copied', 'success');
}

function pasteToSelectedButton() {
  if (!copiedButtonConfig) {
    showToast('No button config to paste', 'warning');
    return;
  }
  store.update('Paste button config', state => {
    const pasted = structuredClone(copiedButtonConfig);
    pasted.id = state.buttons[selectedButtonIndex].id;
    pasted.col = state.buttons[selectedButtonIndex].col;
    pasted.row = state.buttons[selectedButtonIndex].row;
    state.buttons[selectedButtonIndex] = pasted;
  });
  showToast('Button config pasted', 'success');
}

function resetSelectedButton() {
  store.update('Reset button', state => {
    const fallback = DEFAULT_CONFIG.buttons[selectedButtonIndex];
    state.buttons[selectedButtonIndex] = structuredClone(fallback);
  });
  showToast('Button reset to default', 'success');
}

function exportConfig() {
  const json = JSON.stringify(appState, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appState.deviceName || 'cyd'}-config.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Configuration exported', 'success');
}

function importConfig(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const raw = JSON.parse(e.target.result);
      const { config, warnings } = normalizeImportedConfig(raw);
      store.update('Import config', state => {
        Object.assign(state, config);
        state.board = config.board || DEFAULT_BOARD_ID;
      }, { skipUndo: true });
      if (warnings.length) {
        console.log('Import warnings:', warnings);
        showToast(`Imported with ${warnings.length} adjustments`, 'warning');
      } else {
        showToast('Configuration imported', 'success');
      }
    } catch (err) {
      showToast('Import failed: invalid JSON', 'error');
      console.error('Import error:', err);
    }
  };
  reader.readAsText(file);
}

function downloadYAML() {
  const yaml = generateYAML();
  if (!yaml) {
    showToast('Cannot download: fix validation errors first', 'error');
    return;
  }
  const blob = new Blob([yaml], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appState.deviceName || 'cyd'}.yaml`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('YAML downloaded', 'success');
}

function copyYAMLToClipboard() {
  const yaml = generateYAML();
  if (!yaml) {
    showToast('Cannot copy: fix validation errors first', 'error');
    return;
  }
  navigator.clipboard.writeText(yaml).then(() => {
    showToast('YAML copied to clipboard', 'success');
  }).catch(() => {
    showToast('Failed to copy YAML', 'error');
  });
}

function copyConfigToClipboard() {
  const json = JSON.stringify(appState, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    showToast('Config copied to clipboard', 'success');
  }).catch(() => {
    showToast('Failed to copy config', 'error');
  });
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

Object.defineProperty(window, 'appState', {
  get: () => appState,
  set: (val) => { appState = val; }
});
Object.defineProperty(window, 'selectedButtonIndex', {
  get: () => selectedButtonIndex,
  set: (val) => { selectedButtonIndex = val; }
});
window.DEFAULT_CONFIG = DEFAULT_CONFIG;
window.PRESETS = PRESETS;
window.ACTION_SCHEMAS = ACTION_SCHEMAS;
window.HARDWARE_CONFIG = HARDWARE_CONFIG;
window.COLOR_SWATCHES = COLOR_SWATCHES;
window.COLOR_THEMES = COLOR_THEMES;
window.BOARD_OPTIONS = BOARD_OPTIONS;
window.DEFAULT_BOARD_ID = DEFAULT_BOARD_ID;
window.isSupportedBoard = isSupportedBoard;
window.store = store;
window.YamlGenerationEngine = YamlGenerationEngine;
window.ValidationEngine = ValidationEngine;
window.generateFullYAML = (config) => YamlGenerationEngine.generateFullYAML(config, {
  actionSchemas: ACTION_SCHEMAS,
  hardwareConfig: HARDWARE_CONFIG,
  defaultButton: DEFAULT_BUTTON,
  defaultConfig: DEFAULT_CONFIG,
  DEFAULT_BOARD_ID,
  getBoardConfig,
  isSupportedBoard,
  normalizeColor,
  clampNumber,
  normalizeImportedConfig,
  yamlDoc,
  yamlSecret,
  yamlInclude,
  yamlRaw
});
window.validateConfig = (config) => ValidationEngine.validateConfig(config, { selectedButtonIndex, ACTION_SCHEMAS });

init();
