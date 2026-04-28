const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1].replace(/\n\s*init\(\);\s*$/, '');
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
  sessionStorage: { getItem(k){ return sessionStore[k] ?? null; }, setItem(k, v){ sessionStore[k] = String(v); }, removeItem(k){ delete sessionStore[k]; } },
  document: {
    getElementById(){ return nullEl(); }, querySelector(){ return nullEl(); }, querySelectorAll(){ return []; }, createElement: nullEl,
    body: { appendChild(){}, removeChild(){}, hasAttribute(){ return false; }, setAttribute(){} }
  },
  navigator: { clipboard: { writeText(){ return Promise.resolve(); } } },
  Blob: function(){}, URL: { createObjectURL(){ return 'blob:'; }, revokeObjectURL(){} }, FileReader: function(){},
  setTimeout, clearTimeout, confirm(){ return true; }, fetch: async () => ({ text: async () => '' })
};
vm.createContext(ctx);
vm.runInContext(script, ctx);
const preset = vm.runInContext('PRESETS["back-garden"]()', ctx);
ctx.preset = preset;
const issues = vm.runInContext('validateConfig(preset)', ctx);
if (issues.errors.length) throw new Error('validation errors: ' + issues.errors.map(e => e.message).join(' | '));
const yaml = vm.runInContext('generateFullYAML(preset)', ctx);
for (const block of ['substitutions:', 'esp32:', 'api:', 'wifi:', 'font:', 'color:', 'binary_sensor:', 'packages:', 'lvgl:']) {
  if (!yaml.includes(block)) throw new Error('missing ' + block);
}
if (!yaml.includes('!secret api_encryption_key') || !yaml.includes('!secret wifi_ssid')) throw new Error('secret placeholders missing');
ctx.yaml = yaml;
const parsed = vm.runInContext('parseYAMLToConfig(yaml).config', ctx);
ctx.parsed = parsed;
if (parsed.buttons[3].shortPress.actionType !== 'media_player') throw new Error('btn4 short media action did not import');
if (parsed.buttons[3].longPress.actionType !== 'media_player') throw new Error('btn4 long media action did not import');
if (parsed.buttons[6].shortPress.actionType !== 'cover') throw new Error('btn7 cover action did not import');
const yaml2 = vm.runInContext('generateFullYAML(parsed)', ctx);
for (const needle of ['btn_12', 'media_player.media_play_pause', 'cover.set_cover_position', 'timer_sync_template.yaml']) {
  if (!yaml2.includes(needle)) throw new Error('roundtrip loss: ' + needle);
}

const ledConfig = structuredClone(preset);
ledConfig.buttons.forEach(button => { button.ledControl = false; });
ledConfig.buttons[0].type = 'checkable';
ledConfig.buttons[0].haEntity = 'switch.led_test';
ledConfig.buttons[0].ledControl = true;
ctx.ledConfig = ledConfig;
const checkableLedYaml = vm.runInContext('generatePackages([ledConfig.buttons[0]])', ctx);
if (!checkableLedYaml.includes('light.turn_on:') || !checkableLedYaml.includes('light.turn_off: led')) {
  throw new Error('checkable ledControl did not generate LED sync YAML');
}

const statelessLedConfig = structuredClone(ledConfig);
statelessLedConfig.buttons[0].type = 'stateless';
ctx.statelessLedConfig = statelessLedConfig;
const statelessLedYaml = vm.runInContext('generatePackages([statelessLedConfig.buttons[0]])', ctx);
if (statelessLedYaml.includes('light.turn_on:') || statelessLedYaml.includes('light.turn_off: led')) {
  throw new Error('stateless ledControl generated LED sync YAML');
}

const workflowConfig = vm.runInContext('PRESETS["back-garden"]()', ctx);
const oldSlotAction = workflowConfig.buttons[11].shortPress.data.action;
workflowConfig.buttons[11] = {
  ...structuredClone(ctx.DEFAULT_BUTTON),
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
const workflowYaml = vm.runInContext('generateFullYAML(workflowConfig)', ctx);
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

// Ensure HA credentials never leak into YAML or export JSON
ctx.sessionStorage.setItem('cyd-ha-url', 'http://ha.local:8123');
ctx.sessionStorage.setItem('cyd-ha-token', 'supersecrettoken12345');
const yamlWithHACreds = vm.runInContext('generateFullYAML(preset)', ctx);
const exportJson = vm.runInContext('JSON.stringify(appState)', ctx);
if (yamlWithHACreds.includes('supersecrettoken12345') || yamlWithHACreds.includes('ha.local')) {
  throw new Error('HA credentials leaked into generated YAML');
}
if (exportJson.includes('supersecrettoken12345') || exportJson.includes('ha.local')) {
  throw new Error('HA credentials leaked into exported JSON');
}

console.log('verification ok', yaml.length, yaml2.length);
