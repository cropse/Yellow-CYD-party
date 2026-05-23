# AGENTS.md — src/modules

> Core application logic for the CYD Config Generator.

## OVERVIEW

ES modules that power YAML generation, validation, state management, and icon handling. Each module has a single responsibility.

## STRUCTURE

```
src/modules/
├── config.js              # Constants, schemas, presets, board configs
├── board-configs.js       # Hardware init sequences, hardware type enum
├── yaml-engine.js         # YAML generation (8 section generators)
├── validation-engine.js   # Config validation with error/warning reporting
├── store.js               # Undo/redo state management with effect scheduling
├── utils.js               # YAML helpers, color normalization, debounce
├── import.js              # JSON/YAML config import and normalization
├── mdi.js                 # MDI icon loading, search, favorites
└── tests/                 # 11 unit test files (node:test runner)
```

## WHERE TO LOOK

| Task | Module | Notes |
|------|--------|-------|
| Add action type | `config.js` | Add to `ACTION_SCHEMAS` with `ha_action` + `ha_data` |
| Change YAML output | `yaml-engine.js` | 8 section generators; mind `\U000Fxxxx` escaping |
| Add validation rule | `validation-engine.js` | Return `{ errors: [], warnings: [] }` with `selector` |
| Fix icon codepoint bug | `mdi.js` + `utils.js` | Check `normalizeIconCodepoint` and YAML scalar logic |
| Add board support | `config.js` + `board-configs.js` | Add to `BOARD_CONFIGS`, update `isSupportedBoard` |
| Import roundtrip broken | `import.js` + `yaml-engine.js` | Both sides must agree on field names |

## CONVENTIONS

### Dependency injection for testability
`yaml-engine.js` functions accept a `deps` object rather than importing directly. Tests inject mocks:
```js
const deps = { yamlScalar, yamlQuoted, boardConfig, normalizeColor, ... };
generateFullYAML(config, deps);
```

### YAML sentinel markers
Raw YAML values (`!secret`, `!include`, `${var}`) are wrapped in sentinel strings in JS, then stripped during rendering:
```js
yamlSecret('wifi_ssid')  // → "YAMLRAWSTART!secret wifi_ssidYAMLRAWEND"
yamlDoc([{ title: 'wifi', body: yamlSecret('wifi_ssid') }])
```

### Window exports (testing only)
`src/main.js` assigns module exports to `window.*` for `verify-cyd.mjs` VM testing. Do not rely on these in production code.

## ANTI-PATTERNS

- **Do not import DOM APIs in modules** — keep modules environment-agnostic; DOM code belongs in `src/main.js`
- **Do not hardcode board configs in yaml-engine.js** — use `BOARD_CONFIGS` from `config.js`
- **Do not add `!include` to generated YAML** — output must be single-file; templates are inlined at generation time
- **Do not change `back-garden-cyd-test.yaml` structure** without updating `verify-cyd.mjs` — breaks byte-exact parity tests
- **Do not use `node:test` features that require experimental flags** — tests must run with plain `node file.js`

## TESTING

Unit tests use Node.js built-in `node:test`:
```bash
node src/modules/tests/test-yaml.js
node src/modules/tests/test-validation.mjs
```

TDD convention: some test files have expected-failure headers for unimplemented features. Check test comments before "fixing" them.
