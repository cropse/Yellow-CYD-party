import { describe, it } from 'node:test';
import assert from 'node:assert';
import { yamlSecret, yamlInclude, yamlRaw, yamlDoc } from '../utils.js';

// ── yamlSecret ──────────────────────────────────────────────────────────

describe('yamlSecret', () => {
  it('wraps name in sentinel markers', () => {
    const s = yamlSecret('api_encryption_key');
    assert.ok(s.startsWith('YAMLRAWSTART!secret api_encryption_keyYAMLRAWEND'));
  });
});

// ── yamlInclude ──────────────────────────────────────────────────────────

describe('yamlInclude', () => {
  it('wraps path in sentinel markers', () => {
    const s = yamlInclude('templates/binary_sensor.yaml');
    assert.ok(s.startsWith('YAMLRAWSTART!include templates/binary_sensor.yamlYAMLRAWEND'));
  });
});

// ── yamlRaw ──────────────────────────────────────────────────────────────

describe('yamlRaw', () => {
  it('wraps string in sentinel markers', () => {
    const s = yamlRaw('${device_name}');
    assert.ok(s.startsWith('YAMLRAWSTART${device_name}YAMLRAWEND'));
  });

  it('passes non-strings through unchanged', () => {
    assert.strictEqual(yamlRaw(42), 42);
    assert.strictEqual(yamlRaw(undefined), undefined);
    assert.strictEqual(yamlRaw(null), null);
  });
});

// ── yamlDoc ──────────────────────────────────────────────────────────────

describe('yamlDoc', () => {
  it('renders a simple object section', () => {
    const result = yamlDoc([{
      title: 'substitutions',
      body: { device_name: 'my-cyd', width: '320' }
    }]);
    assert.ok(result.includes('substitutions:'));
    assert.ok(result.includes('device_name: my-cyd'));
    assert.ok(result.includes('width: "320"'));
  });

  it('renders a list section', () => {
    const result = yamlDoc([{
      title: 'time',
      list: [{ platform: 'sntp', id: 'esptime' }]
    }]);
    assert.ok(result.includes('time:'));
    assert.ok(result.includes('- platform: sntp'));
    assert.ok(result.includes('id: esptime'));
  });

  it('renders bare key for null body (ESPHome logger/captive_portal pattern)', () => {
    const result = yamlDoc([
      { title: 'api', body: { encryption: { key: yamlSecret('api_key') } } },
      { title: 'logger', body: null }
    ]);
    assert.ok(result.includes('api:'));
    assert.ok(result.includes('logger:'), 'null body should render as bare key');
  });

  it('renders !secret markers without quotes', () => {
    const result = yamlDoc([{
      title: 'wifi',
      body: {
        ssid: yamlSecret('wifi_ssid'),
        password: yamlSecret('wifi_password')
      }
    }]);
    assert.ok(result.includes('ssid: !secret wifi_ssid'));
    assert.ok(result.includes('password: !secret wifi_password'));
  });

  it('renders !include markers without quotes', () => {
    const result = yamlDoc([{
      title: 'packages',
      body: { living_room: yamlInclude('packages/cyd-base.yaml') }
    }]);
    assert.ok(result.includes('packages:'));
    assert.ok(result.includes('living_room: !include packages/cyd-base.yaml'));
  });

  it('renders ${var} substitutions without quotes', () => {
    const result = yamlDoc([{
      title: 'substitutions',
      body: {
        device_name: yamlRaw('${device_name}'),
        friendly_name: yamlRaw('${nice_name}')
      }
    }]);
    assert.ok(result.includes('device_name: ${device_name}'));
    assert.ok(result.includes('friendly_name: ${nice_name}'));
  });

  it('joins multiple sections with newlines', () => {
    const result = yamlDoc([
      { title: 'esp32', body: { board: 'esp32dev' } },
      { title: 'api', body: { encryption: { key: yamlSecret('api_key') } } }
    ]);
    assert.ok(result.includes('esp32:'));
    assert.ok(result.includes('api:'));
    // Sections should be separated
    const lines = result.trim().split('\n');
    const esp32Idx = lines.findIndex(l => l.startsWith('esp32:'));
    const apiIdx = lines.findIndex(l => l.startsWith('api:'));
    assert.ok(apiIdx > esp32Idx);
  });

  it('handles nested objects with yamlSecret', () => {
    const result = yamlDoc([{
      title: 'ota',
      list: [{
        platform: 'esphome',
        password: yamlSecret('ota_password')
      }]
    }]);
    assert.ok(result.includes('- platform: esphome'));
    assert.ok(result.includes('password: !secret ota_password'));
  });

  it('handles inline yamlRaw for init_sequence arrays', () => {
    const result = yamlDoc([{
      title: 'display',
      list: [{
        platform: 'qspi_dbi',
        init_sequence: [yamlRaw('[0xff, 0xa5]'), yamlRaw('[0x36, 0xc0]')]
      }]
    }]);
    assert.ok(result.includes('[0xff, 0xa5]'));
    assert.ok(result.includes('[0x36, 0xc0]'));
  });

  it('handles empty sections array', () => {
    const result = yamlDoc([]);
    assert.strictEqual(result, '');
  });

  it('handles numeric pin values', () => {
    const result = yamlDoc([{
      title: 'i2c',
      list: [{
        sda: 8,
        scl: 4,
        id: 'bus_a'
      }]
    }]);
    assert.ok(result.includes('sda: 8'));
    assert.ok(result.includes('scl: 4'));
    assert.ok(result.includes('id: bus_a'));
  });

  it('skips null items in lists', () => {
    const result = yamlDoc([{
      title: 'font',
      list: [
        { id: 'roboto', file: { type: 'gfonts' } },
        null,
        { id: 'mdi', file: { type: 'gfonts' } }
      ]
    }]);
    assert.ok(result.includes('id: roboto'));
    assert.ok(result.includes('id: mdi'));
    // Should not have a bare "null" entry
    assert.ok(!result.includes('- null'));
  });
});
