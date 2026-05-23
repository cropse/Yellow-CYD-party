/**
 * Grid and Flip Validation / Import Tests
 * Tests src/modules/import.js and src/modules/validation-engine.js
 * for grid dimension and flipHorizontal handling.
 *
 * These tests will FAIL until Task 2 implements grid/flip normalization
 * and validation. That's expected TDD behavior.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeImportedConfig } from '../import.js';
import { validateConfig } from '../validation-engine.js';
import { DEFAULT_CONFIG, DEFAULT_BUTTON, BOARD_CONFIGS, ACTION_SCHEMAS } from '../config.js';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeValidConfig(overrides = {}) {
  const gridCols = overrides.gridColumns ?? DEFAULT_CONFIG.gridColumns ?? 4;
  const gridRows = overrides.gridRows ?? DEFAULT_CONFIG.gridRows ?? 3;

  const buttons = Array(12).fill(null).map((_, i) => ({
    ...structuredClone(DEFAULT_BUTTON),
    id: `btn_${i + 1}`,
    name: `Button ${i + 1}`,
    label: `Btn ${i + 1}`,
    col: i % gridCols,
    row: Math.floor(i / gridCols),
    shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.test', operation: 'toggle' } },
    longPress: { enabled: false, minLength: '1000ms', maxLength: '5000ms', actionType: '', action: '', data: {} }
  }));
  return { ...structuredClone(DEFAULT_CONFIG), ...overrides, buttons };
}

// ── Import: grid/flip normalization ──────────────────────────────────────

describe('normalizeImportedConfig - grid/flip fields', () => {
  it('old config without grid/flip gets defaults (4x3, false)', () => {
    const { config, warnings } = normalizeImportedConfig({
      deviceName: 'test',
      niceName: 'Test',
      board: 'esp32-2432s028-2port'
    });
    assert.strictEqual(config.gridColumns, 4);
    assert.strictEqual(config.gridRows, 3);
    assert.strictEqual(config.flipHorizontal, false);
  });

  it('preserves valid 4x3 grid for small board', () => {
    const { config } = normalizeImportedConfig({
      deviceName: 'test',
      niceName: 'Test',
      board: 'esp32-2432s028-2port',
      gridColumns: 4,
      gridRows: 3
    });
    assert.strictEqual(config.gridColumns, 4);
    assert.strictEqual(config.gridRows, 3);
  });

  it('invalid 5x4 grid for small board resets to 4x3 with warning', () => {
    const { config, warnings } = normalizeImportedConfig({
      deviceName: 'test',
      niceName: 'Test',
      board: 'esp32-2432s028-2port',
      gridColumns: 5,
      gridRows: 4
    });
    assert.strictEqual(config.gridColumns, 4);
    assert.strictEqual(config.gridRows, 3);
    assert.ok(warnings.some(w => w.toLowerCase().includes('grid') || w.toLowerCase().includes('normalized')));
  });

  it('valid 4x4 grid for large board is preserved', () => {
    const { config } = normalizeImportedConfig({
      deviceName: 'test',
      niceName: 'Test',
      board: 'esp32-3248s035c',
      gridColumns: 4,
      gridRows: 4
    });
    assert.strictEqual(config.gridColumns, 4);
    assert.strictEqual(config.gridRows, 4);
  });

  it('valid 5x3 grid for large board is preserved', () => {
    const { config } = normalizeImportedConfig({
      deviceName: 'test',
      niceName: 'Test',
      board: 'esp32-3248s035c',
      gridColumns: 5,
      gridRows: 3
    });
    assert.strictEqual(config.gridColumns, 5);
    assert.strictEqual(config.gridRows, 3);
  });

  it('valid 5x4 grid for large board is preserved', () => {
    const { config } = normalizeImportedConfig({
      deviceName: 'test',
      niceName: 'Test',
      board: 'esp32-3248s035c',
      gridColumns: 5,
      gridRows: 4
    });
    assert.strictEqual(config.gridColumns, 5);
    assert.strictEqual(config.gridRows, 4);
  });

  it('flipHorizontal string "true" normalizes to true', () => {
    const { config } = normalizeImportedConfig({ flipHorizontal: 'true' });
    assert.strictEqual(config.flipHorizontal, true);
  });

  it('flipHorizontal number 1 normalizes to true', () => {
    const { config } = normalizeImportedConfig({ flipHorizontal: 1 });
    assert.strictEqual(config.flipHorizontal, true);
  });

  it('flipHorizontal number 0 normalizes to false', () => {
    const { config } = normalizeImportedConfig({ flipHorizontal: 0 });
    assert.strictEqual(config.flipHorizontal, false);
  });

  it('flipHorizontal null normalizes to false', () => {
    const { config } = normalizeImportedConfig({ flipHorizontal: null });
    assert.strictEqual(config.flipHorizontal, false);
  });

  it('flipHorizontal undefined normalizes to false', () => {
    const { config } = normalizeImportedConfig({});
    assert.strictEqual(config.flipHorizontal, false);
  });
});

// ── Validation: grid dimensions ────────────────────────────────────────

describe('validateConfig - grid dimension validation', () => {
  it('4x3 grid on 320x240 board passes', () => {
    const cfg = makeValidConfig({ board: 'esp32-2432s028-2port', gridColumns: 4, gridRows: 3 });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const gridErrors = result.errors.filter(e => e.message.toLowerCase().includes('grid'));
    assert.strictEqual(gridErrors.length, 0);
  });

  it('5x4 grid on 320x240 board fails', () => {
    const cfg = makeValidConfig({ board: 'esp32-2432s028-2port', gridColumns: 5, gridRows: 4 });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const gridErrors = result.errors.filter(e => e.message.toLowerCase().includes('grid'));
    assert.strictEqual(gridErrors.length, 1, `Expected 1 grid error, got: ${JSON.stringify(result.errors)}`);
  });

  it('4x4 grid on 480x320 board passes', () => {
    const cfg = makeValidConfig({ board: 'esp32-3248s035c', gridColumns: 4, gridRows: 4 });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const gridErrors = result.errors.filter(e => e.message.toLowerCase().includes('grid'));
    assert.strictEqual(gridErrors.length, 0, `Expected 0 grid errors, got: ${JSON.stringify(result.errors)}`);
  });

  it('5x3 grid on 480x320 board passes', () => {
    const cfg = makeValidConfig({ board: 'esp32-3248s035c', gridColumns: 5, gridRows: 3 });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const gridErrors = result.errors.filter(e => e.message.toLowerCase().includes('grid'));
    assert.strictEqual(gridErrors.length, 0);
  });

  it('5x4 grid on 480x320 board passes', () => {
    const cfg = makeValidConfig({ board: 'esp32-3248s035c', gridColumns: 5, gridRows: 4 });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const gridErrors = result.errors.filter(e => e.message.toLowerCase().includes('grid'));
    assert.strictEqual(gridErrors.length, 0);
  });

  it('malformed gridColumns string produces error', () => {
    const cfg = makeValidConfig({ board: 'esp32-2432s028-2port', gridColumns: 'abc', gridRows: 3 });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const gridErrors = result.errors.filter(e => e.message.toLowerCase().includes('grid dimensions'));
    assert.strictEqual(gridErrors.length, 1);
  });

  it('malformed gridRows string produces error', () => {
    const cfg = makeValidConfig({ board: 'esp32-2432s028-2port', gridColumns: 4, gridRows: 'xyz' });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const gridErrors = result.errors.filter(e => e.message.toLowerCase().includes('grid dimensions'));
    assert.strictEqual(gridErrors.length, 1);
  });

  it('zero gridColumns produces error', () => {
    const cfg = makeValidConfig({ board: 'esp32-2432s028-2port', gridColumns: 0, gridRows: 3 });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const gridErrors = result.errors.filter(e => e.message.toLowerCase().includes('grid dimensions'));
    assert.strictEqual(gridErrors.length, 1);
  });

  it('negative gridRows produces error', () => {
    const cfg = makeValidConfig({ board: 'esp32-2432s028-2port', gridColumns: 4, gridRows: -1 });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const gridErrors = result.errors.filter(e => e.message.toLowerCase().includes('grid dimensions'));
    assert.strictEqual(gridErrors.length, 1);
  });
});

// ── Validation: button positions against grid ────────────────────────────

describe('validateConfig - button positions against grid', () => {
  it('button at col=4 is invalid for 4x3 grid', () => {
    const cfg = makeValidConfig({ board: 'esp32-2432s028-2port', gridColumns: 4, gridRows: 3 });
    cfg.buttons[0].col = 4;
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const posErrors = result.errors.filter(e => e.message.toLowerCase().includes('position'));
    assert.strictEqual(posErrors.length, 1);
  });

  it('button at row=3 is invalid for 4x3 grid', () => {
    const cfg = makeValidConfig({ board: 'esp32-2432s028-2port', gridColumns: 4, gridRows: 3 });
    cfg.buttons[0].row = 3;
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const posErrors = result.errors.filter(e => e.message.toLowerCase().includes('position'));
    assert.strictEqual(posErrors.length, 1);
  });

  it('button at col=4, row=3 is valid for 5x4 grid on large board', () => {
    const cfg = makeValidConfig({ board: 'esp32-3248s035c', gridColumns: 5, gridRows: 4 });
    cfg.buttons[0].col = 4;
    cfg.buttons[0].row = 3;
    // Recompute remaining buttons to avoid overlap with button 0
    for (let i = 1; i < 12; i++) {
      cfg.buttons[i].col = (i - 1) % 5;
      cfg.buttons[i].row = Math.floor((i - 1) / 5);
    }
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const posErrors = result.errors.filter(e => e.message.toLowerCase().includes('position'));
    assert.strictEqual(posErrors.length, 0, `Expected 0 position errors, got: ${JSON.stringify(result.errors)}`);
  });

  it('error message mentions selected grid dimensions dynamically', () => {
    const cfg = makeValidConfig({ board: 'esp32-2432s028-2port', gridColumns: 4, gridRows: 3 });
    cfg.buttons[0].col = 4;
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const posErrors = result.errors.filter(e => e.message.toLowerCase().includes('position'));
    assert.strictEqual(posErrors.length, 1);
    assert.ok(
      posErrors[0].message.includes('4') && posErrors[0].message.includes('3'),
      `Error message should mention grid dimensions: "${posErrors[0].message}"`
    );
  });

  it('negative col still returns error', () => {
    const cfg = makeValidConfig({ board: 'esp32-2432s028-2port', gridColumns: 4, gridRows: 3 });
    cfg.buttons[0].col = -1;
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const posErrors = result.errors.filter(e => e.message.toLowerCase().includes('position'));
    assert.strictEqual(posErrors.length, 1);
  });

  it('non-integer col still returns error', () => {
    const cfg = makeValidConfig({ board: 'esp32-2432s028-2port', gridColumns: 4, gridRows: 3 });
    cfg.buttons[0].col = 1.5;
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const posErrors = result.errors.filter(e => e.message.toLowerCase().includes('position'));
    assert.strictEqual(posErrors.length, 1);
  });
});

// ── Validation: flipHorizontal ───────────────────────────────────────────

describe('validateConfig - flipHorizontal validation', () => {
  it('flipHorizontal true passes', () => {
    const cfg = makeValidConfig({ flipHorizontal: true });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const flipErrors = result.errors.filter(e => e.message.toLowerCase().includes('flip'));
    assert.strictEqual(flipErrors.length, 0);
  });

  it('flipHorizontal false passes', () => {
    const cfg = makeValidConfig({ flipHorizontal: false });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const flipErrors = result.errors.filter(e => e.message.toLowerCase().includes('flip'));
    assert.strictEqual(flipErrors.length, 0);
  });

  it('flipHorizontal string "true" fails (must be boolean)', () => {
    const cfg = makeValidConfig({ flipHorizontal: 'true' });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const flipErrors = result.errors.filter(e => e.message.toLowerCase().includes('flip'));
    assert.strictEqual(flipErrors.length, 1);
  });

  it('flipHorizontal number 1 fails (must be boolean)', () => {
    const cfg = makeValidConfig({ flipHorizontal: 1 });
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const flipErrors = result.errors.filter(e => e.message.toLowerCase().includes('flip'));
    assert.strictEqual(flipErrors.length, 1);
  });

  it('missing flipHorizontal passes (backward compatibility)', () => {
    const cfg = makeValidConfig();
    delete cfg.flipHorizontal;
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const flipErrors = result.errors.filter(e => e.message.toLowerCase().includes('flip'));
    assert.strictEqual(flipErrors.length, 0);
  });

  it('missing gridColumns/gridRows passes (backward compatibility)', () => {
    const cfg = makeValidConfig();
    delete cfg.gridColumns;
    delete cfg.gridRows;
    const result = validateConfig(cfg, { ACTION_SCHEMAS });
    const gridErrors = result.errors.filter(e => e.message.toLowerCase().includes('grid dimensions'));
    assert.strictEqual(gridErrors.length, 0);
  });
});

// ── Import: button positions respect grid dimensions ─────────────────────

describe('normalizeImportedConfig - button positions respect grid', () => {
  const baseBtn = { id: 'b1', type: 'stateless', label: 'Test', col: 0, row: 0, shortPress: { enabled: false }, longPress: { enabled: false } };

  it('clamps col to max gridColumns-1 for large board 5x4', () => {
    const { config } = normalizeImportedConfig({
      board: 'esp32-3248s035c',
      gridColumns: 5,
      gridRows: 4,
      buttons: [
        { ...baseBtn, col: 10 },
        ...Array(11).fill(baseBtn)
      ]
    });
    assert.strictEqual(config.buttons[0].col, 4);
  });

  it('clamps row to max gridRows-1 for large board 5x4', () => {
    const { config } = normalizeImportedConfig({
      board: 'esp32-3248s035c',
      gridColumns: 5,
      gridRows: 4,
      buttons: [
        { ...baseBtn, row: 10 },
        ...Array(11).fill(baseBtn)
      ]
    });
    assert.strictEqual(config.buttons[0].row, 3);
  });

  it('preserves col=4 for large board with 5x4 grid', () => {
    const { config } = normalizeImportedConfig({
      board: 'esp32-3248s035c',
      gridColumns: 5,
      gridRows: 4,
      buttons: [
        { ...baseBtn, col: 4 },
        ...Array(11).fill(baseBtn)
      ]
    });
    assert.strictEqual(config.buttons[0].col, 4);
  });

  it('preserves row=3 for large board with 5x4 grid', () => {
    const { config } = normalizeImportedConfig({
      board: 'esp32-3248s035c',
      gridColumns: 5,
      gridRows: 4,
      buttons: [
        { ...baseBtn, row: 3 },
        ...Array(11).fill(baseBtn)
      ]
    });
    assert.strictEqual(config.buttons[0].row, 3);
  });
});
