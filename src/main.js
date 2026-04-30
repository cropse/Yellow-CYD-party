import './styles/main.css';
import { DEFAULT_CONFIG, PRESETS, HARDWARE_CONFIG, ACTION_SCHEMAS, COLOR_SWATCHES, DEFAULT_BUTTON } from './modules/config.js';
import { createStore } from './modules/store.js';
import * as YamlGenerationEngine from './modules/yaml-engine.js';
import * as ValidationEngine from './modules/validation-engine.js';
import { normalizeColor, clampNumber, escapeHTML } from './modules/utils.js';
import { normalizeImportedConfig } from './modules/import.js';
import { loadMDIData, getIconByCodepoint, searchIcons } from './modules/mdi.js';

function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span>${escapeHTML(message)}</span>
    <button type="button" class="toast-dismiss" aria-label="Dismiss">×</button>
  `;
  
  toast.querySelector('.toast-dismiss').addEventListener('click', () => {
    toast.remove();
  });
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
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

const ICON_CATEGORIES = {
  popular: { name: 'Popular', icons: ['F0594', 'F0595', 'F059C', 'F0583', 'F1B94', 'F040E', 'F03E4', 'F040A', 'F091D', 'F17C9', 'F032A', 'F024A', 'F1846', 'F1847', 'F0402', 'F1A5C', 'F025A', 'F1915'] },
  home: { name: 'Home', icons: ['F024A', 'F032A', 'F02DC', 'F02DD', 'F10BC', 'F10BD', 'F10BE', 'F10BF', 'F10C0', 'F10C1'] },
  tech: { name: 'Tech', icons: ['F0594', 'F0595', 'F059C', 'F0583', 'F1B94', 'F040E', 'F03E4', 'F040A'] },
  media: { name: 'Media', icons: ['F040E', 'F03E4', 'F040A', 'F0402', 'F1A5C', 'F025A', 'F1915'] },
  light: { name: 'Light', icons: ['F091D', 'F17C9', 'F1051', 'F0335', 'F076A', 'F1020'] },
  climate: { name: 'Climate', icons: ['F0210', 'F0503', 'F0502', 'F0501', 'F0C6A', 'F0C6B'] }
};

let appState = loadState();
let selectedButtonIndex = 0;
let copiedButtonConfig = null;
let currentIconTarget = 'main';
let selectedIconInModal = null;
let selectedIconCategory = 'popular';
let activeColorTheme = 'basic';

const store = createStore({
  getState: () => appState,
  setState: (next) => { appState = next; },
  getSelectedIndex: () => selectedButtonIndex,
  effects: {
    save: saveState,
    render: () => {
      renderGridPreview();
      renderEditorPanel();
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
  }
}

async function init() {
  console.log('Initializing CYD Config Generator...');

  document.getElementById('icon-loading')?.classList.remove('hidden');
  await loadMDIData();
  document.getElementById('icon-loading')?.classList.add('hidden');

  renderColorThemePresets();
  renderColorSwatches();
  renderGridPreview();
  renderEditorPanel();
  updateGlobalSettings();
  generateYAML();

  setupEventListeners();

  console.log('Initialization complete!');
}

function renderGridPreview() {
  const container = document.getElementById('grid-preview');
  if (!container) return;
  container.innerHTML = '';

  const positionMap = new Map();
  appState.buttons.forEach((btn, idx) => {
    const key = `${btn.col},${btn.row}`;
    if (!positionMap.has(key)) positionMap.set(key, []);
    positionMap.get(key).push(idx);
  });

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.col = col;
      cell.dataset.row = row;

      const btnIndex = appState.buttons.findIndex(b => b.col === col && b.row === row);
      const hasConflict = positionMap.get(`${col},${row}`)?.length > 1;

      if (btnIndex >= 0) {
        const btn = appState.buttons[btnIndex];
        const iconData = getIconByCodepoint(btn.icon);
        
        cell.innerHTML = `
          <span class="position-badge">${col + 1},${row + 1}</span>
          <span class="icon" style="font-family: 'Material Design Icons'; font-size: ${btn.font === 'roboto_12' ? '18px' : btn.font === 'arimo14' ? '20px' : '22px'}; color: #${btn.color};">${iconData?.char || ''}</span>
          <span class="label">${escapeHTML(btn.label)}</span>
        `;
        
        if (btnIndex === selectedButtonIndex) cell.classList.add('selected');
        if (hasConflict) cell.classList.add('position-conflict');
        
        cell.addEventListener('click', () => selectButton(btnIndex));
        cell.tabIndex = 0;
        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-label', `Edit ${btn.label}`);
      } else {
        cell.innerHTML = `
          <span class="position-badge">${col + 1},${row + 1}</span>
          <span class="label text-muted">Empty</span>
        `;
        cell.classList.add('empty');
      }

      container.appendChild(cell);
    }
  }
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

  document.getElementById('checkable-options').classList.toggle('hidden', btn.type !== 'checkable');
  document.getElementById('led-control').checked = btn.ledControl;
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
    group.appendChild(label);

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
    input.addEventListener('focus', () => pushHistory());
    input.addEventListener('change', (e) => {
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
    btn.dataset.color = color;
    btn.addEventListener('click', () => {
      store.button('color', color);
      updateColorDisplay(color);
    });
    container.appendChild(btn);
  });

  renderColorThemePresets();
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
  const prefix = target === 'icon' ? '' : `${target}-`;

  const previewEl = document.getElementById(`${prefix}preview`) || document.getElementById(`icon-${target}-preview`);
  const nameEl = document.getElementById(`${prefix}name`) || document.getElementById(`icon-${target}-name`);

  if (previewEl) previewEl.textContent = iconData?.char || '?';
  if (nameEl) nameEl.textContent = iconData?.name || 'Unknown';
}

function updateGlobalSettings() {
  document.getElementById('device-name').value = appState.deviceName || '';
  document.getElementById('nice-name').value = appState.niceName || '';
  document.getElementById('display-timeout').value = appState.displayTimeout || 600;
  document.getElementById('device-name-hint').textContent = appState.deviceName ? `hostname: ${appState.deviceName}` : '';
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
      normalizeColor,
      clampNumber,
      normalizeImportedConfig
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
  selectedButtonIndex = index;
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
    document.getElementById('validation-modal').classList.add('active');
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
        showToast('Converted to secret reference');
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
      document.documentElement.setAttribute('data-theme', isDark ? 'light' : '');
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
  document.getElementById('export-clipboard-btn')?.addEventListener('click', () => withLoading('export-clipboard-btn', copyConfigToClipboard));
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
}

function setupPresets() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      if (PRESETS[preset]) {
        store.update(`Load ${preset} preset`, state => {
          const newConfig = PRESETS[preset]();
          Object.assign(state, newConfig);
        });
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
      document.getElementById('checkable-options').classList.toggle('hidden', type !== 'checkable');
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

  document.getElementById('led-control')?.addEventListener('change', (e) => {
    store.button('ledControl', e.target.checked);
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

function setupIconPickers() {
  document.getElementById('icon-picker-trigger')?.addEventListener('click', () => openIconPicker('main'));
  document.getElementById('icon-picker-trigger')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openIconPicker('main'); }
  });
  document.getElementById('icon-on-trigger')?.addEventListener('click', () => openIconPicker('on'));
  document.getElementById('icon-off-trigger')?.addEventListener('click', () => openIconPicker('off'));
}

function setupModals() {
  document.getElementById('icon-modal-close')?.addEventListener('click', closeIconPicker);
  document.getElementById('icon-cancel-btn')?.addEventListener('click', closeIconPicker);
  document.getElementById('validation-modal-close')?.addEventListener('click', closeValidationModal);
  document.getElementById('validation-close-btn')?.addEventListener('click', closeValidationModal);

  let iconSearchTimer;
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

  document.getElementById('validation-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'validation-modal') closeValidationModal();
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

function openIconPicker(target) {
  currentIconTarget = target;
  document.getElementById('icon-modal').classList.add('active');
  document.getElementById('icon-search').value = '';
  document.getElementById('icon-search').focus();
  renderIconCategories();
  renderIconResults('');
}

function closeIconPicker() {
  document.getElementById('icon-modal').classList.remove('active');
  selectedIconInModal = null;
}

function closeValidationModal() {
  document.getElementById('validation-modal').classList.remove('active');
}

function renderIconCategories() {
  const container = document.getElementById('icon-category-tabs');
  if (!container) return;

  container.innerHTML = Object.entries(ICON_CATEGORIES).map(([key, cat]) => `
    <button type="button" class="btn btn-sm ${key === selectedIconCategory ? 'active' : ''}" data-category="${key}">
      ${cat.name}
    </button>
  `).join('');

  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedIconCategory = btn.dataset.category;
      renderIconCategories();
      renderIconResults('');
    });
  });
}

function renderIconResults(query) {
  const container = document.getElementById('icon-results');
  if (!container) return;

  const icons = searchIcons(query, 200);

  if (icons.length === 0) {
    container.innerHTML = '<p class="text-muted">No icons found</p>';
    return;
  }

  container.innerHTML = icons.map(icon => `
    <button type="button" class="icon-result ${selectedIconInModal === icon.codepoint ? 'selected' : ''}" 
            data-codepoint="${icon.codepoint}" data-name="${escapeHTML(icon.name)}">
      <span class="icon-char" style="font-family: 'Material Design Icons'">${icon.char}</span>
      <span class="icon-name">${escapeHTML(icon.name)}</span>
    </button>
  `).join('');

  container.querySelectorAll('.icon-result').forEach(btn => {
    btn.addEventListener('click', () => {
      selectIcon(btn.dataset.codepoint);
    });
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
  closeIconPicker();
}

function copySelectedButton() {
  copiedButtonConfig = structuredClone(appState.buttons[selectedButtonIndex]);
  showToast('Button config copied');
}

function pasteToSelectedButton() {
  if (!copiedButtonConfig) {
    showToast('No button config to paste');
    return;
  }
  store.update('Paste button config', state => {
    const pasted = structuredClone(copiedButtonConfig);
    pasted.id = state.buttons[selectedButtonIndex].id;
    pasted.col = state.buttons[selectedButtonIndex].col;
    pasted.row = state.buttons[selectedButtonIndex].row;
    state.buttons[selectedButtonIndex] = pasted;
  });
  showToast('Button config pasted');
}

function resetSelectedButton() {
  store.update('Reset button', state => {
    const fallback = DEFAULT_CONFIG.buttons[selectedButtonIndex];
    state.buttons[selectedButtonIndex] = structuredClone(fallback);
  });
  showToast('Button reset to default');
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
  showToast('Configuration exported');
}

function importConfig(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const raw = JSON.parse(e.target.result);
      const { config, warnings } = normalizeImportedConfig(raw);
      store.update('Import config', state => {
        Object.assign(state, config);
      }, { skipUndo: true });
      if (warnings.length) {
        console.log('Import warnings:', warnings);
        showToast(`Imported with ${warnings.length} adjustments`);
      } else {
        showToast('Configuration imported');
      }
    } catch (err) {
      showToast('Import failed: invalid JSON');
      console.error('Import error:', err);
    }
  };
  reader.readAsText(file);
}

function downloadYAML() {
  const yaml = generateYAML();
  if (!yaml) {
    showToast('Cannot download: fix validation errors first');
    return;
  }
  const blob = new Blob([yaml], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appState.deviceName || 'cyd'}.yaml`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('YAML downloaded');
}

function copyYAMLToClipboard() {
  const yaml = generateYAML();
  if (!yaml) {
    showToast('Cannot copy: fix validation errors first');
    return;
  }
  navigator.clipboard.writeText(yaml).then(() => {
    showToast('YAML copied to clipboard');
  }).catch(() => {
    showToast('Failed to copy YAML');
  });
}

function copyConfigToClipboard() {
  const json = JSON.stringify(appState, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    showToast('Config copied to clipboard');
  }).catch(() => {
    showToast('Failed to copy config');
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

window.appState = appState;
window.selectedButtonIndex = selectedButtonIndex;
window.DEFAULT_CONFIG = DEFAULT_CONFIG;
window.PRESETS = PRESETS;
window.ACTION_SCHEMAS = ACTION_SCHEMAS;
window.HARDWARE_CONFIG = HARDWARE_CONFIG;
window.COLOR_SWATCHES = COLOR_SWATCHES;
window.COLOR_THEMES = COLOR_THEMES;
window.ICON_CATEGORIES = ICON_CATEGORIES;
window.store = store;
window.YamlGenerationEngine = YamlGenerationEngine;
window.ValidationEngine = ValidationEngine;
window.generateFullYAML = (config) => YamlGenerationEngine.generateFullYAML(config, {
  actionSchemas: ACTION_SCHEMAS,
  hardwareConfig: HARDWARE_CONFIG,
  defaultButton: DEFAULT_BUTTON,
  defaultConfig: DEFAULT_CONFIG,
  normalizeColor,
  clampNumber,
  normalizeImportedConfig
});
window.validateConfig = (config) => ValidationEngine.validateConfig(config, { selectedButtonIndex, ACTION_SCHEMAS });

init();
