import { GUITION_NV3041A_INIT_SEQUENCE, HardwareType } from './board-configs.js';

export const DEFAULT_BOARD_ID = 'esp32-2432s028-2port';

export const BOARD_CONFIGS = {
  'esp32-2432s028-2port': {
    id: 'esp32-2432s028-2port',
    label: 'ESP32-2432S028-2port (320×240)',
    width: 320,
    height: 240,
    hardwareType: HardwareType.CYD_SPI_XPT2046,
    capabilities: { rgbLed: true },
    hardware: {
      esp32: { board: 'esp32dev', framework: 'arduino' },
      display: {
        driver: 'ili9xxx',
        model: 'TFT 2.4R',
        spi_id: 'tft',
        cs_pin: { number: 15, ignore_strapping_warning: true },
        dc_pin: { number: 2, ignore_strapping_warning: true },
        invert_colors: false,
        color_palette: '8BIT',
        transform: { swap_xy: true }
      },
      touch: {
        driver: 'xpt2046',
        spi_id: 'touch',
        cs_pin: 33,
        interrupt_pin: 36,
        threshold: 400,
        calibration: { x_min: 280, x_max: 3860, y_min: 340, y_max: 3860 },
        transform: { swap_xy: true }
      },
      backlight: { pin: 'GPIO21', frequency: '1000Hz' },
      rgbLed: { redPin: 'GPIO4', greenPin: 'GPIO17', bluePin: 'GPIO16', inverted: true }
    }
  },
  'esp32-e32r28t': {
    id: 'esp32-e32r28t',
    label: 'ESP32-E32R28T (320×240)',
    width: 320,
    height: 240,
    hardwareType: HardwareType.CYD_SPI_XPT2046,
    capabilities: { rgbLed: false },
    hardware: {
      esp32: { board: 'esp32dev', framework: 'arduino' },
      display: {
        driver: 'ili9341',
        spi_id: 'tft',
        cs_pin: { number: 15, ignore_strapping_warning: true },
        dc_pin: { number: 2, ignore_strapping_warning: true },
        invert_colors: false,
        color_palette: '8BIT',
        transform: { swap_xy: true }
      },
      touch: {
        driver: 'xpt2046',
        spi_id: 'touch',
        cs_pin: 33,
        interrupt_pin: 36,
        threshold: 400,
        calibration: { x_min: 280, x_max: 3860, y_min: 340, y_max: 3860 },
        transform: { swap_xy: true }
      },
      backlight: { pin: 'GPIO21', frequency: '1000Hz' }
    }
  },
  'esp32-3248s035c': {
    id: 'esp32-3248s035c',
    label: 'ESP32-3248S035C (480×320)',
    width: 480,
    height: 320,
    hardwareType: HardwareType.CYD_SPI_XPT2046,
    capabilities: { rgbLed: true },
    hardware: {
      esp32: { board: 'esp32dev', framework: 'arduino' },
      display: {
        driver: 'st7796',
        color_order: 'BGR',
        spi_id: 'tft',
        cs_pin: { number: 15, ignore_strapping_warning: true },
        dc_pin: { number: 2, ignore_strapping_warning: true },
        invert_colors: false,
        color_palette: '8BIT',
        transform: { swap_xy: true }
      },
      touch: {
        driver: 'xpt2046',
        spi_id: 'tft',
        cs_pin: { number: 15, ignore_strapping_warning: true },
        interrupt_pin: 36,
        threshold: 400,
        calibration: { x_min: 200, x_max: 3900, y_min: 200, y_max: 3900 },
        transform: { swap_xy: true, mirror_x: true }
      },
      backlight: { pin: 'GPIO27', frequency: '1000Hz' },
      rgbLed: { redPin: 'GPIO22', greenPin: 'GPIO16', bluePin: 'GPIO17', inverted: true }
    }
  },
  'esp32-e32r35t': {
    id: 'esp32-e32r35t',
    label: 'ESP32-E32R35T (480×320)',
    width: 480,
    height: 320,
    hardwareType: HardwareType.CYD_SPI_XPT2046,
    capabilities: { rgbLed: true },
    hardware: {
      esp32: { board: 'esp32dev', framework: 'arduino' },
      display: {
        driver: 'st7796',
        color_order: 'BGR',
        spi_id: 'tft',
        cs_pin: { number: 15, ignore_strapping_warning: true },
        dc_pin: { number: 2, ignore_strapping_warning: true },
        invert_colors: false,
        color_palette: '8BIT',
        transform: { swap_xy: true }
      },
      touch: {
        driver: 'xpt2046',
        spi_id: 'tft',
        cs_pin: { number: 15, ignore_strapping_warning: true },
        interrupt_pin: 36,
        threshold: 400,
        calibration: { x_min: 200, x_max: 3900, y_min: 200, y_max: 3900 },
        transform: { swap_xy: true, mirror_x: true }
      },
      backlight: { pin: 'GPIO27', frequency: '1000Hz' },
      rgbLed: { redPin: 'GPIO22', greenPin: 'GPIO16', bluePin: 'GPIO17', inverted: true }
    }
  },
  'esp32-e32r40t': {
    id: 'esp32-e32r40t',
    label: 'ESP32-E32R40T (480×320)',
    width: 480,
    height: 320,
    hardwareType: HardwareType.CYD_SPI_XPT2046,
    capabilities: { rgbLed: true },
    hardware: {
      esp32: { board: 'esp32dev', framework: 'arduino' },
      display: {
        driver: 'st7796',
        color_order: 'BGR',
        spi_id: 'tft',
        cs_pin: { number: 15, ignore_strapping_warning: true },
        dc_pin: { number: 2, ignore_strapping_warning: true },
        invert_colors: false,
        color_palette: '8BIT',
        transform: { swap_xy: true }
      },
      touch: {
        driver: 'xpt2046',
        spi_id: 'tft',
        cs_pin: { number: 15, ignore_strapping_warning: true },
        interrupt_pin: 36,
        threshold: 400,
        calibration: { x_min: 200, x_max: 3900, y_min: 200, y_max: 3900 },
        transform: { swap_xy: true, mirror_x: true }
      },
      backlight: { pin: 'GPIO27', frequency: '1000Hz' },
      rgbLed: { redPin: 'GPIO22', greenPin: 'GPIO16', bluePin: 'GPIO17', inverted: true }
    }
  },
  'guition-jc4827543c': {
    id: 'guition-jc4827543c',
    label: 'Guition JC4827543C (480×272)',
    width: 480,
    height: 272,
    hardwareType: HardwareType.GUITION_QSPI_GT911,
    capabilities: { rgbLed: false },
    hardware: {
      esp32: {
        board: 'esp32-s3-devkitc-1',
        variant: 'esp32s3',
        flash_size: '4MB',
        framework: 'esp-idf',
        psram: 'octal 80MHz',
        platformio_options: { 'board_build.flash_mode': 'dio' }
      },
      display: {
        driver: 'qspi_dbi',
        model: 'CUSTOM',
        qspi: {
          clk: 'GPIO47',
          d0: 'GPIO21',
          d1: 'GPIO48',
          d2: 'GPIO40',
          d3: 'GPIO39',
          cs: { number: 'GPIO45', ignore_strapping_warning: true },
          spi_id: 'quad_spi'
        },
        data_rate: '20MHz',
        invert_colors: true,
        rotation: 0,
        init_sequence: GUITION_NV3041A_INIT_SEQUENCE
      },
      touch: {
        driver: 'gt911',
        i2c: {
          id: 'bus_a',
          sda: 'GPIO8',
          scl: 'GPIO4',
          interrupt: { number: 'GPIO3', ignore_strapping_warning: true },
          reset: 'GPIO38'
        },
        transform: { mirror_x: true, mirror_y: true }
      },
      backlight: { pin: 'GPIO1', frequency: '1000Hz' }
    }
  }
};

export const BOARD_OPTIONS = Object.values(BOARD_CONFIGS).map(b => ({ id: b.id, label: b.label }));

export function getBoardConfig(boardId) {
  if (!boardId) return null;
  return BOARD_CONFIGS[boardId] || null;
}

export function isSupportedBoard(boardId) {
  if (!boardId) return false;
  return boardId in BOARD_CONFIGS;
}

export function getDefaultBoardConfig() {
  return { ...BOARD_CONFIGS[DEFAULT_BOARD_ID] };
}

export const DEFAULT_LED = {
  enabled: false,
  effect: 'on-entity',
  entity: '',
  onState: '',
  color: { r: 0, g: 255, b: 0 },
  brightness: 100
};

export const DEFAULT_BUTTON = {
  id: 'btn_1',
  name: 'Button 1',
  type: 'stateless',
  col: 0,
  row: 0,
  label: 'Button',
  font: 'roboto_12',
  color: 'FFFFFF',
  icon: '\\U000F0594',
  haEntity: null,
  onState: 'on',
  timerDefaultLabel: '',
  iconOn: null,
  iconOff: null,
  shortPress: {
    enabled: false,
    actionType: '',
    action: '',
    data: {}
  },
  longPress: {
    enabled: false,
    minLength: '1000ms',
    maxLength: '5000ms',
    actionType: '',
    action: '',
    data: {}
  }
};

export const DEFAULT_CONFIG = {
  deviceName: 'my-cyd',
  niceName: 'My CYD',
  board: DEFAULT_BOARD_ID,
  displayTimeout: 600,
  apPassword: null, // Generated randomly on first YAML generation
  led: structuredClone(DEFAULT_LED),
  buttons: Array(12).fill(null).map((_, i) => ({
    ...structuredClone(DEFAULT_BUTTON),
    id: `btn_${i + 1}`,
    name: `Button ${i + 1}`,
    label: `Btn ${i + 1}`,
    col: i % 4,
    row: Math.floor(i / 4)
  }))
};

export const ACTION_SCHEMAS = {
  // Script is special - it uses the script ID as the action name directly
  script: {
    fields: [
      { name: 'action', label: 'Script ID', type: 'text', placeholder: 'e.g. script.good_night' }
    ],
    ha_action: (data) => data.action,
    ha_data: () => ({})
  },
  // Custom action - free-form HA action for anything not covered
  custom: {
    fields: [
      { name: 'targetType', label: 'Target Type', type: 'select', options: ['entity_id', 'device_id', 'none'] },
      { name: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'e.g. light.living_room', conditional: (d) => d.targetType === 'entity_id' },
      { name: 'deviceId', label: 'Device ID', type: 'text', placeholder: 'e.g. 31e23566034de0e54e242c1dc7c49534', conditional: (d) => d.targetType === 'device_id' },
      { name: 'action', label: 'Action', type: 'text', placeholder: 'e.g. light.turn_on' },
      { name: 'dataJson', label: 'Extra Data (JSON)', type: 'text', placeholder: 'e.g. {"brightness": 255}' }
    ],
    normalize: (data) => data.deviceId && !data.targetType ? { ...data, targetType: 'device_id' } : { targetType: data.targetType || 'entity_id', ...data },
    ha_action: (data) => data.action || 'homeassistant.toggle',
    ha_data: (data) => {
      const result = {};
      if (data.targetType === 'entity_id' && data.entityId) result.entity_id = data.entityId;
      if (data.targetType === 'device_id' && data.deviceId) result.device_id = data.deviceId;
      if (data.dataJson) {
        try {
          const parsed = JSON.parse(data.dataJson);
          Object.assign(result, parsed);
        } catch (e) { /* ignore invalid JSON */ }
      }
      return result;
    }
  },
  switch: {
    normalize: (data) => data.deviceId && !data.targetType ? { ...data, targetType: 'device_id' } : { targetType: 'entity_id', ...data },
    fields: [
      { name: 'targetType', label: 'Target Type', type: 'select', options: ['entity_id', 'device_id'] },
      { name: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'e.g. switch.garden_light', conditional: (d) => (d.targetType || 'entity_id') === 'entity_id' },
      { name: 'deviceId', label: 'Device ID', type: 'text', placeholder: 'e.g. 1fa4679165a72e406c63bec6b74b7c63', conditional: (d) => d.targetType === 'device_id' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['toggle', 'turn_on', 'turn_off'] }
    ],
    ha_action: (data) => `switch.${data.operation || 'toggle'}`,
    ha_data: (data) => data.targetType === 'device_id' ? { device_id: data.deviceId || '' } : { entity_id: data.entityId || '' }
  },
  light: {
    normalize: (data) => data.deviceId && !data.targetType ? { ...data, targetType: 'device_id' } : { targetType: 'entity_id', ...data },
    fields: [
      { name: 'targetType', label: 'Target Type', type: 'select', options: ['entity_id', 'device_id'] },
      { name: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'e.g. light.living_room', conditional: (d) => (d.targetType || 'entity_id') === 'entity_id' },
      { name: 'deviceId', label: 'Device ID', type: 'text', placeholder: 'e.g. 1fa4679165a72e406c63bec6b74b7c63', conditional: (d) => d.targetType === 'device_id' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['turn_on', 'turn_off', 'toggle'] },
      { name: 'brightness', label: 'Brightness (%)', type: 'number', min: 0, max: 100, conditional: (d) => d.operation === 'turn_on' }
    ],
    ha_action: (data) => `light.${data.operation || 'turn_on'}`,
    ha_data: (data) => {
      const d = data.targetType === 'device_id' ? { device_id: data.deviceId || '' } : { entity_id: data.entityId || '' };
      if (data.operation === 'turn_on' && data.brightness !== undefined && data.brightness !== '') {
        d.brightness_pct = String(data.brightness);
      }
      return d;
    }
  },
  cover: {
    normalize: (data) => data.deviceId && !data.targetType ? { ...data, targetType: 'device_id' } : { targetType: 'entity_id', ...data },
    fields: [
      { name: 'targetType', label: 'Target Type', type: 'select', options: ['entity_id', 'device_id'] },
      { name: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'e.g. cover.main_curtain', conditional: (d) => (d.targetType || 'entity_id') === 'entity_id' },
      { name: 'deviceId', label: 'Device ID', type: 'text', placeholder: 'e.g. 1fa4679165a72e406c63bec6b74b7c63', conditional: (d) => d.targetType === 'device_id' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['open_cover', 'close_cover', 'stop_cover', 'set_cover_position'] },
      { name: 'position', label: 'Position (%)', type: 'number', min: 0, max: 100, conditional: (d) => d.operation === 'set_cover_position' }
    ],
    ha_action: (data) => `cover.${data.operation || 'open_cover'}`,
    ha_data: (data) => {
      const d = data.targetType === 'device_id' ? { device_id: data.deviceId || '' } : { entity_id: data.entityId || '' };
      if (data.operation === 'set_cover_position' && data.position !== undefined) {
        d.position = String(data.position);
      }
      return d;
    }
  },
  media_player: {
    normalize: (data) => data.deviceId && !data.targetType ? { ...data, targetType: 'device_id' } : { targetType: 'entity_id', ...data },
    fields: [
      { name: 'targetType', label: 'Target Type', type: 'select', options: ['entity_id', 'device_id'] },
      { name: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'e.g. media_player.spotify', conditional: (d) => (d.targetType || 'entity_id') === 'entity_id' },
      { name: 'deviceId', label: 'Device ID', type: 'text', placeholder: 'e.g. 31e23566034de0e54e242c1dc7c49534', conditional: (d) => d.targetType === 'device_id' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['media_play_pause', 'media_play', 'media_pause', 'media_stop', 'media_next_track', 'media_previous_track', 'volume_mute'] }
    ],
    ha_action: (data) => `media_player.${data.operation || 'media_play_pause'}`,
    ha_data: (data) => data.targetType === 'device_id' ? { device_id: data.deviceId || '' } : { entity_id: data.entityId || '' }
  },
  climate: {
    normalize: (data) => data.deviceId && !data.targetType ? { ...data, targetType: 'device_id' } : { targetType: 'entity_id', ...data },
    fields: [
      { name: 'targetType', label: 'Target Type', type: 'select', options: ['entity_id', 'device_id'] },
      { name: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'e.g. climate.living_room', conditional: (d) => (d.targetType || 'entity_id') === 'entity_id' },
      { name: 'deviceId', label: 'Device ID', type: 'text', placeholder: 'e.g. 1fa4679165a72e406c63bec6b74b7c63', conditional: (d) => d.targetType === 'device_id' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['set_hvac_mode', 'set_temperature', 'turn_on', 'turn_off'] },
      { name: 'hvacMode', label: 'HVAC Mode', type: 'select', options: ['off', 'heat', 'cool', 'auto', 'dry', 'fan_only'], conditional: (d) => d.operation === 'set_hvac_mode' },
      { name: 'temperature', label: 'Temperature', type: 'number', min: 0, max: 40, conditional: (d) => d.operation === 'set_temperature' }
    ],
    ha_action: (data) => `climate.${data.operation || 'set_hvac_mode'}`,
    ha_data: (data) => {
      const d = data.targetType === 'device_id' ? { device_id: data.deviceId || '' } : { entity_id: data.entityId || '' };
      if (data.operation === 'set_hvac_mode' && data.hvacMode) d.hvac_mode = data.hvacMode;
      if (data.operation === 'set_temperature' && data.temperature !== undefined && data.temperature !== '') d.temperature = String(data.temperature);
      return d;
    }
  },
  fan: {
    normalize: (data) => data.deviceId && !data.targetType ? { ...data, targetType: 'device_id' } : { targetType: 'entity_id', ...data },
    fields: [
      { name: 'targetType', label: 'Target Type', type: 'select', options: ['entity_id', 'device_id'] },
      { name: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'e.g. fan.bedroom', conditional: (d) => (d.targetType || 'entity_id') === 'entity_id' },
      { name: 'deviceId', label: 'Device ID', type: 'text', placeholder: 'e.g. 1fa4679165a72e406c63bec6b74b7c63', conditional: (d) => d.targetType === 'device_id' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['turn_on', 'turn_off', 'toggle', 'set_percentage'] },
      { name: 'percentage', label: 'Speed (%)', type: 'number', min: 0, max: 100, conditional: (d) => d.operation === 'set_percentage' }
    ],
    ha_action: (data) => `fan.${data.operation || 'turn_on'}`,
    ha_data: (data) => {
      const d = data.targetType === 'device_id' ? { device_id: data.deviceId || '' } : { entity_id: data.entityId || '' };
      if (data.operation === 'set_percentage' && data.percentage !== undefined && data.percentage !== '') d.percentage = String(data.percentage);
      return d;
    }
  },
  vacuum: {
    normalize: (data) => data.deviceId && !data.targetType ? { ...data, targetType: 'device_id' } : { targetType: 'entity_id', ...data },
    fields: [
      { name: 'targetType', label: 'Target Type', type: 'select', options: ['entity_id', 'device_id'] },
      { name: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'e.g. vacuum.roborock', conditional: (d) => (d.targetType || 'entity_id') === 'entity_id' },
      { name: 'deviceId', label: 'Device ID', type: 'text', placeholder: 'e.g. 1fa4679165a72e406c63bec6b74b7c63', conditional: (d) => d.targetType === 'device_id' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['start', 'pause', 'stop', 'return_to_base', 'clean_spot', 'locate'] }
    ],
    ha_action: (data) => `vacuum.${data.operation || 'start'}`,
    ha_data: (data) => data.targetType === 'device_id' ? { device_id: data.deviceId || '' } : { entity_id: data.entityId || '' }
  },
  lock: {
    normalize: (data) => data.deviceId && !data.targetType ? { ...data, targetType: 'device_id' } : { targetType: 'entity_id', ...data },
    fields: [
      { name: 'targetType', label: 'Target Type', type: 'select', options: ['entity_id', 'device_id'] },
      { name: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'e.g. lock.front_door', conditional: (d) => (d.targetType || 'entity_id') === 'entity_id' },
      { name: 'deviceId', label: 'Device ID', type: 'text', placeholder: 'e.g. 1fa4679165a72e406c63bec6b74b7c63', conditional: (d) => d.targetType === 'device_id' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['lock', 'unlock', 'open'] }
    ],
    ha_action: (data) => `lock.${data.operation || 'lock'}`,
    ha_data: (data) => data.targetType === 'device_id' ? { device_id: data.deviceId || '' } : { entity_id: data.entityId || '' }
  },
  // Scene - entity_id only (HA helper, not a physical device)
  scene: {
    fields: [
      { name: 'entityId', label: 'Scene ID', type: 'text', placeholder: 'e.g. scene.movie_night' }
    ],
    ha_action: () => 'scene.turn_on',
    ha_data: (data) => ({ entity_id: data.entityId || '' })
  },
  // Input Boolean - entity_id only (HA helper, not a physical device)
  input_boolean: {
    fields: [
      { name: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'e.g. input_boolean.guest_mode' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['turn_on', 'turn_off', 'toggle'] }
    ],
    ha_action: (data) => `input_boolean.${data.operation || 'toggle'}`,
    ha_data: (data) => ({ entity_id: data.entityId || '' })
  },
  // Input Select - entity_id only (HA helper, not a physical device)
  input_select: {
    fields: [
      { name: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'e.g. input_select.scene_mode' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['select_option', 'select_next', 'select_previous'] },
      { name: 'option', label: 'Option', type: 'text', placeholder: 'e.g. Evening', conditional: (d) => d.operation === 'select_option' }
    ],
    ha_action: (data) => `input_select.${data.operation || 'select_option'}`,
    ha_data: (data) => {
      const d = { entity_id: data.entityId || '' };
      if (data.operation === 'select_option' && data.option) d.option = data.option;
      return d;
    }
  },
  humidifier: {
    normalize: (data) => data.deviceId && !data.targetType ? { ...data, targetType: 'device_id' } : { targetType: 'entity_id', ...data },
    fields: [
      { name: 'targetType', label: 'Target Type', type: 'select', options: ['entity_id', 'device_id'] },
      { name: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'e.g. humidifier.bedroom', conditional: (d) => (d.targetType || 'entity_id') === 'entity_id' },
      { name: 'deviceId', label: 'Device ID', type: 'text', placeholder: 'e.g. 1fa4679165a72e406c63bec6b74b7c63', conditional: (d) => d.targetType === 'device_id' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['turn_on', 'turn_off', 'set_humidity'] },
      { name: 'humidity', label: 'Target Humidity (%)', type: 'number', min: 0, max: 100, conditional: (d) => d.operation === 'set_humidity' }
    ],
    ha_action: (data) => `humidifier.${data.operation || 'turn_on'}`,
    ha_data: (data) => {
      const d = data.targetType === 'device_id' ? { device_id: data.deviceId || '' } : { entity_id: data.entityId || '' };
      if (data.operation === 'set_humidity' && data.humidity !== undefined && data.humidity !== '') d.humidity = String(data.humidity);
      return d;
    }
  },
  // Button entity - entity_id only (HA helper, not a physical device)
  button: {
    fields: [
      { name: 'entityId', label: 'Button Entity ID', type: 'text', placeholder: 'e.g. button.restart_ha' }
    ],
    ha_action: () => 'button.press',
    ha_data: (data) => ({ entity_id: data.entityId || '' })
  },
  // Automation - entity_id only (HA concept, not a physical device)
  automation: {
    fields: [
      { name: 'entityId', label: 'Automation ID', type: 'text', placeholder: 'e.g. automation.im_wake' }
    ],
    ha_action: () => 'automation.trigger',
    ha_data: (data) => ({ entity_id: data.entityId || '' })
  }
};

export const COLOR_SWATCHES = [
  'FF0000', 'FF4500', 'FF8C00', 'FFD700', 'FFFF00', 'ADFF2F', '00FF00', '00FA9A',
  '00FFFF', '00BFFF', '0000FF', '8A2BE2', 'FF00FF', 'FF1493', 'FFFFFF', '808080'
];

export const PRESETS = {
  empty: () => structuredClone(DEFAULT_CONFIG),
  living: () => ({
    deviceName: 'living-room-cyd',
    niceName: 'Living Room CYD',
    displayTimeout: 600,
    led: { ...DEFAULT_LED, enabled: true },
    buttons: [
      { ...DEFAULT_BUTTON, id: 'btn_1', name: 'Button 1', label: 'Sleep', col: 0, row: 0, icon: '\\U000F1B94', color: 'FF0000', type: 'stateless', shortPress: { enabled: true, actionType: 'script', action: 'script.go_to_sleep', data: { action: 'script.go_to_sleep' } } },
      { ...DEFAULT_BUTTON, id: 'btn_2', name: 'Button 2', label: 'Outside', col: 1, row: 0, icon: '\\U000F0583', color: 'FF7F00', type: 'stateless', shortPress: { enabled: true, actionType: 'script', action: 'script.leave_home', data: { action: 'script.leave_home' } } },
      { ...DEFAULT_BUTTON, id: 'btn_3', name: 'Button 3', label: "I'm wake", col: 2, row: 0, icon: '\\U000F059C', color: 'FFFF00', type: 'checkable', haEntity: 'switch.virtual_is_wake', onState: 'on', iconOn: '\\U000F059C', iconOff: '\\U000F0594' },
      { ...DEFAULT_BUTTON, id: 'btn_4', name: 'Button 4', label: 'Play/Pause', col: 3, row: 0, icon: '\\U000F040E', color: '00FF00', type: 'checkable', haEntity: 'media_player.spotify', onState: 'playing', iconOn: '\\U000F040A', iconOff: '\\U000F03E4' },
      { ...DEFAULT_BUTTON, id: 'btn_5', name: 'Button 5', label: 'Garden', col: 0, row: 1, icon: '\\U000F032A', color: 'FF1493', type: 'stateless', shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.garden_light', operation: 'toggle' } } },
      { ...DEFAULT_BUTTON, id: 'btn_6', name: 'Button 6', label: 'Studio Garden', col: 1, row: 1, icon: '\\U000F024A', color: '800080', type: 'checkable', haEntity: 'timer.studio_balcony_plant_light_timer', timerDefaultLabel: 'Studio Garden', shortPress: { enabled: true, actionType: 'script', action: 'script.watch_studio_plant', data: { action: 'script.watch_studio_plant' } } },
      { ...DEFAULT_BUTTON, id: 'btn_7', name: 'Button 7', label: 'Curtain 30%', col: 2, row: 1, icon: '\\U000F1846', color: '0000FF', type: 'stateless', shortPress: { enabled: true, actionType: 'cover', action: '', data: { entityId: 'cover.main_curtain', operation: 'set_cover_position', position: 30 } } },
      { ...DEFAULT_BUTTON, id: 'btn_8', name: 'Button 8', label: 'Curtain', col: 3, row: 1, icon: '\\U000F1847', color: '00FFFF', type: 'checkable', haEntity: 'cover.main_curtain', onState: 'open', iconOn: '\\U000F1846', iconOff: '\\U000F1847' },
      { ...DEFAULT_BUTTON, id: 'btn_9', name: 'Button 9', label: 'Pill', col: 0, row: 2, icon: '\\U000F0402', color: '00FF00', type: 'checkable', haEntity: 'switch.pill_alert', onState: 'on', iconOn: '\\U000F0402', iconOff: '\\U000F1A5C' },
      { ...DEFAULT_BUTTON, id: 'btn_10', name: 'Button 10', label: 'Studio', col: 1, row: 2, icon: '\\U000F091D', color: 'FFFF00', type: 'checkable', haEntity: 'switch.studio_light', onState: 'on', iconOn: '\\U000F091D', iconOff: '\\U000F17C9' },
      { ...DEFAULT_BUTTON, id: 'btn_11', name: 'Button 11', label: 'Living', col: 2, row: 2, icon: '\\U000F091D', color: 'FFFF00', type: 'checkable', haEntity: 'switch.living_room_light', onState: 'on', iconOn: '\\U000F091D', iconOff: '\\U000F17C9' },
      { ...DEFAULT_BUTTON, id: 'btn_12', name: 'Button 12', label: 'Eat', col: 3, row: 2, icon: '\\U000F025A', color: 'FB852B', type: 'checkable', haEntity: 'switch.dining_light', onState: 'on', iconOn: '\\U000F025A', iconOff: '\\U000F1915' }
    ]
  }),
  'back-garden': () => ({
    deviceName: 'back-garden-cyd',
    niceName: 'Back Garden CYD',
    board: DEFAULT_BOARD_ID,
    displayTimeout: 600,
    led: { ...DEFAULT_LED, enabled: true, entity: 'switch.virtual_pill_alert', onState: 'on' },
    buttons: [
      { ...DEFAULT_BUTTON, id: 'btn_1', name: 'Button 1', label: 'Sleep', col: 0, row: 0, icon: '\\U000F1B94', color: 'FF0000', font: 'roboto_16', type: 'stateless', longPress: { enabled: true, minLength: '1000ms', maxLength: '5000ms', actionType: 'script', action: 'script.go_to_sleep', data: { action: 'script.go_to_sleep' } } },
      { ...DEFAULT_BUTTON, id: 'btn_2', name: 'Button 2', label: 'Outside', col: 1, row: 0, icon: '\\U000F0583', color: 'FF7F00', font: 'roboto_16', type: 'stateless', longPress: { enabled: true, minLength: '1000ms', maxLength: '5000ms', actionType: 'script', action: 'script.leave_home', data: { action: 'script.leave_home' } } },
      { ...DEFAULT_BUTTON, id: 'btn_3', name: 'Button 3', label: "I'm wake", col: 2, row: 0, icon: '\\U000F059C', color: 'FFFF00', type: 'checkable', haEntity: 'switch.virtual_is_wake', onState: 'on', iconOn: '\\U000F059C', iconOff: '\\U000F0594', longPress: { enabled: true, minLength: '1000ms', maxLength: '5000ms', actionType: 'automation', action: '', data: { entityId: 'automation.i_m_wake' } } },
      { ...DEFAULT_BUTTON, id: 'btn_4', name: 'Button 4', label: 'Play/Pause', col: 3, row: 0, icon: '\\U000F040E', color: '00FF00', type: 'checkable', haEntity: 'media_player.spotify_mememe', onState: 'playing', iconOn: '\\U000F040A', iconOff: '\\U000F03E4', shortPress: { enabled: true, actionType: 'media_player', action: '', data: { targetType: 'device_id', deviceId: '31e23566034de0e54e242c1dc7c49534', operation: 'media_play_pause' } }, longPress: { enabled: true, minLength: '500ms', maxLength: '5000ms', actionType: 'media_player', action: '', data: { targetType: 'device_id', deviceId: '31e23566034de0e54e242c1dc7c49534', operation: 'media_next_track' } } },
      { ...DEFAULT_BUTTON, id: 'btn_5', name: 'Button 5', label: 'Back Garden', col: 0, row: 1, icon: '\\U000F032A', color: 'FF1493', type: 'stateless', shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.0xa4c138eaeaa49145_l1', operation: 'toggle' } } },
      { ...DEFAULT_BUTTON, id: 'btn_6', name: 'Button 6', label: 'Studio Garden', col: 1, row: 1, icon: '\\U000F024A', color: '800080', type: 'timer_sync', haEntity: 'timer.studio_balcony_plant_light_timer', timerDefaultLabel: 'Studio Garden', shortPress: { enabled: true, actionType: 'script', action: 'script.watch_a_studio_plant', data: { action: 'script.watch_a_studio_plant' } } },
      { ...DEFAULT_BUTTON, id: 'btn_7', name: 'Button 7', label: 'Curtain 30%', col: 2, row: 1, icon: '\\U000F1846', color: '0000FF', type: 'stateless', shortPress: { enabled: true, actionType: 'cover', action: '', data: { deviceId: '1fa4679165a72e406c63bec6b74b7c63', operation: 'set_cover_position', position: 30 } } },
      { ...DEFAULT_BUTTON, id: 'btn_8', name: 'Button 8', label: 'Curtain', col: 3, row: 1, icon: '\\U000F1847', color: '00FFFF', type: 'checkable', haEntity: 'cover.sonoff_1000faa95f', onState: 'opening', iconOn: '\\U000F1846', iconOff: '\\U000F1847', shortPress: { enabled: true, actionType: 'cover', action: '', data: { entityId: 'cover.sonoff_1000faa95f', operation: 'open_cover' } }, longPress: { enabled: true, minLength: '500ms', maxLength: '10000ms', actionType: 'cover', action: '', data: { entityId: 'cover.sonoff_1000faa95f', operation: 'close_cover' } } },
      { ...DEFAULT_BUTTON, id: 'btn_9', name: 'Button 9', label: 'Pill alert', col: 0, row: 2, icon: '\\U000F0402', color: '00FF00', type: 'checkable', haEntity: 'switch.virtual_pill_alert', onState: 'on', iconOn: '\\U000F0402', iconOff: '\\U000F1A5C', shortPress: { enabled: true, actionType: 'switch', action: '', data: { entityId: 'switch.virtual_pill_alert', operation: 'turn_off' } } },
      { ...DEFAULT_BUTTON, id: 'btn_10', name: 'Button 10', label: 'Studio', col: 1, row: 2, icon: '\\U000F17C9', color: 'FFFF00', font: 'roboto_16', type: 'checkable', haEntity: 'switch.sonoff_10010ff64b_2', onState: 'on', iconOn: '\\U000F091D', iconOff: '\\U000F17C9', shortPress: { enabled: true, actionType: 'script', action: 'script.toggle_studio_room', data: { action: 'script.toggle_studio_room' } } },
      { ...DEFAULT_BUTTON, id: 'btn_11', name: 'Button 11', label: 'Living', col: 2, row: 2, icon: '\\U000F1503', color: '00BFFF', type: 'checkable', haEntity: 'switch.studio_balcony_versatile_esp32_switch_2', onState: 'on', iconOn: '\\U000F1855', iconOff: '\\U000F0E0A', shortPress: { enabled: true, actionType: 'switch', action: 'switch.toggle', data: { entityId: 'switch.studio_balcony_versatile_esp32_switch_2', operation: 'toggle' } } },
      { ...DEFAULT_BUTTON, id: 'btn_12', name: 'Button 12', label: 'Eat', col: 3, row: 2, icon: '\\U000F1915', color: 'FB852B', type: 'checkable', haEntity: 'switch.sonoff_1000f57db2_1', onState: 'on', iconOn: '\\U000F025A', iconOff: '\\U000F1915', shortPress: { enabled: true, actionType: 'script', action: 'script.toggle_eat_time', data: { action: 'script.toggle_eat_time' } } }
    ]
  }),
  bedroom: () => ({
    deviceName: 'bedroom-cyd',
    niceName: 'Bedroom CYD',
    displayTimeout: 600,
    led: structuredClone(DEFAULT_LED),
    buttons: [
      { ...DEFAULT_BUTTON, id: 'btn_1', name: 'Button 1', label: 'Sleep', col: 0, row: 0, icon: '\\U000F1B94', color: 'FF0000', type: 'stateless', shortPress: { enabled: true, actionType: 'script', action: 'script.good_night', data: { action: 'script.good_night' } } },
      { ...DEFAULT_BUTTON, id: 'btn_2', name: 'Button 2', label: 'Wake', col: 1, row: 0, icon: '\\U000F059C', color: 'FF7F00', type: 'stateless', shortPress: { enabled: true, actionType: 'script', action: 'script.good_morning', data: { action: 'script.good_morning' } } },
      { ...DEFAULT_BUTTON, id: 'btn_3', name: 'Button 3', label: 'Fan', col: 2, row: 0, icon: '\\U000F0210', color: 'FFFF00', type: 'checkable', haEntity: 'fan.bedroom', onState: 'on', iconOn: '\\U000F0210', iconOff: '\\U000F0210' },
      { ...DEFAULT_BUTTON, id: 'btn_4', name: 'Button 4', label: 'Light', col: 3, row: 0, icon: '\\U000F091D', color: '00FF00', type: 'checkable', haEntity: 'light.bedroom', onState: 'on', iconOn: '\\U000F091D', iconOff: '\\U000F17C9' },
      { ...DEFAULT_BUTTON, id: 'btn_5', name: 'Button 5', label: 'Lamp', col: 0, row: 1, icon: '\\U000F1051', color: 'FF1493', type: 'checkable', haEntity: 'light.bedside_lamp', onState: 'on', iconOn: '\\U000F1051', iconOff: '\\U000F1051' },
      { ...DEFAULT_BUTTON, id: 'btn_6', name: 'Button 6', label: 'TV', col: 1, row: 1, icon: '\\U000F040E', color: '800080', type: 'checkable', haEntity: 'media_player.bedroom_tv', onState: 'playing', iconOn: '\\U000F040A', iconOff: '\\U000F03E4' },
      ...Array(6).fill(null).map((_, i) => ({
        ...DEFAULT_BUTTON, id: `btn_${i + 7}`, name: `Button ${i + 7}`, label: `Btn ${i + 7}`, col: (i + 6) % 4, row: Math.floor((i + 6) / 4)
      }))
    ]
  })
};

export const HARDWARE_CONFIG = `
esp32:
  board: esp32dev
  framework:
    type: arduino

esphome:
  name: \${device_name}
  friendly_name: \${nice_name}

api:
  encryption:
    key: !secret api_encryption_key

ota:
  - platform: esphome
    password: !secret ota_password

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
  ap:
    ssid: "\${nice_name} Fallback Hotspot"
    password: "\${ap_password}"

logger:

time:
  - platform: sntp
    id: esptime

captive_portal:

i2c:
  - sda: 27
    scl: 22
    scan: true

spi:
  - id: tft
    clk_pin: 14
    mosi_pin: 13
    miso_pin:
      number: 12
      ignore_strapping_warning: true
  - id: touch
    clk_pin: 25
    mosi_pin: 32
    miso_pin: 39

output:
  - id: backlight_pwm
    platform: ledc
    pin: 21
  - id: output_red
    platform: ledc
    pin: 4
    inverted: true
  - id: output_green
    platform: ledc
    pin: 16
    inverted: true
  - id: output_blue
    platform: ledc
    pin: 17
    inverted: true

light:
  - id: display_backlight
    platform: monochromatic
    output: backlight_pwm
    name: Display Backlight
    restore_mode: ALWAYS_ON
  - id: led
    platform: rgb
    red: output_red
    green: output_green
    blue: output_blue
    restore_mode: ALWAYS_OFF

display:
  - id: main_display
    platform: ili9xxx
    model: TFT 2.4R
    spi_id: tft
    cs_pin:
      number: 15
      ignore_strapping_warning: true
    dc_pin:
      number: 2
      ignore_strapping_warning: true
    invert_colors: false
    color_palette: 8BIT
    update_interval: never
    auto_clear_enabled: false
    transform:
      swap_xy: true
    dimensions:
      width: \${width}
      height: \${height}

touchscreen:
  - id: main_touchscreen
    platform: xpt2046
    spi_id: touch
    cs_pin: 33
    interrupt_pin: 36
    threshold: 400
    calibration:
      x_min: 280
      x_max: 3860
      y_min: 340
      y_max: 3860
    transform:
      swap_xy: true
    on_release:
      - if:
          condition: lvgl.is_paused
          then:
            - logger.log: "LVGL resuming"
            - lvgl.resume:
            - lvgl.widget.redraw:
            - light.turn_on: display_backlight
`;
