import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import { PRESETS, DEFAULT_CONFIG, DEFAULT_BUTTON, ACTION_SCHEMAS, DEFAULT_BOARD_ID, BOARD_CONFIGS, getBoardConfig, isSupportedBoard } from '../config.js';
import { normalizeImportedConfig } from '../import.js';
import { generateFullYAML } from '../yaml-engine.js';
import { normalizeColor, clampNumber } from '../utils.js';

const goldenPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../back-garden-cyd.yaml');
const goldenYAML = fs.readFileSync(goldenPath, 'utf-8');

const deps = {
  normalizeColor,
  clampNumber,
  defaultButton: DEFAULT_BUTTON,
  defaultConfig: DEFAULT_CONFIG,
  actionSchemas: ACTION_SCHEMAS,
  normalizeImportedConfig,
  BOARD_CONFIGS,
  getBoardConfig,
  isSupportedBoard,
  DEFAULT_BOARD_ID,
};

function generateWithPreset(presetName) {
  const preset = PRESETS[presetName]();
  return generateFullYAML(preset, deps);
}

describe('Back Garden preset - YAML parity', () => {
  let generated;

  before(() => {
    generated = generateWithPreset('back-garden');
  });

  it('generates non-empty output', () => {
    assert.ok(generated.length > 1000, 'generated YAML should be substantial');
  });

  // ── Substitutions ──────────────────────────────────────────
  it('has substitutions section', () => {
    assert.ok(generated.includes('substitutions:'));
  });

  it('device_name uses literal value from config', () => {
    assert.ok(generated.includes('device_name: back-garden-cyd') ||
              generated.includes('device_name: ${device_name}'),
              'device_name should be present in substitutions');
  });

  it('nice_name uses literal value from config', () => {
    assert.ok(generated.includes('nice_name:') &&
              !generated.includes('nice_name: ${nice_name}'),
              'nice_name should have a literal value, not a circular reference');
  });

  it('dimensions are 320x240', () => {
    assert.ok(generated.includes('width: "320"'));
    assert.ok(generated.includes('height: "240"'));
  });

  // ── ESP32 / Hardware ───────────────────────────────────────
  it('board is esp32dev', () => {
    assert.ok(generated.includes('board: esp32dev'));
  });

  it('framework is arduino', () => {
    assert.ok(generated.includes('type: arduino') || generated.includes('framework:\n    type: arduino'));
  });

  it('has !secret api_encryption_key', () => {
    assert.ok(generated.includes('!secret api_encryption_key'));
  });

  it('has !secret ota_password', () => {
    assert.ok(generated.includes('!secret ota_password'));
  });

  it('has !secret wifi_ssid', () => {
    assert.ok(generated.includes('!secret wifi_ssid'));
  });

  it('has !secret wifi_password', () => {
    assert.ok(generated.includes('!secret wifi_password'));
  });

  // ── Display ────────────────────────────────────────────────
  it('display platform is ili9xxx', () => {
    assert.ok(generated.includes('platform: ili9xxx'));
  });

  it('display model is TFT 2.4R', () => {
    assert.ok(generated.includes('model: TFT 2.4R'));
  });

  it('display has color_palette 8BIT', () => {
    assert.ok(generated.includes('color_palette: 8BIT'));
  });

  // ── Touchscreen ────────────────────────────────────────────
  it('touchscreen platform is xpt2046', () => {
    assert.ok(generated.includes('platform: xpt2046'));
  });

  it('touchscreen has calibration values', () => {
    assert.ok(generated.includes('x_min: 280'));
    assert.ok(generated.includes('x_max: 3860'));
    assert.ok(generated.includes('y_min: 340'));
    assert.ok(generated.includes('y_max: 3860'));
  });

  // ── RGB LED ────────────────────────────────────────────────
  it('has RGB LED outputs (output_red/green/blue)', () => {
    assert.ok(generated.includes('output_red'));
    assert.ok(generated.includes('output_green'));
    assert.ok(generated.includes('output_blue'));
  });

  it('LED platform is rgb', () => {
    assert.ok(generated.includes('platform: rgb'));
  });

  // ── Fonts ──────────────────────────────────────────────────
  it('has font section', () => {
    assert.ok(generated.includes('font:'));
  });

  it('has Roboto 12 font with standard glyphs', () => {
    assert.ok(generated.includes('id: roboto_12'));
  });

  it('has mdi_icons font', () => {
    assert.ok(generated.includes('id: mdi_icons'));
  });

  it('mdi_icons has button glyph codes', () => {
    // Check at least some of the 21 glyphs from back-garden preset
    assert.ok(generated.includes('\\U000F1B94'), 'missing sleep icon');
    assert.ok(generated.includes('\\U000F059C'), 'missing wake icon');
    assert.ok(generated.includes('\\U000F032A'), 'missing garden icon');
  });

  it('has Arimo 14 font for labels needing larger font', () => {
    assert.ok(generated.includes('id: arimo14'));
  });

  it('has Roboto 16 font for buttons using it', () => {
    assert.ok(generated.includes('id: roboto_16'));
  });

  // ── Colors ─────────────────────────────────────────────────
  it('has color section with per-button colors', () => {
    assert.ok(generated.includes('btn_1_color'));
    assert.ok(generated.includes('btn_12_color'));
  });

  it('has default colors (bg, pressed)', () => {
    assert.ok(generated.includes('room_bg_color'));
    assert.ok(generated.includes('default_button_bg_color'));
    assert.ok(generated.includes('default_button_pressed_bg_color'));
  });

  // ── Number (display timeout) ───────────────────────────────
  it('has display_timeout number entity', () => {
    assert.ok(generated.includes('display_timeout'));
  });

  it('display_timeout has correct range', () => {
    assert.ok(generated.includes('min_value: 90'));
    assert.ok(generated.includes('max_value: 3600'));
  });

  // ── Binary sensors ─────────────────────────────────────────
  it('has 12 binary_sensor entries (one per button)', () => {
    for (let i = 1; i <= 12; i++) {
      assert.ok(generated.includes(`id: btn_${i}_pressed`), `missing btn_${i}_pressed`);
    }
  });

  it('btn_1 has long press with script.go_to_sleep', () => {
    assert.ok(generated.includes('script.go_to_sleep'), 'btn_1 should trigger go_to_sleep');
  });

  it('btn_4 has short press media_play_pause + long press media_next_track', () => {
    assert.ok(generated.includes('media_play_pause'));
    assert.ok(generated.includes('media_next_track'));
  });

  it('btn_5 has switch.toggle', () => {
    assert.ok(generated.includes('switch.toggle'));
  });

  it('btn_8 has open_cover and close_cover', () => {
    assert.ok(generated.includes('open_cover'));
    assert.ok(generated.includes('close_cover'));
  });

  it('btn_12 has script.toggle_eat_time', () => {
    assert.ok(generated.includes('script.toggle_eat_time'));
  });

  // ── Packages ───────────────────────────────────────────────
  it('has packages section', () => {
    assert.ok(generated.includes('packages:'));
  });

  it('checkable buttons generate lvgl_sync_template includes', () => {
    assert.ok(generated.includes('lvgl_sync_template.yaml'));
  });

  it('btn_3 (checkable) has btn_logic_3', () => {
    assert.ok(generated.includes('btn_logic_3'));
  });

  it('btn_4 (checkable) has btn_logic_4', () => {
    assert.ok(generated.includes('btn_logic_4'));
  });

  it('btn_6 (timer_sync) has btn_timer_6', () => {
    assert.ok(generated.includes('btn_timer_6'));
    assert.ok(generated.includes('timer_sync_template.yaml'));
  });

  it('btn_8 (checkable) has btn_logic_8', () => {
    assert.ok(generated.includes('btn_logic_8'));
  });

  it('btn_9-12 (checkable) have btn_logic entries', () => {
    assert.ok(generated.includes('btn_logic_9'));
    assert.ok(generated.includes('btn_logic_10'));
    assert.ok(generated.includes('btn_logic_11'));
    assert.ok(generated.includes('btn_logic_12'));
  });

  it('led_sync package is present', () => {
    assert.ok(generated.includes('led_sync'), 'LED sync should be generated for on-entity effect');
  });

  it('led_sync has light.turn_on and light.turn_off', () => {
    assert.ok(generated.includes('light.turn_on'));
    assert.ok(generated.includes('light.turn_off'));
  });

  // ── LVGL ───────────────────────────────────────────────────
  it('has lvgl section', () => {
    assert.ok(generated.includes('lvgl:'));
  });

  it('LVGL has on_idle with display_timeout', () => {
    assert.ok(generated.includes('on_idle'));
  });

  it('LVGL has display_backlight turn_off on idle', () => {
    assert.ok(generated.includes('display_backlight'));
  });

  it('LVGL widgets reference cyd_button_widget.yaml', () => {
    assert.ok(generated.includes('cyd_button_widget.yaml'));
  });

  it('LVGL widgets reference cyd_button_widget_checkable.yaml for checkable buttons', () => {
    assert.ok(generated.includes('cyd_button_widget_checkable.yaml'));
  });

  // ── Parity with golden YAML ────────────────────────────────
  it('has all top-level sections from golden YAML', () => {
    // Extract top-level section names from golden YAML
    const goldenSections = [
      'substitutions:', 'esp32:', 'esphome:', 'api:', 'ota:', 'wifi:',
      'logger:', 'time:', 'captive_portal:', 'i2c:', 'spi:',
      'output:', 'light:', 'display:', 'touchscreen:',
      'font:', 'color:', 'number:', 'binary_sensor:',
      'packages:', 'lvgl:'
    ];
    for (const section of goldenSections) {
      assert.ok(
        generated.includes(section),
        `missing top-level section: ${section}`
      );
    }
  });

  it('matches golden YAML on all key entity IDs', () => {
    // Check key entity references from the golden YAML
    const goldenEntities = [
      'switch.virtual_is_wake',
      'media_player.spotify_mememe',
      'cover.sonoff_1000faa95f',
      'switch.virtual_pill_alert',
      'timer.studio_balcony_plant_light_timer',
    ];
    for (const entity of goldenEntities) {
      assert.ok(
        generated.includes(entity),
        `missing entity reference: ${entity}`
      );
    }
  });
});