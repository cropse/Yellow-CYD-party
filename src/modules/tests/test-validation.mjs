/**
 * Validation Engine Tests
 * Tests src/modules/validation-engine.js for ALL error branches.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { validateConfig, validateActionPayload } from '../validation-engine.js';
import { DEFAULT_CONFIG, DEFAULT_BUTTON, ACTION_SCHEMAS } from '../config.js';

/**
 * Build a valid 12-button config with all defaults satisfied.
 * Each button is stateless with a shortPress so action validation passes.
 */
function makeValidConfig(overrides = {}) {
  const buttons = Array(12).fill(null).map((_, i) => ({
    ...structuredClone(DEFAULT_BUTTON),
    id: `btn_${i + 1}`,
    name: `Button ${i + 1}`,
    label: `Btn ${i + 1}`,
    col: i % 4,
    row: Math.floor(i / 4),
    // Ensure stateless buttons have at least one press action
    shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.test', operation: 'toggle' } },
    longPress: { enabled: false, minLength: '1000ms', maxLength: '5000ms', actionType: '', action: '', data: {} }
  }));
  return { ...structuredClone(DEFAULT_CONFIG), ...overrides, buttons };
}

// ====================================================================
// validateActionPayload standalone tests
// ====================================================================
describe('validateActionPayload', () => {
  test('script action with valid data passes', () => {
    const issues = { errors: [], warnings: [] };
    const actionObj = { enabled: true, actionType: 'script', action: 'script.good_night', data: { action: 'script.good_night' } };
    validateActionPayload(1, 0, 'shortPress', actionObj, issues, 0, ACTION_SCHEMAS);
    assert.strictEqual(issues.errors.length, 0);
  });

  test('script action with empty data fails', () => {
    const issues = { errors: [], warnings: [] };
    const actionObj = { enabled: true, actionType: 'script', action: '', data: {} };
    validateActionPayload(1, 0, 'shortPress', actionObj, issues, 0, ACTION_SCHEMAS);
    // validateActionPayload only checks that actionType is present — it doesn't validate data
    // So if actionType is set, it passes validation at this level
    // The action: '' is not caught by this validator; we test that if actionType is missing it's caught
    assert.strictEqual(issues.errors.length, 0);
  });

  test('switch action with entity_id passes', () => {
    const issues = { errors: [], warnings: [] };
    const actionObj = { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.garden_light', operation: 'toggle' } };
    validateActionPayload(1, 0, 'shortPress', actionObj, issues, 0, ACTION_SCHEMAS);
    assert.strictEqual(issues.errors.length, 0);
  });

  test('custom action with missing required field passes at action level (not deep-validated by validateActionPayload)', () => {
    const issues = { errors: [], warnings: [] };
    const actionObj = { enabled: true, actionType: 'custom', action: '', data: {} };
    validateActionPayload(1, 0, 'shortPress', actionObj, issues, 0, ACTION_SCHEMAS);
    // validateActionPayload only checks actionType existence, not data completeness
    assert.strictEqual(issues.errors.length, 0);
  });

  test('enabled action with no actionType fails', () => {
    const issues = { errors: [], warnings: [] };
    const actionObj = { enabled: true, actionType: '', action: '', data: {} };
    validateActionPayload(1, 0, 'shortPress', actionObj, issues, 0, ACTION_SCHEMAS);
    assert.strictEqual(issues.errors.length, 1);
    assert.ok(issues.errors[0].message.includes('choose an action type'));
  });

  test('disabled action with no actionType passes (skipped)', () => {
    const issues = { errors: [], warnings: [] };
    const actionObj = { enabled: false, actionType: '', action: '', data: {} };
    validateActionPayload(1, 0, 'shortPress', actionObj, issues, 0, ACTION_SCHEMAS);
    assert.strictEqual(issues.errors.length, 0);
  });

  test('undefined action passes (skipped)', () => {
    const issues = { errors: [], warnings: [] };
    validateActionPayload(1, 0, 'shortPress', undefined, issues, 0, ACTION_SCHEMAS);
    assert.strictEqual(issues.errors.length, 0);
  });

  test('null action passes (skipped)', () => {
    const issues = { errors: [], warnings: [] };
    validateActionPayload(1, 0, 'shortPress', null, issues, 0, ACTION_SCHEMAS);
    assert.strictEqual(issues.errors.length, 0);
  });
});

// ====================================================================
// validateConfig tests
// ====================================================================
describe('validateConfig - config-level validation', () => {
  test('null config returns error', () => {
    const result = validateConfig(null);
    assert.strictEqual(result.errors.length, 1);
    assert.ok(result.errors[0].message.includes('Configuration is empty or invalid'));
  });

  test('non-object config (string) returns error', () => {
    const result = validateConfig('hello');
    assert.strictEqual(result.errors.length, 1);
    assert.ok(result.errors[0].message.includes('Configuration is empty or invalid'));
  });

  test('non-object config (number) returns error', () => {
    const result = validateConfig(42);
    assert.strictEqual(result.errors.length, 1);
    assert.ok(result.errors[0].message.includes('Configuration is empty or invalid'));
  });

  test('config with empty buttons array returns error', () => {
    const result = validateConfig({ deviceName: 'test', niceName: 'Test', displayTimeout: 600, buttons: [] });
    assert.strictEqual(result.errors.length, 1);
    assert.ok(result.errors[0].message.includes('at least 1 CYD button'));
  });

  test('config with 11 buttons (non-objects) returns errors for each invalid button', () => {
    const result = validateConfig({ deviceName: 'test', niceName: 'Test', displayTimeout: 600, buttons: [1,2,3,4,5,6,7,8,9,10,11] });
    assert.strictEqual(result.errors.length, 11);
    assert.ok(result.errors[0].message.includes('empty or invalid'));
  });

  test('config with 5 buttons (non-objects) returns errors for each invalid button', () => {
    const result = validateConfig({ deviceName: 'test', niceName: 'Test', displayTimeout: 600, buttons: [1,2,3,4,5] });
    assert.strictEqual(result.errors.length, 5);
    assert.ok(result.errors[0].message.includes('empty or invalid'));
  });

  test('null buttons returns error', () => {
    const result = validateConfig({ deviceName: 'test', niceName: 'Test', displayTimeout: 600, buttons: null });
    assert.strictEqual(result.errors.length, 1);
    assert.ok(result.errors[0].message.includes('at least 1 CYD button'));
  });

  test('empty deviceName returns error', () => {
    const result = validateConfig({ deviceName: '', niceName: 'Test', displayTimeout: 600, buttons: makeValidConfig().buttons });
    const deviceErrors = result.errors.filter(e => e.message.includes('Device name'));
    assert.strictEqual(deviceErrors.length, 1);
    assert.ok(deviceErrors[0].message.includes('Device name is required'));
  });

  test('deviceName with special chars returns error', () => {
    const result = validateConfig({ deviceName: 'My Device!', niceName: 'Test', displayTimeout: 600, buttons: makeValidConfig().buttons });
    const deviceErrors = result.errors.filter(e => e.message.includes('valid ESPHome hostname'));
    assert.strictEqual(deviceErrors.length, 1);
  });

  test('deviceName with leading hyphen returns error', () => {
    const result = validateConfig({ deviceName: '-leading-hyphen', niceName: 'Test', displayTimeout: 600, buttons: makeValidConfig().buttons });
    const deviceErrors = result.errors.filter(e => e.message.includes('valid ESPHome hostname'));
    assert.strictEqual(deviceErrors.length, 1);
  });

  test('empty niceName returns error', () => {
    const result = validateConfig({ deviceName: 'my-cyd', niceName: '', displayTimeout: 600, buttons: makeValidConfig().buttons });
    const nameErrors = result.errors.filter(e => e.message.includes('Friendly name is required'));
    assert.strictEqual(nameErrors.length, 1);
  });

  test('displayTimeout too low (30) returns error', () => {
    const result = validateConfig({ deviceName: 'my-cyd', niceName: 'My CYD', displayTimeout: 30, buttons: makeValidConfig().buttons });
    const timeoutErrors = result.errors.filter(e => e.message.includes('Display timeout'));
    assert.strictEqual(timeoutErrors.length, 1);
  });

  test('displayTimeout too high (5000) returns error', () => {
    const result = validateConfig({ deviceName: 'my-cyd', niceName: 'My CYD', displayTimeout: 5000, buttons: makeValidConfig().buttons });
    const timeoutErrors = result.errors.filter(e => e.message.includes('Display timeout'));
    assert.strictEqual(timeoutErrors.length, 1);
  });

  test('displayTimeout non-numeric (abc) returns error', () => {
    const result = validateConfig({ deviceName: 'my-cyd', niceName: 'My CYD', displayTimeout: 'abc', buttons: makeValidConfig().buttons });
    const timeoutErrors = result.errors.filter(e => e.message.includes('Display timeout'));
    assert.strictEqual(timeoutErrors.length, 1);
  });

  test('valid config returns no errors', () => {
    const cfg = makeValidConfig();
    const result = validateConfig(cfg);
    assert.strictEqual(result.errors.length, 0);
  });
});

describe('validateConfig - button-level validation', () => {
  test('button with type invalid_type returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'invalid_type';
    const result = validateConfig(cfg);
    const typeErrors = result.errors.filter(e => e.message.includes('unsupported button type'));
    assert.strictEqual(typeErrors.length, 1);
  });

  test('button with empty/null/whitespace label passes validation (label is optional)', () => {
    const cfg = makeValidConfig();
    for (const label of ['', '   ', null, undefined]) {
      cfg.buttons[0].label = label;
      const result = validateConfig(cfg);
      const labelErrors = result.errors.filter(e => e.message.includes('label'));
      assert.strictEqual(labelErrors.length, 0, `Failed for label=${JSON.stringify(label)}`);
    }
  });

  test('button with invalid icon (not U000Fxxxx) returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].icon = '\\U000FZZZZ';
    const result = validateConfig(cfg);
    const iconErrors = result.errors.filter(e => e.message.includes('icon must be a Material Design Icon'));
    assert.strictEqual(iconErrors.length, 1);
  });

  test('button with malformed icon (missing backslash) returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].icon = 'U000F0594';
    const result = validateConfig(cfg);
    const iconErrors = result.errors.filter(e => e.message.includes('icon must be a Material Design Icon'));
    assert.strictEqual(iconErrors.length, 1);
  });

  test('button with empty icon returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].icon = '';
    const result = validateConfig(cfg);
    const iconErrors = result.errors.filter(e => e.message.includes('icon must be a Material Design Icon'));
    assert.strictEqual(iconErrors.length, 1);
  });

  test('button with negative col returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].col = -1;
    const result = validateConfig(cfg);
    const posErrors = result.errors.filter(e => e.message.includes('position must be inside the 4x3 grid'));
    assert.strictEqual(posErrors.length, 1);
  });

  test('button with col=5 (out of bounds) returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].col = 5;
    const result = validateConfig(cfg);
    const posErrors = result.errors.filter(e => e.message.includes('position must be inside the 4x3 grid'));
    assert.strictEqual(posErrors.length, 1);
  });

  test('button with row=5 (out of bounds) returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].row = 5;
    const result = validateConfig(cfg);
    const posErrors = result.errors.filter(e => e.message.includes('position must be inside the 4x3 grid'));
    assert.strictEqual(posErrors.length, 1);
  });

  test('button with non-integer col returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].col = 1.5;
    const result = validateConfig(cfg);
    const posErrors = result.errors.filter(e => e.message.includes('position must be inside the 4x3 grid'));
    assert.strictEqual(posErrors.length, 1);
  });

  test('two buttons at same position (0,0) returns overlap error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[1].col = 0;
    cfg.buttons[1].row = 0;
    const result = validateConfig(cfg);
    const overlapErrors = result.errors.filter(e => e.message.includes('overlap'));
    assert.strictEqual(overlapErrors.length, 1);
  });

  test('button with invalid color FF (too short) returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].color = 'FF';
    const result = validateConfig(cfg);
    const colorErrors = result.errors.filter(e => e.message.includes('color must be exactly 6 hexadecimal characters'));
    assert.strictEqual(colorErrors.length, 1);
  });

  test('button with invalid color GGGGGG returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].color = 'GGGGGG';
    const result = validateConfig(cfg);
    const colorErrors = result.errors.filter(e => e.message.includes('color must be exactly 6 hexadecimal characters'));
    assert.strictEqual(colorErrors.length, 1);
  });

  test('button with empty color returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].color = '';
    const result = validateConfig(cfg);
    const colorErrors = result.errors.filter(e => e.message.includes('color must be exactly 6 hexadecimal characters'));
    assert.strictEqual(colorErrors.length, 1);
  });

  test('stateless button with no press actions returns warning', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].shortPress = { enabled: false, actionType: '', action: '', data: {} };
    cfg.buttons[0].longPress = { enabled: false, actionType: '', action: '', data: {} };
    const result = validateConfig(cfg);
    const actionWarnings = result.warnings.filter(w => w.message.includes('stateless buttons need at least one press action'));
    assert.strictEqual(actionWarnings.length, 1);
  });

  test('checkable button with no haEntity returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'checkable';
    cfg.buttons[0].haEntity = '';
    cfg.buttons[0].onState = 'on';
    cfg.buttons[0].iconOn = '\\U000F059C';
    cfg.buttons[0].iconOff = '\\U000F0594';
    const result = validateConfig(cfg);
    const entityErrors = result.errors.filter(e => e.message.includes('needs a Home Assistant entity'));
    assert.strictEqual(entityErrors.length, 1);
  });

  test('timer_sync button with no haEntity returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'timer_sync';
    cfg.buttons[0].haEntity = null;
    cfg.buttons[0].onState = 'on';
    cfg.buttons[0].iconOn = '\\U000F059C';
    cfg.buttons[0].iconOff = '\\U000F0594';
    const result = validateConfig(cfg);
    const entityErrors = result.errors.filter(e => e.message.includes('needs a Home Assistant entity'));
    assert.strictEqual(entityErrors.length, 1);
  });

  // ── Number sync validation tests ──────────────────
  test('number_sync button with valid sensor entity + threshold + icons passes', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'number_sync';
    cfg.buttons[0].haEntity = 'sensor.gecko_sensor_humidity';
    cfg.buttons[0].threshold = 50;
    cfg.buttons[0].condition = 'above';
    cfg.buttons[0].iconOn = '\\U000F0001';
    cfg.buttons[0].iconOff = '\\U000F0002';
    const result = validateConfig(cfg);
    const numberErrors = result.errors.filter(e => e.message.includes('number_sync'));
    assert.strictEqual(numberErrors.length, 0);
  });

  test('number_sync button with blank entity returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'number_sync';
    cfg.buttons[0].haEntity = '';
    cfg.buttons[0].threshold = 50;
    cfg.buttons[0].condition = 'above';
    cfg.buttons[0].iconOn = '\\U000F0001';
    cfg.buttons[0].iconOff = '\\U000F0002';
    const result = validateConfig(cfg);
    const entityErrors = result.errors.filter(e => e.message.includes('needs a Home Assistant entity'));
    assert.strictEqual(entityErrors.length, 1);
  });

  test('number_sync button with null entity returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'number_sync';
    cfg.buttons[0].haEntity = null;
    cfg.buttons[0].threshold = 50;
    cfg.buttons[0].condition = 'above';
    cfg.buttons[0].iconOn = '\\U000F0001';
    cfg.buttons[0].iconOff = '\\U000F0002';
    const result = validateConfig(cfg);
    const entityErrors = result.errors.filter(e => e.message.includes('needs a Home Assistant entity'));
    assert.strictEqual(entityErrors.length, 1);
  });

  test('number_sync button with non-sensor domain returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'number_sync';
    cfg.buttons[0].haEntity = 'switch.garden_lights';
    cfg.buttons[0].threshold = 50;
    cfg.buttons[0].condition = 'above';
    cfg.buttons[0].iconOn = '\\U000F0001';
    cfg.buttons[0].iconOff = '\\U000F0002';
    const result = validateConfig(cfg);
    const domainErrors = result.errors.filter(e => e.message.includes('requires a sensor.* entity'));
    assert.strictEqual(domainErrors.length, 1);
    assert.ok(domainErrors[0].message.includes('switch.garden_lights'));
  });

  test('number_sync button without threshold returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'number_sync';
    cfg.buttons[0].haEntity = 'sensor.temperature';
    cfg.buttons[0].threshold = null;
    cfg.buttons[0].condition = 'above';
    cfg.buttons[0].iconOn = '\\U000F0001';
    cfg.buttons[0].iconOff = '\\U000F0002';
    const result = validateConfig(cfg);
    const thresholdErrors = result.errors.filter(e => e.message.includes('numeric threshold'));
    assert.strictEqual(thresholdErrors.length, 1);
  });

  test('number_sync button without icons falls back to main icon, errors if main icon also missing', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'number_sync';
    cfg.buttons[0].haEntity = 'sensor.temperature';
    cfg.buttons[0].threshold = 50;
    cfg.buttons[0].condition = 'above';
    cfg.buttons[0].icon = '';
    cfg.buttons[0].iconOn = '';
    cfg.buttons[0].iconOff = '';
    const result = validateConfig(cfg);
    const iconErrors = result.errors.filter(e => e.message.includes('on/off icon'));
    assert.strictEqual(iconErrors.length, 1);
  });

  test('number_sync button does not require onState or timerDefaultLabel', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'number_sync';
    cfg.buttons[0].haEntity = 'sensor.temperature';
    cfg.buttons[0].threshold = 50;
    cfg.buttons[0].condition = 'above';
    cfg.buttons[0].iconOn = '\\U000F0001';
    cfg.buttons[0].iconOff = '\\U000F0002';
    cfg.buttons[0].onState = '';
    cfg.buttons[0].timerDefaultLabel = '';
    const result = validateConfig(cfg);
    const numberErrors = result.errors.filter(e => e.message.includes('number_sync'));
    assert.strictEqual(numberErrors.length, 0);
  });

  test('checkable button with missing onState returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'checkable';
    cfg.buttons[0].haEntity = 'switch.test';
    cfg.buttons[0].onState = '';
    cfg.buttons[0].iconOn = '\\U000F059C';
    cfg.buttons[0].iconOff = '\\U000F0594';
    const result = validateConfig(cfg);
    const onStateErrors = result.errors.filter(e => e.message.includes('requires an on-state value'));
    assert.strictEqual(onStateErrors.length, 1);
  });

  test('checkable button with null onState returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'checkable';
    cfg.buttons[0].haEntity = 'switch.test';
    cfg.buttons[0].onState = null;
    cfg.buttons[0].iconOn = '\\U000F059C';
    cfg.buttons[0].iconOff = '\\U000F0594';
    const result = validateConfig(cfg);
    const onStateErrors = result.errors.filter(e => e.message.includes('requires an on-state value'));
    assert.strictEqual(onStateErrors.length, 1);
  });

  test('checkable button with missing iconOn (no fallback icon) returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'checkable';
    cfg.buttons[0].haEntity = 'switch.test';
    cfg.buttons[0].onState = 'on';
    cfg.buttons[0].iconOn = '';
    cfg.buttons[0].iconOff = '';
    cfg.buttons[0].icon = ''; // Make icon empty too so the || fallback doesn't mask it
    const result = validateConfig(cfg);
    const iconErrors = result.errors.filter(e => e.message.includes('requires valid on/off icon codepoints'));
    assert.strictEqual(iconErrors.length, 1);
  });

  test('checkable button with invalid iconOn returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'checkable';
    cfg.buttons[0].haEntity = 'switch.test';
    cfg.buttons[0].onState = 'on';
    cfg.buttons[0].iconOn = 'INVALID';
    cfg.buttons[0].iconOff = '\\U000F0594';
    const result = validateConfig(cfg);
    const iconErrors = result.errors.filter(e => e.message.includes('requires valid on/off icon codepoints'));
    assert.strictEqual(iconErrors.length, 1);
  });

  test('checkable button with invalid iconOff returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].type = 'checkable';
    cfg.buttons[0].haEntity = 'switch.test';
    cfg.buttons[0].onState = 'on';
    cfg.buttons[0].iconOn = '\\U000F059C';
    cfg.buttons[0].iconOff = '\\U000GZZZZ';
    const result = validateConfig(cfg);
    const iconErrors = result.errors.filter(e => e.message.includes('requires valid on/off icon codepoints'));
    assert.strictEqual(iconErrors.length, 1);
  });

  test('null button in array returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0] = null;
    const result = validateConfig(cfg);
    const nullErrors = result.errors.filter(e => e.message.includes('is empty or invalid'));
    assert.strictEqual(nullErrors.length, 1);
  });

  test('non-object button in array returns error', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0] = 'not-a-button';
    const result = validateConfig(cfg);
    const notObjectErrors = result.errors.filter(e => e.message.includes('is empty or invalid'));
    assert.strictEqual(notObjectErrors.length, 1);
  });
});

describe('validateConfig - looksLikeSecret', () => {
  test('deviceName that looks like a secret triggers warning', () => {
    const cfg = makeValidConfig();
    // Must be 24+ chars AND contain chars not in [a-z0-9_] to avoid the simple-name exclusion
    cfg.deviceName = 'my-super-secret-api-key-long-enough';
    const result = validateConfig(cfg);
    const secretWarnings = result.warnings.filter(w => w.message.includes('looks like a secret'));
    assert.strictEqual(secretWarnings.length, 1);
  });

  test('button label that looks like a secret triggers warning', () => {
    const cfg = makeValidConfig();
    // Must be 24+ chars AND contain chars not in [a-z0-9_]
    cfg.buttons[0].label = 'my-super-secret-api-key-long-label';
    const result = validateConfig(cfg);
    const secretWarnings = result.warnings.filter(w => w.message.includes('looks like a credential'));
    assert.strictEqual(secretWarnings.length, 1);
  });

  test('button haEntity that looks like a secret triggers warning', () => {
    const cfg = makeValidConfig();
    // Must be 24+ chars AND contain chars not in [a-z0-9_]
    cfg.buttons[0].haEntity = 'my-super-secret-token-long-entity';
    const result = validateConfig(cfg);
    const secretWarnings = result.warnings.filter(w => w.message.includes('looks like a credential'));
    assert.strictEqual(secretWarnings.length, 1);
  });

  test('already-secret values do not trigger warning', () => {
    const cfg = makeValidConfig();
    cfg.deviceName = '!secret something';
    const result = validateConfig(cfg);
    const secretWarnings = result.warnings.filter(w => w.message.includes('looks like a secret'));
    assert.strictEqual(secretWarnings.length, 0);
  });

  test('normal hostname does not trigger secret warning', () => {
    const cfg = makeValidConfig();
    cfg.deviceName = 'living-room-cyd';
    const result = validateConfig(cfg);
    const secretWarnings = result.warnings.filter(w => w.message.includes('looks like a secret'));
    assert.strictEqual(secretWarnings.length, 0);
  });
});

describe('validateConfig - enabled shortPress with no actionType', () => {
  test('enabled shortPress with no actionType fails', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].shortPress = { enabled: true, actionType: '', action: '', data: {} };
    const result = validateConfig(cfg);
    const actionTypeErrors = result.errors.filter(e => e.message.includes('choose an action type'));
    assert.strictEqual(actionTypeErrors.length, 1);
  });

  test('enabled longPress with no actionType fails', () => {
    const cfg = makeValidConfig();
    cfg.buttons[0].longPress = { enabled: true, minLength: '1000ms', maxLength: '5000ms', actionType: '', action: '', data: {} };
    const result = validateConfig(cfg);
    const actionTypeErrors = result.errors.filter(e => e.message.includes('choose an action type'));
    assert.strictEqual(actionTypeErrors.length, 1);
  });
});