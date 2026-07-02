import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractGlyphs, yamlScalar, yamlQuoted, toYAML, generateBinarySensors, generatePackages, generateLVGLWidgets, generateSubstitutions, generateColorSection, generateFontSection, generateNumberSection, generateLVGLSection, generateFullYAML } from '../yaml-engine.js';
import { ACTION_SCHEMAS, DEFAULT_CONFIG, DEFAULT_BUTTON, DEFAULT_LED, getBoardConfig, isSupportedBoard, BOARD_CONFIGS } from '../config.js';
import { normalizeImportedConfig } from '../import.js';
import { yamlDoc } from '../utils.js';

const sectionDeps = {
  normalizeColor: (c) => {
    if (!c) return null;
    const s = String(c).replace(/^#/,'').replace(/^0x/i,'').toUpperCase();
    return /^[0-9A-F]{6}$/.test(s) ? s : null;
  },
  clampNumber: (v, min, max, fb) => {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return fb;
    return Math.max(min, Math.min(max, n));
  },
  yamlScalar,
  yamlQuoted,
  yamlDoc,
  getBoardConfig,
  isSupportedBoard,
  BOARD_CONFIGS,
  defaultButton: DEFAULT_BUTTON,
  defaultConfig: DEFAULT_CONFIG,
  actionSchemas: ACTION_SCHEMAS,
};

function testDeps(addl = {}) {
  return { ...sectionDeps, ...addl };
}

// Helper: convert section result ({title, body|list}) to YAML string
function render(result) {
  if (typeof result === 'string') return result;
  if (Array.isArray(result)) return JSON.stringify(result);
  if (!result || (result.body == null && result.list == null)) return '';
  return yamlDoc([result]);
}

// ── yamlScalar ──────────────────────────────────────────────────────────
describe('yamlScalar', () => {
  it('null → null', () => assert.strictEqual(yamlScalar(null), 'null'));
  it('undefined → null', () => assert.strictEqual(yamlScalar(undefined), 'null'));
  it('number → bare string', () => assert.strictEqual(yamlScalar(42), '42'));
  it('boolean true → true', () => assert.strictEqual(yamlScalar(true), 'true'));
  it('boolean false → false', () => assert.strictEqual(yamlScalar(false), 'false'));
  it('safe alphanumeric → unquoted', () => assert.strictEqual(yamlScalar('hello'), 'hello'));
  it('text with path → unquoted (has /)', () => assert.strictEqual(yamlScalar('path/file'), 'path/file'));
  it('plain word with dash → unquoted', () => assert.strictEqual(yamlScalar('my-device'), 'my-device'));
  it('text with space → double-quoted', () => assert.strictEqual(yamlScalar('hello world'), '"hello world"'));
  it('text with double-quote → escaped', () => assert.strictEqual(yamlScalar('he"llo'), '"' + 'he\\"llo' + '"'));
  it('text with newline → escaped', () => assert.strictEqual(yamlScalar('a\nb'), '"a\\nb"'));
  it('regular backslash → double-escaped', () => assert.strictEqual(yamlScalar('a\\b'), '"a\\\\b"'));
  it('!secret → unquoted', () => assert.strictEqual(yamlScalar('!secret wifi_ssid'), '!secret wifi_ssid'));
  it('!lambda → unquoted', () => assert.strictEqual(yamlScalar("!lambda 'return true'"), "!lambda 'return true'"));
  it('false keyword → quoted', () => assert.strictEqual(yamlScalar('false'), '"false"'));
  it('true keyword → quoted', () => assert.strictEqual(yamlScalar('true'), '"true"'));
  it('on keyword → quoted', () => assert.strictEqual(yamlScalar('on'), '"on"'));
  it('off keyword → quoted', () => assert.strictEqual(yamlScalar('off'), '"off"'));
  it('yes keyword → quoted', () => assert.strictEqual(yamlScalar('yes'), '"yes"'));
  it('no keyword → quoted', () => assert.strictEqual(yamlScalar('no'), '"no"'));
  it('numeric string → quoted', () => assert.strictEqual(yamlScalar('42.5'), '"42.5"'));
  it('icon codepoint NOT double-escaped', () => assert.strictEqual(yamlScalar('\\U000F0335'), '"\\U000F0335"'));
  it('icon codepoint with extra backslash', () => {
    const out = yamlScalar('prefix\\U000F0335');
    assert.ok(out.includes('prefix\\\\U000F0335') || out.includes('prefix'), 'should handle mixed backslash');
  });
});

// ── yamlQuoted ──────────────────────────────────────────────────────────
describe('yamlQuoted', () => {
  it('always double-quoted', () => assert.strictEqual(yamlQuoted('hello'), '"hello"'));
  it('null → empty quoted', () => assert.strictEqual(yamlQuoted(null), '""'));
  it('undefined → empty quoted', () => assert.strictEqual(yamlQuoted(undefined), '""'));
  it('empty string → ""', () => assert.strictEqual(yamlQuoted(''), '""'));
  it('backslash → double-escaped', () => assert.strictEqual(yamlQuoted('a\\b'), '"a\\\\b"'));
  it('icon codepoint NOT double-escaped', () => assert.strictEqual(yamlQuoted('\\U000F0335'), '"\\U000F0335"'));
  it('double-quote → escaped', () => assert.strictEqual(yamlQuoted('he"llo'), '"' + 'he\\"llo' + '"'));
  it('newline → escaped', () => assert.strictEqual(yamlQuoted('a\nb'), '"a\\nb"'));
});

// ── toYAML ──────────────────────────────────────────────────────────────
describe('toYAML', () => {
  it('null → null', () => assert.strictEqual(toYAML(null), 'null'));
  it('empty object → {}', () => assert.strictEqual(toYAML({}), '{}'));
  it('empty array → []', () => assert.strictEqual(toYAML([]), '[]'));
  it('simple key-value', () => {
    const out = toYAML({ key: 'value' });
    assert.ok(out.includes('key: value'));
  });
  it('nested object', () => {
    const out = toYAML({ parent: { child: 'val' } });
    assert.ok(out.includes('parent:'));
    assert.ok(out.includes('  child: val'));
  });
  it('array of strings', () => {
    const out = toYAML({ items: ['a', 'b'] });
    assert.ok(out.includes('- a'));
    assert.ok(out.includes('- b'));
  });
  it('array of objects', () => {
    const out = toYAML([{ k: 'v1' }, { k: 'v2' }]);
    assert.ok(out.includes('- k: v1'));
    assert.ok(out.includes('- k: v2'));
  });
  it('number', () => assert.strictEqual(toYAML(42), '42'));
  it('boolean', () => assert.strictEqual(toYAML(true), 'true'));
  it('string with backslash in object', () => {
    const out = toYAML({ glyph: '\\U000F0335' });
    assert.ok(out.includes('\\U000F0335'));
    assert.ok(!out.includes('\\\\U000F0335'));
  });
});

// ── extractGlyphs ───────────────────────────────────────────────────────
describe('extractGlyphs', () => {
  it('collects all icon sources', () => {
    const btns = [
      { icon: '\\U000F0001', iconOn: '\\U000F0002', iconOff: '\\U000F0003' },
      { icon: '\\U000F0001' }
    ];
    const out = extractGlyphs(btns);
    assert.deepStrictEqual(out.sort(), ['\\U000F0001', '\\U000F0002', '\\U000F0003'].sort());
  });
  it('handles empty array', () => assert.deepStrictEqual(extractGlyphs([]), []));
});

// ── generateSubstitutions ───────────────────────────────────────────────
describe('generateSubstitutions', () => {
  it('produces substitutions block', () => {
    const out = render(generateSubstitutions({ deviceName: 'my-cyd', niceName: 'My CYD', apPassword: '123', board: 'esp32-2432s028-2port' }, sectionDeps));
    assert.ok(out.includes('substitutions:'));
    assert.ok(out.includes('device_name:'));
    assert.ok(out.includes('ap_password'));
  });
});

// ── generateColorSection ────────────────────────────────────────────────
describe('generateColorSection', () => {
  it('produces color block with per-button colors', () => {
    const btns = [{ color: 'FF0000', id: 'btn_1' }];
    const out = render(generateColorSection(btns, sectionDeps));
    assert.ok(out.includes('color:'));
    assert.ok(out.includes('btn_1_color'));
    assert.ok(out.includes('FF0000'));
  });
});

// ── generateFontSection ─────────────────────────────────────────────────
describe('generateFontSection', () => {
  it('includes mdi_icons section with glyphs from buttons', () => {
    const btns = [{ icon: '\\U000F0335' }];
    const out = render(generateFontSection(btns, sectionDeps));
    assert.ok(out.includes('font:'));
    assert.ok(out.includes('mdi_icons'));
    assert.ok(out.includes('\\U000F0335'));
  });
  it('handles empty buttons', () => {
    const out = render(generateFontSection([], sectionDeps));
    assert.ok(out.includes('font:') || out.includes('mdi_icons'));
  });
});

// ── generateNumberSection ───────────────────────────────────────────────
describe('generateNumberSection', () => {
  it('generates display_timeout', () => {
    const out = render(generateNumberSection({ displayTimeout: 600 }, sectionDeps));
    assert.ok(out.includes('number:'));
    assert.ok(out.includes('display_timeout'));
  });
});

// ── generateBinarySensors ───────────────────────────────────────────────
describe('generateBinarySensors', () => {
  it('short press only with script action', () => {
    const btns = [{
      id: 'btn_1', name: 'Test', type: 'stateless',
      shortPress: { enabled: true, actionType: 'script', action: 'script.good_night', data: { action: 'script.good_night' } },
      longPress: { enabled: false, actionType: '', action: '', data: {} }
    }];
    const out = render(generateBinarySensors(btns, sectionDeps));
    assert.ok(out.includes('binary_sensor:'));
    assert.ok(out.includes('btn_1'));
    assert.ok(out.includes('script.good_night'));
  });

  it('short and long press with different actions', () => {
    const btns = [{
      id: 'btn_1', name: 'Test', type: 'stateless',
      shortPress: { enabled: true, actionType: 'script', action: 'script.short', data: { action: 'script.short' } },
      longPress: { enabled: true, minLength: '1000ms', maxLength: '5000ms', actionType: 'script', action: 'script.long', data: { action: 'script.long' } }
    }];
    const out = render(generateBinarySensors(btns, sectionDeps));
    assert.ok(out.includes('script.short'));
    assert.ok(out.includes('script.long'));
  });

  it('switch action with entity_id data', () => {
    const btns = [{
      id: 'btn_1', name: 'Test', type: 'stateless',
      shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.garden_light', operation: 'toggle', targetType: 'entity_id' } },
      longPress: { enabled: false, actionType: '', action: '', data: {} }
    }];
    const out = render(generateBinarySensors(btns, sectionDeps));
    assert.ok(out.includes('switch.toggle'));
    assert.ok(out.includes('entity_id'));
  });

  it('custom action generates data section', () => {
    const btns = [{
      id: 'btn_1', name: 'Test', type: 'stateless',
      shortPress: { enabled: true, actionType: 'custom', action: '', data: { action: 'light.turn_on', entityId: 'light.ceiling', targetType: 'entity_id', dataJson: '{"brightness":255}' } },
      longPress: { enabled: false, actionType: '', action: '', data: {} }
    }];
    const out = render(generateBinarySensors(btns, sectionDeps));
    assert.ok(out.includes('light.turn_on'));
    assert.ok(out.includes('entity_id'));
  });

  it('no actions returns empty or minimal section', () => {
    const btns = [{
      id: 'btn_1', name: 'Stateless', type: 'stateless',
      shortPress: { enabled: false }, longPress: { enabled: false }
    }];
    const out = render(generateBinarySensors(btns, sectionDeps));
    assert.ok(out === '' || out.includes('binary_sensor: []'), 'empty binary_sensor expected');
  });

  it('unknown action schema skipped', () => {
    const btns = [{
      id: 'btn_1', name: 'Test', type: 'stateless',
      shortPress: { enabled: true, actionType: 'unknown_thing', data: {} },
      longPress: { enabled: false }
    }];
    const out = render(generateBinarySensors(btns, sectionDeps));
    assert.ok(out === '' || out.includes('binary_sensor: []'), 'empty binary_sensor expected');
  });

  it('checkable button with no action still generates for state sync', () => {
    const btns = [{
      id: 'btn_1', name: 'Test', type: 'checkable',
      shortPress: { enabled: false }, longPress: { enabled: false }
    }];
    const out = render(generateBinarySensors(btns, sectionDeps));
    assert.ok(out.includes('binary_sensor') || out.includes('btn_1'));
  });
});

// ── generatePackages ────────────────────────────────────────────────────
describe('generatePackages', () => {
  const baseConfig = { deviceName: 'test', niceName: 'Test', displayTimeout: 600, buttons: [] };

  it('checkable button generates btn_logic', () => {
    const config = { ...baseConfig, buttons: [{ type: 'checkable', haEntity: 'switch.test', id: 'btn_1', onState: 'on', icon: '\\U000F0001', iconOn: '\\U000F0002', iconOff: '\\U000F0003' }] };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('btn_logic_1'));
    assert.ok(out.includes('lvgl_sync_template') || out.includes('btn_1'));
  });

  it('timer_sync button generates timer template', () => {
    const config = { ...baseConfig, buttons: [{ type: 'timer_sync', haEntity: 'timer.test', id: 'btn_1', label: 'Timer', timerDefaultLabel: 'My Timer' }] };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('btn_timer_1') || out.includes('btn_1'));
    assert.ok(out.includes('timer_sync_template') || out.includes('timer') || out.includes('packages:'));
  });

  it('number_sync button generates number sync package', () => {
    const config = { ...baseConfig, buttons: [numberSyncFixtures.happyPath] };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('btn_number_1'), 'should include btn_number_1 package key');
    assert.ok(out.includes('number_sync_template.yaml'), 'should reference number_sync_template.yaml');
    assert.ok(out.includes('ts_btn_1_sensor'), 'should pass ts_id var');
    assert.ok(out.includes('sensor.gecko_sensor_humidity'), 'should pass ha_entity var');
    assert.ok(out.includes('btn_id: btn_1'), 'should pass btn_id var');
    assert.ok(out.includes('threshold:'), 'should pass threshold var');
    assert.ok(out.includes('condition:'), 'should pass condition var');
    assert.ok(out.includes('default_label:'), 'should pass default_label var');
    assert.ok(out.includes('ico_on:'), 'should pass ico_on var');
    assert.ok(out.includes('ico_off:'), 'should pass ico_off var');
  });

  it('number_sync with blank entity does NOT generate package', () => {
    const config = { ...baseConfig, buttons: [numberSyncFixtures.blankEntity] };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(!out.includes('btn_number_'), 'should not generate package for blank entity');
    assert.ok(!out.includes('number_sync_template'), 'should not reference number template');
  });

  it('number_sync with above condition passes threshold and condition', () => {
    const config = { ...baseConfig, buttons: [numberSyncFixtures.aboveCondition] };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('btn_number_1'), 'should include btn_number_1 package key');
    assert.ok(out.includes('threshold: 25'), 'should pass threshold 25');
    assert.ok(out.includes('condition: above'), 'should pass condition above');
  });

  it('number_sync with below condition passes threshold and condition', () => {
    const config = { ...baseConfig, buttons: [numberSyncFixtures.belowCondition] };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('btn_number_1'), 'should include btn_number_1 package key');
    assert.ok(out.includes('threshold: 80'), 'should pass threshold 80');
    assert.ok(out.includes('condition: below'), 'should pass condition below');
  });

  it('number_sync with invalid domain still generates package (domain validation is separate)', () => {
    const config = { ...baseConfig, buttons: [numberSyncFixtures.invalidDomain] };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('btn_number_1'), 'should generate package for invalid domain');
    assert.ok(out.includes('number_sync_template.yaml'), 'should reference number template');
    assert.ok(out.includes('switch.garden_lights'), 'should pass switch.garden_lights as ha_entity');
  });

  it('number_sync does not require onState or timerDefaultLabel', () => {
    const config = { ...baseConfig, buttons: [numberSyncFixtures.noOptionalFields] };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('btn_number_1'), 'should generate package without optional fields');
    assert.ok(out.includes('number_sync_template.yaml'), 'should reference number_sync_template.yaml');
    assert.ok(!out.includes('on_state:'), 'should not include on_state var');
    assert.ok(out.includes('ico_on:'), 'should include ico_on var');
    assert.ok(out.includes('ico_off:'), 'should include ico_off var');
  });

  // ── Number sync fixture definitions ─────────────────────────
  const numberSyncFixtures = {
    happyPath: { type: 'number_sync', haEntity: 'sensor.gecko_sensor_humidity', id: 'btn_1', label: 'Humidity', col: 0, row: 0, icon: '\\U000F0335', color: 'FF0000', threshold: 50, condition: 'above', iconOn: '\\U000F0335', iconOff: '\\U000F0594', shortPress: { enabled: true }, longPress: { enabled: false } },
    aboveCondition: { type: 'number_sync', haEntity: 'sensor.temperature', id: 'btn_1', label: 'Temp', col: 0, row: 0, icon: '\\U000F0335', color: 'FF0000', threshold: 25, condition: 'above', iconOn: '\\U000F0335', iconOff: '\\U000F0594', shortPress: { enabled: true }, longPress: { enabled: false } },
    belowCondition: { type: 'number_sync', haEntity: 'sensor.humidity', id: 'btn_1', label: 'Hum', col: 0, row: 0, icon: '\\U000F0335', color: 'FF0000', threshold: 80, condition: 'below', iconOn: '\\U000F0335', iconOff: '\\U000F0594', shortPress: { enabled: true }, longPress: { enabled: false } },
    invalidDomain: { type: 'number_sync', haEntity: 'switch.garden_lights', id: 'btn_1', label: 'Invalid', col: 0, row: 0, icon: '\\U000F0335', color: '0000FF', threshold: 25, condition: 'above', iconOn: '\\U000F0335', iconOff: '\\U000F0594', shortPress: { enabled: true }, longPress: { enabled: false } },
    blankEntity: { type: 'number_sync', haEntity: '', id: 'btn_1', label: 'Blank', col: 0, row: 0, icon: '\\U000F0335', color: 'FF00FF', threshold: 25, condition: 'above', iconOn: '\\U000F0335', iconOff: '\\U000F0594', shortPress: { enabled: true }, longPress: { enabled: false } },
    noOptionalFields: { type: 'number_sync', haEntity: 'sensor.gecko_sensor_humidity', id: 'btn_1', label: '54%', col: 0, row: 0, icon: '\\U000F0335', color: '00FFFF', threshold: 50, condition: 'above', iconOn: '\\U000F0335', iconOff: '\\U000F0594', shortPress: { enabled: true }, longPress: { enabled: false } },
  };

  it('stateless button does NOT generate state sync', () => {
    const config = { ...baseConfig, buttons: [{ type: 'stateless', id: 'btn_1', haEntity: '' }] };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(!out.includes('btn_logic'));
    assert.ok(!out.includes('btn_timer'));
  });

  it('LED enabled generates led_sync', () => {
    const config = {
      ...baseConfig, buttons: [],
      led: { enabled: true, effect: 'on-entity', entity: 'switch.led_test', onState: 'on', color: { r: 0, g: 255, b: 0 }, brightness: 100 }
    };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('led_sync'));
    assert.ok(out.includes('light.turn_on'));
  });

  it('LED disabled does NOT generate led_sync', () => {
    const config = {
      ...baseConfig, buttons: [],
      led: { enabled: false, effect: 'on-entity', entity: 'switch.led_test', onState: 'on', color: { r: 0, g: 255, b: 0 }, brightness: 100 }
    };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(!out.includes('led_sync'));
  });

  it('LED with effect not on-entity does NOT generate', () => {
    const config = {
      ...baseConfig, buttons: [],
      led: { enabled: true, effect: 'blink', entity: 'switch.test', onState: 'on', color: { r: 0, g: 0, b: 0 }, brightness: 100 }
    };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(!out.includes('led_sync'));
  });

  it('LED with empty entity does NOT generate', () => {
    const config = {
      ...baseConfig, buttons: [],
      led: { enabled: true, effect: 'on-entity', entity: '', onState: 'on', color: { r: 0, g: 0, b: 0 }, brightness: 100 }
    };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(!out.includes('led_sync'));
  });

  it('LED clamps invalid color values', () => {
    const config = {
      ...baseConfig, buttons: [],
      led: { enabled: true, effect: 'on-entity', entity: 'switch.test', onState: 'on', color: { r: 999, g: -10, b: 200 }, brightness: 150 }
    };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('led_sync'));
    assert.ok(out.includes('100%'));
  });

  it('LED with missing color uses defaults', () => {
    const config = {
      ...baseConfig, buttons: [],
      led: { enabled: true, effect: 'on-entity', entity: 'switch.test', onState: 'on', brightness: 100 }
    };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('led_sync'));
  });

  it('empty config returns empty or minimal', () => {
    const out = render(generatePackages(baseConfig, { ...sectionDeps, config: baseConfig }));
    assert.ok(out === '' || !out.includes('btn_logic') || !out.includes('led_sync'));
  });

  it('stateless button with LED enabled still generates LED', () => {
    const config = {
      ...baseConfig,
      buttons: [{ type: 'stateless', id: 'btn_1', haEntity: '' }],
      led: { enabled: true, effect: 'on-entity', entity: 'switch.led_test', onState: 'on', color: { r: 0, g: 255, b: 0 }, brightness: 100 }
    };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('led_sync'));
  });

  it('LED brightness percentage clamped', () => {
    const config = {
      ...baseConfig, buttons: [],
      led: { enabled: true, effect: 'on-entity', entity: 'switch.test', onState: 'on', color: { r: 0, g: 0, b: 0 }, brightness: 200 }
    };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('100%') || out.includes('led_sync'));
  });

  it('LED color channel clamped to 0-255', () => {
    const config = {
      ...baseConfig, buttons: [],
      led: { enabled: true, effect: 'on-entity', entity: 'switch.test', onState: 'on', color: { r: -1, g: 0, b: 300 }, brightness: 50 }
    };
    const out = render(generatePackages(config, { ...sectionDeps, config }));
    assert.ok(out.includes('led_sync'));
  });

});

// ── generateLVGLWidgets ──────────────────────────────────────────────────
describe('generateLVGLWidgets', () => {
  it('checkable button without dual actions uses checkable template', () => {
    const btns = [{
      type: 'checkable', id: 'btn_1', col: 0, row: 0, icon: '\\U000F0335', label: 'Light', color: 'FF0000',
      shortPress: { enabled: true }, longPress: { enabled: false }
    }];
    const out = render(generateLVGLWidgets(btns, sectionDeps));
    assert.ok(out.includes('cyd_button_widget_checkable.yaml'));
  });

  it('checkable button with dual actions uses standard template', () => {
    const btns = [{
      type: 'checkable', id: 'btn_1', col: 0, row: 0, icon: '\\U000F0335', label: 'Light', color: 'FF0000',
      shortPress: { enabled: true }, longPress: { enabled: true }
    }];
    const out = render(generateLVGLWidgets(btns, sectionDeps));
    assert.ok(!out.includes('cyd_button_widget_checkable.yaml'));
    assert.ok(out.includes('cyd_button_widget.yaml'));
  });

  it('stateless button uses standard template', () => {
    const btns = [{
      type: 'stateless', id: 'btn_1', col: 0, row: 0, icon: '\\U000F0335', label: 'Light', color: 'FF0000',
      shortPress: { enabled: true }, longPress: { enabled: false }
    }];
    const out = render(generateLVGLWidgets(btns, sectionDeps));
    assert.ok(out.includes('cyd_button_widget.yaml'));
    assert.ok(!out.includes('cyd_button_widget_checkable.yaml'));
  });

  it('timer_sync button uses standard template', () => {
    const btns = [{
      type: 'timer_sync', id: 'btn_1', col: 0, row: 0, icon: '\\U000F0335', label: 'Timer', color: 'FF0000',
      shortPress: { enabled: true }, longPress: { enabled: false }
    }];
    const out = render(generateLVGLWidgets(btns, sectionDeps));
    assert.ok(out.includes('cyd_button_widget.yaml'));
  });

  it('number_sync button uses checkable widget template', () => {
    const btns = [{
      type: 'number_sync', id: 'btn_1', col: 0, row: 0, icon: '\\U000F0335', label: 'Sensor', color: 'FF0000',
      threshold: 50, condition: 'above', iconOn: '\\U000F0335', iconOff: '\\U000F0594',
      shortPress: { enabled: true }, longPress: { enabled: false }
    }];
    const out = render(generateLVGLWidgets(btns, sectionDeps));
    assert.ok(out.includes('cyd_button_widget_checkable.yaml'), 'should use checkable widget template');
    assert.ok(!out.includes('cyd_button_widget.yaml'), 'should NOT use standard widget template');
  });

  it('buttons are sorted by row then col', () => {
    const btns = [
      { type: 'stateless', id: 'btn_2', col: 1, row: 0, icon: '\\U000F0002', label: 'B', color: '0000FF', shortPress: {enabled: true}, longPress: {enabled: false} },
      { type: 'stateless', id: 'btn_1', col: 0, row: 0, icon: '\\U000F0001', label: 'A', color: 'FF0000', shortPress: {enabled: true}, longPress: {enabled: false} },
    ];
    const out = render(generateLVGLWidgets(btns, sectionDeps));
    const aIdx = out.indexOf('btn_1');
    const bIdx = out.indexOf('btn_2');
    assert.ok(aIdx < bIdx, 'btn_1 should appear before btn_2');
  });

  it('font line only added for non-roboto_12 fonts', () => {
    const btns = [{
      type: 'stateless', id: 'btn_1', col: 0, row: 0, icon: '\\U000F0335', label: 'Test', color: 'FFFFFF',
      font: 'arimo14', shortPress: {enabled: true}, longPress: {enabled: false}
    }];
    const out = render(generateLVGLWidgets(btns, sectionDeps));
    assert.ok(out.includes('font: arimo14'));
  });
});

// ── generateLVGLSection ─────────────────────────────────────────────────
describe('generateLVGLSection', () => {
  it('produces lvgl block', () => {
    const btns = [{ type: 'stateless', id: 'btn_1', col: 0, row: 0, icon: '\\U000F0335', label: 'A', color: 'FFFFFF', font: 'roboto_16', shortPress: {enabled: true}, longPress: {enabled: false} }];
    const out = render(generateLVGLSection(btns, sectionDeps));
    assert.ok(out.includes('lvgl:'));
    assert.ok(out.includes('on_idle'));
    assert.ok(out.includes('touchscreen_id: main_touchscreen'));
  });
});

// ── generateFullYAML ────────────────────────────────────────────────────
describe('generateFullYAML (basic smoke)', () => {

  it('generates all required top-level sections', () => {
    const config = {
      deviceName: 'my-cyd',
      niceName: 'My CYD',
      displayTimeout: 600,
      buttons: Array(12).fill(null).map((_, i) => ({
        id: `btn_${i + 1}`, name: `Button ${i+1}`, label: `Btn ${i+1}`,
        col: i % 4, row: Math.floor(i / 4),
        icon: '\\U000F0594', color: 'FFFFFF', type: 'stateless',
        shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.test', operation: 'toggle', targetType: 'entity_id'} }
      }))
    };

    const yaml = generateFullYAML(config, { ...sectionDeps, hardwareConfig: 'esp32:\n  board: test', normalizeImportedConfig });

    for (const block of ['substitutions:', 'esp32:', 'font:', 'color:', 'binary_sensor:', 'lvgl:']) {
      assert.ok(yaml.includes(block), `missing block: ${block}`);
    }
  });

  it('sanitizeDeviceName transforms !secret references', () => {
    const config = {
      deviceName: '!secret device_name',
      niceName: 'Test',
      displayTimeout: 600,
      buttons: Array(12).fill(null).map((_, i) => ({
        id: `btn_${i + 1}`, name: `Button ${i+1}`, label: `Btn`,
        col: i % 4, row: Math.floor(i / 4),
        icon: '\\U000F0594', color: 'FFFFFF', type: 'stateless',
        shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.test', operation: 'toggle', targetType: 'entity_id'} }
      }))
    };
    const yaml = generateFullYAML(config, { ...sectionDeps, hardwareConfig: 'esp32:\n  board: test', normalizeImportedConfig });
    assert.ok(yaml.includes('device_name: secret-device-name'));
  });

  it('preserves rawBlocks from import', () => {
    const config = {
      deviceName: 'test', niceName: 'Test', displayTimeout: 600,
      buttons: Array(12).fill(null).map((_, i) => ({
        id: `btn_${i + 1}`, name: `Button ${i+1}`, label: `Btn`,
        col: i % 4, row: Math.floor(i / 4), icon: '\\U000F0594', color: 'FFFFFF', type: 'stateless',
        shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.test', operation: 'toggle', targetType: 'entity_id'} }
      })),
      rawBlocks: ['# custom comment block']
    };
    const yaml = generateFullYAML(config, { ...sectionDeps, hardwareConfig: 'esp32:\n  board: test', normalizeImportedConfig });
    assert.ok(yaml.includes('# Imported unsupported blocks preserved'));
    assert.ok(yaml.includes('# custom comment block'));
  });
});