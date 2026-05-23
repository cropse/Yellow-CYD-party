// Unit tests for src/modules/config.js board registry
// Run with: node src/modules/tests/test-board-registry.js

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_BOARD_ID,
  BOARD_CONFIGS,
  BOARD_OPTIONS,
  getBoardConfig,
  isSupportedBoard,
  getDefaultBoardConfig
} from '../config.js';

// ── DEFAULT_BOARD_ID ────────────────────────────────────────────────────
describe('DEFAULT_BOARD_ID', () => {
  it('is esp32-2432s028-2port', () => {
    assert.strictEqual(DEFAULT_BOARD_ID, 'esp32-2432s028-2port');
  });
});

// ── BOARD_CONFIGS ───────────────────────────────────────────────────────
describe('BOARD_CONFIGS', () => {
  it('has all 6 boards defined', () => {
    const ids = Object.keys(BOARD_CONFIGS).sort();
    assert.deepStrictEqual(ids, [
      'esp32-2432s028-2port',
      'esp32-3248s035c',
      'esp32-e32r28t',
      'esp32-e32r35t',
      'esp32-e32r40t',
      'guition-jc4827543c'
    ]);
  });

  it('each board has required fields', () => {
    for (const [id, board] of Object.entries(BOARD_CONFIGS)) {
      assert.ok(board.id, `board ${id} missing id`);
      assert.ok(board.label, `board ${id} missing label`);
      assert.strictEqual(board.id, id, `board key ${id} !== board.id ${board.id}`);
      assert.ok(typeof board.width === 'number', `board ${id} width not a number`);
      assert.ok(typeof board.height === 'number', `board ${id} height not a number`);
      assert.ok(board.capabilities, `board ${id} missing capabilities`);
      assert.ok(board.hardware, `board ${id} missing hardware`);
      assert.ok(board.hardware.esp32, `board ${id} missing hardware.esp32`);
      assert.ok(board.hardware.display, `board ${id} missing hardware.display`);
      assert.ok(board.hardware.touch, `board ${id} missing hardware.touch`);
      assert.ok(board.hardware.backlight, `board ${id} missing hardware.backlight`);
    }
  });

  it('default board is esp32-2432s028-2port', () => {
    const def = BOARD_CONFIGS[DEFAULT_BOARD_ID];
    assert.ok(def, 'default board not found in BOARD_CONFIGS');
    assert.strictEqual(def.id, DEFAULT_BOARD_ID);
    assert.strictEqual(def.width, 320);
    assert.strictEqual(def.height, 240);
    assert.strictEqual(def.capabilities.rgbLed, true);
  });

  it('esp32-2432s028-2port has correct display config', () => {
    const b = BOARD_CONFIGS['esp32-2432s028-2port'];
    assert.strictEqual(b.hardware.display.driver, 'ili9xxx');
    assert.strictEqual(b.hardware.display.model, 'TFT 2.4R');
    assert.strictEqual(b.hardware.display.color_palette, '8BIT');
    assert.strictEqual(b.hardware.transform, undefined);
    assert.strictEqual(b.hardware.display.transform.swap_xy, true);
    assert.strictEqual(b.hardware.display.cs_pin.number, 15);
    assert.strictEqual(b.hardware.display.dc_pin.number, 2);
  });

  it('esp32-2432s028-2port has dual SPI touch', () => {
    const b = BOARD_CONFIGS['esp32-2432s028-2port'];
    assert.strictEqual(b.hardware.touch.driver, 'xpt2046');
    assert.strictEqual(b.hardware.touch.cs_pin, 33);
    assert.strictEqual(b.hardware.touch.calibration.x_min, 280);
    assert.strictEqual(b.hardware.touch.transform.swap_xy, true);
    // separate SPI = has its own spi_id
    assert.strictEqual(b.hardware.touch.spi_id, 'touch');
  });

  it('esp32-2432s028-2port has rgbLed', () => {
    const b = BOARD_CONFIGS['esp32-2432s028-2port'];
    assert.strictEqual(b.capabilities.rgbLed, true);
    assert.ok(b.hardware.rgbLed, 'expected rgbLed hardware config');
    assert.strictEqual(b.hardware.rgbLed.inverted, true);
  });

  it('esp32-e32r28t has NO rgbLed', () => {
    const b = BOARD_CONFIGS['esp32-e32r28t'];
    assert.strictEqual(b.capabilities.rgbLed, false);
    assert.strictEqual(b.hardware.rgbLed, undefined);
    assert.strictEqual(b.hardware.display.driver, 'ili9341');
  });

  it('esp32-3248s035c has st7796 display and rgbLed', () => {
    const b = BOARD_CONFIGS['esp32-3248s035c'];
    assert.strictEqual(b.hardware.display.driver, 'st7796');
    assert.strictEqual(b.hardware.display.color_order, 'BGR');
    assert.strictEqual(b.capabilities.rgbLed, true);
    assert.ok(b.hardware.rgbLed);
    assert.strictEqual(b.hardware.rgbLed.redPin, 'GPIO22');
  });

  it('esp32-e32r35t has st7796 display and rgbLed', () => {
    const b = BOARD_CONFIGS['esp32-e32r35t'];
    assert.strictEqual(b.hardware.display.driver, 'st7796');
    assert.strictEqual(b.hardware.display.color_order, 'BGR');
    assert.strictEqual(b.capabilities.rgbLed, true);
    assert.ok(b.hardware.rgbLed);
    assert.strictEqual(b.hardware.backlight.pin, 'GPIO27');
  });

  it('esp32-e32r40t has st7796 display and rgbLed', () => {
    const b = BOARD_CONFIGS['esp32-e32r40t'];
    assert.strictEqual(b.hardware.display.driver, 'st7796');
    assert.strictEqual(b.hardware.display.color_order, 'BGR');
    assert.strictEqual(b.capabilities.rgbLed, true);
    assert.ok(b.hardware.rgbLed);
    assert.strictEqual(b.hardware.backlight.pin, 'GPIO27');
  });

  it('guition-jc4827543c has qspi_dbi display, gt911 touch, NO rgbLed', () => {
    const b = BOARD_CONFIGS['guition-jc4827543c'];
    assert.strictEqual(b.hardware.display.driver, 'qspi_dbi');
    assert.strictEqual(b.hardware.display.model, 'CUSTOM');
    assert.strictEqual(b.hardware.display.data_rate, '20MHz');
    assert.strictEqual(b.hardware.display.rotation, 180);
    assert.ok(Array.isArray(b.hardware.display.init_sequence));
    assert.ok(b.hardware.display.init_sequence.length > 80);
    assert.strictEqual(b.capabilities.rgbLed, false);
    assert.strictEqual(b.hardware.rgbLed, undefined);
    assert.strictEqual(b.hardware.touch.driver, 'gt911');
    assert.strictEqual(b.hardware.touch.i2c.id, 'bus_a');
    assert.strictEqual(b.hardware.touch.i2c.sda, 'GPIO8');
    assert.strictEqual(b.hardware.touch.i2c.interrupt.number, 'GPIO3');
    assert.strictEqual(b.hardware.touch.i2c.interrupt.ignore_strapping_warning, true);
    assert.strictEqual(b.hardware.esp32.board, 'esp32-s3-devkitc-1');
    assert.strictEqual(b.hardware.esp32.variant, 'esp32s3');
    assert.strictEqual(b.hardware.esp32.flash_size, '4MB');
    assert.strictEqual(b.hardware.esp32.framework, 'esp-idf');
    assert.strictEqual(b.hardware.esp32.psram, 'octal 80MHz');
    assert.strictEqual(b.hardware.esp32.platformio_options['board_build.flash_mode'], 'dio');
    assert.strictEqual(b.hardware.display.qspi.cs.number, 'GPIO45');
    assert.strictEqual(b.hardware.display.qspi.cs.ignore_strapping_warning, true);
    assert.strictEqual(b.hardware.display.qspi.spi_id, 'quad_spi');
    assert.strictEqual(b.width, 480);
    assert.strictEqual(b.height, 272);
  });

  it('dimensions are correct per board', () => {
    const dims = {
      'esp32-2432s028-2port': [320, 240],
      'esp32-e32r28t': [320, 240],
      'esp32-3248s035c': [480, 320],
      'esp32-e32r35t': [480, 320],
      'esp32-e32r40t': [480, 320],
      'guition-jc4827543c': [480, 272]
    };
    for (const [id, [w, h]] of Object.entries(dims)) {
      assert.strictEqual(BOARD_CONFIGS[id].width, w, `${id} width mismatch`);
      assert.strictEqual(BOARD_CONFIGS[id].height, h, `${id} height mismatch`);
    }
  });
});

// ── BOARD_OPTIONS ───────────────────────────────────────────────────────
describe('BOARD_OPTIONS', () => {
  it('is an array with 6 entries', () => {
    assert.ok(Array.isArray(BOARD_OPTIONS));
    assert.strictEqual(BOARD_OPTIONS.length, 6);
  });

  it('each entry has id and label', () => {
    for (const opt of BOARD_OPTIONS) {
      assert.ok(typeof opt.id === 'string', `option missing id: ${JSON.stringify(opt)}`);
      assert.ok(typeof opt.label === 'string', `option missing label: ${JSON.stringify(opt)}`);
      assert.ok(BOARD_CONFIGS[opt.id], `option id ${opt.id} not in BOARD_CONFIGS`);
    }
  });

  it('first option is the default board', () => {
    assert.strictEqual(BOARD_OPTIONS[0].id, DEFAULT_BOARD_ID);
  });
});

// ── getBoardConfig ──────────────────────────────────────────────────────
describe('getBoardConfig', () => {
  it('returns config for valid board id', () => {
    const cfg = getBoardConfig('esp32-2432s028-2port');
    assert.ok(cfg);
    assert.strictEqual(cfg.id, 'esp32-2432s028-2port');
    assert.strictEqual(cfg.width, 320);
  });

  it('returns null for unknown board id', () => {
    assert.strictEqual(getBoardConfig('nonexistent'), null);
  });

  it('returns null for undefined/null', () => {
    assert.strictEqual(getBoardConfig(undefined), null);
    assert.strictEqual(getBoardConfig(null), null);
  });
});

// ── isSupportedBoard ────────────────────────────────────────────────────
describe('isSupportedBoard', () => {
  it('returns true for valid board ids', () => {
    for (const id of Object.keys(BOARD_CONFIGS)) {
      assert.strictEqual(isSupportedBoard(id), true, `${id} should be supported`);
    }
  });

  it('returns false for unknown board ids', () => {
    assert.strictEqual(isSupportedBoard('foo'), false);
    assert.strictEqual(isSupportedBoard(''), false);
  });

  it('returns false for undefined/null', () => {
    assert.strictEqual(isSupportedBoard(undefined), false);
    assert.strictEqual(isSupportedBoard(null), false);
  });
});

// ── getDefaultBoardConfig ──────────────────────────────────────────────
describe('getDefaultBoardConfig', () => {
  it('returns config for DEFAULT_BOARD_ID', () => {
    const cfg = getDefaultBoardConfig();
    assert.ok(cfg);
    assert.strictEqual(cfg.id, DEFAULT_BOARD_ID);
    assert.strictEqual(cfg.width, 320);
    assert.strictEqual(cfg.height, 240);
  });

  it('returns a fresh object (not same reference as BOARD_CONFIGS entry)', () => {
    const cfg = getDefaultBoardConfig();
    const direct = BOARD_CONFIGS[DEFAULT_BOARD_ID];
    assert.notStrictEqual(cfg, direct);
    assert.deepStrictEqual(cfg, direct);
  });
});