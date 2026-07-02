import { isSupportedBoard, isGridAllowedForBoard, getBoardConfig, DEFAULT_CONFIG } from './config.js';

/**
 * Validation Engine - Pure validation logic for CYD configurations.
 *
 * This module validates button configurations and returns structured
 * errors/warnings without UI side effects.
 */

/**
 * Validate a complete CYD configuration.
 * @param {object} config - The configuration to validate
 * @param {object} deps - Dependencies { selectedButtonIndex, ACTION_SCHEMAS }
 * @returns {object} { errors: [], warnings: [] }
 */
export function validateConfig(config, deps = {}) {
  const { selectedButtonIndex = 0, ACTION_SCHEMAS = {} } = deps;
  const issues = { errors: [], warnings: [] };

  if (!config || typeof config !== 'object') {
    issues.errors.push({ message: 'Configuration is empty or invalid.' });
    return issues;
  }

  if (!Array.isArray(config.buttons) || config.buttons.length === 0) {
    issues.errors.push({ message: 'Configuration must contain at least 1 CYD button.' });
    return issues;
  }

  if (!String(config.deviceName || '').trim()) {
    issues.errors.push({ message: 'Device name is required. Use a lowercase ESPHome hostname such as living-room-cyd.', selector: '#device-name' });
  } else if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(String(config.deviceName))) {
    issues.errors.push({ message: 'Device name must be a valid ESPHome hostname: lowercase letters, numbers, and hyphens; no leading/trailing hyphen.', selector: '#device-name' });
  }

  if (!String(config.niceName || '').trim()) {
    issues.errors.push({ message: 'Friendly name is required.', selector: '#nice-name' });
  }

  if (typeof config.board === 'string' && config.board.trim()) {
    if (!isSupportedBoard(config.board)) {
      issues.errors.push({
        message: `Board "${config.board}" is not supported. Choose from: esp32-2432s028-2port, esp32-e32r28t, esp32-3248s035c, esp32-e32r35t, esp32-e32r40t, guition-jc4827543c.`,
        selector: '#board-select'
      });
    }
  }

  const timeout = parseInt(config.displayTimeout, 10);
  if (!Number.isFinite(timeout) || timeout < 90 || timeout > 3600) {
    issues.errors.push({ message: 'Display timeout must be between 90 and 3600 seconds.', selector: '#display-timeout' });
  }

  const boardConfig = getBoardConfig(config.board);
  const gridCols = config.gridColumns;
  const gridRows = config.gridRows;

  if (gridCols !== undefined && gridRows !== undefined) {
    if (!Number.isInteger(gridCols) || !Number.isInteger(gridRows) || gridCols < 1 || gridRows < 1) {
      issues.errors.push({ message: `Grid dimensions must be positive integers (got columns: ${gridCols}, rows: ${gridRows}).`, selector: '#grid-columns' });
    } else if (boardConfig && !isGridAllowedForBoard(boardConfig, gridCols, gridRows)) {
      issues.errors.push({ message: `Grid ${gridCols}x${gridRows} is not supported for board "${config.board}".`, selector: '#grid-columns' });
    }
  }

  if (config.rotate180 !== undefined && typeof config.rotate180 !== 'boolean') {
    issues.errors.push({ message: 'rotate180 must be a boolean value (true or false).', selector: '#rotate-180' });
  }

  if (config.iconSize !== undefined) {
    const iconSize = Number(config.iconSize);
    if (!Number.isFinite(iconSize) || !Number.isInteger(iconSize) || iconSize < 16 || iconSize > 96) {
      issues.errors.push({ message: 'Icon size must be an integer between 16 and 96.', selector: '#icon-size' });
    }
  }

  if (looksLikeSecret(config.deviceName, 'deviceName')) {
    issues.warnings.push({ message: 'Device name looks like a secret or credential; use a non-sensitive hostname.', selector: '#device-name' });
  }

  const positions = new Map();
  config.buttons.forEach((btn, i) => {
    if (!btn || typeof btn !== 'object') {
      issues.errors.push({ message: `Button ${i + 1} is empty or invalid.` });
      return;
    }

    if (btn.empty) return;

    if (!['stateless', 'checkable', 'timer_sync', 'number_sync'].includes(btn.type)) {
      issues.errors.push({ message: `Button ${i + 1} has an unsupported button type.`, selector: i === selectedButtonIndex ? '.type-toggle' : null });
    }

    if (!/^\\U000F[0-9A-Fa-f]{4}$/.test(String(btn.icon || ''))) {
      issues.errors.push({ message: `Button ${i + 1} icon must be a Material Design Icon codepoint like \\U000F0594.`, selector: i === selectedButtonIndex ? '#icon-picker-trigger' : null });
    }

    const maxCol = Number.isInteger(config.gridColumns) ? config.gridColumns - 1 : DEFAULT_CONFIG.gridColumns - 1;
    const maxRow = Number.isInteger(config.gridRows) ? config.gridRows - 1 : DEFAULT_CONFIG.gridRows - 1;
    if (!Number.isInteger(btn.col) || btn.col < 0 || btn.col > maxCol || !Number.isInteger(btn.row) || btn.row < 0 || btn.row > maxRow) {
      issues.errors.push({ message: `Button ${i + 1} position must be inside the ${config.gridColumns || DEFAULT_CONFIG.gridColumns}x${config.gridRows || DEFAULT_CONFIG.gridRows} grid.`, selector: null });
    }

    const position = `${btn.col},${btn.row}`;
    if (positions.has(position)) {
      issues.errors.push({ message: `Buttons ${positions.get(position) + 1} and ${i + 1} overlap at column ${btn.col + 1}, row ${btn.row + 1}. Move one button to an unused grid slot.`, selector: null });
    } else {
      positions.set(position, i);
    }

    if (!/^[0-9A-Fa-f]{6}$/.test(String(btn.color || ''))) {
      issues.errors.push({ message: `Button ${i + 1}: color must be exactly 6 hexadecimal characters, for example FFFFFF or FF9800.`, selector: i === selectedButtonIndex ? '#color-hex' : null });
    }

    if (btn.type === 'stateless' && !btn.shortPress?.enabled && !btn.longPress?.enabled) {
      issues.warnings.push({ message: `Button ${i + 1}: stateless buttons need at least one press action so the generated YAML has something to trigger.`, selector: i === selectedButtonIndex ? '#short-action-type' : null });
    }

    // Both checkable, timer_sync and number_sync require HA entity
    const needsEntitySync = btn.type === 'checkable' || btn.type === 'timer_sync' || btn.type === 'number_sync';
    if (needsEntitySync && !String(btn.haEntity || '').trim()) {
      issues.errors.push({ message: `Button ${i + 1}: ${btn.type} mode needs a Home Assistant entity such as switch.living_room or timer.studio_light.`, selector: i === selectedButtonIndex ? '#ha-entity' : null });
    }

    // number_sync must use a sensor.* domain entity
    if (btn.type === 'number_sync' && String(btn.haEntity || '').trim() && !/^sensor\./.test(String(btn.haEntity))) {
      issues.errors.push({ message: `Button ${i + 1}: number_sync mode requires a sensor.* entity like sensor.temperature; got "${btn.haEntity}".`, selector: i === selectedButtonIndex ? '#ha-entity' : null });
    }

    // number_sync requires threshold and valid on/off icons
    if (btn.type === 'number_sync') {
      if (btn.threshold === null || btn.threshold === '' || isNaN(Number(btn.threshold))) {
        issues.errors.push({ message: `Button ${i + 1} number_sync mode requires a numeric threshold.`, selector: i === selectedButtonIndex ? '#number-threshold' : null });
      }
      if (!['above', 'below'].includes(btn.condition)) {
        issues.errors.push({ message: `Button ${i + 1} number_sync condition must be 'above' or 'below'.`, selector: i === selectedButtonIndex ? '#number-sync-condition-group' : null });
      }
      if (!/^\\U000F[0-9A-Fa-f]{4}$/.test(String(btn.iconOn || btn.icon || '')) || !/^\\U000F[0-9A-Fa-f]{4}$/.test(String(btn.iconOff || btn.icon || ''))) {
        issues.errors.push({ message: `Button ${i + 1} number_sync mode requires valid on/off icon codepoints.`, selector: i === selectedButtonIndex ? '#icon-on-trigger' : null });
      }
    }

    // Only checkable buttons need onState and icon validation (timer_sync has its own state tracking)
    if (btn.type === 'checkable') {
      if (!String(btn.onState || '').trim()) {
        issues.errors.push({ message: `Button ${i + 1} checkable mode requires an on-state value.`, selector: i === selectedButtonIndex ? '#on-state' : null });
      }
      if (!/^\\U000F[0-9A-Fa-f]{4}$/.test(String(btn.iconOn || btn.icon || '')) || !/^\\U000F[0-9A-Fa-f]{4}$/.test(String(btn.iconOff || btn.icon || ''))) {
        issues.errors.push({ message: `Button ${i + 1} checkable mode requires valid on/off icon codepoints.`, selector: i === selectedButtonIndex ? '#icon-on-trigger' : null });
      }
    }

    ['label', 'haEntity', 'onState', 'timerDefaultLabel'].forEach(key => {
      if (looksLikeSecret(btn[key], key)) {
        const path = `buttons.${i}.${key}`;
        issues.warnings.push({
          message: `Button ${i + 1} ${key} looks like a credential. Use !secret ${secretNameFromContext(path)} instead.`,
          selector: i === selectedButtonIndex ? (key === 'label' ? '#btn-label' : key === 'haEntity' ? '#ha-entity' : key === 'timerDefaultLabel' ? '#timer-default-label' : '#on-state') : null,
          secretPath: path,
          secretRef: `!secret ${secretNameFromContext(path)}`
        });
      }
    });

    validateActionPayload(i, 'shortPress', btn.shortPress, issues, selectedButtonIndex, ACTION_SCHEMAS);
    validateActionPayload(i, 'longPress', btn.longPress, issues, selectedButtonIndex, ACTION_SCHEMAS);
  });

  return issues;
}

/**
 * Validate an action payload for a button press.
 * @param {number} buttonIndex - Zero-based button index
 * @param {string} pressType - 'shortPress' or 'longPress'
 * @param {object} actionObj - The action configuration object
 * @param {object} issues - The issues accumulator { errors: [], warnings: [] }
 * @param {number} selectedButtonIndex - Currently selected button index for selector mapping
 * @param {object} ACTION_SCHEMAS - Action schema definitions (for future extensibility)
 */
export function validateActionPayload(buttonIndex, pressType, actionObj, issues, selectedButtonIndex, ACTION_SCHEMAS) {
  if (!actionObj?.enabled) return;
  const pressLabel = pressType === 'longPress' ? 'long press' : 'short press';
  const actionTypeSelector = buttonIndex === selectedButtonIndex ? (pressType === 'longPress' ? '#long-action-type' : '#short-action-type') : null;

  if (!actionObj.actionType) {
    issues.errors.push({ message: `Button ${buttonIndex + 1}: choose an action type for the enabled ${pressLabel}, or disable that ${pressLabel} action.`, selector: actionTypeSelector });
    return;
  }
}

/**
 * Check if a value looks like a secret or credential.
 * @param {string} value - The value to check
 * @param {string} context - The field context (e.g., 'deviceName', 'password')
 * @returns {boolean}
 */
export function looksLikeSecret(value, context = '') {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('!secret ')) return false;
  const lowerContext = context.toLowerCase();
  const lowerValue = trimmed.toLowerCase();
  const secretContext = /(password|passwd|pwd|secret|token|api[_-]?key|apikey|credential|ssid|encryption[_-]?key|auth|bearer)/i.test(lowerContext);
  const secretShape = /^(sk-|xox[baprs]-|gh[pousr]_|eyJ[A-Za-z0-9_-]+\.|AKIA[0-9A-Z]{16})/.test(trimmed)
    || /^[A-Za-z0-9_-]{24,}$/.test(trimmed)
    || /password\s*[:=]/i.test(trimmed)
    || /ssid\s*[:=]/i.test(trimmed);
  return secretContext || (secretShape && !/^([a-z]+\.)?[a-z0-9_]+$/i.test(lowerValue));
}

/**
 * Generate a secret name from a context path.
 * @param {string} context - The context path (e.g., 'buttons.0.label')
 * @returns {string} A snake_case secret name
 */
export function secretNameFromContext(context) {
  return context
    .toLowerCase()
    .replace(/buttons\.(\d+)/, 'button_$1')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'my_secret';
}
