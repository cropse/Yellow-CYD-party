// ============================================================
// UI RENDERING MODULE
// ============================================================

export function createUIRendering({
  getState, getSelectedIndex, store,
  getIconByCodepoint, escapeHTML,
  ACTION_SCHEMAS, DEFAULT_LED, DEFAULT_CONFIG, BOARD_OPTIONS, DEFAULT_BOARD_ID, COLOR_SWATCHES,
  getBoardConfig, isGridAllowedForBoard, getDefaultGridForBoard, getAllowedGridOptions, getBoardSupportWarnings,
  selectButton, handleGridKeydown, handleEmptyCellClick, attachGridDragListeners, applyGridDragAttributes,
  getPreviewFontSize, getGridColumns, getGridRows, getIconSize, getBoardId,
  openModal, showToast
}) {
  let gridCellCache = null;
  let activeColorTheme = 'basic';

  const LED_COLOR_PRESETS = [
    { name: 'Green', r: 0, g: 255, b: 0 },
    { name: 'Red', r: 255, g: 0, b: 0 },
    { name: 'Amber', r: 255, g: 152, b: 0 },
    { name: 'Blue', r: 74, g: 158, b: 255 },
    { name: 'White', r: 255, g: 255, b: 255 }
  ];

  const COLOR_THEMES = {
    basic: COLOR_SWATCHES,
    warm: ['FF6B6B', 'FF8E72', 'FFA94D', 'FFD93D', 'FFE066', 'FFF3B0', 'FFB4B4', 'FF8585'],
    cool: ['4ECDC4', '45B7D1', '5C7AEA', '7C83FD', '9B5DE5', 'F15BB5', '00BBF9', '00F5D4'],
    nature: ['2D5A27', '4A7C23', '6B8E23', '8FBC8F', '90EE90', '98FB98', 'ADFF2F', '00FA9A'],
    vibrant: ['FF0080', 'FF4D4D', 'FF8C00', 'FFD700', '7FFF00', '00FF7F', '00CED1', '8A2BE2'],
    pastel: ['FFB3BA', 'FFDFBA', 'FFFFBA', 'BAFFC9', 'BAE1FF', 'E8BAFF', 'FFB3DE', 'B3FFE8'],
    neon: ['FF073A', 'FF61F6', 'A020F0', '00FF00', '39FF14', '00FFFF', 'FF00FF', 'FFFF00']
  };

  function getLed() {
    const led = getState().led;
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

  function colorMatchIndex(color) {
    if (!color || typeof color !== 'object') return -1;
    return LED_COLOR_PRESETS.findIndex(p => p.r === color.r && p.g === color.g && p.b === color.b);
  }

  function getCurrentBoardConfig() {
    return getBoardConfig(getBoardId()) || getBoardConfig(DEFAULT_BOARD_ID);
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

  // ponytail: state-sync buttons show iconOn in the preview — the main icon is the unavailable fallback
  const previewIconOf = (btn) => {
    if (!btn) return null;
    if ((btn.type === 'checkable' || btn.type === 'timer_sync' || btn.type === 'number_sync') && btn.iconOn) {
      return getIconByCodepoint(btn.iconOn);
    }
    return getIconByCodepoint(btn.icon);
  };

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

    const state = getState();
    const positionMap = new Map();
    state.buttons.forEach((btn, idx) => {
      if (btn.empty) return;
      const key = `${btn.col},${btn.row}`;
      if (!positionMap.has(key)) positionMap.set(key, []);
      positionMap.get(key).push(idx);
    });

    const expectedCellCount = gridColumns * gridRows;
    const hasGridChanges = container.children.length !== expectedCellCount
      || gridCellCache?.gridColumns !== gridColumns
      || gridCellCache?.gridRows !== gridRows
      || gridCellCache?.buttonCount !== state.buttons.length;

    const needsFullRebuild = !gridCellCache || hasGridChanges;
    if (needsFullRebuild) {
      container.innerHTML = '';
      gridCellCache = new Array(state.buttons.length);
      gridCellCache.gridColumns = gridColumns;
      gridCellCache.gridRows = gridRows;
      gridCellCache.buttonCount = state.buttons.length;
    }

    const createGridCell = (col, row, btnIndex, hasConflict) => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.col = col;
      cell.dataset.row = row;
      cell.dataset.btnIndex = btnIndex >= 0 ? String(btnIndex) : 'empty';

      if (btnIndex >= 0) {
        const btn = state.buttons[btnIndex];
        const iconData = previewIconOf(btn);

        cell.innerHTML = `
          <span class="position-badge">${col + 1},${row + 1}</span>
          <span class="icon" style="font-family: 'Material Design Icons'; font-size: ${getPreviewFontSize(btn.font)}; color: #${btn.color};">${iconData?.char || ''}</span>
          <span class="label">${escapeHTML(btn.label)}</span>
        `;

        if (btnIndex === getSelectedIndex()) cell.classList.add('selected');
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
        cell.tabIndex = 0;
        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-label', `Move selected button to column ${col + 1}, row ${row + 1}`);
        cell.addEventListener('click', () => handleEmptyCellClick(col, row));
        cell.addEventListener('keydown', (e) => handleGridKeydown(e, col, row, btnIndex));
        attachGridDragListeners(cell, btnIndex);
      }

      return cell;
    };

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridColumns; col++) {
        const slotIndex = row * gridColumns + col;
        const btnIndex = state.buttons.findIndex(b => !b.empty && b.col === col && b.row === row);
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
          const btn = state.buttons[btnIndex];
          const iconData = previewIconOf(btn);
          const fontSize = getPreviewFontSize(btn.font);
          const iconSpan = cell.querySelector('.icon');
          if (iconSpan) {
            iconSpan.style.fontSize = fontSize;
            iconSpan.style.color = `#${btn.color}`;
            iconSpan.textContent = iconData?.char || '';
          }
          const labelSpan = cell.querySelector('.label');
          if (labelSpan) labelSpan.textContent = btn.label;
          cell.classList.toggle('selected', btnIndex === getSelectedIndex());
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

  function renderEditorPanel() {
    const state = getState();
    const btn = state.buttons[getSelectedIndex()];
    if (!btn) return;

    document.getElementById('btn-number').textContent = btn.row * getGridColumns() + btn.col + 1;
    document.getElementById('btn-label').value = btn.label;
    document.getElementById('btn-font').value = btn.font;

    document.querySelectorAll('.type-toggle button').forEach(b => {
      const isActive = b.dataset.type === btn.type;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    const hasHomeAssistantEntity = btn.type === 'checkable' || btn.type === 'timer_sync' || btn.type === 'number_sync';
    const hasCheckableIcons = btn.type === 'checkable' || btn.type === 'timer_sync' || btn.type === 'number_sync';
    document.getElementById('checkable-options').classList.toggle('hidden', !hasHomeAssistantEntity);
    document.getElementById('checkable-icons').classList.toggle('hidden', !hasCheckableIcons);
    document.getElementById('timer-default-label-group')?.classList.toggle('hidden', btn.type !== 'timer_sync');
    document.getElementById('on-state-group')?.classList.toggle('hidden', btn.type !== 'checkable');
    document.getElementById('number-sync-threshold-group')?.classList.toggle('hidden', btn.type !== 'number_sync');
    document.getElementById('number-sync-condition-group')?.classList.toggle('hidden', btn.type !== 'number_sync');
    document.getElementById('ha-entity').value = btn.haEntity || '';
    document.getElementById('on-state').value = btn.onState ?? 'on';
    document.getElementById('timer-default-label').value = btn.timerDefaultLabel || '';
    document.getElementById('number-threshold').value = btn.threshold ?? '';
    document.querySelectorAll('.condition-toggle button').forEach(b => {
      const isActive = b.dataset.condition === (btn.condition || 'above');
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    updateColorDisplay(btn.color);
    updateIconPreview('icon', btn.icon);
    updateIconPreview('icon-on', btn.iconOn || btn.icon);
    updateIconPreview('icon-off', btn.iconOff || btn.icon);

    // ponytail: relabel main icon for state-sync buttons — it's only shown when unavailable
    const iconLabel = document.getElementById('icon-label');
    if (iconLabel) iconLabel.textContent = hasCheckableIcons ? 'Icon Unavailable' : 'Icon';

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

    const activeEl = document.activeElement;
    const wasFocused = activeEl && container.contains(activeEl);
    const focusedFieldName = wasFocused ? activeEl.id.replace(`${containerId}-`, '') : null;
    const cursorPos = wasFocused ? (activeEl.selectionStart ?? null) : null;

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
          state.buttons[getSelectedIndex()][pressKey].data[field.name] = e.target.value;
        });
        if (hasConditional) {
          renderActionFields(containerId, actionType, { ...data, [field.name]: e.target.value }, isLong);
        }
      });

      group.appendChild(input);
      container.appendChild(group);
    });

    if (focusedFieldName) {
      const el = document.getElementById(`${containerId}-${focusedFieldName}`);
      if (el) {
        el.focus();
        if (cursorPos !== null && el.setSelectionRange) {
          el.setSelectionRange(cursorPos, cursorPos);
        }
      }
    }
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

  function populateBoardSelector() {
    const select = document.getElementById('board-select');
    if (!select) return;

    select.innerHTML = BOARD_OPTIONS.map(opt =>
      `<option value="${escapeHTML(opt.id)}">${escapeHTML(opt.label)}</option>`
    ).join('');
    select.value = getBoardId();
    populateGridSelector();
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

  function updateGridSizePreview(columns, rows) {
    const preview = document.getElementById('grid-size-preview');
    if (!preview || typeof preview.style?.setProperty !== 'function') return;

    preview.style.setProperty('--preview-columns', columns);
    preview.style.setProperty('--preview-rows', rows);
    preview.setAttribute('title', `${columns}×${rows} grid`);
    preview.innerHTML = Array.from({ length: columns * rows }, () => '<span class="grid-size-preview-cell"></span>').join('');
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
    const state = getState();
    document.getElementById('device-name').value = state.deviceName || '';
    document.getElementById('nice-name').value = state.niceName || '';
    document.getElementById('display-timeout').value = state.displayTimeout || 600;
    const boardSelect = document.getElementById('board-select');
    if (boardSelect) boardSelect.value = getBoardId();
    const rotate180Checkbox = document.getElementById('rotate-180');
    if (rotate180Checkbox) rotate180Checkbox.checked = Boolean(state.rotate180);
    const iconSizeInput = document.getElementById('icon-size');
    if (iconSizeInput) iconSizeInput.value = getIconSize();
    populateGridSelector();
    document.getElementById('device-name-hint').textContent = state.deviceName ? `hostname: ${state.deviceName}` : '';
    renderLedControl();
    updateLEDCompatibility();
    updateBoardSupportWarning(getBoardId());
  }

  function renderValidationSummary(result, onConvertSecret) {
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
          onConvertSecret(warn.secretPath, warn.secretRef);
        }
      });
    });
  }

  function updateHistoryButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = !store.canUndo();
    if (redoBtn) redoBtn.disabled = !store.canRedo();
  }

  return {
    renderGridPreview,
    renderEditorPanel,
    renderActionFields,
    renderColorThemePresets,
    renderColorSwatches,
    updateColorDisplay,
    updateIconPreview,
    renderLedControl,
    populateBoardSelector,
    populateGridSelector,
    updateGridSizePreview,
    updateLEDCompatibility,
    updateBoardSupportWarning,
    updateGlobalSettings,
    renderValidationSummary,
    updateHistoryButtons,
    getCurrentBoardConfig,
    getNormalizedGridForBoard,
    COLOR_THEMES,
    getLed,
    setLed,
    colorMatchIndex,
    get activeColorTheme() { return activeColorTheme; },
    set activeColorTheme(v) { activeColorTheme = v; }
  };
}
