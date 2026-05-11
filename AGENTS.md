# AGENTS.md — Yellow-CYD-party

> Compact guidance for OpenCode agents working in this repo.
> Last updated: 2026-05-01

## What this repo is

A Vite-based web app that generates ESPHome YAML configurations for CYD (Cheap Yellow Display / ESP32-2432S028R) button panels.

- **Build system:** Vite 5.x for development and production builds
- **Deployment:** GitHub Pages from `dist/` folder
- **Modular architecture:** ES modules in `src/` directory

## Architecture

### Source Files (`src/`)

| File | Role |
|---|---|
| `src/main.js` | Entry point (~900 lines). Initializes app, sets up event listeners, orchestrates modules. |
| `src/styles/main.css` | All CSS (~1400 lines). Extracted from original `index.html`. |
| `src/modules/config.js` | Constants: `DEFAULT_BUTTON`, `DEFAULT_CONFIG`, `ACTION_SCHEMAS`, `PRESETS`, `HARDWARE_CONFIG` (~450 lines) |
| `src/modules/store.js` | State management with undo/redo (~130 lines) |
| `src/modules/yaml-engine.js` | YAML generation functions (~540 lines) |
| `src/modules/validation-engine.js` | Config validation (~170 lines) |
| `src/modules/utils.js` | Utility functions: `normalizeColor`, `clampNumber`, `escapeHTML`, etc. (~100 lines) |
| `src/modules/import.js` | Import/normalize config logic (~100 lines) |
| `src/modules/mdi.js` | MDI icon loading and search (~90 lines) |
| `src/modules/ui-render.js` | UI render functions (~330 lines) |
| `src/modules/events.js` | Event handlers (~280 lines) |
| `src/modules/actions.js` | User actions: export, import, download, etc. (~200 lines) |
| `src/modules/state.js` | Global state and store initialization (~50 lines) |
| `src/modules/toast.js` | Toast notification system (~35 lines) |

### Source Files (`src/`)

| File | Role |
|---|---|
| `index.html` | Vite HTML entry point (~280 lines). |
| `src/main.js` | Entry point (~940 lines). Initializes app, sets up event listeners, orchestrates modules. |

### Build Output (`dist/`)

| File | Role |
|---|---|
| `dist/index.html` | Production HTML entry |
| `dist/assets/main-*.js` | Main bundle (~28KB gzipped) |
| `dist/assets/main-*.css` | CSS bundle (~18KB gzipped) |
| `dist/assets/yaml-engine-*.js` | YAML generation chunk (~14KB gzipped) |
| `dist/assets/config-*.js` | Config constants chunk (~22KB gzipped) |
| `dist/assets/validation-*.js` | Validation chunk (~5KB gzipped) |

## Developer commands

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Run tests (against original index.html)
npm run test

# Test icon preview fixes
node test-preview-fix.js
```

## Critical conventions

### 1. Module structure
- All new code should go into `src/modules/` as ES modules
- `src/main.js` is the entry point - it imports and orchestrates all modules
- Keep modules focused: each module should have a single responsibility

### 2. Icon codepoint formats (common bug source)
The app handles two representations of the same icon:
- **ESPHome YAML**: `\U000Fxxxx` (e.g., `\U000F0335`)
- **JavaScript / DOM**: `\uFxxxx` (e.g., `\uF0335`)

When parsing YAML into the UI model, or generating YAML from the model, codepoint conversion must be handled carefully.

### 3. YAML generation targets
The generator produces **single-file, self-contained YAML** (no `!include` dependencies).
- Generated YAML must pass parity checks against `back-garden-cyd-test.yaml` behavior.

### 4. Button types
- `stateless` — simple press action
- `checkable` — syncs with HA entity state, shows different ON/OFF icons

### 5. Secrets
All generated configs must use `!secret` placeholders for:
- `api_encryption_key`
- `ota_password`
- `wifi_ssid`
- `wifi_password`

Never hardcode credentials in generated YAML.

### 6. Window exports for testing
`src/main.js` exports key functions to `window` for backward compatibility with `verify-cyd.js`:
- `window.appState`
- `window.DEFAULT_CONFIG`
- `window.PRESETS`
- `window.ACTION_SCHEMAS`
- `window.HARDWARE_CONFIG`
- `window.generateFullYAML`
- `window.validateConfig`
- `window.YamlGenerationEngine`
- `window.ValidationEngine`

## Testing workflow

Before considering generator changes complete:

1. Run `npm run build` — ensure Vite build succeeds
2. Run `npm run test` or `node verify-cyd.js` — validates:
   - Preset generation (especially `back-garden` preset)
   - Required YAML blocks exist
   - Secret placeholders are present
   - Import roundtrip: generate → parse → re-generate without data loss

3. If you changed icon/codepoint logic, also run `node test-preview-fix.js`.

## Common pitfalls

- **Do not modify `index.html` directly for new features.** Add code to `src/modules/` instead.
- **Do not check in `esphome/` directory.** It is gitignored and contains hardware-specific configs and secrets.
- **YAML string escaping:** ESPHome glyph strings use `\U000Fxxxx` with double backslash in YAML.
- **Font files:** The icon picker expects `fonts/materialdesignicons-webfont.ttf` to exist. Vite copies this to `dist/assets/`.

## Deployment

1. Run `npm run build`
2. The `dist/` folder contains the production build
3. Deploy `dist/` contents to GitHub Pages

## References

- `PRD.md` — Full product requirements, milestones, and acceptance criteria.
- `README.md` — User-facing documentation.
- `back-garden-cyd-test.yaml` — Golden reference for generated YAML structure.
- `vite.config.js` — Vite configuration with chunk splitting.