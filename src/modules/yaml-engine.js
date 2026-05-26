// ============================================================
// YAML GENERATION ENGINE MODULE
// ============================================================

/**
 * YAML Generation Engine - Pure functions for ESPHome YAML generation.
 *
 * This module contains all YAML generation logic, separated from UI concerns.
 * It can be tested independently and used in different contexts.
 *
 * Dependencies (passed via deps parameter):
 * - actionSchemas: ACTION_SCHEMAS object for action normalization
 * - hardwareConfig: HARDWARE_CONFIG string
 * - defaultButton: DEFAULT_BUTTON object
 * - defaultConfig: DEFAULT_CONFIG object
 * - normalizeColor: color normalization function
 * - clampNumber: number clamping function
 * - normalizeImportedConfig: config normalization function
 */

export function yamlScalar(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const text = String(value);
  if (text.startsWith('!secret ') || text.startsWith('!lambda ')) return text;
  if (/^[A-Za-z0-9_.\/-]+$/.test(text) && !/^(true|false|null|yes|no|on|off)$/i.test(text) && !/^\d+(\.\d+)?$/.test(text)) return text;
  // Don't double-backslash icon codepoints like \U000Fxxxx - they're already YAML-ready
  const escaped = text.startsWith('\\U000F') ? text : text.replace(/\\/g, '\\\\');
  return `"${escaped.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

export function yamlQuoted(value) {
  const text = String(value ?? '');
  // Don't double-backslash icon codepoints like \U000Fxxxx - they're already YAML-ready
  const escaped = text.startsWith('\\U000F') ? text : text.replace(/\\/g, '\\\\');
  return `"${escaped.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

export function toYAML(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  const nextIndent = indent + 1;

  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') return yamlScalar(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(item => {
      const itemYAML = toYAML(item, nextIndent);
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        const lines = itemYAML.split('\n');
        return `- ${lines[0]}\n${lines.slice(1).map(l => '  '.repeat(nextIndent) + l).join('\n')}`;
      }
      return `- ${itemYAML}`;
    }).join('\n' + spaces);
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';

    return entries.map(([key, value]) => {
      const valueYAML = toYAML(value, nextIndent);

      if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
        return `${key}:\n${'  '.repeat(nextIndent)}${valueYAML.split('\n').join('\n' + '  '.repeat(nextIndent))}`;
      }

      if (Array.isArray(value) && value.length > 0) {
        const items = value.map(item => {
          const itemYAML = toYAML(item, nextIndent + 1);
          if (typeof item === 'object' && item !== null) {
            const lines = itemYAML.split('\n');
            return `${'  '.repeat(nextIndent)}- ${lines[0]}\n${lines.slice(1).map(l => '  '.repeat(nextIndent + 1) + l).join('\n')}`;
          }
          return `${'  '.repeat(nextIndent)}- ${itemYAML}`;
        }).join('\n');
        return `${key}:\n${items}`;
      }

      return `${key}: ${valueYAML}`;
    }).join('\n' + spaces);
  }

  return String(obj);
}

export function extractGlyphs(buttons) {
  const glyphs = new Set();
  buttons.forEach(btn => {
    if (btn.empty) return;
    if (btn.icon) glyphs.add(btn.icon);
    if (btn.iconOn) glyphs.add(btn.iconOn);
    if (btn.iconOff) glyphs.add(btn.iconOff);
  });
  return Array.from(glyphs);
}

export function generateRandomPassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function resolveBoardConfig(config, deps) {
  if (!deps.getBoardConfig) {
    throw new Error('generateFullYAML requires deps.getBoardConfig from config.js');
  }
  const defaultBoardId = deps.DEFAULT_BOARD_ID || 'esp32-2432s028-2port';
  const requestedBoard = config?.board;
  const hasBoard = typeof requestedBoard === 'string' && requestedBoard.trim();
  const isSupported = deps.isSupportedBoard || ((id) => id in deps.BOARD_CONFIGS);
  const boardId = hasBoard && isSupported(requestedBoard) ? requestedBoard : defaultBoardId;
  return deps.getBoardConfig(boardId) || deps.getBoardConfig(defaultBoardId);
}

export function generateSubstitutions(config, deps) {
  const { yamlScalar, yamlQuoted } = deps;
  const boardConfig = deps.boardConfig || resolveBoardConfig(config, deps);

  return `substitutions:
  font_directory: cyd-lib/fonts/
  width: "${boardConfig.width}"
  height: "${boardConfig.height}"
  device_name: ${yamlScalar(config.deviceName)}
  nice_name: ${yamlQuoted(config.niceName)}
  ap_password: "${config.apPassword}"`;
}

function pinValue(pin) {
  if (typeof pin === 'string') return pin.replace(/^GPIO/i, '');
  return pin;
}

function pinBlock(pin, indent = 4) {
  const spaces = ' '.repeat(indent);
  if (pin && typeof pin === 'object') {
    const lines = [`${spaces}number: ${pinValue(pin.number)}`];
    if (pin.ignore_strapping_warning) lines.push(`${spaces}ignore_strapping_warning: true`);
    return lines.join('\n');
  }
  return `${spaces}${pinValue(pin)}`;
}

function generateCoreHardwareConfig(esp32, esphomeOpts = {}) {
  const variant = esp32.variant ? `\n  variant: ${esp32.variant}` : '';
  const flashSize = esp32.flash_size ? `\n  flash_size: ${esp32.flash_size}` : '';
  const psram = esp32.psram ? `\n\npsram:\n  mode: ${esp32.psram.split(' ')[0]}\n  speed: ${esp32.psram.split(' ')[1] || '80MHz'}` : '';
  const pioOpts = esphomeOpts.platformio_options ? Object.entries(esphomeOpts.platformio_options).map(([k, v]) => `\n    ${k}: ${v}`).join('') : '';
  const platformio = pioOpts ? `\n  platformio_options:${pioOpts}` : '';
  const onBoot = esphomeOpts.on_boot ? `\n  on_boot:${esphomeOpts.on_boot}` : '';
  return `esp32:
  board: ${esp32.board}${variant}${flashSize}
  framework:
    type: ${esp32.framework}${psram}

esphome:
  name: \${device_name}
  friendly_name: \${nice_name}${platformio}${onBoot}

api:
  encryption:
    key: !secret api_encryption_key

ota:
  - platform: esphome
    password: !secret ota_password

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
  ap:
    ssid: "\${nice_name} Fallback Hotspot"
    password: "\${ap_password}"

logger:

time:
  - platform: sntp
    id: esptime

captive_portal:`;
}

function generateRgbOutputs(rgbLed) {
  if (!rgbLed) return '';
  const inverted = rgbLed.inverted ? '\n    inverted: true' : '';
  return `
  - id: output_red
    platform: ledc
    pin: ${pinValue(rgbLed.redPin)}${inverted}
  - id: output_green
    platform: ledc
    pin: ${pinValue(rgbLed.greenPin)}${inverted}
  - id: output_blue
    platform: ledc
    pin: ${pinValue(rgbLed.bluePin)}${inverted}`;
}

function generateLightSection(includeRgb) {
  const rgbLight = includeRgb ? `
  - id: led
    platform: rgb
    red: output_red
    green: output_green
    blue: output_blue
    restore_mode: ALWAYS_OFF` : '';
  return `light:
  - id: display_backlight
    platform: monochromatic
    output: backlight_pwm
    name: Display Backlight
    restore_mode: ALWAYS_ON${rgbLight}`;
}

function generateCydHardwareConfig(boardConfig, config, deps) {
  const hardware = boardConfig.hardware;
  const display = hardware.display;
  const touch = hardware.touch;
  const includeRgb = boardConfig.capabilities?.rgbLed === true;
  const displayModel = display.model ? `
    model: ${display.model}` : '';
  const colorOrder = display.color_order ? `
    color_order: ${display.color_order}` : '';
  const rotate = Boolean(config?.rotate180);
  const displayTransformObj = rotate ? composeTransform(display.transform, true) : (display.transform || {});
  const touchTransformObj = rotate ? composeTransform(touch.transform, true) : (touch.transform || {});
  const displayTransform = Object.entries(displayTransformObj).map(([key, value]) => `      ${key}: ${value}`).join('\n');
  const touchTransform = Object.entries(touchTransformObj).map(([key, value]) => `      ${key}: ${value}`).join('\n');
  const spiSection = touch.spi_id === 'tft' ? `spi:
  - id: tft
    clk_pin: 14
    mosi_pin: 13
    miso_pin:
      number: 12
      ignore_strapping_warning: true` : `i2c:
  - sda: 27
    scl: 22
    scan: true

spi:
  - id: tft
    clk_pin: 14
    mosi_pin: 13
    miso_pin:
      number: 12
      ignore_strapping_warning: true
  - id: touch
    clk_pin: 25
    mosi_pin: 32
    miso_pin: 39`;

  const esphomeOpts = hardware.esp32.platformio_options ? { platformio_options: hardware.esp32.platformio_options } : {};
  return `${generateCoreHardwareConfig(hardware.esp32, esphomeOpts)}

${spiSection}

output:
  - id: backlight_pwm
    platform: ledc
    pin: ${pinValue(hardware.backlight.pin)}${generateRgbOutputs(includeRgb ? hardware.rgbLed : null)}

${generateLightSection(includeRgb)}

display:
  - id: main_display
    platform: ${display.driver}${displayModel}${colorOrder}
    spi_id: ${display.spi_id}
    cs_pin:
${pinBlock(display.cs_pin, 6)}
    dc_pin:
${pinBlock(display.dc_pin, 6)}
    invert_colors: ${display.invert_colors}
    color_palette: ${display.color_palette}
    update_interval: never
    auto_clear_enabled: false
    transform:
${displayTransform}
    dimensions:
      width: \${width}
      height: \${height}

touchscreen:
  - id: main_touchscreen
    platform: ${touch.driver}
    spi_id: ${touch.spi_id}
    cs_pin:${touch.cs_pin && typeof touch.cs_pin === 'object' ? `\n${pinBlock(touch.cs_pin, 6)}` : ` ${pinValue(touch.cs_pin)}`}
    interrupt_pin: ${pinValue(touch.interrupt_pin)}
    threshold: ${touch.threshold}
    calibration:
      x_min: ${touch.calibration.x_min}
      x_max: ${touch.calibration.x_max}
      y_min: ${touch.calibration.y_min}
      y_max: ${touch.calibration.y_max}
    transform:
${touchTransform}
    on_release:
      - if:
          condition: lvgl.is_paused
          then:
            - logger.log: "LVGL resuming"
            - lvgl.resume:
            - lvgl.widget.redraw:
            - light.turn_on: display_backlight`;
}

function generateGuitionHardwareConfig(boardConfig, config, deps) {
  const hardware = boardConfig.hardware;
  const qspi = hardware.display.qspi;
  const touch = hardware.touch;
  const esphomeOpts = hardware.esp32.platformio_options ? { platformio_options: hardware.esp32.platformio_options } : {};
  const displayModel = hardware.display.model ? `\n    model: ${hardware.display.model}` : '';
  const dataRate = hardware.display.data_rate ? `\n    data_rate: ${hardware.display.data_rate}` : '';
  const rotation = hardware.display.rotation !== undefined ? `\n    rotation: ${hardware.display.rotation}` : '';
  const initSeq = hardware.display.init_sequence && hardware.display.init_sequence.length ? `\n    init_sequence:\n${hardware.display.init_sequence.map(b => {
    const arr = Array.isArray(b) ? b : [b];
    return `      - [${arr.map(v => '0x' + v.toString(16).padStart(2, '0')).join(', ')}]`;
  }).join('\n')}` : '';
  const i2cId = touch.i2c.id ? `\n    i2c_id: ${touch.i2c.id}` : '';
  const backlightFreq = hardware.backlight.frequency ? `\n    frequency: ${hardware.backlight.frequency}` : '';
  const rotate = Boolean(config?.rotate180);
  const composedDisplayTransform = rotate ? composeTransform(hardware.display.transform, true) : (hardware.display.transform || {});
  const composedTouchTransform = rotate ? composeTransform(hardware.touch.transform, true) : (hardware.touch.transform || {});
  const displayTransform = Object.keys(composedDisplayTransform).length > 0
    ? `\n    transform:\n${Object.entries(composedDisplayTransform).map(([k, v]) => `      ${k}: ${v}`).join('\n')}`
    : '';
  esphomeOpts.on_boot = `\n    - priority: -100\n      then:\n        - component.update: main_display`;

  return `${generateCoreHardwareConfig(hardware.esp32, esphomeOpts)}

i2c:
  - id: ${touch.i2c.id || 'bus_a'}
    sda: ${pinValue(touch.i2c.sda)}
    scl: ${pinValue(touch.i2c.scl)}
    scan: true

spi:
  - id: ${qspi.spi_id}
    type: quad
    clk_pin: ${pinValue(qspi.clk)}
    data_pins:
      - ${pinValue(qspi.d0)}
      - ${pinValue(qspi.d1)}
      - ${pinValue(qspi.d2)}
      - ${pinValue(qspi.d3)}

output:
  - id: backlight_pwm
    platform: ledc
    pin: ${pinValue(hardware.backlight.pin)}${backlightFreq}

${generateLightSection(false)}

display:
  - id: main_display
    platform: ${hardware.display.driver}
    spi_id: ${qspi.spi_id}
    invert_colors: ${hardware.display.invert_colors}
    update_interval: never
    auto_clear_enabled: false
    dimensions:
      width: \${width}
      height: \${height}${displayTransform}${displayModel}${dataRate}${rotation}${initSeq}
    cs_pin:${qspi.cs && typeof qspi.cs === 'object' ? `\n${pinBlock(qspi.cs, 6)}` : ` ${pinValue(qspi.cs)}`}

touchscreen:
  - id: main_touchscreen
    platform: gt911${i2cId}
    interrupt_pin:${touch.i2c.interrupt && typeof touch.i2c.interrupt === 'object' ? `\n${pinBlock(touch.i2c.interrupt, 6)}` : ` ${pinValue(touch.i2c.interrupt)}`}
    reset_pin: ${touch.i2c.reset}
    transform:
${Object.entries(composedTouchTransform).map(([k, v]) => `      ${k}: ${v}`).join('\n')}
    on_touch:
      then:
        - if:
            condition: lvgl.is_paused
            then:
              - logger.log: "LVGL resuming"
              - lvgl.resume:
              - lvgl.widget.redraw:
              - light.turn_on: display_backlight`;
}

export function generateHardwareConfig(boardConfig, config, deps) {
  if (!boardConfig?.hardware) return deps.hardwareConfig || '';
  if (boardConfig.id === 'esp32-2432s028-2port' && deps.hardwareConfig && !config?.rotate180) return deps.hardwareConfig;
  if (boardConfig.hardware.display?.qspi || boardConfig.hardware.touch?.driver === 'gt911') return generateGuitionHardwareConfig(boardConfig, config, deps);
  return generateCydHardwareConfig(boardConfig, config, deps);
}

export function generateFontSection(buttons, deps) {
  const { defaultButton, yamlQuoted, config } = deps;
  const glyphs = extractGlyphs(buttons);
  const safeGlyphs = glyphs.length ? glyphs : [defaultButton.icon];
  const glyphList = safeGlyphs.map(g => `      - ${yamlQuoted(g)}`).join('\n');
  const iconSize = (config && config.iconSize) || 48;

  return `font:
  - file:
      type: gfonts
      family: Roboto
      weight: 600
    id: roboto_12
    bpp: 2
    size: 12
    glyphs:
      - "0123456789 /%':."
      - "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      - "abcdefghijklmnopqrstuvwxyz"
  - file:
      path: \${font_directory}Arimo-Regular.ttf
      type: local
    id: arimo14
    size: 14
    bpp: 2
    glyphs:
      - "0123456789 /%':."
      - "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      - "abcdefghijklmnopqrstuvwxyz"
  - file:
      type: gfonts
      family: Roboto
      weight: 800
    id: roboto_16
    bpp: 2
    size: 16
    glyphs:
      - "0123456789 /%':."
      - "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      - "abcdefghijklmnopqrstuvwxyz"
  - file: \${font_directory}materialdesignicons-webfont.ttf
    id: mdi_icons
    size: ${iconSize}
    glyphs:
${glyphList}`;
}

export function generateColorSection(buttons, deps) {
  const { defaultButton, yamlQuoted, normalizeColor } = deps;
  const colors = buttons.map((btn, i) => {
    if (btn.empty) return null;
    return `  - id: btn_${i + 1}_color
    hex: ${yamlQuoted(normalizeColor(btn.color) || defaultButton.color)}`;
  }).filter(Boolean).join('\n');

  return `color:
  - id: room_bg_color
    hex: "000000"
  - id: default_button_bg_color
    hex: "000000"
  - id: default_button_pressed_bg_color
    hex: "D3D3D3"
${colors}`;
}

export function generateNumberSection(config, deps) {
  const { defaultConfig, clampNumber } = deps;
  return `number:
  - platform: template
    name: LVGL Screen timeout
    optimistic: true
    id: display_timeout
    unit_of_measurement: "s"
    initial_value: ${clampNumber(config.displayTimeout, 90, 3600, defaultConfig.displayTimeout)}
    restore_value: true
    min_value: 90
    max_value: 3600
    step: 5
    mode: box`;
}

export function generateBinarySensors(buttons, deps) {
  const { actionSchemas, yamlScalar } = deps;
  const sensors = [];

  buttons.forEach((btn, i) => {
    if (btn.empty) return;
    if (!btn.shortPress?.enabled && !btn.longPress?.enabled && btn.type !== 'checkable') return;

    const clicks = [];

    if (btn.shortPress?.enabled && btn.shortPress?.actionType) {
      const schema = actionSchemas[btn.shortPress.actionType];
      if (schema) {
        const normalizedData = schema.normalize ? schema.normalize(btn.shortPress.data || {}) : (btn.shortPress.data || {});
        const action = yamlScalar(schema.ha_action(normalizedData));
        const data = schema.ha_data(normalizedData);
        const dataStr = Object.keys(data).length > 0 ? `\n              data:\n${Object.entries(data).map(([k, v]) => `                ${k}: ${yamlScalar(v)}`).join('\n')}` : '';

        clicks.push(`      - min_length: 50ms
        max_length: 500ms
        then:
          - logger.log: "Button ${i + 1} short click"
          - homeassistant.action:
              action: ${action}${dataStr}`);
      }
    }

    if (btn.longPress?.enabled && btn.longPress?.actionType) {
      const schema = actionSchemas[btn.longPress.actionType];
      if (schema) {
        const normalizedData = schema.normalize ? schema.normalize(btn.longPress.data || {}) : (btn.longPress.data || {});
        const action = yamlScalar(schema.ha_action(normalizedData));
        const data = schema.ha_data(normalizedData);
        const dataStr = Object.keys(data).length > 0 ? `\n              data:\n${Object.entries(data).map(([k, v]) => `                ${k}: ${yamlScalar(v)}`).join('\n')}` : '';

        clicks.push(`      - min_length: ${btn.longPress.minLength || '1000ms'}
        max_length: ${btn.longPress.maxLength || '5000ms'}
        then:
          - logger.log: "Button ${i + 1} long press"
          - homeassistant.action:
              action: ${action}${dataStr}`);
      }
    }

    if (clicks.length > 0) {
      sensors.push(`  - platform: lvgl
    widget: ${btn.id}
    name: "${btn.name}"
    id: ${btn.id}_pressed
    on_click:
${clicks.join('\n')}`);
    }
  });

  if (sensors.length === 0) return 'binary_sensor: []';
  return `binary_sensor:\n${sensors.join('\n')}`;
}

export function generatePackages(buttons, deps) {
  const { yamlScalar, yamlQuoted } = deps;
  const packages = [];

  // Support config object with .buttons for backward compatibility
  const isArray = Array.isArray(buttons);
  const config = deps.config || (isArray ? {} : buttons) || {};
  const btnList = isArray ? buttons : (buttons?.buttons || []);

  btnList.forEach((btn, i) => {
    if (btn.empty) return;
    if (!['checkable', 'timer_sync', 'sensor_sync'].includes(btn.type) || !String(btn.haEntity || '').trim()) return;

    const escapedState = String(btn.onState || 'on').replace(/"/g, '\\"');

    if (btn.type === 'timer_sync') {
      const timerLabel = (btn.timerDefaultLabel || btn.label || '').replace(/"/g, '\\"');
      packages.push(`  btn_timer_${i + 1}: !include
    file: cyd-lib/templates/timer_sync_template.yaml
    vars:
      ts_id: ts_${btn.id}_timer
      ha_entity: ${yamlScalar(btn.haEntity)}
      btn_id: ${btn.id}
      default_label: ${yamlQuoted(timerLabel)}`);
    } else if (btn.type === 'sensor_sync') {
      const sensorLabel = (btn.label || '').replace(/"/g, '\\"');
      packages.push(`  btn_sensor_${i + 1}: !include
    file: cyd-lib/templates/sensor_sync_template.yaml
    vars:
      ts_id: ts_${btn.id}_sensor
      ha_entity: ${yamlScalar(btn.haEntity)}
      btn_id: ${btn.id}
      default_label: ${yamlQuoted(sensorLabel)}`);
    } else {
      const iconOn = btn.iconOn || btn.icon;
      const iconOff = btn.iconOff || btn.icon;

      packages.push(`  btn_logic_${i + 1}: !include
    file: cyd-lib/templates/lvgl_sync_template.yaml
    vars:
      ts_id: ts_${btn.id}
      ha_entity: ${yamlScalar(btn.haEntity)}
      btn_id: ${btn.id}
      on_state: "${escapedState}"
      ico_on: "${iconOn}"
      ico_off: "${iconOff}"`);
    }

    if (btn.ledControl) {
      packages.push(`  led_sync_${i + 1}:
    text_sensor:
      - platform: homeassistant
        id: ts_led_${btn.id}
        entity_id: ${yamlScalar(btn.haEntity)}
        on_value:
          then:
            - if:
                condition:
                  lambda: 'return x == "${escapedState}";'
                then:
                  - light.turn_on:
                      id: led
                      red: 0%
                      green: 100%
                      blue: 0%
                else:
                  - light.turn_off: led`);
    }
  });

  const boardHasRgb = !deps.boardConfig || deps.boardConfig.capabilities?.rgbLed === true;
  if (boardHasRgb && config.led?.enabled && config.led.effect === 'on-entity' && String(config.led.entity || '').trim()) {
    const led = config.led;
    const onState = String(led.onState || 'on').replace(/"/g, '\\"');
    const color = led.color || {};
    const red = Math.round((color.r || 0) / 255 * 100);
    const green = Math.round((color.g || 255) / 255 * 100);
    const blue = Math.round((color.b || 0) / 255 * 100);
    const brightness = Math.max(0, Math.min(100, Math.round(led.brightness || 100)));
    packages.push(`  led_sync:
    text_sensor:
      - platform: homeassistant
        id: ts_led_global
        entity_id: ${yamlScalar(led.entity)}
        on_value:
          then:
            - if:
                condition:
                  lambda: 'return x == "${onState}";'
                then:
                  - light.turn_on:
                      id: led
                      red: ${red}%
                      green: ${green}%
                      blue: ${blue}%
                      brightness: ${brightness}%
                else:
                  - light.turn_off: led`);
  }

  if (packages.length === 0) return '';
  return `packages:\n${packages.join('\n')}`;
}

export function generateLVGLWidgets(buttons, deps) {
  const { yamlQuoted } = deps;
  const widgets = [];

  const sorted = [...buttons].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const gridColumns = deps.config?.gridColumns ?? 4;
  const gridRows = deps.config?.gridRows ?? 3;

  sorted.forEach(btn => {
    if (btn.empty || btn.col >= gridColumns || btn.row >= gridRows) return;
    const isCheckable = btn.type === 'checkable';
    const hasTimerDefaultLabel = isCheckable && btn.timerDefaultLabel && String(btn.timerDefaultLabel).trim();
    const colorRef = `btn_${buttons.indexOf(btn) + 1}_color`;

    const hasDualActions = btn.shortPress?.enabled && btn.longPress?.enabled;
    const fontLine = btn.font !== 'roboto_12' ? `                     font: ${btn.font}\n` : '';
    if (isCheckable && !hasTimerDefaultLabel && !hasDualActions) {
      const colorValue = `0x${btn.color}`;
      widgets.push(`              - <<: !include
                   file: cyd-lib/templates/cyd_button_widget_checkable.yaml
                   vars:
                     id: ${btn.id}
                     col: ${btn.col}
                     row: ${btn.row}
                     color: ${colorValue}
                     icon: ${yamlQuoted(btn.icon)}
${fontLine}                     label: ${yamlQuoted(btn.label)}`);
    } else {
      widgets.push(`              - <<: !include
                   file: cyd-lib/templates/cyd_button_widget.yaml
                   vars:
                     id: ${btn.id}
                     col: ${btn.col}
                     row: ${btn.row}
                     color: ${colorRef}
                     icon: ${yamlQuoted(btn.icon)}
${fontLine}                     label: ${yamlQuoted(btn.label)}`);
    }
  });

  return widgets.join('\n');
}

export function calculateLVGLLayoutScale(boardConfig, gridColumns = 4, gridRows = 3) {
  const width = Number(boardConfig?.width) || 320;
  const height = Number(boardConfig?.height) || 240;
  const scale = Math.min(width / 320, height / 240);
  const gap = Math.max(5, Math.round(scale * 5));

  return {
    gap,
    outerMargin: gap,
    cellWidth: Math.floor((width - gap * 2 - gap * (gridColumns - 1)) / gridColumns),
    cellHeight: Math.floor((height - gap * 2 - gap * (gridRows - 1)) / gridRows)
  };
}

export function generateLVGLSection(buttons, deps) {
  const widgets = generateLVGLWidgets(buttons, deps);
  const gridColumns = deps.config?.gridColumns ?? 4;
  const gridRows = deps.config?.gridRows ?? 3;
  const { outerMargin } = calculateLVGLLayoutScale(deps.boardConfig, gridColumns, gridRows);
  const gridColumnsArr = Array(gridColumns).fill('fr(1)');
  const gridRowsArr = Array(gridRows).fill('fr(1)');

  return `lvgl:
  on_idle:
    timeout: !lambda "return (id(display_timeout).state * 1000);"
    then:
      - logger.log: "LVGL is idle"
      - light.turn_off: display_backlight
      - lvgl.pause:
  buffer_size: 25%
  touchscreens:
    - touchscreen_id: main_touchscreen
      long_press_time: 2s
  theme:
    button:
      bg_color: 0x000000
      bg_opa: COVER
      border_color: 0x000000
      border_width: 1
      text_color: 0x808080
      pressed:
        bg_color: 0xC0C0C0
        bg_grad_color: 0xC0C0C0
        bg_opa: COVER
      checked:
        bg_color: 0x000000
        bg_grad_color: 0x000000
        bg_opa: COVER
        text_color: 0x800080
  pages:
    - id: main_page
      pad_all: 0
      widgets:
        - obj:
            width: \${width}
            height: \${height}
            bg_color: room_bg_color
            layout:
              type: grid
              grid_columns: [${gridColumnsArr.join(', ')}]
              grid_rows: [${gridRowsArr.join(', ')}]
            pad_all: ${outerMargin}px
            outline_pad: ${outerMargin}px
            widgets:
${widgets}`;
}

export function generateFullYAML(config, deps) {
  const { normalizeImportedConfig, hardwareConfig } = deps;
  const { config: normalizedConfig } = normalizeImportedConfig(config);
  const boardConfig = (config?.board || deps.getBoardConfig || deps.isSupportedBoard || deps.BOARD_CONFIGS)
    ? resolveBoardConfig(config, deps)
    : null;

  const sectionDeps = {
    ...deps,
    yamlScalar,
    yamlQuoted,
    boardConfig,
    config: normalizedConfig
  };

  const parts = [
    generateSubstitutions(normalizedConfig, sectionDeps),
    boardConfig ? generateHardwareConfig(boardConfig, normalizedConfig, sectionDeps) : hardwareConfig,
    generateFontSection(normalizedConfig.buttons, sectionDeps),
    generateColorSection(normalizedConfig.buttons, sectionDeps),
    generateNumberSection(normalizedConfig, sectionDeps),
    generateBinarySensors(normalizedConfig.buttons, sectionDeps),
    generatePackages(normalizedConfig.buttons, sectionDeps),
    generateLVGLSection(normalizedConfig.buttons, sectionDeps)
  ].filter(p => p.trim());

  const yaml = parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  if (normalizedConfig.rawBlocks?.length) {
    return `${yaml}\n# Imported unsupported blocks preserved for manual review\n${normalizedConfig.rawBlocks.join('\n\n')}\n`;
  }
  return yaml;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function highlightYAML(text) {
  const lines = text.split('\n');
  return lines.map(line => {
    let highlighted = escapeHTML(line);

    const commentMatch = highlighted.match(/^(\s*)(#.*)$/);
    if (commentMatch) return `${commentMatch[1]}<span class="comment">${commentMatch[2]}</span>`;

    highlighted = highlighted.replace(/(!secret\s+\S+|!lambda\s+|!include|!reference\s+\S+|!\w+)/g, '<span class="anchor">$1</span>');

    highlighted = highlighted.replace(/^(\s*)([A-Za-z0-9_]+)(\s*:\s*)(.*)$/, (match, indent, key, colon, value) => {
      if (value.startsWith('!secret') || value.startsWith('!lambda') || value.startsWith('!include') || value.startsWith('!')) {
        return `${indent}<span class="key">${key}</span>${colon}${value}`;
      }
      if (value.startsWith('"') || value.startsWith("'") || value.startsWith('&quot;') || value.startsWith('&#039;')) {
        return `${indent}<span class="key">${key}</span>${colon}<span class="string">${value}</span>`;
      }
      if (value && !/^[\s]*$/.test(value)) {
        return `${indent}<span class="key">${key}</span>${colon}<span class="value">${value}</span>`;
      }
      return `${indent}<span class="key">${key}</span>${colon}`;
    });

    highlighted = highlighted.replace(/(\s*-\s+)(#.*)$/, '$1<span class="comment">$2</span>');
    return highlighted;
  }).join('\n');
}

/**
 * Compose a rotate180 toggle with the board's built-in transform.
 * Produces the effective transform for a 180-degree rotation.
 *
 * Rotating 180 degrees = mirror X + mirror Y (both axes flipped).
 * Composition rule: XOR rotate180 with board mirror_x and mirror_y.
 * All other transform keys (swap_xy, rotation, etc.) pass through unchanged.
 * Both mirror_x and mirror_y are always emitted in the output for consistency.
 */
export function composeTransform(boardTransform, rotate180) {
  const boardMirrorX = Boolean(boardTransform?.mirror_x);
  const boardMirrorY = Boolean(boardTransform?.mirror_y);
  const effectiveMirrorX = boardMirrorX !== Boolean(rotate180);
  const effectiveMirrorY = boardMirrorY !== Boolean(rotate180);
  return { ...(boardTransform || {}), mirror_x: effectiveMirrorX, mirror_y: effectiveMirrorY };
}
