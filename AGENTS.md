# AGENTS.md — Yellow-CYD-party

> Compact guidance for OpenCode agents working in this repo.
> Last updated: 2026-04-29

## What this repo is

A static GitHub Pages web app (single file: `index.html`) that generates ESPHome YAML configurations for CYD (Cheap Yellow Display / ESP32-2432S028R) button panels.

- **No build system.** No `package.json`, no bundler, no npm.
- **No CI.** Deployed via GitHub Pages from the root of the default branch.
- **Single-file app.** All HTML, CSS, and JS live inside `index.html`.

## Architecture

| File | Role |
|---|---|
| `index.html` | The entire web app (~2500+ lines: HTML + CSS + JS). This is the only source file that matters for the UI. |
| `verify-cyd.js` | Node.js test script. Extracts JS from `index.html`, runs it in `vm`, validates YAML generation, import/export, and roundtrip parity. |
| `test-preview-fix.js` | Standalone Node script for icon preview bug regression tests. |
| `test-import.yaml` | Reference ESPHome YAML using `!include` templates. Generator targets single-file output, but this shows the real-world pattern. |
| `back-garden-cyd-test.yaml` | Expanded reference YAML (no includes). This is the **golden file** for validation. The generator must be able to reproduce behavior equivalent to this config. |
| `back-garden-cyd.yaml` | Currently empty; intended as generator output target. |
| `fonts/` | Local TTF files (`materialdesignicons-webfont.ttf`). Required for the icon picker to render MDI glyphs offline. |
| `esphome/` | **Gitignored.** Not tracked in this repo. Contains real ESPHome configs, templates, and secrets for the author's hardware. |

## Developer commands

```bash
# Validate the generator logic (extracts JS from index.html and runs it in Node VM)
node verify-cyd.js

# Test icon preview fixes
node test-preview-fix.js

# Local preview (no server needed — just open in browser)
open index.html        # macOS
xdg-open index.html    # Linux
```

## Critical conventions

### 1. Single-file app
Never split `index.html` into separate `.js` or `.css` files. The entire app must remain self-contained in one HTML file for GitHub Pages deployment.

### 2. Icon codepoint formats (common bug source)
The app handles two representations of the same icon:
- **ESPHome YAML**: `\U000Fxxxx` (e.g., `\U000F0335`)
- **JavaScript / DOM**: `\uFxxxx` (e.g., `\uF0335`)

When parsing YAML into the UI model, or generating YAML from the model, codepoint conversion must be handled carefully. Past bugs involved stripping the wrong prefix (`\U000` vs `\U000F`).

### 3. YAML generation targets
The generator produces **single-file, self-contained YAML** (no `!include` dependencies). However:
- `test-import.yaml` uses template includes (`templates/cyd_button_sensor.yaml`, `templates/lvgl_sync_template.yaml`, etc.) — these are the real-world patterns the generator abstracts.
- `back-garden-cyd-test.yaml` shows the expanded equivalent.
- Generated YAML must pass parity checks against `back-garden-cyd-test.yaml` behavior.

### 4. Button types
- `stateless` — simple press action
- `checkable` — syncs with HA entity state, shows different ON/OFF icons
- `timer_sync` — uses `timer_sync_template.yaml` logic; shows a default label when inactive

### 5. Secrets
All generated configs must use `!secret` placeholders for:
- `api_encryption_key`
- `ota_password`
- `wifi_ssid`
- `wifi_password`

Never hardcode credentials in generated YAML.

## Testing workflow

Before considering generator changes complete:

1. Run `node verify-cyd.js` — it validates:
   - Preset generation (especially `back-garden` preset)
   - Required YAML blocks exist (`substitutions`, `esp32`, `api`, `wifi`, `font`, `color`, `binary_sensor`, `packages`, `lvgl`)
   - Secret placeholders are present
   - Import roundtrip: generate → parse → re-generate without data loss
   - Specific button actions (media_player, cover, etc.)

2. If you changed icon/codepoint logic, also run `node test-preview-fix.js`.

## Common pitfalls

- **Do not add npm packages or a build pipeline.** This must remain a zero-dependency static site.
- **Do not create separate JS/CSS files.** Keep everything in `index.html`.
- **Do not check in `esphome/` directory.** It is gitignored and contains hardware-specific configs and secrets.
- **YAML string escaping:** ESPHome glyph strings use `\U000Fxxxx` with double backslash in YAML. The generator must emit this correctly.
- **Font files:** The icon picker expects `fonts/materialdesignicons-webfont.ttf` to exist locally. If adding new glyphs, ensure the TTF file supports them or the picker will show blank squares.

## References

- `PRD.md` — Full product requirements, milestones, and acceptance criteria.
- `README.md` — User-facing documentation.
- `back-garden-cyd-test.yaml` — Golden reference for generated YAML structure.
