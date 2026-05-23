// TDD tests for board-specific YAML generation
// These tests will FAIL until Task 5 implements board-aware YAML generation
// Run with: node src/modules/tests/test-yaml-board-generation.js

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateFullYAML } from '../yaml-engine.js';
import { DEFAULT_BOARD_ID, BOARD_CONFIGS, DEFAULT_CONFIG, DEFAULT_BUTTON, DEFAULT_LED, HARDWARE_CONFIG, getBoardConfig, ACTION_SCHEMAS } from '../config.js';
import { normalizeImportedConfig } from '../import.js';

// ── Shared deps (mirrors test-yaml.js pattern) ───────────────────────────

const baseDeps = {
  normalizeColor: (c) => {
    if (!c) return null;
    const s = String(c).replace(/^#/,'').replace(/^0x/i,'').toUpperCase();
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
};

// Build deps for generateFullYAML — includes hardwareConfig and normalizeImportedConfig
function buildDeps(depsOverrides = {}) {
  return {
    ...baseDeps,
    hardwareConfig: HARDWARE_CONFIG,
    BOARD_CONFIGS,
    getBoardConfig,
    normalizeImportedConfig,
    ...depsOverrides,
  };
}

// Helper: create a minimal config for a given board
function generateForBoard(boardId, configOverrides = {}) {
  const config = {
    ...structuredClone(DEFAULT_CONFIG),
    board: boardId,
    deviceName: `test-${boardId}`,
    niceName: `Test ${boardId}`,
    apPassword: 'testpass123',
    buttons: [],
    ...configOverrides,
  };
  const deps = buildDeps();
  const yaml = generateFullYAML(config, deps);
  return yaml;
}

// Helper: count occurrences of a substring
function countOccurrences(str, substr) {
  return (str.match(new RegExp(substr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

// ── 0. All boards produce syntactically valid YAML ────────────────────────

describe('All boards produce valid YAML', () => {
  for (const boardId of Object.keys(BOARD_CONFIGS)) {
    it(`Board: ${boardId} generates valid YAML`, () => {
      const yaml = generateForBoard(boardId);
      assert(!yaml.includes('[object Object]'), `Generated YAML contains [object Object] for board ${boardId}`);
      assert(yaml.includes('esp32:'), `Missing esp32 section for board ${boardId}`);
      assert(yaml.includes('display:'), `Missing display section for board ${boardId}`);
      assert(yaml.includes('touchscreen:'), `Missing touchscreen section for board ${boardId}`);
    });
  }
});

// ── 1. Default board (esp32-2432s028-2port) ─────────────────────────────

describe('Board: esp32-2432s028-2port (320×240, RGB LED)', () => {
  const yaml = generateForBoard('esp32-2432s028-2port');

  it('substitutions contain width: "320"', () => {
    const subSection = yaml.split('substitutions:')[1].split(/\n\S/)[0];
    assert.ok(yaml.includes('width: "320"'), `Expected width: "320" but got:\n${yaml.substring(0, 300)}`);
  });

  it('substitutions contain height: "240"', () => {
    assert.ok(yaml.includes('height: "240"'), `Expected height: "240"`);
  });

  it('contains board: esp32dev', () => {
    assert.ok(yaml.includes('board: esp32dev'), `Expected board: esp32dev`);
  });

  it('contains type: arduino', () => {
    assert.ok(yaml.includes('type: arduino'), `Expected type: arduino`);
  });

  it('contains output_red / output_green / output_blue (RGB LED)', () => {
    assert.ok(yaml.includes('output_red'), 'Missing output_red');
    assert.ok(yaml.includes('output_green'), 'Missing output_green');
    assert.ok(yaml.includes('output_blue'), 'Missing output_blue');
  });

  it('contains platform: rgb for LED', () => {
    assert.ok(yaml.includes('platform: rgb'), 'Missing platform: rgb');
  });

  it('contains platform: xpt2046 for touch', () => {
    assert.ok(yaml.includes('platform: xpt2046'), 'Missing platform: xpt2046');
  });

  it('contains platform: ili9xxx', () => {
    assert.ok(yaml.includes('platform: ili9xxx'), 'Missing platform: ili9xxx');
  });
});

// ── 2. esp32-e32r28t (no RGB) ───────────────────────────────────────────

describe('Board: esp32-e32r28t (320×240, NO RGB LED)', () => {
  const yaml = generateForBoard('esp32-e32r28t');

  it('substitutions contain width: "320"', () => {
    assert.ok(yaml.includes('width: "320"'));
  });

  it('substitutions contain height: "240"', () => {
    assert.ok(yaml.includes('height: "240"'));
  });

  it('does NOT contain output_red', () => {
    assert.ok(!yaml.includes('output_red'), 'Should not have RGB red output');
  });

  it('does NOT contain output_green', () => {
    assert.ok(!yaml.includes('output_green'), 'Should not have RGB green output');
  });

  it('does NOT contain output_blue', () => {
    assert.ok(!yaml.includes('output_blue'), 'Should not have RGB blue output');
  });

  it('does NOT contain platform: rgb', () => {
    assert.ok(!yaml.includes('platform: rgb'), 'Should not have RGB light section');
  });

  it('contains platform: xpt2046 for touch', () => {
    assert.ok(yaml.includes('platform: xpt2046'));
  });
});

// ── 3. esp32-3248s035c (480×320, shared SPI, RGB) ──────────────────────

describe('Board: esp32-3248s035c (480×320, shared SPI, RGB)', () => {
  const yaml = generateForBoard('esp32-3248s035c');

  it('substitutions contain width: "480"', () => {
    assert.ok(yaml.includes('width: "480"'), `Expected width: "480"`);
  });

  it('substitutions contain height: "320"', () => {
    assert.ok(yaml.includes('height: "320"'), `Expected height: "320"`);
  });

  it('contains st7796 or color_order BGR marker (display driver)', () => {
    const hasSt7796 = yaml.includes('st7796');
    const hasBGR = yaml.includes('BGR');
    assert.ok(hasSt7796 || hasBGR, `Expected st7796 or BGR marker for this board`);
  });

  it('contains RGB LED (output_red)', () => {
    assert.ok(yaml.includes('output_red'), 'Missing RGB LED section');
  });

  it('contains board: esp32dev', () => {
    assert.ok(yaml.includes('board: esp32dev'));
  });
});

// ── 4. esp32-e32r35t (480×320, RGB) ────────────────────────────────────

describe('Board: esp32-e32r35t (480×320, RGB)', () => {
  const yaml = generateForBoard('esp32-e32r35t');

  it('substitutions contain width: "480"', () => {
    assert.ok(yaml.includes('width: "480"'));
  });

  it('substitutions contain height: "320"', () => {
    assert.ok(yaml.includes('height: "320"'));
  });

  it('contains RGB LED (output_red)', () => {
    assert.ok(yaml.includes('output_red'), 'Missing RGB LED section');
  });

  it('contains board: esp32dev', () => {
    assert.ok(yaml.includes('board: esp32dev'));
  });
});

// ── 5. esp32-e32r40t (480×320, RGB) ────────────────────────────────────

describe('Board: esp32-e32r40t (480×320, RGB)', () => {
  const yaml = generateForBoard('esp32-e32r40t');

  it('substitutions contain width: "480"', () => {
    assert.ok(yaml.includes('width: "480"'));
  });

  it('substitutions contain height: "320"', () => {
    assert.ok(yaml.includes('height: "320"'));
  });

  it('contains RGB LED (output_red)', () => {
    assert.ok(yaml.includes('output_red'), 'Missing RGB LED section');
  });
});

// ── 6. guition-jc4827543c (480×272, ESP32-S3, ESP-IDF) ──────────────────

describe('Board: guition-jc4827543c (480×272, ESP32-S3, ESP-IDF, NO RGB)', () => {
  const yaml = generateForBoard('guition-jc4827543c');

  it('substitutions contain width: "480"', () => {
    assert.ok(yaml.includes('width: "480"'), `Expected width: "480"`);
  });

  it('substitutions contain height: "272"', () => {
    assert.ok(yaml.includes('height: "272"'), `Expected height: "272"`);
  });

  it('contains esp32-s3-devkitc-1 board', () => {
    assert.ok(yaml.includes('esp32-s3-devkitc-1') || yaml.includes('esp32s3'), 'Expected ESP32-S3 board reference');
  });

  it('contains variant: esp32s3', () => {
    assert.ok(yaml.includes('variant: esp32s3'), 'Expected variant: esp32s3');
  });

  it('contains flash_size: 4MB', () => {
    assert.ok(yaml.includes('flash_size: 4MB'), 'Expected flash_size: 4MB');
  });

  it('contains framework with esp-idf', () => {
    assert.ok(yaml.includes('esp-idf'), 'Expected esp-idf framework');
  });

  it('contains psram', () => {
    assert.ok(yaml.includes('psram'), 'Expected psram section');
  });

  it('contains platformio_options with flash_mode: dio', () => {
    assert.ok(yaml.includes('platformio_options'), 'Expected platformio_options');
    assert.ok(yaml.includes('board_build.flash_mode: dio'), 'Expected flash_mode: dio');
  });

  it('contains qspi_dbi display platform', () => {
    assert.ok(yaml.includes('platform: qspi_dbi'), 'Expected qspi_dbi display platform');
  });

  it('contains CUSTOM model for display', () => {
    assert.ok(yaml.includes('model: CUSTOM'), 'Expected model: CUSTOM');
  });

  it('contains spi section with quad type', () => {
    assert.ok(yaml.includes('type: quad'), 'Expected quad spi type');
    assert.ok(yaml.includes('id: quad_spi'), 'Expected quad_spi id');
  });

  it('contains cs_pin with ignore_strapping_warning', () => {
    assert.ok(yaml.includes('ignore_strapping_warning: true'), 'Expected strapping warning on CS or interrupt');
  });

  it('contains data_rate: 20MHz', () => {
    assert.ok(yaml.includes('data_rate: 20MHz'), 'Expected data_rate: 20MHz');
  });

  it('contains rotation: 0', () => {
    assert.ok(yaml.includes('rotation: 0'), 'Expected rotation: 0');
  });

  it('contains init_sequence', () => {
    assert.ok(yaml.includes('init_sequence:'), 'Expected init_sequence');
    assert.ok(yaml.includes('0xff, 0xa5'), 'Expected first init command');
  });

  it('contains GT911 or gt911 touch driver', () => {
    assert.ok(yaml.includes('gt911') || yaml.includes('GT911'), 'Expected gt911 touch driver');
  });

  it('contains i2c_id in touchscreen', () => {
    assert.ok(yaml.includes('i2c_id: bus_a'), 'Expected i2c_id: bus_a');
  });

  it('does NOT contain output_red (no RGB LED)', () => {
    assert.ok(!yaml.includes('output_red'), 'Should not have RGB LED output');
  });

  it('does NOT contain platform: rgb (no RGB LED)', () => {
    assert.ok(!yaml.includes('platform: rgb'), 'Should not have rgb light');
  });

  it('contains backlight on GPIO1 with frequency', () => {
    assert.ok(
      yaml.includes('pin: 1') || yaml.includes('pin: GPIO1'),
      'Expected backlight on GPIO1'
    );
    assert.ok(yaml.includes('frequency: 1000Hz'), 'Expected backlight frequency');
  });

  it('contains on_boot with component.update for display', () => {
    assert.ok(yaml.includes('on_boot:'), 'Expected on_boot section');
    assert.ok(yaml.includes('component.update: main_display'), 'Expected display update on boot');
  });

  it('does NOT route by feature-sniffing (no false positive for qspi on CYD boards)', () => {
    const cydYaml = generateForBoard('esp32-2432s028-2port');
    assert.ok(!cydYaml.includes('platform: qspi_dbi'), 'CYD boards must not emit qspi_dbi');
    assert.ok(cydYaml.includes('platform: ili9xxx'), 'CYD boards should use ili9xxx');
  });

  it('does NOT emit led_sync packages even when led.enabled = true (no RGB hardware)', () => {
    const yamlWithLed = generateForBoard('guition-jc4827543c', {
      led: { ...structuredClone(DEFAULT_LED), enabled: true, entity: 'switch.test', onState: 'on' }
    });
    assert.ok(!yamlWithLed.includes('led_sync:'), 'No-RGB board must not emit led_sync package');
    assert.ok(!yamlWithLed.includes('ts_led_global'), 'No-RGB board must not reference LED text sensor');
  });
});

// ── 7. No-RGB edge case: esp32-e32r28t with led.enabled = true ──────────

describe('No-RGB board with led.enabled = true (esp32-e32r28t)', () => {
  const yaml = generateForBoard('esp32-e32r28t', {
    led: { ...structuredClone(DEFAULT_LED), enabled: true, entity: 'switch.test', onState: 'on' }
  });

  it('does NOT contain platform: rgb', () => {
    assert.ok(!yaml.includes('platform: rgb'), 'No-RGB board must not have rgb light');
  });

  it('does NOT contain output_red', () => {
    assert.ok(!yaml.includes('output_red'), 'No-RGB board must not have RGB outputs');
  });

  it('does NOT contain output_green', () => {
    assert.ok(!yaml.includes('output_green'));
  });

  it('does NOT contain output_blue', () => {
    assert.ok(!yaml.includes('output_blue'));
  });

  it('still contains board: esp32dev and touch config', () => {
    assert.ok(yaml.includes('board: esp32dev'));
    assert.ok(yaml.includes('platform: xpt2046'));
  });
});

// ── 8. RGB state preserved: default board with led.enabled = true ───────

describe('Default board (esp32-2432s028-2port) with led.enabled = true', () => {
  const yaml = generateForBoard('esp32-2432s028-2port', {
    led: { ...structuredClone(DEFAULT_LED), enabled: true, entity: 'switch.test', onState: 'on' }
  });

  it('contains RGB LED output sections', () => {
    assert.ok(yaml.includes('output_red'), 'Should have output_red');
    assert.ok(yaml.includes('output_green'), 'Should have output_green');
    assert.ok(yaml.includes('output_blue'), 'Should have output_blue');
  });

  it('contains platform: rgb light section', () => {
    assert.ok(yaml.includes('platform: rgb'), 'Should have rgb light');
  });
});