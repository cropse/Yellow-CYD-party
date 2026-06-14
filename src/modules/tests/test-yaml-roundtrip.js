import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateFullYAML, encodeMetadata, decodeMetadata } from '../yaml-engine.js';
import { normalizeImportedConfig } from '../import.js';
import { importFromYAML, parseCustomBlocks } from '../import.js';
import { DEFAULT_CONFIG, PRESETS, ACTION_SCHEMAS, BOARD_CONFIGS, DEFAULT_BOARD_ID, getBoardConfig } from '../config.js';
import { normalizeColor, clampNumber } from '../utils.js';

const deps = {
  normalizeImportedConfig,
  hardwareConfig: null,
  getBoardConfig,
  isSupportedBoard: (id) => id in BOARD_CONFIGS,
  BOARD_CONFIGS,
  DEFAULT_BOARD_ID,
  actionSchemas: ACTION_SCHEMAS,
  defaultButton: DEFAULT_CONFIG.buttons[0],
  defaultConfig: DEFAULT_CONFIG,
  normalizeColor,
  clampNumber,
  yamlScalar: (v) => {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    const text = String(v);
    if (text.startsWith('!secret ') || text.startsWith('!lambda ')) return text;
    if (text.startsWith('\\U000F')) return text;
    if (/^[A-Za-z0-9_.\/-]+$/.test(text) && !/^(true|false|null|yes|no|on|off)$/i.test(text)) return text;
    return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  },
  yamlQuoted: (v) => {
    const text = String(v ?? '');
    if (text.startsWith('\\U000F')) return `"${text}"`;
    return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
};

function configFieldsEqual(a, b, fields) {
  for (const f of fields) {
    if (f === 'buttons') continue;
    if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) return false;
  }
  return true;
}

describe('encodeMetadata / decodeMetadata', () => {
  it('encodes only UI gap-fill metadata', () => {
    const config = { ...DEFAULT_CONFIG, deviceName: 'test-device', niceName: 'Test Device' };
    const { config: normalized } = normalizeImportedConfig(config);
    const encoded = encodeMetadata(normalized);
    assert.ok(encoded.includes('# cyd-config: begin'));
    assert.ok(encoded.includes('# cyd-config: end'));

    const result = decodeMetadata(encoded);
    assert.ok(result);
    assert.strictEqual(result.config, null);
    assert.ok(result.gapFill);
    assert.ok(Array.isArray(result.gapFill.buttons));
  });

  it('round-trips button gap-fill fields', () => {
    const preset = PRESETS['back-garden']();
    preset.buttons[0].name = 'Kitchen Scene Button';
    preset.buttons[5].timerDefaultLabel = 'Water Plants';
    const { config: normalized } = normalizeImportedConfig(preset);
    const encoded = encodeMetadata(normalized);
    const result = decodeMetadata(encoded);
    assert.ok(result);
    const first = result.gapFill.buttons.find(b => b.id === 'btn_1');
    const timer = result.gapFill.buttons.find(b => b.id === 'btn_6');
    assert.strictEqual(first.name, 'Kitchen Scene Button');
    assert.strictEqual(timer.timerDefaultLabel, 'Water Plants');
  });

  it('returns null for YAML without metadata', () => {
    const result = decodeMetadata('substitutions:\n  device_name: test\n');
    assert.strictEqual(result, null);
  });

  it('returns warnings for corrupt base64', () => {
    const badYaml = '# cyd-config: begin\n# !!!not-valid-base64!!!\n# cyd-config: end';
    const result = decodeMetadata(badYaml);
    assert.ok(result);
    assert.strictEqual(result.config, null);
    assert.strictEqual(result.gapFill, null);
    assert.ok(result.warnings.some(w => w.includes('corrupt')));
  });

  it('returns warnings for wrong version', () => {
    const payload = { version: 999, gapFill: { buttons: [] } };
    const json = JSON.stringify(payload);
    const base64 = Buffer.from(json, 'utf8').toString('base64');
    const lines = base64.match(/.{1,76}/g) || [];
    const badYaml = ['# cyd-config: begin', ...lines.map(l => `# ${l}`), '# cyd-config: end'].join('\n');
    const result = decodeMetadata(badYaml);
    assert.ok(result);
    assert.strictEqual(result.config, null);
    assert.strictEqual(result.gapFill, null);
    assert.ok(result.warnings.some(w => w.includes('unsupported version')));
  });

  it('omits apPassword and rawBlocks from metadata', () => {
    const config = { ...DEFAULT_CONFIG, apPassword: 'secret123', rawBlocks: ['# extra'] };
    const { config: normalized } = normalizeImportedConfig(config);
    const encoded = encodeMetadata(normalized);
    assert.ok(!encoded.includes('secret123'));
    const result = decodeMetadata(encoded);
    assert.ok(result);
    assert.strictEqual(result.config, null);
    assert.strictEqual(result.gapFill.rawBlocks, undefined);
  });
});

describe('importFromYAML with metadata', () => {
  it('restores full config from generated YAML with metadata', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const { config, warnings } = importFromYAML(yaml);

    const { config: expected } = normalizeImportedConfig(preset);
    assert.strictEqual(config.deviceName, expected.deviceName);
    assert.strictEqual(config.niceName, expected.niceName);
    assert.strictEqual(config.board, expected.board);
    assert.strictEqual(config.displayTimeout, expected.displayTimeout);
    assert.strictEqual(config.gridColumns, expected.gridColumns);
    assert.strictEqual(config.gridRows, expected.gridRows);
    assert.strictEqual(config.iconSize, expected.iconSize);
    assert.strictEqual(config.rotate180, expected.rotate180);
    assert.strictEqual(config.buttons.length, expected.buttons.length);
    for (let i = 0; i < expected.buttons.length; i++) {
      assert.strictEqual(config.buttons[i].id, expected.buttons[i].id);
      assert.strictEqual(config.buttons[i].type, expected.buttons[i].type);
      assert.strictEqual(config.buttons[i].col, expected.buttons[i].col);
      assert.strictEqual(config.buttons[i].row, expected.buttons[i].row);
      assert.strictEqual(config.buttons[i].label, expected.buttons[i].label);
      assert.strictEqual(config.buttons[i].icon, expected.buttons[i].icon);
      assert.strictEqual(config.buttons[i].color, expected.buttons[i].color);
      assert.strictEqual(config.buttons[i].haEntity, expected.buttons[i].haEntity);
      assert.strictEqual(config.buttons[i].font, expected.buttons[i].font);
      assert.strictEqual(config.buttons[i].onState, expected.buttons[i].onState);
      assert.strictEqual(config.buttons[i].iconOn, expected.buttons[i].iconOn);
      assert.strictEqual(config.buttons[i].iconOff, expected.buttons[i].iconOff);
      assert.strictEqual(config.buttons[i].shortPress?.enabled, expected.buttons[i].shortPress?.enabled);
      assert.strictEqual(config.buttons[i].shortPress?.actionType, expected.buttons[i].shortPress?.actionType);
      assert.strictEqual(config.buttons[i].longPress?.enabled, expected.buttons[i].longPress?.enabled);
      assert.strictEqual(config.buttons[i].longPress?.actionType, expected.buttons[i].longPress?.actionType);
    }
    assert.strictEqual(config.led.enabled, expected.led.enabled);
    assert.strictEqual(config.led.entity, expected.led.entity);
    assert.strictEqual(config.led.onState, expected.led.onState);
    assert.strictEqual(config.led.effect, expected.led.effect);
  });

  it('restores living-room preset via metadata round-trip', () => {
    const preset = PRESETS.living();
    const yaml = generateFullYAML(preset, deps);
    const { config } = importFromYAML(yaml);
    const { config: expected } = normalizeImportedConfig(preset);
    assert.strictEqual(config.deviceName, expected.deviceName);
    assert.strictEqual(config.buttons.length, expected.buttons.length);
  });

  it('falls back to best-effort when metadata is stripped', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = yaml.split('\n').filter(l => !l.startsWith('# cyd-config:')).join('\n');
    const { config, warnings } = importFromYAML(stripped);
    assert.strictEqual(config.deviceName, 'back-garden-cyd');
    assert.strictEqual(config.niceName, 'Back Garden CYD');
    assert.ok(warnings.some(w => w.includes('without embedded metadata')));
  });

  it('still parses substitutions from YAML without metadata', () => {
    const yaml = 'substitutions:\n  device_name: manual-device\n  nice_name: "Manual Device"\n';
    const { config, warnings } = importFromYAML(yaml);
    assert.strictEqual(config.deviceName, 'manual-device');
    assert.strictEqual(config.niceName, 'Manual Device');
    assert.ok(warnings.some(w => w.includes('without embedded metadata')));
  });

  it('generates YAML that ESPHome ignores (metadata is comments)', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const metadataLines = yaml.split('\n').filter(l => l.startsWith('# cyd-config:'));
    assert.ok(metadataLines.length >= 2);
  });
});

describe('generateFullYAML includes metadata', () => {
  it('appends metadata block to generated YAML', () => {
    const yaml = generateFullYAML(DEFAULT_CONFIG, deps);
    assert.ok(yaml.includes('# cyd-config: begin'));
    assert.ok(yaml.includes('# cyd-config: end'));
  });

  it('metadata does not interfere with YAML structure', () => {
    const yaml = generateFullYAML(DEFAULT_CONFIG, deps);
    for (const block of ['substitutions:', 'esp32:', 'font:', 'color:', 'binary_sensor:', 'lvgl:']) {
      assert.ok(yaml.includes(block), `missing ${block}`);
    }
  });
});

describe('importFromYAML fallback parser (no metadata)', () => {
  function stripMetadata(yaml) {
    return yaml.split('\n').filter(l => !l.startsWith('# cyd-config:')).join('\n');
  }

  it('recovers deviceName and niceName from substitutions', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    assert.strictEqual(config.deviceName, 'back-garden-cyd');
    assert.strictEqual(config.niceName, 'Back Garden CYD');
  });

  it('recovers display timeout', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    assert.strictEqual(config.displayTimeout, 600);
  });

  it('recovers icon size', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    assert.strictEqual(config.iconSize, 48);
  });

  it('fingerprints the correct board', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    assert.strictEqual(config.board, 'esp32-2432s028-2port');
  });

  it('recovers grid dimensions', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    assert.strictEqual(config.gridColumns, 4);
    assert.strictEqual(config.gridRows, 3);
  });

  it('recovers button count from LVGL widgets', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    assert.strictEqual(config.buttons.length, 12);
  });

  it('recovers button positions', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    assert.strictEqual(config.buttons[0].col, 0);
    assert.strictEqual(config.buttons[0].row, 0);
    assert.strictEqual(config.buttons[4].col, 0);
    assert.strictEqual(config.buttons[4].row, 1);
  });

  it('recovers button labels', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    assert.strictEqual(config.buttons[0].label, 'Sleep');
    assert.strictEqual(config.buttons[4].label, 'Back Garden');
  });

  it('recovers button colors', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    assert.ok(config.buttons[0].color);
    assert.ok(config.buttons[4].color);
  });

  it('recovers checkable button types from packages', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    // btn_3 is checkable in back-garden
    const checkableBtns = config.buttons.filter(b => b.type === 'checkable');
    assert.ok(checkableBtns.length > 0, 'should find at least one checkable button');
  });

  it('recovers timer_sync button types from packages', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    // btn_6 is timer_sync in back-garden
    const timerBtns = config.buttons.filter(b => b.type === 'timer_sync');
    assert.ok(timerBtns.length > 0, 'should find at least one timer_sync button');
  });

  it('recovers HA entity IDs for checkable buttons', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    const checkableBtns = config.buttons.filter(b => b.type === 'checkable' && b.haEntity);
    assert.ok(checkableBtns.length > 0, 'checkable buttons should have entity IDs');
  });

  it('recovers short press actions from binary_sensor', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    const withShortPress = config.buttons.filter(b => b.shortPress?.enabled);
    assert.ok(withShortPress.length > 0, 'should find buttons with short press actions');
  });

  it('recovers long press actions from binary_sensor', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    const withLongPress = config.buttons.filter(b => b.longPress?.enabled);
    assert.ok(withLongPress.length > 0, 'should find buttons with long press actions');
  });

  it('recovers action types from binary_sensor', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    const withAction = config.buttons.filter(b => b.shortPress?.actionType || b.longPress?.actionType);
    assert.ok(withAction.length > 0, 'should find buttons with mapped action types');
    const actionTypes = withAction.map(b => b.shortPress?.actionType || b.longPress?.actionType).filter(Boolean);
    assert.ok(actionTypes.some(t => ['switch', 'script', 'cover', 'media_player'].includes(t)),
      `should find known action types, got: ${actionTypes.join(', ')}`);
  });

  it('handles Guition board YAML', () => {
    const preset = { ...PRESETS['back-garden'](), board: 'guition-jc4827543c' };
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { config } = importFromYAML(stripped);
    assert.strictEqual(config.board, 'guition-jc4827543c');
  });

  it('warns about missing metadata', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const stripped = stripMetadata(yaml);
    const { warnings } = importFromYAML(stripped);
    assert.ok(warnings.some(w => w.includes('without embedded metadata')));
  });
});

describe('cyd-custom blocks', () => {
  it('parseCustomBlocks extracts a single custom block', () => {
    const yaml = [
      'substitutions:',
      '  device_name: test-device',
      '# cyd-custom: begin',
      'api:',
      '  encryption: !secret api_key',
      '# cyd-custom: end',
      'esp32:',
      '  board: esp32dev'
    ].join('\n');
    const blocks = parseCustomBlocks(yaml);
    assert.strictEqual(blocks.length, 1);
    assert.ok(blocks[0].includes('api:'));
    assert.ok(blocks[0].includes('encryption:'));
  });

  it('parseCustomBlocks extracts multiple custom blocks', () => {
    const yaml = [
      'substitutions:',
      '  device_name: test-device',
      '# cyd-custom: begin',
      'api:',
      '  encryption: !secret api_key',
      '# cyd-custom: end',
      '# cyd-custom: begin',
      'ota:',
      '  password: !secret ota_password',
      '# cyd-custom: end'
    ].join('\n');
    const blocks = parseCustomBlocks(yaml);
    assert.strictEqual(blocks.length, 2);
    assert.ok(blocks[0].includes('api:'));
    assert.ok(blocks[1].includes('ota:'));
  });

  it('parseCustomBlocks returns empty array when no blocks', () => {
    const yaml = 'substitutions:\n  device_name: test\n';
    const blocks = parseCustomBlocks(yaml);
    assert.strictEqual(blocks.length, 0);
  });

  it('importFromYAML preserves custom blocks in rawBlocks', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const customYaml = yaml + '\n# cyd-custom: begin\napi:\n  encryption: !secret api_key\n# cyd-custom: end\n';
    const { config } = importFromYAML(customYaml);
    assert.ok(Array.isArray(config.rawBlocks));
    assert.strictEqual(config.rawBlocks.length, 1);
    assert.ok(config.rawBlocks[0].includes('api:'));
  });

  it('importFromYAML preserves multiple custom blocks', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const customYaml = yaml +
      '\n# cyd-custom: begin\napi:\n  encryption: !secret api_key\n# cyd-custom: end\n' +
      '\n# cyd-custom: begin\nota:\n  password: !secret ota_pw\n# cyd-custom: end\n';
    const { config } = importFromYAML(customYaml);
    assert.strictEqual(config.rawBlocks.length, 2);
    assert.ok(config.rawBlocks[0].includes('api:'));
    assert.ok(config.rawBlocks[1].includes('ota:'));
  });

  it('custom blocks round-trip through generateFullYAML', () => {
    const preset = PRESETS['back-garden']();
    const yaml1 = generateFullYAML(preset, deps);
    const { config } = importFromYAML(yaml1);
    config.rawBlocks = ['api:\n  encryption: !secret api_key', 'ota:\n  password: !secret ota_pw'];
    const yaml2 = generateFullYAML(config, deps);
    assert.ok(yaml2.includes('# cyd-custom: begin'));
    assert.ok(yaml2.includes('# cyd-custom: end'));
    assert.ok(yaml2.includes('api:'));
    assert.ok(yaml2.includes('ota:'));
    const { config: config2 } = importFromYAML(yaml2);
    assert.strictEqual(config2.rawBlocks.length, 2);
    assert.ok(config2.rawBlocks[0].includes('api:'));
    assert.ok(config2.rawBlocks[1].includes('ota:'));
  });

  it('empty custom blocks are ignored', () => {
    const yaml = 'substitutions:\n  device_name: test\n# cyd-custom: begin\n# cyd-custom: end\n';
    const blocks = parseCustomBlocks(yaml);
    assert.strictEqual(blocks.length, 0);
  });

  it('custom blocks with only whitespace are ignored', () => {
    const yaml = 'substitutions:\n  device_name: test\n# cyd-custom: begin\n  \n  \n# cyd-custom: end\n';
    const blocks = parseCustomBlocks(yaml);
    assert.strictEqual(blocks.length, 0);
  });

  it('custom blocks do not interfere with ESPHome YAML parsing', () => {
    const preset = PRESETS['back-garden']();
    const yaml = generateFullYAML(preset, deps);
    const customYaml = yaml + '\n# cyd-custom: begin\nmy_sensor:\n  platform: adc\n  pin: GPIO34\n# cyd-custom: end\n';
    const { config, warnings } = importFromYAML(customYaml);
    assert.strictEqual(config.deviceName, 'back-garden-cyd');
    assert.strictEqual(config.rawBlocks.length, 1);
  });
});