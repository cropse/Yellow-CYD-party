import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BOARD_CONFIGS, getBoardSupportWarnings } from '../config.js';

// ── Board supportStatus metadata ──────────────────────────────────────────

describe('BOARD_CONFIGS supportStatus', () => {
  const UPSTREAM_BOARDS = ['esp32-2432s028-2port', 'esp32-e32r28t', 'esp32-3248s035c', 'esp32-e32r35t', 'esp32-e32r40t', 'guition-jc4827543c'];
  const ALL_BOARDS = [...UPSTREAM_BOARDS];

  it('every board has a supportStatus field', () => {
    for (const id of ALL_BOARDS) {
      const config = BOARD_CONFIGS[id];
      assert.ok(config, `board ${id} not found in BOARD_CONFIGS`);
      assert.ok(config.supportStatus, `board ${id} missing supportStatus`);
    }
  });

  it('upstream-backed boards have supportStatus "upstream-example"', () => {
    for (const id of UPSTREAM_BOARDS) {
      assert.strictEqual(BOARD_CONFIGS[id].supportStatus, 'upstream-example',
        `expected ${id} to have upstream-example supportStatus`);
    }
  });

  it('all boards have upstream-example supportStatus', () => {
    for (const id of ALL_BOARDS) {
      assert.strictEqual(BOARD_CONFIGS[id].supportStatus, 'upstream-example',
        `expected ${id} to have upstream-example supportStatus`);
    }
  });

  it('supportStatus values are valid strings', () => {
    const valid = new Set(['upstream-example', 'no-upstream-example']);
    for (const id of ALL_BOARDS) {
      assert.ok(valid.has(BOARD_CONFIGS[id].supportStatus),
        `board ${id} has invalid supportStatus "${BOARD_CONFIGS[id].supportStatus}"`);
    }
  });
});

// ── getBoardSupportWarnings ────────────────────────────────────────────────

describe('getBoardSupportWarnings', () => {
  it('upstream-example board returns empty warnings array', () => {
    const warnings = getBoardSupportWarnings(BOARD_CONFIGS['esp32-e32r40t']);
    assert.ok(Array.isArray(warnings));
    assert.strictEqual(warnings.length, 0);
  });

  it('no-upstream-example board returns warning with code "no-upstream-example"', () => {
    const mockConfig = { id: 'mock-board', label: 'Mock Board', supportStatus: 'no-upstream-example' };
    const warnings = getBoardSupportWarnings(mockConfig);
    assert.ok(Array.isArray(warnings));
    assert.strictEqual(warnings.length, 1);
    assert.strictEqual(warnings[0].code, 'no-upstream-example');
  });

  it('warning has blocking: false', () => {
    const mockConfig = { id: 'mock-board', label: 'Mock Board', supportStatus: 'no-upstream-example' };
    const warnings = getBoardSupportWarnings(mockConfig);
    assert.strictEqual(warnings[0].blocking, false);
  });

  it('warning has severity "warning"', () => {
    const mockConfig = { id: 'mock-board', label: 'Mock Board', supportStatus: 'no-upstream-example' };
    const warnings = getBoardSupportWarnings(mockConfig);
    assert.strictEqual(warnings[0].severity, 'warning');
  });

  it('warning has a non-empty message string', () => {
    const mockConfig = { id: 'mock-board', label: 'Mock Board', supportStatus: 'no-upstream-example' };
    const warnings = getBoardSupportWarnings(mockConfig);
    assert.ok(typeof warnings[0].message === 'string');
    assert.ok(warnings[0].message.length > 0);
  });

  it('warning is a structured object, not a plain string', () => {
    const mockConfig = { id: 'mock-board', label: 'Mock Board', supportStatus: 'no-upstream-example' };
    const warnings = getBoardSupportWarnings(mockConfig);
    const w = warnings[0];
    assert.ok(typeof w === 'object' && w !== null);
    assert.ok('code' in w);
    assert.ok('message' in w);
    assert.ok('severity' in w);
    assert.ok('blocking' in w);
  });

  it('null board config returns empty array', () => {
    const warnings = getBoardSupportWarnings(null);
    assert.ok(Array.isArray(warnings));
    assert.strictEqual(warnings.length, 0);
  });

  it('undefined board config returns empty array', () => {
    const warnings = getBoardSupportWarnings(undefined);
    assert.ok(Array.isArray(warnings));
    assert.strictEqual(warnings.length, 0);
  });

  it('board config without supportStatus returns empty array', () => {
    const warnings = getBoardSupportWarnings({ id: 'nonexistent', label: 'Test' });
    assert.ok(Array.isArray(warnings));
    assert.strictEqual(warnings.length, 0);
  });
});