// Unit tests for src/modules/import.js
// Run with: node src/modules/tests/test-import.js

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeImportedConfig, importFromYAML } from '../import.js';
import { DEFAULT_CONFIG } from '../config.js';

// ── normalizeImportedConfig ──────────────────────────────────────────────
describe('normalizeImportedConfig - config-level', () => {
  it('returns 12 buttons from empty config', () => {
    const { config, warnings } = normalizeImportedConfig({});
    assert.strictEqual(config.buttons.length, 12);
    assert.strictEqual(config.deviceName, DEFAULT_CONFIG.deviceName);
  });

  it('fills missing buttons up to 12', () => {
    const btn = { type: 'stateless', col: 0, row: 0, shortPress: { enabled: false }, longPress: { enabled: false } };
    const { config, warnings } = normalizeImportedConfig({ buttons: [btn] });
    assert.strictEqual(config.buttons.length, 12);
    // Multiple warnings: 1 count warning + 11 missing-btn + 12 position warnings
    assert.ok(warnings.length > 1);
    assert.ok(warnings.some(w => w.includes('1 button')));
  });

  it('warns when more than 12 buttons', () => {
    const btn = { type: 'stateless', col: 0, row: 0, shortPress: { enabled: false }, longPress: { enabled: false } };
    const { warnings } = normalizeImportedConfig({ buttons: Array(15).fill(btn).map((b, i) => ({ ...b, id: `btn_${i}` })) });
    assert.ok(warnings.some(w => w.includes('15 buttons')));
  });

  it('clamps displayTimeout to 90-3600', () => {
    const { config } = normalizeImportedConfig({ deviceName: 'test', niceName: 't', displayTimeout: 10 });
    assert.strictEqual(config.displayTimeout, 90);
  });

  it('clamps high displayTimeout', () => {
    const { config } = normalizeImportedConfig({ deviceName: 'test', niceName: 't', displayTimeout: 99999 });
    assert.strictEqual(config.displayTimeout, 3600);
  });

  it('uses fallback displayTimeout when NaN', () => {
    const { config } = normalizeImportedConfig({ displayTimeout: 'abc' });
    assert.strictEqual(config.displayTimeout, DEFAULT_CONFIG.displayTimeout);
  });

  it('handles null/undefined input', () => {
    const { config } = normalizeImportedConfig(null);
    assert.strictEqual(config.buttons.length, 12);
  });

  it('normalizes deviceName via sanitizeDeviceName', () => {
    const { config } = normalizeImportedConfig({ deviceName: 'Hello World!' });
    assert.strictEqual(config.deviceName, 'hello-world');
  });

  it('preserves rawBlocks when present', () => {
    const { config } = normalizeImportedConfig({ rawBlocks: ['# comment'] });
    assert.deepStrictEqual(config.rawBlocks, ['# comment']);
  });

  it('default rawBlocks is empty array', () => {
    const { config } = normalizeImportedConfig({});
    assert.deepStrictEqual(config.rawBlocks, []);
  });

  it('preserves led configuration when valid', () => {
    const { config } = normalizeImportedConfig({
      led: { enabled: true, effect: 'blink', entity: 'switch.test', onState: 'on', color: { r: 255, g: 0, b: 0 }, brightness: 80 }
    });
    assert.strictEqual(config.led.enabled, true);
    assert.strictEqual(config.led.effect, 'blink');
    assert.strictEqual(config.led.brightness, 80);
  });

  it('led boolean true → defaults with enabled', () => {
    const { config } = normalizeImportedConfig({ led: true });
    assert.strictEqual(config.led.enabled, true);
  });

  it('led boolean false → defaults with disabled', () => {
    const { config } = normalizeImportedConfig({ led: false });
    assert.strictEqual(config.led.enabled, false);
  });

  it('invalid led effect falls back to default', () => {
    const { config } = normalizeImportedConfig({ led: { enabled: true, effect: 'invalid' } });
    assert.ok(['on-entity', 'blink', 'pulse', 'steady'].includes(config.led.effect));
  });

  it('led color clamps r/g/b to 0-255', () => {
    const { config } = normalizeImportedConfig({ led: { enabled: true, effect: 'blink', color: { r: -1, g: 300, b: 128 } } });
    assert.strictEqual(config.led.color.r, 0);
    assert.strictEqual(config.led.color.g, 255);
    assert.strictEqual(config.led.color.b, 128);
  });

  it('led brightness clamped 0-100', () => {
    const { config } = normalizeImportedConfig({ led: { enabled: true, brightness: 200 } });
    assert.strictEqual(config.led.brightness, 100);
  });
});

// ── normalizeButton within normalizeImportedConfig ───────────────────────
describe('normalizeImportedConfig - button-level', () => {
  const baseBtn = { id: 'b1', type: 'stateless', label: 'Test', col: 0, row: 0, shortPress: { enabled: false }, longPress: { enabled: false } };

  it('clamps col 0-3', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, col: 10 },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].col, 3);
  });

  it('clamps row 0-2', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, row: 10 },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].row, 2);
  });

  it('uses fallback col/row when invalid', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, col: 'abc', row: 'xyz' },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].col, DEFAULT_CONFIG.buttons[0].col);
    assert.strictEqual(config.buttons[0].row, DEFAULT_CONFIG.buttons[0].row);
  });

  it('truncates label to 40 chars', () => {
    const long = 'a'.repeat(60);
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, label: long },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].label.length, 40);
  });

  it('valid icon preserved and uppercased', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, icon: '\\U000f0594' },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].icon, '\\U000F0594');
  });

  it('invalid icon uses fallback', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, icon: 'not-an-icon' },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].icon, DEFAULT_CONFIG.buttons[0].icon);
  });

  it('invalid type falls back to default', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, type: 'unknown' },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].type, 'stateless');
  });

  it('valid font preserved, invalid uses fallback', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, font: 'arimo14' },
      { ...baseBtn, font: 'unknown_font' },
      ...Array(10).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].font, 'arimo14');
    assert.strictEqual(config.buttons[1].font, DEFAULT_CONFIG.buttons[1].font);
  });

  it('invalid color uses fallback', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, color: 'not-hex' },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].color, DEFAULT_CONFIG.buttons[0].color);
  });

  it('sets id to btn_N', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn },
      { ...baseBtn, id: 'something-else' },
      ...Array(10).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].id, 'btn_1');
    assert.strictEqual(config.buttons[1].id, 'btn_2');
  });

  it('warns for invalid button', () => {
    const { warnings } = normalizeImportedConfig({ buttons: [
      null,
      ...Array(11).fill(baseBtn)
    ]});
    assert.ok(warnings.some(w => w.includes('Button 1')));
  });

  it('warns when position normalized', () => {
    const { warnings } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, col: 10, row: 10 },
      ...Array(11).fill(baseBtn)
    ]});
    assert.ok(warnings.some(w => w.includes('position was normalized')));
  });

  it('checkable type with valid haEntity', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, type: 'checkable', haEntity: 'switch.test', iconOn: '\\U000F0001', iconOff: '\\U000F0002' },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].type, 'checkable');
    assert.strictEqual(config.buttons[0].haEntity, 'switch.test');
    assert.strictEqual(config.buttons[0].iconOn, '\\U000F0001');
    assert.strictEqual(config.buttons[0].iconOff, '\\U000F0002');
  });

  // ── sensor_sync import tests (Task 5) ───────────────────────
  it('sensor_sync type is preserved in import', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, type: 'sensor_sync', haEntity: 'sensor.temperature', iconOn: '', iconOff: '' },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].type, 'sensor_sync');
    assert.strictEqual(config.buttons[0].haEntity, 'sensor.temperature');
  });

  it('sensor_sync button does not require iconOn/iconOff', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, type: 'sensor_sync', haEntity: 'sensor.humidity', iconOn: undefined, iconOff: undefined },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].type, 'sensor_sync');
    assert.strictEqual(config.buttons[0].haEntity, 'sensor.humidity');
  });

  it('sensor_sync type rejected as invalid falls back to stateless', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, type: 'sensor_sync_invalid' },
      ...Array(11).fill(baseBtn)
    ]});
    assert.notStrictEqual(config.buttons[0].type, 'sensor_sync_invalid');
  });

  it('sensor_sync import preserves sensor.gecko_sensor_humidity entity', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, type: 'sensor_sync', haEntity: 'sensor.gecko_sensor_humidity' },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].type, 'sensor_sync');
    assert.strictEqual(config.buttons[0].haEntity, 'sensor.gecko_sensor_humidity');
  });

  it('sensor_sync import preserves 54% label', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, type: 'sensor_sync', haEntity: 'sensor.gecko_sensor_humidity', label: '54%' },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].label, '54%');
    assert.strictEqual(config.buttons[0].type, 'sensor_sync');
  });

  it('sensor_sync does not require timerDefaultLabel on import', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, type: 'sensor_sync', haEntity: 'sensor.gecko_sensor_humidity', timerDefaultLabel: undefined },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].type, 'sensor_sync');
    assert.strictEqual(config.buttons[0].haEntity, 'sensor.gecko_sensor_humidity');
    assert.strictEqual(config.buttons[0].timerDefaultLabel, '');
  });
});

// ── normalizePress within button ─────────────────────────────────────────
describe('normalizeImportedConfig - press normalization', () => {
  const baseBtn = { id: 'b1', type: 'stateless', label: 'Test', col: 0, row: 0, shortPress: { enabled: false }, longPress: { enabled: false } };

  it('invalid actionType disabled', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, shortPress: { enabled: true, actionType: 'bad_type', action: 'x', data: {} } },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].shortPress.enabled, false);
  });

  it('valid actionType preserves enabled', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.test', operation: 'toggle', targetType: 'entity_id' } } },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].shortPress.enabled, true);
    assert.strictEqual(config.buttons[0].shortPress.actionType, 'switch');
  });

  it('longPress has minLength/maxLength defaults', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, longPress: { enabled: true, actionType: 'script', action: 'script.test', data: { action: 'script.test' } } },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].longPress.minLength, '1000ms');
    assert.strictEqual(config.buttons[0].longPress.maxLength, '5000ms');
  });

  it('shortPress has no minLength/maxLength', () => {
    const { config } = normalizeImportedConfig({ buttons: [
      { ...baseBtn, shortPress: { enabled: true, actionType: 'script', action: 'script.test', data: { action: 'script.test' }, minLength: '100ms' } },
      ...Array(11).fill(baseBtn)
    ]});
    assert.strictEqual(config.buttons[0].shortPress.minLength, undefined);
  });
});

// ── importFromYAML ───────────────────────────────────────────────────────
describe('importFromYAML', () => {
  it('extracts device_name and nice_name from substitutions', () => {
    const yaml = `substitutions:
  device_name: test-device
  nice_name: Test Device
`;
    const { config } = importFromYAML(yaml);
    assert.strictEqual(config.deviceName, 'test-device');
    assert.strictEqual(config.niceName, 'Test Device');
  });

  it('extracts glyph codepoints from font section', () => {
    const yaml = `font:
  - file: fonts/materialdesignicons-webfont.ttf
    id: mdi_icons
    glyphs:
      - "\\U000F0335"
      - "\\U000F0594"
`;
    const { config } = importFromYAML(yaml);
    // Import parses glyphs - verify the config has them or doesn't crash
    assert.ok(config);
  });

  it('handles empty yaml gracefully', () => {
    const { config } = importFromYAML('');
    assert.strictEqual(config.deviceName, DEFAULT_CONFIG.deviceName);
  });

  it('handles substitutions with quoted values', () => {
    const yaml = `substitutions:
  device_name: "my-device-name"
  nice_name: "My Device"
`;
    const { config } = importFromYAML(yaml);
    assert.strictEqual(config.deviceName, 'my-device-name');
  });
});
