import { DEFAULT_CONFIG, DEFAULT_BUTTON, DEFAULT_LED, ACTION_SCHEMAS, DEFAULT_BOARD_ID, isSupportedBoard, getBoardConfig, normalizeGridConfig, BOARD_CONFIGS } from './config.js';
import { normalizeColor, clampNumber, ensureUniquePositions, isPlainYAMLObject, sanitizeDeviceName, cleanYAMLValue, getYAMLSection, splitTopLevelListItems, parseYAMLKeyValue } from './utils.js';
import { decodeMetadata } from './yaml-engine.js';
import YamlPkg from 'yaml';

function normalizeLedColor(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LED.color };
  return {
    r: Math.max(0, Math.min(255, Number(raw.r) || 0)),
    g: Math.max(0, Math.min(255, Number(raw.g ?? 255))),
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
  if (buttons.length === 0) warnings.push('Imported config had no buttons; using defaults.');

  const board = resolveBoard(source.board);
  const boardConfig = getBoardConfig(board);
  const grid = normalizeGridConfig(source, boardConfig);
  // Backward compatibility: map old flipHorizontal to rotate180
const rotate180 = source.rotate180 !== undefined ? Boolean(source.rotate180) : Boolean(source.flipHorizontal);

  if (
    (source.gridColumns !== undefined && source.gridColumns !== grid.gridColumns) ||
    (source.gridRows !== undefined && source.gridRows !== grid.gridRows)
  ) {
    warnings.push(`Grid size was normalized to ${grid.gridColumns}x${grid.gridRows} for the selected board.`);
  }

  const buttonCount = Math.max(1, buttons.length);
  const config = {
    deviceName: sanitizeDeviceName(source.deviceName || DEFAULT_CONFIG.deviceName) || DEFAULT_CONFIG.deviceName,
    niceName: String(source.niceName || DEFAULT_CONFIG.niceName).trim() || DEFAULT_CONFIG.niceName,
    displayTimeout: clampNumber(source.displayTimeout, 90, 3600, DEFAULT_CONFIG.displayTimeout),
    board,
    gridColumns: grid.gridColumns,
    gridRows: grid.gridRows,
    rotate180,
    iconSize: clampNumber(source.iconSize, 16, 96, DEFAULT_CONFIG.iconSize),
    led: normalizeLedConfig(source.led),
    buttons: Array(buttonCount).fill(null).map((_, index) => normalizeButton(buttons[index], index, warnings, grid.gridColumns - 1, grid.gridRows - 1))
  };

  ensureUniquePositions(config.buttons, warnings);
  config.rawBlocks = Array.isArray(source.rawBlocks) ? source.rawBlocks : [];
  return { config, warnings };
}

function normalizeButton(rawButton, index, warnings = [], maxCol = 3, maxRow = 2) {
  const fallback = DEFAULT_CONFIG.buttons[index] || DEFAULT_BUTTON;
  const source = rawButton && typeof rawButton === 'object' ? rawButton : {};
  if (!rawButton || typeof rawButton !== 'object') warnings.push(`Button ${index + 1} was missing or invalid; defaults were used.`);

  const btn = {
    ...structuredClone(fallback),
    ...source,
    id: `btn_${index + 1}`,
    name: source.name || `Button ${index + 1}`,
    col: Number.isInteger(parseInt(source.col, 10)) ? Math.max(0, Math.min(maxCol, parseInt(source.col, 10))) : fallback.col,
    row: Number.isInteger(parseInt(source.row, 10)) ? Math.max(0, Math.min(maxRow, parseInt(source.row, 10))) : fallback.row,
    label: String(source.label ?? fallback.label ?? `Btn ${index + 1}`).slice(0, 40),
    font: ['roboto_12', 'roboto_16', 'arimo14'].includes(source.font) ? source.font : fallback.font,
    color: normalizeColor(source.color) || fallback.color,
    icon: /^\\U000F[0-9A-Fa-f]{4}$/.test(String(source.icon || '')) ? source.icon.toUpperCase() : fallback.icon,
    type: ['stateless', 'checkable', 'timer_sync', 'number_sync'].includes(source.type) ? source.type : fallback.type,
    haEntity: source.haEntity ? String(source.haEntity).trim() : null,
    onState: String(source.onState || fallback.onState || 'on').trim() || 'on',
    timerDefaultLabel: String(source.timerDefaultLabel || ''),
    iconOn: /^\\U000F[0-9A-Fa-f]{4}$/.test(String(source.iconOn || '')) ? source.iconOn.toUpperCase() : null,
    iconOff: /^\\U000F[0-9A-Fa-f]{4}$/.test(String(source.iconOff || '')) ? source.iconOff.toUpperCase() : null,
    shortPress: normalizePress(source.shortPress, fallback.shortPress),
    longPress: normalizePress(source.longPress, fallback.longPress, true),
    rawBlocks: Array.isArray(source.rawBlocks) ? source.rawBlocks : []
  };

  if (btn.col !== source.col || btn.row !== source.row) warnings.push(`Button ${index + 1} position was normalized into the ${maxCol + 1}x${maxRow + 1} grid.`);
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

// ── Custom block markers ──────────────────────────────────────────────────

const CUSTOM_MARKER_BEGIN = '# cyd-custom: begin';
const CUSTOM_MARKER_END = '# cyd-custom: end';

export function parseCustomBlocks(text) {
  const blocks = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const beginIdx = lines.findIndex((line, idx) => idx >= i && line.trim() === CUSTOM_MARKER_BEGIN);
    if (beginIdx < 0) break;
    const endIdx = lines.findIndex((line, idx) => idx > beginIdx && line.trim() === CUSTOM_MARKER_END);
    if (endIdx < 0) break;
    const content = lines.slice(beginIdx + 1, endIdx).join('\n').trim();
    if (content) blocks.push(content);
    i = endIdx + 1;
  }
  return blocks;
}

function stripCustomBlocks(text) {
  const lines = text.split('\n');
  const result = [];
  let skip = false;
  for (const line of lines) {
    if (line.trim() === CUSTOM_MARKER_BEGIN) { skip = true; continue; }
    if (line.trim() === CUSTOM_MARKER_END) { skip = false; continue; }
    if (!skip) result.push(line);
  }
  return result.join('\n');
}

// ── YAML parsing helpers ──────────────────────────────────────────────────

function preprocessYamlTags(text) {
  // Replace !include lines with inline object markers so the yaml parser can handle them
  // e.g., "btn_logic_3: !include\n    file: x\n    vars: ..." → "btn_logic_3:\n    __tag: include\n    file: x\n    vars: ..."
  // And "!secret api_encryption_key" → "__secret: api_encryption_key"
  let result = text;
  result = result.replace(/^(\s*)([\w_-]+):\s+!secret\s+(\S+)/gm, '$1$2: __secret__$3');
  result = result.replace(/^(\s*)([\w_-]+):\s+!include\s+(\S+)\s*$/gm, '$1$2:\n$1  __tag__: include\n$1  __file__: $3');
  result = result.replace(/^(\s*)([\w_-]+):\s+!include\s*$/gm, '$1$2:\n$1  __tag__: include');
  result = result.replace(/^(\s*)-\s*<<:\s+!include\s*$/gm, '$1- __merge_include__:');
  return result;
}

function safeParseYAML(text) {
  try {
    const preprocessed = preprocessYamlTags(text);
    const raw = YamlPkg.parse(preprocessed, { strict: false, uniqueKeys: false });
    return { raw, warnings: [] };
  } catch (e) {
    return { raw: null, warnings: [`YAML parse error: ${e.message}`] };
  }
}

function asString(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  return String(val);
}

function asNumber(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function asArray(val) {
  return Array.isArray(val) ? val : [];
}

function asObject(val) {
  return val && typeof val === 'object' && !Array.isArray(val) ? val : {};
}

function iconFromYaml(val) {
  const s = String(val || '');
  const m = s.match(/(\\U000F[0-9A-Fa-f]{4})/);
  if (m) return m[1].toUpperCase();
  const m2 = s.match(/\\uF([0-9A-Fa-f]{4})/i);
  if (m2) return `\\U000F${m2[1].toUpperCase()}`;
  const codePoint = [...s][0]?.codePointAt(0);
  if (codePoint && codePoint >= 0xF0000 && codePoint <= 0xFFFFD) {
    return `\\U${codePoint.toString(16).toUpperCase().padStart(8, '0')}`;
  }
  return null;
}

function buttonIndexFromId(id) {
  const m = String(id || '').match(/btn_(\d+)/);
  return m ? parseInt(m[1], 10) - 1 : -1;
}

// ── Reverse action mapping ───────────────────────────────────────────────

const ACTION_DOMAIN_MAP = {
  switch: 'switch',
  light: 'light',
  cover: 'cover',
  media_player: 'media_player',
  climate: 'climate',
  fan: 'fan',
  vacuum: 'vacuum',
  lock: 'lock',
  humidifier: 'humidifier',
  input_boolean: 'input_boolean',
  input_select: 'input_select'
};

const ACTION_SPECIAL_MAP = {
  'scene.turn_on': 'scene',
  'button.press': 'button',
  'automation.trigger': 'automation'
};

function reverseMapAction(actionStr, dataObj) {
  if (!actionStr) return { actionType: '', data: {} };

  // Check special actions first
  for (const [actionKey, schemaKey] of Object.entries(ACTION_SPECIAL_MAP)) {
    if (actionStr === actionKey || actionStr.startsWith(actionKey.split('.')[0] + '.')) {
      if (actionStr === actionKey) {
        const result = { actionType: schemaKey, data: {} };
        if (dataObj?.entity_id) result.data.entityId = dataObj.entity_id;
        return result;
      }
    }
  }

  const parts = actionStr.split('.');
  if (parts.length < 2) return { actionType: 'custom', data: { action: actionStr } };

  const domain = parts[0];
  const operation = parts.slice(1).join('.');

  // Check if it's a script (script.xxx where xxx is a script ID)
  if (domain === 'script') {
    return { actionType: 'script', data: { action: actionStr } };
  }

  // Check known domain
  const mappedType = ACTION_DOMAIN_MAP[domain];
  if (mappedType) {
    const data = {};
    if (dataObj?.device_id) {
      data.targetType = 'device_id';
      data.deviceId = dataObj.device_id;
    } else if (dataObj?.entity_id) {
      data.targetType = 'entity_id';
      data.entityId = dataObj.entity_id;
    }
    data.operation = operation;
    // Copy extra data keys
    for (const [k, v] of Object.entries(dataObj || {})) {
      if (k === 'entity_id' || k === 'device_id') continue;
      if (mappedType === 'cover' && k === 'position') data.position = Number(v) || 0;
      if (mappedType === 'light' && k === 'brightness_pct') data.brightness = Number(v) || 0;
      if (mappedType === 'climate' && k === 'hvac_mode') data.hvacMode = v;
      if (mappedType === 'climate' && k === 'temperature') data.temperature = Number(v) || 0;
      if (mappedType === 'fan' && k === 'percentage') data.percentage = Number(v) || 0;
      if (mappedType === 'humidifier' && k === 'humidity') data.humidity = Number(v) || 0;
      if (mappedType === 'input_select' && k === 'option') data.option = v;
    }
    return { actionType: mappedType, data };
  }

  // Fallback to custom
  return {
    actionType: 'custom',
    data: {
      action: actionStr,
      targetType: dataObj?.device_id ? 'device_id' : 'entity_id',
      entityId: dataObj?.entity_id || '',
      deviceId: dataObj?.device_id || '',
      dataJson: Object.keys(dataObj || {}).filter(k => !['entity_id', 'device_id'].includes(k)).length
        ? JSON.stringify(Object.fromEntries(Object.entries(dataObj || {}).filter(([k]) => !['entity_id', 'device_id'].includes(k))))
        : ''
    }
  };
}

// ── Fallback YAML section parsers ────────────────────────────────────────

function parseSubstitutions(raw) {
  const sub = asObject(raw?.substitutions);
  const displayTimeout = sub.display_timeout === undefined ? undefined : asNumber(sub.display_timeout);
  const iconSize = sub.icon_size === undefined ? undefined : asNumber(sub.icon_size);
  return {
    deviceName: asString(sub.device_name),
    niceName: asString(sub.nice_name),
    apPassword: asString(sub.ap_password),
    width: asNumber(sub.width),
    height: asNumber(sub.height),
    displayTimeout,
    iconSize,
    display_timeout: displayTimeout,
    icon_size: iconSize
  };
}

function resolveSubstitution(val, sub) {
  const s = String(val || '');
  const m = s.match(/^\$\{(\w+)\}$/);
  if (m) {
    const key = m[1];
    return sub[key] !== undefined ? sub[key] : val;
  }
  return val;
}

function parseDisplayTimeout(raw, sub) {
  const numberSection = asArray(raw?.number);
  for (const entry of numberSection) {
    const obj = asObject(entry);
    if (obj.id === 'display_timeout') {
      const resolved = resolveSubstitution(obj.initial_value, sub);
      return asNumber(resolved, DEFAULT_CONFIG.displayTimeout);
    }
  }
  return DEFAULT_CONFIG.displayTimeout;
}

function parseIconSize(raw, sub) {
  const fontSection = asArray(raw?.font);
  for (const entry of fontSection) {
    const obj = asObject(entry);
    if (obj.id === 'mdi_icons') {
      const resolved = resolveSubstitution(obj.size, sub);
      return clampNumber(resolved, 16, 96, DEFAULT_CONFIG.iconSize);
    }
  }
  return DEFAULT_CONFIG.iconSize;
}

function parseGridDimensions(raw) {
  const lvgl = asObject(raw?.lvgl);
  const pages = asArray(lvgl.pages);
  for (const page of pages) {
    const pg = asObject(page);
    const widgets = asArray(pg.widgets);
    for (const w of widgets) {
      const obj = asObject(w.obj || w);
      const layout = asObject(obj.layout);
      if (layout.grid_columns && layout.grid_rows) {
        const gc = asArray(layout.grid_columns);
        const gr = asArray(layout.grid_rows);
        if (gc.length && gr.length) {
          return { gridColumns: gc.length, gridRows: gr.length };
        }
      }
    }
  }
  return { gridColumns: DEFAULT_CONFIG.gridColumns, gridRows: DEFAULT_CONFIG.gridRows };
}

function fingerprintBoard(raw, sub) {
  const esp32 = asObject(raw?.esp32);
  const boardName = asString(esp32.board);
  const framework = asObject(esp32.framework);
  const fwType = asString(framework.type);
  const variant = asString(esp32.variant);

  const display = asArray(raw?.display);
  const touch = asArray(raw?.touchscreen);

  let displayPlatform = '';
  let touchPlatform = '';
  let hasRgb = false;

  for (const d of display) {
    const obj = asObject(d);
    displayPlatform = asString(obj.platform);
  }
  for (const t of touch) {
    const obj = asObject(t);
    touchPlatform = asString(obj.platform);
  }

  const output = asArray(raw?.output);
  for (const o of output) {
    const obj = asObject(o);
    if (obj.id === 'output_red') hasRgb = true;
  }

  for (const [id, bc] of Object.entries(BOARD_CONFIGS)) {
    const hw = bc.hardware || {};
    const hwEsp32 = hw.esp32 || {};
    if (hwEsp32.board !== boardName) continue;
    if (hwEsp32.framework !== fwType && !(fwType === 'esp-idf' && hwEsp32.framework === 'esp-idf')) continue;
    if (bc.width !== sub.width || bc.height !== sub.height) continue;
    if (bc.capabilities?.rgbLed !== hasRgb) continue;
    return id;
  }

  return DEFAULT_BOARD_ID;
}

function parseRotate180(raw, boardId) {
  const display = asArray(raw?.display);
  if (!display.length) return false;
  const dispObj = asObject(display[0]);
  const transform = asObject(dispObj.transform);
  const bc = getBoardConfig(boardId);
  if (!bc?.hardware?.display?.transform) return false;

  const boardTx = bc.hardware.display.transform;
  const boardMirrorX = Boolean(boardTx.mirror_x);
  const boardMirrorY = Boolean(boardTx.mirror_y);
  const mirrorX = Boolean(transform.mirror_x);
  const mirrorY = Boolean(transform.mirror_y);
  return mirrorX !== boardMirrorX && mirrorY !== boardMirrorY;
}

function parseGlobalLed(packagesSection) {
  const pkgs = asObject(packagesSection);
  const ledSync = asObject(pkgs.led_sync);
  if (!ledSync || !Object.keys(ledSync).length) return null;

  const sensors = asArray(ledSync.text_sensor);
  for (const sensor of sensors) {
    const s = asObject(sensor);
    const entityId = asString(s.entity_id);
    if (!entityId) continue;

    const onValue = asArray(s.on_value);
    const thenBlock = onValue.length ? asArray(onValue[0]?.then) : [];
    let onState = 'on';
    let color = { r: 0, g: 255, b: 0 };
    let brightness = 100;

    for (const step of thenBlock) {
      const ifBlock = asObject(step.if);
      const cond = asObject(ifBlock.condition);
      if (cond.lambda) {
        const lambdaStr = asString(cond.lambda);
        const stateMatch = lambdaStr.match(/return\s+x\s*==\s*"([^"]+)"/);
        if (stateMatch) onState = stateMatch[1];
      }

      const thenArr = asArray(ifBlock.then);
      for (const t of thenArr) {
        const turnOn = asObject(t['light.turn_on']);
        if (turnOn) {
          if (turnOn.red) color.r = Math.round(asNumber(turnOn.red.replace('%', ''), 0) * 2.55);
          if (turnOn.green) color.g = Math.round(asNumber(turnOn.green.replace('%', ''), 0) * 2.55);
          if (turnOn.blue) color.b = Math.round(asNumber(turnOn.blue.replace('%', ''), 0) * 2.55);
          if (turnOn.brightness) brightness = asNumber(turnOn.brightness.replace('%', ''), 100);
        }
      }
    }

    return { enabled: true, effect: 'on-entity', entity: entityId, onState, color, brightness };
  }
  return null;
}

function parseColorSection(raw) {
  const colorSection = asArray(raw?.color);
  const colorMap = {};
  for (const entry of colorSection) {
    const obj = asObject(entry);
    if (obj.id && obj.hex) {
      const hex = asString(obj.hex).replace(/^0x/i, '').replace(/^#/, '').replace(/"/g, '');
      colorMap[obj.id] = hex.toUpperCase();
    }
  }
  return colorMap;
}

function parseButtonsFromLVGL(raw, colorMap) {
  const lvgl = asObject(raw?.lvgl);
  const pages = asArray(lvgl.pages);
  const buttons = {};

  for (const page of pages) {
    const pg = asObject(page);
    const widgets = asArray(pg.widgets);
    for (const w of widgets) {
      const obj = asObject(w.obj || w);
      const innerWidgets = asArray(obj.widgets);
      for (const iw of innerWidgets) {
        // The yaml package puts !include + << merge key content under "<<" or after preprocessing under "__merge_include__"
        const widgetObj = asObject(iw);
        const mergeContent = asObject(widgetObj['<<'] || widgetObj.__merge_include__ || {});
        const includeObj = Object.keys(mergeContent).length ? mergeContent : widgetObj;
        const includeFile = asString(includeObj.file || '');
        const vars = asObject(includeObj.vars);
        if (!vars.id) continue;

        const idx = buttonIndexFromId(vars.id);
        if (idx < 0) continue;

        let btn = {
          id: vars.id,
          col: asNumber(vars.col, 0),
          row: asNumber(vars.row, 0),
          label: asString(vars.label, `Btn ${idx + 1}`),
          icon: iconFromYaml(vars.icon) || DEFAULT_BUTTON.icon,
          font: ['roboto_12', 'roboto_16', 'arimo14'].includes(vars.font) ? vars.font : 'roboto_12',
          color: DEFAULT_BUTTON.color,
          type: 'stateless',
          haEntity: null,
          onState: 'on',
          timerDefaultLabel: '',
          threshold: null,
          condition: 'above',
          iconOn: null,
          iconOff: null,
          shortPress: { enabled: false, actionType: '', action: '', data: {} },
          longPress: { enabled: false, minLength: '1000ms', maxLength: '5000ms', actionType: '', action: '', data: {} }
        };

        // Resolve color: can be a color ref like btn_N_color or direct 0xRRGGBB
        const colorVal = vars.color;
        const colorText = asString(colorVal, '');
        if (typeof colorVal === 'number') {
          btn.color = Math.max(0, Math.min(0xFFFFFF, colorVal)).toString(16).toUpperCase().padStart(6, '0');
        } else if (colorText.startsWith('0x') || colorText.startsWith('0X')) {
          btn.color = colorText.replace(/^0x/i, '').toUpperCase();
        } else if (colorMap[colorText]) {
          btn.color = colorMap[colorText];
        }

        if (includeFile.includes('cyd_button_widget_checkable')) {
          btn.type = 'checkable';
        }

        buttons[idx] = btn;
      }
    }
  }
  return buttons;
}

function parseSyncPackages(raw, buttons) {
  const packagesSection = asObject(raw?.packages);
  if (!packagesSection || !Object.keys(packagesSection).length) return buttons;

  for (const [key, val] of Object.entries(packagesSection)) {
    const pkg = asObject(val);
    // val might be a YAML node — try to get vars
    const vars = asObject(pkg.vars || (typeof val === 'object' && val?.vars ? val.vars : {}));

    // If val itself has !include shape, check the raw structure
    const file = asString(pkg.file || '');
    const entityId = asString(vars.ha_entity || vars.entity_id || '');
    const btnId = asString(vars.btn_id || '');
    const idx = buttonIndexFromId(btnId);

    if (key.startsWith('btn_logic_')) {
      // checkable sync
      if (idx >= 0 && buttons[idx]) {
        buttons[idx].type = 'checkable';
        buttons[idx].haEntity = entityId;
        buttons[idx].onState = asString(vars.on_state || 'on');
        buttons[idx].iconOn = iconFromYaml(vars.ico_on) || buttons[idx].iconOn;
        buttons[idx].iconOff = iconFromYaml(vars.ico_off) || buttons[idx].iconOff;
      }
    } else if (key.startsWith('btn_timer_')) {
      // timer_sync
      if (idx >= 0 && buttons[idx]) {
        buttons[idx].type = 'timer_sync';
        buttons[idx].haEntity = entityId;
        buttons[idx].timerDefaultLabel = asString(vars.default_label || '');
      }
    } else if (key.startsWith('btn_number_')) {
      // number_sync
      if (idx >= 0 && buttons[idx]) {
        buttons[idx].type = 'number_sync';
        buttons[idx].haEntity = entityId;
        buttons[idx].threshold = vars.threshold != null ? Number(vars.threshold) : null;
        buttons[idx].condition = asString(vars.condition || 'above');
        buttons[idx].iconOn = iconFromYaml(vars.ico_on) || buttons[idx].iconOn;
        buttons[idx].iconOff = iconFromYaml(vars.ico_off) || buttons[idx].iconOff;
      }
    } else if (key.startsWith('btn_sensor_')) {
      // Legacy sensor_sync — reject (user chose to reject, not map)
    } else if (key.startsWith('led_sync_')) {
      // Per-button LED sync — also confirms checkable type
      if (idx >= 0 && buttons[idx]) {
        buttons[idx].ledControl = true;
      }
    }
  }

  return buttons;
}

function metadataButtonFor(metaGapFill, index, useIdLookup) {
  const buttons = asArray(metaGapFill?.buttons);
  if (useIdLookup) return buttons.find(btn => btn?.id === `btn_${index + 1}`) || null;
  return buttons[index] || null;
}

function parseBinarySensors(raw, buttons) {
  const sensorSection = asArray(raw?.binary_sensor);
  if (!sensorSection.length) return buttons;

  for (const entry of sensorSection) {
    const sensor = asObject(entry);
    if (sensor.platform !== 'lvgl') continue;

    const widgetId = asString(sensor.widget || '');
    const idx = buttonIndexFromId(widgetId);
    if (idx < 0 || !buttons[idx]) continue;

    const onClick = asArray(sensor.on_click);
    for (const click of onClick) {
      const minLen = asString(click.min_length || '');
      const maxLen = asString(click.max_length || '');
      const thenArr = asArray(click.then);

      let actionStr = '';
      let dataObj = {};
      for (const step of thenArr) {
        const haAction = asObject(step['homeassistant.action']);
        if (haAction) {
          actionStr = asString(haAction.action);
          dataObj = asObject(haAction.data);
        }
      }

      if (!actionStr) continue;

      const mapped = reverseMapAction(actionStr, dataObj);
      if (!mapped.actionType) continue;

      const minMs = asNumber(parseInt(minLen, 10), 0);
      const maxMs = asNumber(parseInt(maxLen, 10), 0);
      const isShort = minLen === '50ms' || (maxMs > 0 ? maxMs <= 500 : minMs <= 500);
      const pressObj = {
        enabled: true,
        actionType: mapped.actionType,
        action: actionStr,
        data: mapped.data
      };

      if (isShort) {
        buttons[idx].shortPress = pressObj;
      } else {
        buttons[idx].longPress = {
          ...pressObj,
          minLength: minLen || '1000ms',
          maxLength: maxLen || '5000ms'
        };
      }
    }
  }

  return buttons;
}

// ── Main import function ──────────────────────────────────────────────────

export function importFromYAML(yamlText) {
  const warnings = [];

  const customBlocks = parseCustomBlocks(yamlText);
  const strippedYaml = stripCustomBlocks(yamlText);

  const { raw, warnings: parseWarnings } = safeParseYAML(strippedYaml);
  warnings.push(...parseWarnings);

  const metadata = decodeMetadata(yamlText);
  const metaConfig = metadata?.config || null;
  const useMetaGapFillIds = Boolean(metadata?.gapFill);
  const metaGapFill = metadata?.gapFill || metaConfig;
  if (metadata?.warnings?.length) warnings.push(...metadata.warnings);

  if (!raw && !metaConfig) {
    warnings.push('Could not parse YAML; using default configuration.');
    const { config } = normalizeImportedConfig({});
    return { config, warnings };
  }

  if (raw) {
    const sub = parseSubstitutions(raw);
    const deviceName = sanitizeDeviceName(sub.deviceName) || DEFAULT_CONFIG.deviceName;
    const niceName = sub.niceName || DEFAULT_CONFIG.niceName;
    const board = fingerprintBoard(raw, sub);
    const boardConfig = getBoardConfig(board);
    const { gridColumns, gridRows } = parseGridDimensions(raw);
    const displayTimeout = parseDisplayTimeout(raw, sub);
    const iconSize = parseIconSize(raw, sub);
    const rotate180 = parseRotate180(raw, board);
    const ledParsed = parseGlobalLed(raw?.packages);
    const led = ledParsed ? normalizeLedConfig(ledParsed) : structuredClone(DEFAULT_LED);
    const colorMap = parseColorSection(raw);
    const lvglButtons = parseButtonsFromLVGL(raw, colorMap);
    const buttonsWithSync = parseSyncPackages(raw, { ...lvglButtons });
    const buttonsWithActions = parseBinarySensors(raw, buttonsWithSync);
    const maxIdx = Math.max(...Object.keys(buttonsWithActions).map(Number), -1);
    const buttonCount = Math.max(1, maxIdx + 1);
    const grid = normalizeGridConfig({ gridColumns, gridRows }, boardConfig);
    const maxCol = grid.gridColumns - 1;
    const maxRow = grid.gridRows - 1;

    const buttons = Array(buttonCount).fill(null).map((_, i) => {
      const parsed = buttonsWithActions[i] || null;
      return normalizeButton(parsed, i, warnings, maxCol, maxRow);
    });
    ensureUniquePositions(buttons, warnings);

    const config = {
      deviceName,
      niceName,
      displayTimeout,
      board,
      gridColumns: grid.gridColumns,
      gridRows: grid.gridRows,
      rotate180,
      iconSize,
      led,
      buttons,
      rawBlocks: customBlocks
    };

    if (metaGapFill) {
      for (let i = 0; i < config.buttons.length; i++) {
        const metaButton = metadataButtonFor(metaGapFill, i, useMetaGapFillIds);
        if (metaButton?.name && metaButton.name !== `Button ${i + 1}`) {
          config.buttons[i].name = metaButton.name;
        }
        if (metaButton?.empty !== undefined) {
          config.buttons[i].empty = metaButton.empty;
        }
        if (metaButton?.timerDefaultLabel && !config.buttons[i].timerDefaultLabel) {
          config.buttons[i].timerDefaultLabel = metaButton.timerDefaultLabel;
        }
        if (metaButton?.threshold != null && config.buttons[i].threshold == null) {
          config.buttons[i].threshold = Number(metaButton.threshold);
        }
        if (metaButton?.condition && !config.buttons[i].condition) {
          config.buttons[i].condition = metaButton.condition;
        }
      }
    }

    if (metaGapFill) {
      warnings.push('YAML imported; embedded metadata was used only for UI-only gap-fill.');
    } else {
      warnings.push('YAML imported without embedded metadata; UI-only settings may not be fully restored.');
    }
    return { config, warnings };
  }

  if (metaConfig) {
    const { config, warnings: normWarnings } = normalizeImportedConfig(metaConfig);
    warnings.push(...normWarnings);
    return { config, warnings };
  }

  const { config } = normalizeImportedConfig({});
  return { config, warnings };
}
