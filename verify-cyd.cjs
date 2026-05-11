const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Load the built bundle from dist
const distPath = path.join(__dirname, 'dist', 'assets');
let mainJs = '';
for (const file of fs.readdirSync(distPath)) {
  if (file.startsWith('main-') && file.endsWith('.js')) {
    mainJs = fs.readFileSync(path.join(distPath, file), 'utf8');
    break;
  }
}

if (!mainJs) {
  console.error('Could not find main bundle. Run npm run build first.');
  process.exit(1);
}

// Mock DOM environment
const nullEl = () => ({
  textContent: '', value: '', innerHTML: '', style: {}, dataset: {}, disabled: false,
  classList: { add(){}, remove(){}, toggle(){} },
  addEventListener(){}, appendChild(){}, removeChild(){}, setAttribute(){}, select(){}, remove(){}, click(){},
  querySelector(){ return nullEl(); }, querySelectorAll(){ return []; }, closest(){ return nullEl(); }
});

const sessionStore = {};
const ctx = {
  console, structuredClone,
  localStorage: { getItem(){ return null; }, setItem(){} },
  sessionStorage: { 
    getItem(k){ return sessionStore[k] ?? null; }, 
    setItem(k, v){ sessionStore[k] = String(v); }, 
    removeItem(k){ delete sessionStore[k]; } 
  },
  document: {
    getElementById(){ return nullEl(); }, 
    querySelector(){ return nullEl(); }, 
    querySelectorAll(){ return []; }, 
    createElement: nullEl,
    body: { appendChild(){}, removeChild(){}, hasAttribute(){ return false; }, setAttribute(){} }
  },
  navigator: { clipboard: { writeText(){ return Promise.resolve(); } } },
  Blob: function(){}, 
  URL: { createObjectURL(){ return 'blob:'; }, revokeObjectURL(){} }, 
  FileReader: function(){},
  setTimeout, clearTimeout, 
  confirm(){ return true; }, 
  fetch: async () => ({ text: async () => '' }),
  window: {},
  module: { exports: {} },
  exports: {}
};

vm.createContext(ctx);

// Execute the bundle
vm.runInContext(mainJs, ctx);

// Access exported functions from window
const win = ctx.window;

// Test PRESETS
if (!win.PRESETS || !win.PRESETS['back-garden']) {
  throw new Error('PRESETS not exported to window');
}

const preset = win.PRESETS['back-garden']();
ctx.preset = preset;

// Test validation
if (!win.validateConfig) {
  throw new Error('validateConfig not exported to window');
}

const issues = win.validateConfig(preset);
if (issues.errors.length) {
  throw new Error('validation errors: ' + issues.errors.map(e => e.message).join(' | '));
}

// Test YAML generation
if (!win.generateFullYAML) {
  throw new Error('generateFullYAML not exported to window');
}

const yaml = win.generateFullYAML(preset);
for (const block of ['substitutions:', 'esp32:', 'api:', 'wifi:', 'font:', 'color:', 'binary_sensor:', 'packages:', 'lvgl:']) {
  if (!yaml.includes(block)) throw new Error('missing ' + block);
}
if (!yaml.includes('!secret api_encryption_key') || !yaml.includes('!secret wifi_ssid')) {
  throw new Error('secret placeholders missing');
}

// Test YAML parsing
ctx.yaml = yaml;
if (!win.parseYAMLToConfig) {
  throw new Error('parseYAMLToConfig not exported to window');
}

const parsed = win.parseYAMLToConfig(yaml).config;
ctx.parsed = parsed;

if (parsed.buttons[3].shortPress.actionType !== 'media_player') {
  throw new Error('btn4 short media action did not import');
}
if (parsed.buttons[3].longPress.actionType !== 'media_player') {
  throw new Error('btn4 long media action did not import');
}
if (parsed.buttons[6].shortPress.actionType !== 'cover') {
  throw new Error('btn7 cover action did not import');
}

// Test roundtrip
const yaml2 = win.generateFullYAML(parsed);
for (const needle of ['btn_12', 'media_player.media_play_pause', 'cover.set_cover_position', 'timer.studio_balcony_plant_light_timer']) {
  if (!yaml2.includes(needle)) throw new Error('roundtrip loss: ' + needle);
}

// Test LED control for checkable
const ledConfig = structuredClone(preset);
ledConfig.buttons.forEach(button => { button.ledControl = false; });
ledConfig.buttons[0].type = 'checkable';
ledConfig.buttons[0].haEntity = 'switch.led_test';
ledConfig.buttons[0].ledControl = true;
ctx.ledConfig = ledConfig;

if (!win.YamlGenerationEngine || !win.YamlGenerationEngine.generatePackages) {
  throw new Error('YamlGenerationEngine.generatePackages not exported to window');
}

const checkableLedYaml = win.YamlGenerationEngine.generatePackages([ledConfig.buttons[0]]);
if (!checkableLedYaml.includes('light.turn_on:') || !checkableLedYaml.includes('light.turn_off: led')) {
  throw new Error('checkable ledControl did not generate LED sync YAML');
}

// Test LED control for stateless (should NOT generate LED sync)
const statelessLedConfig = structuredClone(ledConfig);
statelessLedConfig.buttons[0].type = 'stateless';
ctx.statelessLedConfig = statelessLedConfig;
const statelessLedYaml = win.YamlGenerationEngine.generatePackages([statelessLedConfig.buttons[0]]);
if (statelessLedYaml.includes('light.turn_on:') || statelessLedYaml.includes('light.turn_off: led')) {
  throw new Error('stateless ledControl generated LED sync YAML');
}

// Test workflow config update
const workflowConfig = win.PRESETS['back-garden']();
const oldSlotAction = workflowConfig.buttons[11].shortPress.data?.action;
workflowConfig.buttons[11] = {
  ...structuredClone(win.DEFAULT_BUTTON),
  id: 'btn_12',
  name: 'Button 12',
  label: 'Test Switch',
  col: 3,
  row: 2,
  icon: '\\U000F0335',
  type: 'stateless',
  shortPress: {
    enabled: true,
    actionType: 'switch',
    action: '',
    data: { entityId: 'switch.test_lamp', operation: 'toggle' }
  }
};
ctx.workflowConfig = workflowConfig;
const workflowYaml = win.generateFullYAML(workflowConfig);
const slot12Block = workflowYaml.match(/widget: btn_12[\s\S]*?(?=\n  - platform: lvgl|\npackages:|\nlvgl:)/)?.[0] || '';
if (!slot12Block.includes('switch.test_lamp')) {
  throw new Error('updated slot 12 action missing from generated YAML');
}
if (!slot12Block.includes('name: "Button 12"')) {
  throw new Error('updated slot 12 binary sensor missing or wrong slot');
}
if (oldSlotAction && workflowYaml.includes(oldSlotAction)) {
  throw new Error('stale slot 12 action leaked into generated YAML');
}

// Test HA credentials don't leak
ctx.sessionStorage.setItem('cyd-ha-url', 'http://ha.local:8123');
ctx.sessionStorage.setItem('cyd-ha-token', 'supersecrettoken12345');
const yamlWithHACreds = win.generateFullYAML(preset);
const exportJson = JSON.stringify(win.appState || preset);
if (yamlWithHACreds.includes('supersecrettoken12345') || yamlWithHACreds.includes('ha.local')) {
  throw new Error('HA credentials leaked into generated YAML');
}
if (exportJson.includes('supersecrettoken12345') || exportJson.includes('ha.local')) {
  throw new Error('HA credentials leaked into exported JSON');
}

console.log('✓ verification ok', yaml.length, yaml2.length);
