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

export function generateSubstitutions(config, deps) {
  const { yamlScalar, yamlQuoted } = deps;

  return `substitutions:
  font_directory: cyd-lib/fonts/
  width: "320"
  height: "240"
  device_name: ${yamlScalar(config.deviceName)}
  nice_name: ${yamlQuoted(config.niceName)}
  ap_password: "${config.apPassword}"`;
}

export function generateFontSection(buttons, deps) {
  const { defaultButton, yamlQuoted } = deps;
  const glyphs = extractGlyphs(buttons);
  const safeGlyphs = glyphs.length ? glyphs : [defaultButton.icon];
  const glyphList = safeGlyphs.map(g => `      - ${yamlQuoted(g)}`).join('\n');

  return `font:
  - file:
      type: gfonts
      family: Roboto
      weight: 600
    id: roboto_12
    bpp: 2
    size: 12
    glyphs:
      - "0123456789 /%'"
      - "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      - "abcdefghijklmnopqrstuvwxyz"
  - file:
      path: \${font_directory}Arimo-Regular.ttf
      type: local
    id: arimo14
    size: 14
    bpp: 2
    glyphs:
      - "0123456789 "
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
      - "0123456789 /"
      - "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      - "abcdefghijklmnopqrstuvwxyz"
  - file: \${font_directory}materialdesignicons-webfont.ttf
    id: mdi_icons
    size: 48
    glyphs:
${glyphList}`;
}

export function generateColorSection(buttons, deps) {
  const { defaultButton, yamlQuoted, normalizeColor } = deps;
  const colors = buttons.map((btn, i) => {
    return `  - id: btn_${i + 1}_color
    hex: ${yamlQuoted(normalizeColor(btn.color) || defaultButton.color)}`;
  }).join('\n');

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

  buttons.forEach((btn, i) => {
    if (btn.type !== 'checkable' || !String(btn.haEntity || '').trim()) return;

    const escapedState = String(btn.onState || 'on').replace(/"/g, '\\"');

    if (btn.timerDefaultLabel && String(btn.timerDefaultLabel).trim()) {
      const timerLabel = btn.timerDefaultLabel.replace(/"/g, '\\"');
      packages.push(`  btn_timer_${i + 1}: !include
    file: cyd-lib/templates/timer_sync_template.yaml
    vars:
      ts_id: ts_${btn.id}_timer
      ha_entity: ${yamlScalar(btn.haEntity)}
      btn_id: ${btn.id}
      default_label: ${yamlQuoted(timerLabel)}`);
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

  sorted.forEach(btn => {
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

export function generateLVGLSection(buttons, deps) {
  const widgets = generateLVGLWidgets(buttons, deps);

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
              grid_columns: [fr(1), fr(1), fr(1), fr(1)]
              grid_rows: [fr(1), fr(1), fr(1)]
            pad_all: 5px
            outline_pad: 5px
            widgets:
${widgets}`;
}

export function generateFullYAML(config, deps) {
  const { normalizeImportedConfig, hardwareConfig } = deps;
  const { config: normalizedConfig } = normalizeImportedConfig(config);

  const sectionDeps = {
    ...deps,
    yamlScalar,
    yamlQuoted
  };

  const parts = [
    generateSubstitutions(normalizedConfig, sectionDeps),
    hardwareConfig,
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
