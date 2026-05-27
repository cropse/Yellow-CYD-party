import './styles/main.css';
import {
  DEFAULT_CONFIG, PRESETS, HARDWARE_CONFIG, ACTION_SCHEMAS, COLOR_SWATCHES,
  BOARD_OPTIONS, DEFAULT_BOARD_ID, isSupportedBoard
} from './modules/config.js';
import * as YamlGenerationEngine from './modules/yaml-engine.js';
import * as ValidationEngine from './modules/validation-engine.js';
import { normalizeColor, clampNumber, yamlDoc, yamlInclude, yamlRaw, yamlSecret } from './modules/utils.js';
import { normalizeImportedConfig } from './modules/import.js';
import { getBoardConfig } from './modules/config.js';
import {
  init, store, generateYAML, selectButton, getAppState, setAppState, setSelectedButtonIndex
} from './modules/orchestration.js';

Object.defineProperty(window, 'appState', {
  get: getAppState,
  set: setAppState
});
Object.defineProperty(window, 'selectedButtonIndex', {
  get: () => store.getSelectedIndex(),
  set: setSelectedButtonIndex
});
window.DEFAULT_CONFIG = DEFAULT_CONFIG;
window.PRESETS = PRESETS;
window.ACTION_SCHEMAS = ACTION_SCHEMAS;
window.HARDWARE_CONFIG = HARDWARE_CONFIG;
window.COLOR_SWATCHES = COLOR_SWATCHES;
window.COLOR_THEMES = COLOR_SWATCHES;
window.BOARD_OPTIONS = BOARD_OPTIONS;
window.DEFAULT_BOARD_ID = DEFAULT_BOARD_ID;
window.isSupportedBoard = isSupportedBoard;
window.store = store;
window.YamlGenerationEngine = YamlGenerationEngine;
window.ValidationEngine = ValidationEngine;
window.generateFullYAML = (config) => YamlGenerationEngine.generateFullYAML(config, {
  actionSchemas: ACTION_SCHEMAS,
  hardwareConfig: HARDWARE_CONFIG,
  defaultButton: DEFAULT_CONFIG.buttons?.[0] || {},
  defaultConfig: DEFAULT_CONFIG,
  DEFAULT_BOARD_ID,
  getBoardConfig,
  isSupportedBoard,
  normalizeColor,
  clampNumber,
  normalizeImportedConfig,
  yamlDoc,
  yamlSecret,
  yamlInclude,
  yamlRaw
});
window.validateConfig = (config) => ValidationEngine.validateConfig(config, {
  selectedButtonIndex: store.getSelectedIndex(),
  ACTION_SCHEMAS
});

init();
