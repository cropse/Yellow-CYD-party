import { DEFAULT_CONFIG, DEFAULT_BUTTON, DEFAULT_LED, ACTION_SCHEMAS, DEFAULT_BOARD_ID, isSupportedBoard } from './config.js';
import { normalizeColor, clampNumber, ensureUniquePositions, isPlainYAMLObject, sanitizeDeviceName, cleanYAMLValue, getYAMLSection, splitTopLevelListItems, parseYAMLKeyValue } from './utils.js';

function normalizeLedColor(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LED.color };
  return {
    r: Math.max(0, Math.min(255, Number(raw.r) || 0)),
    g: Math.max(0, Math.min(255, Number(raw.g) || 255)),
    b: Math.max(0, Math.min(255, Number(raw.b) || 0))
  };
}

function resolveBoard(raw) {
  if (!raw || typeof raw !== 'string') return DEFAULT_BOARD_ID;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_BOARD_ID;
  if (isSupportedBoard(trimmed)) return trimmed;
  return DEFAULT_BOARD_ID;
}

function normalizeLedConfig(source, fallback) {
  if (typeof source === 'boolean') {
    return { ...structuredClone(DEFAULT_LED), enabled: source };
  }
  if (!source || typeof source !== 'object') return structuredClone(fallback || DEFAULT_LED);
  const fb = (typeof fallback === 'object' && fallback) ? fallback : DEFAULT_LED;
  return {
    enabled: Boolean(source.enabled),
    effect: ['on-entity', 'blink', 'pulse', 'steady'].includes(source.effect) ? source.effect : fb.effect,
    entity: String(source.entity || '').trim(),
    onState: String(source.onState || '').trim(),
    color: normalizeLedColor(source.color),
    brightness: Math.max(0, Math.min(100, Number(source.brightness) || 100))
  };
}

export function normalizeImportedConfig(rawConfig) {
  const warnings = [];
  const source = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
  const buttons = Array.isArray(source.buttons) ? source.buttons : [];
  if (buttons.length !== 12) warnings.push(`Imported config had ${buttons.length || 0} buttons; normalized to 12 CYD buttons.`);

  const config = {
    deviceName: sanitizeDeviceName(source.deviceName || DEFAULT_CONFIG.deviceName) || DEFAULT_CONFIG.deviceName,
    niceName: String(source.niceName || DEFAULT_CONFIG.niceName).trim() || DEFAULT_CONFIG.niceName,
    displayTimeout: clampNumber(source.displayTimeout, 90, 3600, DEFAULT_CONFIG.displayTimeout),
    board: resolveBoard(source.board),
    led: normalizeLedConfig(source.led),
    buttons: Array(12).fill(null).map((_, index) => normalizeButton(buttons[index], index, warnings))
  };

  ensureUniquePositions(config.buttons, warnings);
  config.rawBlocks = Array.isArray(source.rawBlocks) ? source.rawBlocks : [];
  return { config, warnings };
}

function normalizeButton(rawButton, index, warnings = []) {
  const fallback = DEFAULT_CONFIG.buttons[index] || DEFAULT_BUTTON;
  const source = rawButton && typeof rawButton === 'object' ? rawButton : {};
  if (!rawButton || typeof rawButton !== 'object') warnings.push(`Button ${index + 1} was missing or invalid; defaults were used.`);

  const btn = {
    ...structuredClone(fallback),
    ...source,
    id: `btn_${index + 1}`,
    name: source.name || `Button ${index + 1}`,
    col: Number.isInteger(parseInt(source.col, 10)) ? Math.max(0, Math.min(3, parseInt(source.col, 10))) : fallback.col,
    row: Number.isInteger(parseInt(source.row, 10)) ? Math.max(0, Math.min(2, parseInt(source.row, 10))) : fallback.row,
    label: String(source.label ?? fallback.label ?? `Btn ${index + 1}`).slice(0, 40),
    font: ['roboto_12', 'roboto_16', 'arimo14'].includes(source.font) ? source.font : fallback.font,
    color: normalizeColor(source.color) || fallback.color,
    icon: /^\\U000F[0-9A-Fa-f]{4}$/.test(String(source.icon || '')) ? source.icon.toUpperCase() : fallback.icon,
    type: ['stateless', 'checkable', 'timer_sync'].includes(source.type) ? source.type : fallback.type,
    haEntity: source.haEntity ? String(source.haEntity).trim() : null,
    onState: String(source.onState || fallback.onState || 'on').trim() || 'on',
    timerDefaultLabel: String(source.timerDefaultLabel || ''),
    iconOn: /^\\U000F[0-9A-Fa-f]{4}$/.test(String(source.iconOn || '')) ? source.iconOn.toUpperCase() : null,
    iconOff: /^\\U000F[0-9A-Fa-f]{4}$/.test(String(source.iconOff || '')) ? source.iconOff.toUpperCase() : null,
    shortPress: normalizePress(source.shortPress, fallback.shortPress),
    longPress: normalizePress(source.longPress, fallback.longPress, true),
    rawBlocks: Array.isArray(source.rawBlocks) ? source.rawBlocks : []
  };

  if (btn.col !== source.col || btn.row !== source.row) warnings.push(`Button ${index + 1} position was normalized into the 4x3 grid.`);
  if (!normalizeColor(source.color || btn.color)) warnings.push(`Button ${index + 1} color was invalid; default color was used.`);
  return btn;
}

function normalizePress(rawPress, fallbackPress, isLong = false) {
  const source = rawPress && typeof rawPress === 'object' ? rawPress : {};
  const actionType = ACTION_SCHEMAS[source.actionType] ? source.actionType : '';
  const fallbackActionType = ACTION_SCHEMAS[fallbackPress?.actionType] ? fallbackPress.actionType : '';
  const enabled = Boolean(actionType ? source.enabled : fallbackPress?.enabled && fallbackActionType);
  return {
    enabled,
    minLength: isLong ? String(source.minLength || fallbackPress?.minLength || '1000ms') : undefined,
    maxLength: isLong ? String(source.maxLength || fallbackPress?.maxLength || '5000ms') : undefined,
    actionType: actionType || fallbackActionType,
    action: String(source.action || fallbackPress?.action || ''),
    data: isPlainYAMLObject(source.data || {}) && Object.keys(source.data || {}).length ? source.data : (isPlainYAMLObject(fallbackPress?.data || {}) ? fallbackPress.data : {})
  };
}

export function importFromYAML(yamlText) {
  const config = structuredClone(DEFAULT_CONFIG);
  const warnings = [];

  const subSection = getYAMLSection(yamlText, 'substitutions');
  if (subSection) {
    const lines = subSection.split('\n');
    lines.forEach(line => {
      const kv = parseYAMLKeyValue(line);
      if (!kv) return;
      if (kv.key === 'device_name') config.deviceName = kv.value;
      if (kv.key === 'nice_name') config.niceName = kv.value;
    });
  }

  const fontSection = getYAMLSection(yamlText, 'font');
  if (fontSection) {
    const glyphs = new Set();
    splitTopLevelListItems(fontSection).forEach(item => {
      const glyphMatch = item.match(/glyphs:\s*\n((?:\s+-.+\n?)+)/);
      if (glyphMatch) {
        glyphMatch[1].split('\n').forEach(g => {
          const m = g.match(/-\s+"?(\\U000F[0-9A-Fa-f]{4})"?\s*$/);
          if (m) glyphs.add(m[1].toUpperCase());
        });
      }
    });
  }

  return { config, warnings };
}
