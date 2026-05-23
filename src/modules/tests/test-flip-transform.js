// Test: composeTransform(boardTransform, flipHorizontal)
// TDD — tests first, then implement the helper in yaml-engine.js

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { composeTransform } from '../yaml-engine.js';

describe('composeTransform', () => {

  // ── flipHorizontal: false, no board mirror_x ──────────────────────────
  it('flipHorizontal=false + no board mirror_x → mirror_x: false, other fields preserved', () => {
    const boardTransform = { swap_xy: true };
    const result = composeTransform(boardTransform, false);
    assert.deepStrictEqual(result, { swap_xy: true, mirror_x: false });
  });

  it('flipHorizontal=false + board mirror_x absent → mirror_x: false, swap_xy preserved', () => {
    const boardTransform = { swap_xy: true };
    const result = composeTransform(boardTransform, false);
    assert.strictEqual(result.swap_xy, true);
    assert.strictEqual(result.mirror_x, false);
  });

  // ── flipHorizontal: false, board has mirror_x: true ───────────────────
  it('flipHorizontal=false + board mirror_x:true → mirror_x:true, other fields preserved', () => {
    const boardTransform = { swap_xy: true, mirror_x: true };
    const result = composeTransform(boardTransform, false);
    assert.strictEqual(result.mirror_x, true);
    assert.strictEqual(result.swap_xy, true);
  });

  // ── flipHorizontal: true, no board mirror_x ───────────────────────────
  it('flipHorizontal=true + no board mirror_x → mirror_x:true (toggled on)', () => {
    const boardTransform = { swap_xy: true };
    const result = composeTransform(boardTransform, true);
    assert.strictEqual(result.mirror_x, true);
    assert.strictEqual(result.swap_xy, true);
  });

  // ── flipHorizontal: true, board has mirror_x: true (XOR toggles off) ─
  it('flipHorizontal=true + board mirror_x:true → mirror_x:false (XOR toggles off)', () => {
    const boardTransform = { swap_xy: true, mirror_x: true };
    const result = composeTransform(boardTransform, true);
    assert.strictEqual(result.mirror_x, false);
    assert.strictEqual(result.swap_xy, true);
  });

  // ── mirror_y and swap_xy are always unchanged ─────────────────────────
  it('mirror_y is always preserved unchanged', () => {
    const boardTransform = { swap_xy: true, mirror_x: true, mirror_y: true };
    let result = composeTransform(boardTransform, false);
    assert.strictEqual(result.mirror_y, true);
    result = composeTransform(boardTransform, true);
    assert.strictEqual(result.mirror_y, true);
  });

  it('swap_xy is always preserved unchanged', () => {
    const boardTransform = { swap_xy: true };
    let result = composeTransform(boardTransform, false);
    assert.strictEqual(result.swap_xy, true);
    result = composeTransform(boardTransform, true);
    assert.strictEqual(result.swap_xy, true);
  });

  // ── Guition touch preserves mirror_y regardless of flip ───────────────
  it('Guition-style touch (mirror_x+mirror_y) flipHorizontal=true toggles only mirror_x', () => {
    const boardTransform = { mirror_x: true, mirror_y: true };
    const result = composeTransform(boardTransform, true);
    assert.strictEqual(result.mirror_x, false);
    assert.strictEqual(result.mirror_y, true);
  });

  it('Guition-style touch flipHorizontal=false preserves both', () => {
    const boardTransform = { mirror_x: true, mirror_y: true };
    const result = composeTransform(boardTransform, false);
    assert.strictEqual(result.mirror_x, true);
    assert.strictEqual(result.mirror_y, true);
  });

  // ── rotation and other keys are preserved ─────────────────────────────
  it('rotation is preserved unchanged', () => {
    const boardTransform = { swap_xy: true, rotation: 90 };
    const result = composeTransform(boardTransform, true);
    assert.strictEqual(result.rotation, 90);
    assert.strictEqual(result.mirror_x, true);
  });

  it('unknown keys are preserved', () => {
    const boardTransform = { swap_xy: true, someFutureKey: 'value' };
    const result = composeTransform(boardTransform, true);
    assert.strictEqual(result.someFutureKey, 'value');
    assert.strictEqual(result.mirror_x, true);
  });

  // ── Edge cases ────────────────────────────────────────────────────────
  it('null/undefined boardTransform returns default transform with mirror_x', () => {
    const result = composeTransform(null, false);
    assert.deepStrictEqual(result, { mirror_x: false });
  });

  it('undefined boardTransform with flip=true returns mirror_x:true', () => {
    const result = composeTransform(undefined, true);
    assert.strictEqual(result.mirror_x, true);
  });

  it('empty boardTransform object with flip=true returns only mirror_x:true', () => {
    const result = composeTransform({}, true);
    assert.strictEqual(result.mirror_x, true);
    assert.deepStrictEqual(Object.keys(result), ['mirror_x']);
  });

  it('empty boardTransform object with flip=false returns only mirror_x:false', () => {
    const result = composeTransform({}, false);
    assert.strictEqual(result.mirror_x, false);
    assert.deepStrictEqual(Object.keys(result), ['mirror_x']);
  });
});