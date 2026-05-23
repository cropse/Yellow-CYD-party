import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateLVGLSection, generateLVGLWidgets, generateHardwareConfig, generateFullYAML } from '../yaml-engine.js';
import { ACTION_SCHEMAS, DEFAULT_CONFIG, DEFAULT_BUTTON, BOARD_CONFIGS, getBoardConfig, isSupportedBoard, DEFAULT_BOARD_ID } from '../config.js';
import { normalizeImportedConfig } from '../import.js';

const baseDeps = {
  normalizeColor: (c) => {
    if (!c) return null;
    const s = String(c).replace(/^#/, '').replace(/^0x/i, '').toUpperCase();
    return /^[0-9A-F]{6}$/.test(s) ? s : null;
  },
  clampNumber: (v, min, max, fb) => {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return fb;
    return Math.max(min, Math.min(max, n));
  },
  defaultButton: DEFAULT_BUTTON,
  defaultConfig: DEFAULT_CONFIG,
  actionSchemas: ACTION_SCHEMAS,
  yamlScalar: (v) => {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    const text = String(v);
    if (text.startsWith('!secret ') || text.startsWith('!lambda ')) return text;
    if (/^[A-Za-z0-9_.\/-]+$/.test(text) && !/^(true|false|null|yes|no|on|off)$/i.test(text) && !/^\d+(\.\d+)?$/.test(text)) return text;
    const escaped = text.startsWith('\\U000F') ? text : text.replace(/\\/g, '\\\\');
    return `"${escaped.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  },
  yamlQuoted: (v) => {
    const text = String(v ?? '');
    const escaped = text.startsWith('\\U000F') ? text : text.replace(/\\/g, '\\\\');
    return `"${escaped.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  },
};

function testDeps(addl = {}) {
  return { ...baseDeps, ...addl };
}

// Helper: extract boolean transform keys from a YAML section starting at a marker
function extractTransformKeys(yaml, sectionMarker) {
  const sectionIdx = yaml.indexOf(sectionMarker);
  if (sectionIdx === -1) return null;
  const afterMarker = yaml.slice(sectionIdx);
  const nextSectionMatch = afterMarker.slice(1).search(/\n\w+:/);
  const sectionEnd = nextSectionMatch === -1 ? afterMarker.length : nextSectionMatch + 1;
  const section = afterMarker.slice(0, sectionEnd);
  const transformIdx = section.indexOf('transform:');
  if (transformIdx === -1) return {};
  const afterTransform = section.slice(transformIdx + 'transform:'.length);
  const lines = afterTransform.split('\n');
  const keys = {};
  let started = false;
  for (const line of lines) {
    if (!line.startsWith(' ')) {
      if (started) break;
      continue;
    }
    started = true;
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^(\w+):\s*(true|false)$/);
    if (m) {
      keys[m[1]] = m[2] === 'true';
    } else if (trimmed.match(/^(\w+):/)) {
      break;
    }
  }
  return keys;
}

// ── generateLVGLSection grid dimensions ────────────────────────────────
describe('generateLVGLSection grid dimensions', () => {
  const baseBtn = { type: 'stateless', id: 'btn_1', col: 0, row: 0, icon: '\\U000F0335', label: 'A', color: 'FFFFFF', shortPress: { enabled: true }, longPress: { enabled: false } };

  it('default 320×240 config emits 4 column entries and 3 row entries', () => {
    const deps = testDeps({
      boardConfig: BOARD_CONFIGS['esp32-2432s028-2port'],
      config: { gridColumns: 4, gridRows: 3 }
    });
    const out = generateLVGLSection([baseBtn], deps);
    const colMatch = out.match(/grid_columns:\s*\[([^\]]+)\]/);
    assert.ok(colMatch, 'should contain grid_columns array');
    const colEntries = colMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.strictEqual(colEntries.length, 4, 'should have 4 column entries');

    const rowMatch = out.match(/grid_rows:\s*\[([^\]]+)\]/);
    assert.ok(rowMatch, 'should contain grid_rows array');
    const rowEntries = rowMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.strictEqual(rowEntries.length, 3, 'should have 3 row entries');
  });

  it('larger board 4×4 emits 4 column entries and 4 row entries', () => {
    const deps = testDeps({
      boardConfig: BOARD_CONFIGS['esp32-3248s035c'],
      config: { gridColumns: 4, gridRows: 4 }
    });
    const out = generateLVGLSection([baseBtn], deps);
    const colMatch = out.match(/grid_columns:\s*\[([^\]]+)\]/);
    const colEntries = colMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.strictEqual(colEntries.length, 4);

    const rowMatch = out.match(/grid_rows:\s*\[([^\]]+)\]/);
    const rowEntries = rowMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.strictEqual(rowEntries.length, 4);
  });

  it('larger board 5×3 emits 5 column entries and 3 row entries', () => {
    const deps = testDeps({
      boardConfig: BOARD_CONFIGS['esp32-3248s035c'],
      config: { gridColumns: 5, gridRows: 3 }
    });
    const out = generateLVGLSection([baseBtn], deps);
    const colMatch = out.match(/grid_columns:\s*\[([^\]]+)\]/);
    const colEntries = colMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.strictEqual(colEntries.length, 5);

    const rowMatch = out.match(/grid_rows:\s*\[([^\]]+)\]/);
    const rowEntries = rowMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.strictEqual(rowEntries.length, 3);
  });

  it('larger board 5×4 emits 5 column entries and 4 row entries', () => {
    const deps = testDeps({
      boardConfig: BOARD_CONFIGS['esp32-3248s035c'],
      config: { gridColumns: 5, gridRows: 4 }
    });
    const out = generateLVGLSection([baseBtn], deps);
    const colMatch = out.match(/grid_columns:\s*\[([^\]]+)\]/);
    const colEntries = colMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.strictEqual(colEntries.length, 5);

    const rowMatch = out.match(/grid_rows:\s*\[([^\]]+)\]/);
    const rowEntries = rowMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.strictEqual(rowEntries.length, 4);
  });

  it('defaults to 4×3 when config grid dimensions are undefined', () => {
    const deps = testDeps({
      boardConfig: BOARD_CONFIGS['esp32-2432s028-2port'],
      config: {} // no gridColumns/gridRows
    });
    const out = generateLVGLSection([baseBtn], deps);
    const colMatch = out.match(/grid_columns:\s*\[([^\]]+)\]/);
    const colEntries = colMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.strictEqual(colEntries.length, 4);

    const rowMatch = out.match(/grid_rows:\s*\[([^\]]+)\]/);
    const rowEntries = rowMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.strictEqual(rowEntries.length, 3);
  });
});

// ── generateLVGLWidgets out-of-bounds ────────────────────────────────────
describe('generateLVGLWidgets out-of-bounds skipping', () => {
  it('skips buttons with col >= gridColumns', () => {
    const btns = [
      { type: 'stateless', id: 'btn_1', col: 0, row: 0, icon: '\\U000F0335', label: 'A', color: 'FFFFFF', shortPress: { enabled: true }, longPress: { enabled: false } },
      { type: 'stateless', id: 'btn_2', col: 4, row: 0, icon: '\\U000F0335', label: 'B', color: 'FFFFFF', shortPress: { enabled: true }, longPress: { enabled: false } },
    ];
    const deps = testDeps({
      boardConfig: BOARD_CONFIGS['esp32-2432s028-2port'],
      config: { gridColumns: 4, gridRows: 3 }
    });
    const out = generateLVGLWidgets(btns, deps);
    assert.ok(out.includes('btn_1'), 'in-bounds button should appear');
    assert.ok(!out.includes('btn_2'), 'out-of-bounds col button should NOT appear');
  });

  it('skips buttons with row >= gridRows', () => {
    const btns = [
      { type: 'stateless', id: 'btn_1', col: 0, row: 0, icon: '\\U000F0335', label: 'A', color: 'FFFFFF', shortPress: { enabled: true }, longPress: { enabled: false } },
      { type: 'stateless', id: 'btn_2', col: 0, row: 3, icon: '\\U000F0335', label: 'B', color: 'FFFFFF', shortPress: { enabled: true }, longPress: { enabled: false } },
    ];
    const deps = testDeps({
      boardConfig: BOARD_CONFIGS['esp32-2432s028-2port'],
      config: { gridColumns: 4, gridRows: 3 }
    });
    const out = generateLVGLWidgets(btns, deps);
    assert.ok(out.includes('btn_1'), 'in-bounds button should appear');
    assert.ok(!out.includes('btn_2'), 'out-of-bounds row button should NOT appear');
  });

  it('preserves in-bounds buttons on a 5×4 grid', () => {
    const btns = [
      { type: 'stateless', id: 'btn_1', col: 4, row: 3, icon: '\\U000F0335', label: 'A', color: 'FFFFFF', shortPress: { enabled: true }, longPress: { enabled: false } },
      { type: 'stateless', id: 'btn_2', col: 5, row: 0, icon: '\\U000F0335', label: 'B', color: 'FFFFFF', shortPress: { enabled: true }, longPress: { enabled: false } },
      { type: 'stateless', id: 'btn_3', col: 0, row: 4, icon: '\\U000F0335', label: 'C', color: 'FFFFFF', shortPress: { enabled: true }, longPress: { enabled: false } },
    ];
    const deps = testDeps({
      boardConfig: BOARD_CONFIGS['esp32-3248s035c'],
      config: { gridColumns: 5, gridRows: 4 }
    });
    const out = generateLVGLWidgets(btns, deps);
    assert.ok(out.includes('btn_1'), 'col 4 row 3 should be in bounds for 5×4');
    assert.ok(!out.includes('btn_2'), 'col 5 should be out of bounds');
    assert.ok(!out.includes('btn_3'), 'row 4 should be out of bounds');
  });
});

// ── generateHardwareConfig rotate180 transform ───────────────────────────
describe('generateHardwareConfig rotate180 transform', () => {
  const hwDeps = () => testDeps({ normalizeImportedConfig });

  it('CYD 320×240 rotate180=false keeps swap_xy, no mirror on display or touch', () => {
    const board = BOARD_CONFIGS['esp32-2432s028-2port'];
    const out = generateHardwareConfig(board, { rotate180: false }, hwDeps());
    const displayTransform = extractTransformKeys(out, 'display:');
    const touchTransform = extractTransformKeys(out, 'touchscreen:');
    assert.ok(displayTransform, 'display section should exist');
    assert.strictEqual(displayTransform.swap_xy, true);
    assert.strictEqual(displayTransform.mirror_x, undefined, 'display should not have mirror_x key');
    assert.ok(touchTransform, 'touch section should exist');
    assert.strictEqual(touchTransform.swap_xy, true);
    assert.strictEqual(touchTransform.mirror_x, undefined, 'touch should not have mirror_x key');
  });

  it('CYD 320×240 rotate180=true adds mirror_x and mirror_y to both display and touch', () => {
    const board = BOARD_CONFIGS['esp32-2432s028-2port'];
    const out = generateHardwareConfig(board, { rotate180: true }, hwDeps());
    const displayTransform = extractTransformKeys(out, 'display:');
    const touchTransform = extractTransformKeys(out, 'touchscreen:');
    assert.strictEqual(displayTransform.swap_xy, true);
    assert.strictEqual(displayTransform.mirror_x, true, 'display should have mirror_x true when rotated 180');
    assert.strictEqual(displayTransform.mirror_y, true, 'display should have mirror_y true when rotated 180');
    assert.strictEqual(touchTransform.swap_xy, true);
    assert.strictEqual(touchTransform.mirror_x, true, 'touch should have mirror_x true when rotated 180');
    assert.strictEqual(touchTransform.mirror_y, true, 'touch should have mirror_y true when rotated 180');
  });

  it('CYD 480×320 rotate180=false preserves existing board mirror_x on touch', () => {
    const board = BOARD_CONFIGS['esp32-3248s035c'];
    const out = generateHardwareConfig(board, { rotate180: false }, hwDeps());
    const displayTransform = extractTransformKeys(out, 'display:');
    const touchTransform = extractTransformKeys(out, 'touchscreen:');
    assert.strictEqual(displayTransform.swap_xy, true);
    assert.strictEqual(displayTransform.mirror_x, undefined, 'display should not have mirror_x key');
    assert.strictEqual(touchTransform.swap_xy, true);
    assert.strictEqual(touchTransform.mirror_x, true, '480×320 board already has mirror_x true, should stay true when not flipped');
  });

  it('CYD 480×320 rotate180=true XORs with existing board mirror_x and mirror_y', () => {
    const board = BOARD_CONFIGS['esp32-3248s035c'];
    const out = generateHardwareConfig(board, { rotate180: true }, hwDeps());
    const displayTransform = extractTransformKeys(out, 'display:');
    const touchTransform = extractTransformKeys(out, 'touchscreen:');
    assert.strictEqual(displayTransform.swap_xy, true);
    assert.strictEqual(displayTransform.mirror_x, true, 'display should rotate to mirror_x true');
    assert.strictEqual(displayTransform.mirror_y, true, 'display should rotate to mirror_y true');
    assert.strictEqual(touchTransform.swap_xy, true);
    assert.strictEqual(touchTransform.mirror_x, false, 'touch board mirror_x true XOR rotate180 true = false');
    assert.strictEqual(touchTransform.mirror_y, true, 'touch board mirror_y false XOR rotate180 true = true');
  });

  it('Guition rotate180=false preserves mirror_x and mirror_y on touch', () => {
    const board = BOARD_CONFIGS['guition-jc4827543c'];
    const out = generateHardwareConfig(board, { rotate180: false }, hwDeps());
    const displayTransform = extractTransformKeys(out, 'display:');
    const touchTransform = extractTransformKeys(out, 'touchscreen:');
    assert.deepStrictEqual(displayTransform, {}, 'Guition display should have no transform block');
    assert.strictEqual(touchTransform.mirror_x, true, 'Guition touch should keep mirror_x true');
    assert.strictEqual(touchTransform.mirror_y, true, 'Guition touch should keep mirror_y true');
  });

  it('Guition rotate180=true XORs both mirror_x and mirror_y on display and touch', () => {
    const board = BOARD_CONFIGS['guition-jc4827543c'];
    const out = generateHardwareConfig(board, { rotate180: true }, hwDeps());
    const displayTransform = extractTransformKeys(out, 'display:');
    const touchTransform = extractTransformKeys(out, 'touchscreen:');
    assert.strictEqual(displayTransform.mirror_x, true, 'Guition display should get mirror_x true from rotate180');
    assert.strictEqual(displayTransform.mirror_y, true, 'Guition display should get mirror_y true from rotate180');
    assert.strictEqual(touchTransform.mirror_x, false, 'Guition touch mirror_x true XOR rotate180 true = false');
    assert.strictEqual(touchTransform.mirror_y, false, 'Guition touch mirror_y true XOR rotate180 true = false');
  });
});

// ── generateFullYAML end-to-end grid + rotate180 ─────────────────────────
describe('generateFullYAML grid and flip integration', () => {
  const fullDeps = (addl = {}) => testDeps({
    normalizeImportedConfig,
    hardwareConfig: '', // don't use hardcoded fallback so flip is applied
    BOARD_CONFIGS,
    getBoardConfig,
    isSupportedBoard,
    DEFAULT_BOARD_ID,
    ...addl
  });

  it('full YAML for 5×4 grid on 480×320 board', () => {
    const config = {
      deviceName: 'test-cyd',
      niceName: 'Test CYD',
      board: 'esp32-3248s035c',
      displayTimeout: 600,
      gridColumns: 5,
      gridRows: 4,
      rotate180: false,
      buttons: Array(20).fill(null).map((_, i) => ({
        id: `btn_${i + 1}`, name: `Button ${i + 1}`, label: `Btn ${i + 1}`,
        col: i % 5, row: Math.floor(i / 5),
        icon: '\\U000F0594', color: 'FFFFFF', type: 'stateless',
        shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.test', operation: 'toggle', targetType: 'entity_id' } }
      }))
    };
    const yaml = generateFullYAML(config, fullDeps());
    const colMatch = yaml.match(/grid_columns:\s*\[([^\]]+)\]/);
    const colEntries = colMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.strictEqual(colEntries.length, 5);

    const rowMatch = yaml.match(/grid_rows:\s*\[([^\]]+)\]/);
    const rowEntries = rowMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    assert.strictEqual(rowEntries.length, 4);
  });

  it('full YAML rotate180=true on default board affects hardware transforms', () => {
    const config = {
      deviceName: 'test-cyd',
      niceName: 'Test CYD',
      board: 'esp32-2432s028-2port',
      displayTimeout: 600,
      gridColumns: 4,
      gridRows: 3,
      rotate180: true,
      buttons: Array(12).fill(null).map((_, i) => ({
        id: `btn_${i + 1}`, name: `Button ${i + 1}`, label: `Btn ${i + 1}`,
        col: i % 4, row: Math.floor(i / 4),
        icon: '\\U000F0594', color: 'FFFFFF', type: 'stateless',
        shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.test', operation: 'toggle', targetType: 'entity_id' } }
      }))
    };
    const yaml = generateFullYAML(config, fullDeps());
    const displayTransform = extractTransformKeys(yaml, 'display:');
    const touchTransform = extractTransformKeys(yaml, 'touchscreen:');
    assert.strictEqual(displayTransform.mirror_x, true);
    assert.strictEqual(displayTransform.mirror_y, true);
    assert.strictEqual(touchTransform.mirror_x, true);
    assert.strictEqual(touchTransform.mirror_y, true);
  });

  it('full YAML with out-of-bounds buttons does not emit them', () => {
    const config = {
      deviceName: 'test-cyd',
      niceName: 'Test CYD',
      board: 'esp32-2432s028-2port',
      displayTimeout: 600,
      gridColumns: 4,
      gridRows: 3,
      rotate180: false,
      buttons: [
        ...Array(12).fill(null).map((_, i) => ({
          id: `btn_${i + 1}`, name: `Button ${i + 1}`, label: `Btn ${i + 1}`,
          col: i % 4, row: Math.floor(i / 4),
          icon: '\\U000F0594', color: 'FFFFFF', type: 'stateless',
          shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.test', operation: 'toggle', targetType: 'entity_id' } }
        })),
        { id: 'btn_13', name: 'Button 13', label: 'Extra', col: 4, row: 0, icon: '\\U000F0594', color: 'FFFFFF', type: 'stateless', shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.test', operation: 'toggle', targetType: 'entity_id' } } },
        { id: 'btn_14', name: 'Button 14', label: 'Extra2', col: 0, row: 3, icon: '\\U000F0594', color: 'FFFFFF', type: 'stateless', shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.test', operation: 'toggle', targetType: 'entity_id' } } }
      ]
    };
    const yaml = generateFullYAML(config, fullDeps());
    assert.ok(!yaml.includes('btn_13'), 'out-of-bounds col button should NOT appear in YAML');
    assert.ok(!yaml.includes('btn_14'), 'out-of-bounds row button should NOT appear in YAML');
  });
});
