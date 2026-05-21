// Unit tests for board field in import/export
// Run with: node src/modules/tests/test-import-export-board.js
//
// These tests will FAIL until Task 6 implements board field handling in
// normalizeImportedConfig. That's expected TDD behavior.

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeImportedConfig } from '../import.js';
import { DEFAULT_CONFIG, DEFAULT_BOARD_ID, BOARD_CONFIGS } from '../config.js';

// ── Board field normalization ─────────────────────────────────────────────
describe('normalizeImportedConfig - board field handling', () => {
  it('missing board defaults to DEFAULT_BOARD_ID', () => {
    const { config } = normalizeImportedConfig({});
    assert.strictEqual(config.board, DEFAULT_BOARD_ID);
  });

  it('valid board ID (guition-jc4827543c) is preserved', () => {
    const { config } = normalizeImportedConfig({ board: 'guition-jc4827543c' });
    assert.strictEqual(config.board, 'guition-jc4827543c');
  });

  it('valid board ID (esp32-e32r28t) is preserved', () => {
    const { config } = normalizeImportedConfig({ board: 'esp32-e32r28t' });
    assert.strictEqual(config.board, 'esp32-e32r28t');
  });

  it('unknown board ID defaults to DEFAULT_BOARD_ID', () => {
    const { config } = normalizeImportedConfig({ board: 'unknown-board-123' });
    assert.strictEqual(config.board, DEFAULT_BOARD_ID);
  });

  it('empty board string defaults to DEFAULT_BOARD_ID', () => {
    const { config } = normalizeImportedConfig({ board: '' });
    assert.strictEqual(config.board, DEFAULT_BOARD_ID);
  });

  it('null board field defaults to DEFAULT_BOARD_ID', () => {
    const { config } = normalizeImportedConfig({ board: null });
    assert.strictEqual(config.board, DEFAULT_BOARD_ID);
  });

  it('undefined board field defaults to DEFAULT_BOARD_ID', () => {
    const { config } = normalizeImportedConfig({ board: undefined });
    assert.strictEqual(config.board, DEFAULT_BOARD_ID);
  });
});

// ── All board IDs round-trip ─────────────────────────────────────────────
describe('normalizeImportedConfig - all 6 board IDs round-trip', () => {
  const boardIds = Object.keys(BOARD_CONFIGS);
  it(`preserves all ${boardIds.length} supported board IDs`, () => {
    for (const boardId of boardIds) {
      const { config } = normalizeImportedConfig({ board: boardId });
      assert.strictEqual(
        config.board, boardId,
        `Expected board '${boardId}' to be preserved, got '${config.board}'`
      );
    }
  });
});

// ── Export includes board ────────────────────────────────────────────────
describe('normalizeImportedConfig - export includes board field', () => {
  it('exported config has board field set to DEFAULT_BOARD_ID by default', () => {
    const { config } = normalizeImportedConfig({});
    assert.ok(Object.prototype.hasOwnProperty.call(config, 'board'), 'config must have board field');
    assert.strictEqual(config.board, DEFAULT_BOARD_ID);
  });

  it('exported config preserves provided board field', () => {
    const { config } = normalizeImportedConfig({ board: 'esp32-3248s035c' });
    assert.ok(Object.prototype.hasOwnProperty.call(config, 'board'));
    assert.strictEqual(config.board, 'esp32-3248s035c');
  });
});

// ── Board field integration with full config ─────────────────────────────
describe('normalizeImportedConfig - board with full config', () => {
  it('board is preserved alongside deviceName and niceName', () => {
    const input = {
      board: 'esp32-e32r40t',
      deviceName: 'my-cyd',
      niceName: 'My CYD'
    };
    const { config } = normalizeImportedConfig(input);
    assert.strictEqual(config.board, 'esp32-e32r40t');
    assert.strictEqual(config.deviceName, 'my-cyd');
    assert.strictEqual(config.niceName, 'My CYD');
  });

  it('board defaults when importing 12-button config without board field', () => {
    const btn = { type: 'stateless', label: 'Test', col: 0, row: 0, shortPress: { enabled: false }, longPress: { enabled: false } };
    const buttons = Array(12).fill(null).map((b, i) => ({ ...b, id: `btn_${i + 1}`, name: `Button ${i + 1}`, label: `Btn ${i + 1}`, col: i % 4, row: Math.floor(i / 4) }));
    const { config } = normalizeImportedConfig({ deviceName: 'test', niceName: 'Test', buttons });
    assert.strictEqual(config.board, DEFAULT_BOARD_ID);
  });
});