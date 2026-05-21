/**
 * Validation Engine Board Tests
 * Tests board field validation in src/modules/validation-engine.js
 *
 * These tests will FAIL until Task 6 implements board validation.
 * That's expected TDD behavior.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { validateConfig } from '../validation-engine.js';
import { DEFAULT_CONFIG, DEFAULT_BUTTON, BOARD_CONFIGS } from '../config.js';

/**
 * Build a valid 12-button config with all defaults satisfied.
 */
function makeValidConfig(overrides = {}) {
  const buttons = Array(12).fill(null).map((_, i) => ({
    ...structuredClone(DEFAULT_BUTTON),
    id: `btn_${i + 1}`,
    name: `Button ${i + 1}`,
    label: `Btn ${i + 1}`,
    col: i % 4,
    row: Math.floor(i / 4),
    shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.test', operation: 'toggle' } },
    longPress: { enabled: false, minLength: '1000ms', maxLength: '5000ms', actionType: '', action: '', data: {} }
  }));
  return { ...structuredClone(DEFAULT_CONFIG), ...overrides, buttons };
}

// ====================================================================
// Board validation tests
// ====================================================================
describe('validateConfig - board field validation', () => {
  test('valid board ID (esp32-2432s028-2port) passes validation', () => {
    const cfg = makeValidConfig({ board: 'esp32-2432s028-2port' });
    const result = validateConfig(cfg);
    const boardErrors = result.errors.filter(e =>
      e.message.toLowerCase().includes('board') || e.message.toLowerCase().includes('unsupported')
    );
    assert.strictEqual(boardErrors.length, 0);
  });

  test('valid Guition board (guition-jc4827543c) passes validation', () => {
    const cfg = makeValidConfig({ board: 'guition-jc4827543c' });
    const result = validateConfig(cfg);
    const boardErrors = result.errors.filter(e =>
      e.message.toLowerCase().includes('board') || e.message.toLowerCase().includes('unsupported')
    );
    assert.strictEqual(boardErrors.length, 0);
  });

  test('valid board (esp32-e32r28t) passes validation', () => {
    const cfg = makeValidConfig({ board: 'esp32-e32r28t' });
    const result = validateConfig(cfg);
    const boardErrors = result.errors.filter(e =>
      e.message.toLowerCase().includes('board') || e.message.toLowerCase().includes('unsupported')
    );
    assert.strictEqual(boardErrors.length, 0);
  });

  test('valid board (esp32-3248s035c) passes validation', () => {
    const cfg = makeValidConfig({ board: 'esp32-3248s035c' });
    const result = validateConfig(cfg);
    const boardErrors = result.errors.filter(e =>
      e.message.toLowerCase().includes('board') || e.message.toLowerCase().includes('unsupported')
    );
    assert.strictEqual(boardErrors.length, 0);
  });

  test('valid board (esp32-e32r35t) passes validation', () => {
    const cfg = makeValidConfig({ board: 'esp32-e32r35t' });
    const result = validateConfig(cfg);
    const boardErrors = result.errors.filter(e =>
      e.message.toLowerCase().includes('board') || e.message.toLowerCase().includes('unsupported')
    );
    assert.strictEqual(boardErrors.length, 0);
  });

  test('valid board (esp32-e32r40t) passes validation', () => {
    const cfg = makeValidConfig({ board: 'esp32-e32r40t' });
    const result = validateConfig(cfg);
    const boardErrors = result.errors.filter(e =>
      e.message.toLowerCase().includes('board') || e.message.toLowerCase().includes('unsupported')
    );
    assert.strictEqual(boardErrors.length, 0);
  });

  test('unknown board ID (foo-bar) produces error', () => {
    const cfg = makeValidConfig({ board: 'foo-bar' });
    const result = validateConfig(cfg);
    const boardErrors = result.errors.filter(e =>
      e.message.toLowerCase().includes('board') || e.message.toLowerCase().includes('unsupported')
    );
    assert.strictEqual(boardErrors.length, 1);
  });

  test('unknown board ID (bogus-board-999) produces error', () => {
    const cfg = makeValidConfig({ board: 'bogus-board-999' });
    const result = validateConfig(cfg);
    const boardErrors = result.errors.filter(e =>
      e.message.toLowerCase().includes('board')
    );
    assert.strictEqual(boardErrors.length, 1);
  });

  test('empty board string is silently accepted (falls back to default)', () => {
    const cfg = makeValidConfig({ board: '' });
    const result = validateConfig(cfg);
    const boardErrors = result.errors.filter(e =>
      e.message.toLowerCase().includes('board')
    );
    assert.strictEqual(boardErrors.length, 0);
  });
});

// ====================================================================
// All 6 supported boards pass validation
// ====================================================================
describe('validateConfig - all 6 supported boards pass', () => {
  const boardIds = Object.keys(BOARD_CONFIGS);
  for (const boardId of boardIds) {
    test(`supported board '${boardId}' passes validation`, () => {
      const cfg = makeValidConfig({ board: boardId });
      const result = validateConfig(cfg);
      const boardErrors = result.errors.filter(e =>
        e.message.toLowerCase().includes('board') || e.message.toLowerCase().includes('unsupported')
      );
      assert.strictEqual(
        boardErrors.length, 0,
        `Expected no board errors for '${boardId}', got: ${JSON.stringify(boardErrors)}`
      );
    });
  }
});