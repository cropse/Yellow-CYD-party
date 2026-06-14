import * as fs from 'fs';
import * as vm from 'vm';
import * as path from 'path';
import { fileURLToPath } from 'url';
const { SourceTextModule } = vm;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load chunks
const distPath = path.join(__dirname, 'dist', 'assets');
const chunks = {};
let mainFile = '';
for (const file of fs.readdirSync(distPath)) {
  if (file.endsWith('.js')) {
    const content = fs.readFileSync(path.join(distPath, file), 'utf8');
    chunks[file] = content;
    if (file.startsWith('main-')) mainFile = file;
  }
}

if (!mainFile) {
  console.error('Could not find main bundle. Run npm run build first.');
  process.exit(1);
}

// --- Mock globals ---
const nullEl = () => ({
  textContent: '', value: '', innerHTML: '', style: {}, dataset: { get() { return ''; } }, disabled: false,
  classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
  addEventListener(){}, appendChild(){ return nullEl(); }, removeChild(){}, setAttribute(){}, select(){}, remove(){}, click(){},
  querySelector(){ return nullEl(); }, querySelectorAll(){ return []; }, closest(){ return nullEl(); },
  options: { add(){}, length: 0 }, children: [], parentElement: null
});

const sessionStore = {};
const mockWin = {};
const sharedCtx = {
  console,
  structuredClone,
  btoa: (str) => Buffer.from(str, 'utf8').toString('base64'),
  atob: (b64) => Buffer.from(b64, 'base64').toString('utf8'),
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
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
    createTextNode(){ return nullEl(); },
    addEventListener(){},
    removeEventListener(){},
    body: { appendChild(){}, removeChild(){}, hasAttribute(){ return false; }, setAttribute(){} }
  },
  navigator: { clipboard: { writeText(){ return Promise.resolve(); } } },
  Blob: function(){},
  URL: { createObjectURL(){ return 'blob:'; }, revokeObjectURL(){} },
  FileReader: class { constructor(){ this.onload = null; } readAsText(){ this.onload({ target: { result: '' } }); } },
  MutationObserver: class { constructor(){ this._observed = null; } observe(){ this._observed = null; } disconnect(){ this._observed = null; } takeRecords(){ return []; } },
  setTimeout,
  clearTimeout,
  confirm(){ return true; },
  fetch: async () => ({ ok: false, status: 404, text: async () => '', json: async () => ({}) }),
  window: mockWin
};

vm.createContext(sharedCtx);

// Strip IIFE modulepreload polyfill from main chunk
const patchContent = (filename, content) => {
  if (filename !== mainFile) return content;
  // The modulepreload IIFE: "(function(){...}})();"
  // Find start of IIFE and end by brace depth
  const iifeStart = content.indexOf('";(function(){const');
  if (iifeStart === -1) return content;
  // Start counting AFTER the "; at the end of the import (skip it)
  const iifeBodyStart = iifeStart + 2; // ";
  let depth = 0, end = -1;
  for (let i = iifeBodyStart; i < content.length; i++) {
    const ch = content[i];
    if (ch === '(' || ch === '{') depth++;
    if (ch === ')' || ch === '}') depth--;
    if (ch === ';' && depth <= 0) { end = i + 1; break; }
  }
  if (end === -1) return content;
  return content.slice(0, iifeStart + 2) + content.slice(end);
};

// Build, link, evaluate modules
const modules = {};
for (const [filename, content] of Object.entries(chunks)) {
  const patched = patchContent(filename, content);
  const mod = new SourceTextModule(patched, { context: sharedCtx });
  modules[filename] = mod;
}

await Promise.all(Object.values(modules).map(async (mod) => {
  await mod.link(async (specifier) => {
    let fileName = specifier.startsWith('./') ? specifier.slice(2) : specifier.slice(3);
    if (modules[fileName]) return modules[fileName];
    throw new Error(`Cannot resolve import: ${specifier}`);
  });
}));

for (const mod of Object.values(modules)) {
  await mod.evaluate(sharedCtx);
}

// Access exports from mockWin
const win = mockWin;

// ===================== TESTS =====================

if (!win.PRESETS || !win.PRESETS['back-garden']) {
  throw new Error('PRESETS not exported to window');
}

const preset = win.PRESETS['back-garden']();

if (!win.validateConfig) {
  throw new Error('validateConfig not exported to window');
}

const issues = win.validateConfig(preset);
if (issues.errors.length) {
  throw new Error('validation errors: ' + issues.errors.map(e => e.message).join(' | '));
}

// Test board registry exports
if (!win.DEFAULT_BOARD_ID) {
  throw new Error('DEFAULT_BOARD_ID not exported to window');
}
if (win.DEFAULT_BOARD_ID !== 'esp32-2432s028-2port') {
  throw new Error('DEFAULT_BOARD_ID should be esp32-2432s028-2port (got ' + win.DEFAULT_BOARD_ID + ')');
}

if (!win.BOARD_OPTIONS || !Array.isArray(win.BOARD_OPTIONS)) {
  throw new Error('BOARD_OPTIONS not exported to window');
}
if (win.BOARD_OPTIONS.length !== 6) {
  throw new Error('BOARD_OPTIONS should have 6 entries (got ' + win.BOARD_OPTIONS.length + ')');
}

if (!win.isSupportedBoard) {
  throw new Error('isSupportedBoard not exported to window');
}
if (!win.isSupportedBoard('esp32-2432s028-2port')) {
  throw new Error('isSupportedBoard should return true for default board');
}
if (win.isSupportedBoard('unknown-board')) {
  throw new Error('isSupportedBoard should return false for unknown board');
}

// Test board-aware YAML generation for default board
const defaultYaml = win.generateFullYAML(preset);
if (!defaultYaml.includes('board: esp32dev')) {
  throw new Error('default board YAML missing board: esp32dev');
}
if (!defaultYaml.includes('width: "320"')) {
  throw new Error('default board YAML missing width: "320" in substitutions');
}
if (!defaultYaml.includes('height: "240"')) {
  throw new Error('default board YAML missing height: "240" in substitutions');
}

// Test board-aware YAML generation for non-default board (Guition)
const guitionPreset = { ...preset, board: 'guition-jc4827543c' };
const guitionYaml = win.generateFullYAML(guitionPreset);
if (!guitionYaml.includes('board: esp32-s3-devkitc-1')) {
  throw new Error('Guition board YAML missing board: esp32-s3-devkitc-1');
}
if (!guitionYaml.includes('width: "480"')) {
  throw new Error('Guition board YAML missing width: "480" in substitutions');
}
if (!guitionYaml.includes('height: "272"')) {
  throw new Error('Guition board YAML missing height: "272" in substitutions');
}
if (!guitionYaml.includes('gt911') && !guitionYaml.includes('GT911')) {
  throw new Error('Guition board YAML missing GT911 touch driver');
}
if (guitionYaml.includes('platform: rgb') || guitionYaml.includes('output_red')) {
  throw new Error('Guition board YAML should NOT contain RGB LED sections');
}

// Test no-RGB board (esp32-e32r28t) omits RGB outputs
const noRgbPreset = { ...preset, board: 'esp32-e32r28t' };
const noRgbYaml = win.generateFullYAML(noRgbPreset);
if (noRgbYaml.includes('output_red') || noRgbYaml.includes('platform: rgb')) {
  throw new Error('no-RGB board YAML should NOT contain RGB LED sections');
}

// Test Back Garden global LED control
if (!preset.led) {
  throw new Error('back-garden preset missing global led config');
}
if (preset.led.enabled !== true) {
  throw new Error('back-garden led.enabled !== true (got ' + preset.led.enabled + ')');
}
if (preset.led.entity !== 'switch.virtual_pill_alert') {
  throw new Error('back-garden led.entity should be switch.virtual_pill_alert (got ' + JSON.stringify(preset.led.entity) + ')');
}
if (preset.led.onState !== 'on') {
  throw new Error('back-garden led.onState should be on (got ' + JSON.stringify(preset.led.onState) + ')');
}
if (preset.led.effect !== 'on-entity') {
  throw new Error('back-garden led.effect should be on-entity (got ' + JSON.stringify(preset.led.effect) + ')');
}
// Verify btn_9 still has correct button config
const btn9 = preset.buttons[8];
if (btn9.haEntity !== 'switch.virtual_pill_alert') {
  throw new Error('back-garden btn_9 haEntity !== switch.virtual_pill_alert (got ' + btn9.haEntity + ')');
}
if (btn9.onState !== 'on') {
  throw new Error('back-garden btn_9 onState !== on (got ' + btn9.onState + ')');
}

// Test YAML generation
if (!win.generateFullYAML) {
  throw new Error('generateFullYAML not exported to window');
}

const yaml = win.generateFullYAML(preset);
for (const block of ['substitutions:', 'esp32:', 'api:', 'wifi:', 'font:', 'color:', 'binary_sensor:', 'packages:', 'lvgl:']) {
  if (!yaml.includes(block)) throw new Error('missing ' + block);
}

// Verify global LED sync in generated YAML
if (!yaml.includes('led_sync:')) {
  throw new Error('generated YAML missing led_sync global LED control');
}
if (!yaml.includes('entity_id: switch.virtual_pill_alert')) {
  throw new Error('generated YAML missing entity_id: switch.virtual_pill_alert in led_sync block');
}
if (!yaml.includes('light.turn_on:')) {
  throw new Error('generated YAML missing light.turn_on in led_sync block');
}
if (!yaml.includes('light.turn_off: led')) {
  throw new Error('generated YAML missing light.turn_off: led in led_sync block');
}
if (!yaml.includes('btn_logic_9')) {
  throw new Error('generated YAML missing btn_logic_9 for btn_9 LVGL sync');
}
if (!yaml.includes('!secret api_encryption_key') || !yaml.includes('!secret wifi_ssid')) {
  throw new Error('secret placeholders missing');
}

// Test parity: generated YAML must match back-garden-cyd.yaml reference
// Strip embedded metadata comments before comparison (metadata is for round-trip import, not ESPHome behavior)
const stripMetadata = (text) => {
  const lines = text.split('\n');
  let inMeta = false;
  let inCustom = false;
  return lines.filter(l => {
    if (l === '# cyd-config: begin') { inMeta = true; return false; }
    if (l === '# cyd-config: end') { inMeta = false; return false; }
    if (inMeta) return false;
    if (l === '# cyd-custom: begin') { inCustom = true; return false; }
    if (l === '# cyd-custom: end') { inCustom = false; return false; }
    if (inCustom) return false;
    return true;
  }).join('\n').replace(/\n{2,}$/, '\n');
};
const refPath = path.join(__dirname, 'back-garden-cyd.yaml');
const refYaml = fs.readFileSync(refPath, 'utf8');
const yamlStripped = stripMetadata(yaml);
if (yamlStripped !== refYaml) {
  const refLines = refYaml.split('\n');
  const genLines = yamlStripped.split('\n');
  for (let i = 0; i < Math.max(refLines.length, genLines.length); i++) {
    if (refLines[i] !== genLines[i]) {
      throw new Error(`YAML parity mismatch at line ${i + 1}: ref="${refLines[i]}" gen="${genLines[i]}"`);
    }
  }
}

// Test LED control generation with global led enabled
if (!win.YamlGenerationEngine || !win.YamlGenerationEngine.generatePackages) {
  throw new Error('YamlGenerationEngine.generatePackages not exported to window');
}

const pkgDeps = { yamlScalar: v => v, yamlQuoted: v => `"${v}"` };
const ledConfig = {
  led: { enabled: true, effect: 'on-entity', entity: 'switch.led_test', onState: 'on', color: { r: 0, g: 255, b: 0 }, brightness: 100 },
  buttons: [{ type: 'checkable', haEntity: 'switch.led_test', id: 'btn_1', onState: 'on' }]
};
const checkableLedYaml = win.YamlGenerationEngine.generatePackages(ledConfig, pkgDeps);
if (!checkableLedYaml.includes('light.turn_on:') || !checkableLedYaml.includes('light.turn_off: led')) {
  throw new Error('config with led.enabled did not generate LED sync YAML');
}

// Test LED sync is type-independent (works with stateless buttons too)
const statelessLedConfig = { ...ledConfig, buttons: [{ ...ledConfig.buttons[0], type: 'stateless' }] };
const statelessLedYaml = win.YamlGenerationEngine.generatePackages(statelessLedConfig, pkgDeps);
if (!statelessLedYaml.includes('light.turn_on:') || !statelessLedYaml.includes('light.turn_off: led')) {
  throw new Error('stateless config with led.enabled should also generate LED sync YAML');
}

// Test LED control when disabled
const noLedConfig = { ...ledConfig, led: { ...ledConfig.led, enabled: false } };
const noLedYaml = win.YamlGenerationEngine.generatePackages(noLedConfig, pkgDeps);
if (noLedYaml.includes('light.turn_on:') || noLedYaml.includes('light.turn_off: led') || noLedYaml.includes('led_sync:')) {
  throw new Error('disabled led should NOT generate LED sync YAML');
}

// Test HA credentials don't leak
sessionStore['cyd-ha-url'] = 'http://ha.local:8123';
sessionStore['cyd-ha-token'] = 'supersecrettoken12345';
const yamlWithHACreds = win.generateFullYAML(preset);
if (yamlWithHACreds.includes('supersecrettoken12345') || yamlWithHACreds.includes('ha.local')) {
  throw new Error('HA credentials leaked into generated YAML');
}

console.log('✓ verification ok', yaml.length);
