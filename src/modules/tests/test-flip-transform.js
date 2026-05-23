// Test: composeTransform(boardTransform, rotate180)
// Rotate 180° toggles BOTH mirror_x AND mirror_y (both axes flipped).

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { composeTransform } from '../yaml-engine.js';

describe('composeTransform', () => {

  // ── rotate180: false, no board mirror ──────────────────────────────────
  it('rotate180=false + no board mirror → mirror_x:false, mirror_y:false, other fields preserved', () => {
    const boardTransform = { swap_xy: true };
    const result = composeTransform(boardTransform, false);
    assert.deepStrictEqual(result, { swap_xy: true, mirror_x: false, mirror_y: false });
  });

  it('rotate180=false + board mirror_x absent → mirror_x:false, mirror_y:false, swap_xy preserved', () => {
    const boardTransform = { swap_xy: true };
    const result = composeTransform(boardTransform, false);
    assert.strictEqual(result.swap_xy, true);
    assert.strictEqual(result.mirror_x, false);
    assert.strictEqual(result.mirror_y, false);
  });

  // ── rotate180: false, board has mirror_x: true ─────────────────────────
  it('rotate180=false + board mirror_x:true → mirror_x:true, mirror_y:false, other fields preserved', () => {
    const boardTransform = { swap_xy: true, mirror_x: true };
    const result = composeTransform(boardTransform, false);
    assert.strictEqual(result.mirror_x, true);
    assert.strictEqual(result.mirror_y, false);
    assert.strictEqual(result.swap_xy, true);
  });

  // ── rotate180: true, no board mirror ───────────────────────────────────
  it('rotate180=true + no board mirror → mirror_x:true, mirror_y:true (both toggled on)', () => {
    const boardTransform = { swap_xy: true };
    const result = composeTransform(boardTransform, true);
    assert.strictEqual(result.mirror_x, true);
    assert.strictEqual(result.mirror_y, true);
    assert.strictEqual(result.swap_xy, true);
  });

  // ── rotate180: true, board has mirror_x: true (XOR toggles off) ───────
  it('rotate180=true + board mirror_x:true → mirror_x:false, mirror_y:true (XOR toggles mirror_x off)', () => {
    const boardTransform = { swap_xy: true, mirror_x: true };
    const result = composeTransform(boardTransform, true);
    assert.strictEqual(result.mirror_x, false);
    assert.strictEqual(result.mirror_y, true);
    assert.strictEqual(result.swap_xy, true);
  });

  // ── rotate180: true, board has both mirrors (XOR both axes) ──────────
  it('rotate180=true + board mirror_x:true, mirror_y:false → both XOR: mirror_x:false, mirror_y:true', () => {
    const boardTransform = { mirror_x: true, mirror_y: false };
    const result = composeTransform(boardTransform, true);
    assert.strictEqual(result.mirror_x, false);
    assert.strictEqual(result.mirror_y, true);
  });

  it('rotate180=false + board mirror_x:true, mirror_y:true → mirror_x:true, mirror_y:true (preserved)', () => {
    const boardTransform = { mirror_x: true, mirror_y: true };
    const result = composeTransform(boardTransform, false);
    assert.strictEqual(result.mirror_x, true);
    assert.strictEqual(result.mirror_y, true);
  });

  it('rotate180=true + board mirror_x:true, mirror_y:true → both XOR: mirror_x:false, mirror_y:false', () => {
    const boardTransform = { mirror_x: true, mirror_y: true };
    const result = composeTransform(boardTransform, true);
    assert.strictEqual(result.mirror_x, false);
    assert.strictEqual(result.mirror_y, false);
  });

  // ── swap_xy is always unchanged ───────────────────────────────────────
  it('swap_xy is always preserved unchanged', () => {
    const boardTransform = { swap_xy: true };
    let result = composeTransform(boardTransform, false);
    assert.strictEqual(result.swap_xy, true);
    result = composeTransform(boardTransform, true);
    assert.strictEqual(result.swap_xy, true);
  });

  // ── rotation and other keys are preserved ─────────────────────────────
  it('rotation is preserved unchanged', () => {
    const boardTransform = { swap_xy: true, rotation: 90 };
    const result = composeTransform(boardTransform, true);
    assert.strictEqual(result.rotation, 90);
    assert.strictEqual(result.mirror_x, true);
    assert.strictEqual(result.mirror_y, true);
  });

  it('unknown keys are preserved', () => {
    const boardTransform = { swap_xy: true, someFutureKey: 'value' };
    const result = composeTransform(boardTransform, true);
    assert.strictEqual(result.someFutureKey, 'value');
    assert.strictEqual(result.mirror_x, true);
    assert.strictEqual(result.mirror_y, true);
  });

  // ── Edge cases ────────────────────────────────────────────────────────
  it('null/undefined boardTransform returns default transform with mirror_x and mirror_y', () => {
    const result = composeTransform(null, false);
    assert.deepStrictEqual(result, { mirror_x: false, mirror_y: false });
  });

  it('undefined boardTransform with rotate180=true returns mirror_x:true, mirror_y:true', () => {
    const result = composeTransform(undefined, true);
    assert.strictEqual(result.mirror_x, true);
    assert.strictEqual(result.mirror_y, true);
  });

  it('empty boardTransform object with rotate180=true returns only mirror keys', () => {
    const result = composeTransform({}, true);
    assert.strictEqual(result.mirror_x, true);
    assert.strictEqual(result.mirror_y, true);
    assert.deepStrictEqual(Object.keys(result), ['mirror_x', 'mirror_y']);
  });

  it('empty boardTransform object with rotate180=false returns only mirror keys set to false', () => {
    const result = composeTransform({}, false);
    assert.strictEqual(result.mirror_x, false);
    assert.strictEqual(result.mirror_y, false);
    assert.deepStrictEqual(Object.keys(result), ['mirror_x', 'mirror_y']);
  });
});