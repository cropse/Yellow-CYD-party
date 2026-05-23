import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  BOARD_CONFIGS,
  getAllowedGridOptions,
  getDefaultGridForBoard,
  isGridAllowedForBoard,
  normalizeGridConfig
} from '../config.js';

// ── getAllowedGridOptions ────────────────────────────────────────────────
describe('getAllowedGridOptions', () => {
  it('320x240 board (esp32-2432s028-2port) allows ONLY 4x3', () => {
    const options = getAllowedGridOptions(BOARD_CONFIGS['esp32-2432s028-2port']);
    assert.deepStrictEqual(options, [{ columns: 4, rows: 3 }]);
  });

  it('320x240 board (esp32-e32r28t) allows ONLY 4x3', () => {
    const options = getAllowedGridOptions(BOARD_CONFIGS['esp32-e32r28t']);
    assert.deepStrictEqual(options, [{ columns: 4, rows: 3 }]);
  });

  it('480x320 board (esp32-3248s035c) allows 4x3, 4x4, 5x3, 5x4', () => {
    const options = getAllowedGridOptions(BOARD_CONFIGS['esp32-3248s035c']);
    assert.deepStrictEqual(options, [
      { columns: 4, rows: 3 },
      { columns: 4, rows: 4 },
      { columns: 5, rows: 3 },
      { columns: 5, rows: 4 }
    ]);
  });

  it('480x320 board (esp32-e32r35t) allows 4x3, 4x4, 5x3, 5x4', () => {
    const options = getAllowedGridOptions(BOARD_CONFIGS['esp32-e32r35t']);
    assert.deepStrictEqual(options, [
      { columns: 4, rows: 3 },
      { columns: 4, rows: 4 },
      { columns: 5, rows: 3 },
      { columns: 5, rows: 4 }
    ]);
  });

  it('480x320 board (esp32-e32r40t) allows 4x3, 4x4, 5x3, 5x4', () => {
    const options = getAllowedGridOptions(BOARD_CONFIGS['esp32-e32r40t']);
    assert.deepStrictEqual(options, [
      { columns: 4, rows: 3 },
      { columns: 4, rows: 4 },
      { columns: 5, rows: 3 },
      { columns: 5, rows: 4 }
    ]);
  });

  it('480x272 board (guition-jc4827543c) treated as larger — allows 4x3, 4x4, 5x3, 5x4', () => {
    const options = getAllowedGridOptions(BOARD_CONFIGS['guition-jc4827543c']);
    assert.deepStrictEqual(options, [
      { columns: 4, rows: 3 },
      { columns: 4, rows: 4 },
      { columns: 5, rows: 3 },
      { columns: 5, rows: 4 }
    ]);
  });
});

// ── getDefaultGridForBoard ───────────────────────────────────────────────
describe('getDefaultGridForBoard', () => {
  it('returns 4x3 for 320x240 boards', () => {
    const def = getDefaultGridForBoard(BOARD_CONFIGS['esp32-2432s028-2port']);
    assert.deepStrictEqual(def, { columns: 4, rows: 3 });
  });

  it('returns 4x3 for 480x320 boards', () => {
    const def = getDefaultGridForBoard(BOARD_CONFIGS['esp32-3248s035c']);
    assert.deepStrictEqual(def, { columns: 4, rows: 3 });
  });

  it('returns 4x3 for unknown board (fallback)', () => {
    const def = getDefaultGridForBoard(null);
    assert.deepStrictEqual(def, { columns: 4, rows: 3 });
  });
});

// ── isGridAllowedForBoard ────────────────────────────────────────────────
describe('isGridAllowedForBoard', () => {
  it('accepts 4x3 for 320x240 board', () => {
    assert.ok(isGridAllowedForBoard(BOARD_CONFIGS['esp32-2432s028-2port'], 4, 3));
  });

  it('rejects 4x4 for 320x240 board', () => {
    assert.strictEqual(isGridAllowedForBoard(BOARD_CONFIGS['esp32-e32r28t'], 4, 4), false);
  });

  it('rejects 5x3 for 320x240 board', () => {
    assert.strictEqual(isGridAllowedForBoard(BOARD_CONFIGS['esp32-2432s028-2port'], 5, 3), false);
  });

  it('rejects 5x4 for 320x240 board', () => {
    assert.strictEqual(isGridAllowedForBoard(BOARD_CONFIGS['esp32-2432s028-2port'], 5, 4), false);
  });

  it('rejects 3x3 for 480x320 board', () => {
    assert.strictEqual(isGridAllowedForBoard(BOARD_CONFIGS['esp32-3248s035c'], 3, 3), false);
  });

  it('rejects 5x5 for larger board', () => {
    assert.strictEqual(isGridAllowedForBoard(BOARD_CONFIGS['esp32-3248s035c'], 5, 5), false);
  });

  it('rejects 6x4 for larger board', () => {
    assert.strictEqual(isGridAllowedForBoard(BOARD_CONFIGS['esp32-3248s035c'], 6, 4), false);
  });

  it('accepts 4x4 for 480x320 board', () => {
    assert.ok(isGridAllowedForBoard(BOARD_CONFIGS['esp32-3248s035c'], 4, 4));
  });

  it('accepts 5x3 for 480x320 board', () => {
    assert.ok(isGridAllowedForBoard(BOARD_CONFIGS['esp32-3248s035c'], 5, 3));
  });

  it('accepts 5x4 for 480x320 board', () => {
    assert.ok(isGridAllowedForBoard(BOARD_CONFIGS['esp32-3248s035c'], 5, 4));
  });
});

// ── normalizeGridConfig ──────────────────────────────────────────────────
describe('normalizeGridConfig', () => {
  it('missing gridColumns defaults to 4', () => {
    const result = normalizeGridConfig({ gridRows: 3 }, BOARD_CONFIGS['esp32-2432s028-2port']);
    assert.strictEqual(result.gridColumns, 4);
    assert.strictEqual(result.gridRows, 3);
  });

  it('missing gridRows defaults to 3', () => {
    const result = normalizeGridConfig({ gridColumns: 4 }, BOARD_CONFIGS['esp32-2432s028-2port']);
    assert.strictEqual(result.gridColumns, 4);
    assert.strictEqual(result.gridRows, 3);
  });

  it('missing both defaults to 4x3', () => {
    const result = normalizeGridConfig({}, BOARD_CONFIGS['esp32-2432s028-2port']);
    assert.strictEqual(result.gridColumns, 4);
    assert.strictEqual(result.gridRows, 3);
  });

  it('null config defaults to 4x3', () => {
    const result = normalizeGridConfig(null, BOARD_CONFIGS['esp32-2432s028-2port']);
    assert.strictEqual(result.gridColumns, 4);
    assert.strictEqual(result.gridRows, 3);
  });

  it('undefined config defaults to 4x3', () => {
    const result = normalizeGridConfig(undefined, BOARD_CONFIGS['esp32-2432s028-2port']);
    assert.strictEqual(result.gridColumns, 4);
    assert.strictEqual(result.gridRows, 3);
  });

  it('normalizes 5x5 to default 4x3 for 320x240 board', () => {
    const result = normalizeGridConfig({ gridColumns: 5, gridRows: 5 }, BOARD_CONFIGS['esp32-2432s028-2port']);
    assert.strictEqual(result.gridColumns, 4);
    assert.strictEqual(result.gridRows, 3);
  });

  it('passes through valid 4x4 for larger board', () => {
    const result = normalizeGridConfig({ gridColumns: 4, gridRows: 4 }, BOARD_CONFIGS['esp32-3248s035c']);
    assert.strictEqual(result.gridColumns, 4);
    assert.strictEqual(result.gridRows, 4);
  });

  it('normalizes 5x5 to default 4x3 for larger board', () => {
    const result = normalizeGridConfig({ gridColumns: 5, gridRows: 5 }, BOARD_CONFIGS['esp32-3248s035c']);
    assert.strictEqual(result.gridColumns, 4);
    assert.strictEqual(result.gridRows, 3);
  });

  it('normalizes 6x4 to default 4x3 for larger board', () => {
    const result = normalizeGridConfig({ gridColumns: 6, gridRows: 4 }, BOARD_CONFIGS['esp32-3248s035c']);
    assert.strictEqual(result.gridColumns, 4);
    assert.strictEqual(result.gridRows, 3);
  });

  it('normalizes 0 columns to default', () => {
    const result = normalizeGridConfig({ gridColumns: 0, gridRows: 3 }, BOARD_CONFIGS['esp32-2432s028-2port']);
    assert.strictEqual(result.gridColumns, 4);
    assert.strictEqual(result.gridRows, 3);
  });

  it('normalizes negative rows to default', () => {
    const result = normalizeGridConfig({ gridColumns: 4, gridRows: -1 }, BOARD_CONFIGS['esp32-2432s028-2port']);
    assert.strictEqual(result.gridColumns, 4);
    assert.strictEqual(result.gridRows, 3);
  });
});