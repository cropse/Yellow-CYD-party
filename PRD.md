# PRD — CYD ESPHome YAML Generator (GitHub Pages)

## 1) Product Summary

Build a **modern JavaScript web app for GitHub Pages** that lets users visually configure a CYD (ESP32-2432S028R) button panel and generate a production-ready ESPHome YAML file.

Important interpretation:
- "Single-file" applies to the **generated ESPHome YAML output** (one generated YAML file), not the frontend code structure.
- The generator should produce a **self-contained YAML as much as possible** (minimal external file dependencies).

The app must align with existing project resources as references/patterns (not by recreating the same folder structure), especially:
- `esphome/back-garden-cyd.yaml` (reference complete config)
- `esphome/templates/*` (reusable patterns)
- `esphome/layouts/*` (widget/layout style patterns)
- `esphome/secrets.yaml` (sensitive values handled via `!secret` references, never hardcoded)

Golden target for validation:
- `esphome/back-garden-cyd.yaml` is the **final goal reference** for generator correctness.
- Even if generation uses template-inspired logic, final output must be validated against the behavior and structure represented by this file.

---

## 2) Goals

1. Generate ESPHome config from user settings, following `back-garden-cyd.yaml` structure.
2. Provide UI to customize each button (HA action/function, icon, text, color, press behavior, etc.).
3. Preserve secret-management best practices (`!secret` placeholders).
4. Generate **one YAML file output** as much as possible (self-contained, minimal includes).
5. Support both **import and export YAML config**.

---

## 3) Non-Goals (for v1)

- Multi-file frontend framework setup (React/Vue build pipeline).
- Backend services or cloud persistence.
- Automatic validation against every ESPHome schema edge-case.
- Full WYSIWYG editor for all raw YAML nodes.

---

## 4) Target Users

- Home Assistant + ESPHome users with CYD hardware.
- Users who want to avoid hand-editing long YAML files.
- Users who need repeatable button layouts with HA integrations.

---

## 5) User Stories

1. As a user, I can set device basics (device name, friendly name, dimensions), so generated YAML is ready to flash.
2. As a user, I can configure each of 12 buttons (text/icon/color/action), so the panel matches my room controls.
3. As a user, I can configure short press and optional long press actions per button.
4. As a user, I can choose stateless or stateful/checkable button behavior where applicable.
5. As a user, I can export generated YAML to file.
6. As a user, I can import an existing YAML file and continue editing.
7. As a user, I can generate YAML that references `!secret` keys instead of exposing credentials.

---

## 6) Functional Requirements

### 6.1 App Shell & Platform

- Must run as static GitHub Pages site.
- Must require no backend services.
- Must work in modern desktop browsers; mobile-friendly layout preferred.

### 6.2 Configuration Inputs

Provide forms for:
- Device metadata: `device_name`, `nice_name`, width, height.
- Core ESPHome blocks: `esp32`, `api`, `ota`, `wifi`, `logger`, `time`, `captive_portal`.
- Secret references (key names only, not raw secret values):
  - `api_encryption_key`
  - `ota_password`
  - `wifi_ssid`
  - `wifi_password`

### 6.3 Button Customization (12-button CYD grid)

Per button, support:
- Button ID/index mapping (btn_1..btn_12)
- Display text/label
- Icon glyph (Material Design icon codepoint)
- Text/icon color (hex)
- Button type:
  - Stateless
  - Stateful/checkable (with entity-state sync configuration)
- Home Assistant action configuration:
  - action name (e.g., `script.xxx`, `switch.toggle`, `cover.open_cover`, `media_player.media_play_pause`)
  - action data payload (entity_id/device_id/position/etc.)
- Press behavior:
  - short press (required)
  - long press (optional)
  - min/max click lengths

### 6.4 YAML Generation

Generated YAML should follow existing reference patterns:
- Match major block ordering and style from `esphome/back-garden-cyd.yaml`.
- Prefer a **single generated YAML file** with expanded blocks instead of external `!include`/`packages` dependencies whenever feasible.
- Use template/include style only as a fallback when a section cannot be represented cleanly inline.
- Generate `color` entries for button colors.
- Generate `binary_sensor` handlers for button click logic.
- Generate state-sync logic for stateful buttons directly in output YAML where practical.
- Functional parity with `esphome/back-garden-cyd.yaml` is the primary definition of done for v1.

### 6.5 Import/Export (YAML)

- **Export YAML**: Download generated configuration as `.yaml`.
- **Import YAML**: Load `.yaml` and parse into editable UI model.
- If unsupported/custom blocks are encountered on import:
  - Preserve raw blocks where possible
  - Show user warning of partially mapped fields

### 6.6 Validation & Guardrails

- Validate required fields (device name, at least short action for active buttons).
- Validate color format and button index uniqueness.
- Validate action payload as YAML-compatible object.
- Warn if secret values are hardcoded and offer conversion to `!secret`.

---

## 7) Secrets & Security Requirements

1. Do not embed sensitive values in generated config by default.
2. Always prefer `!secret <key>` references for wifi/api/ota values.
3. If user imports raw credentials, mark as sensitive and recommend conversion.
4. No network upload of configuration by default (local-only generation).
5. Any local persistence (e.g., localStorage) must exclude plaintext secrets unless user explicitly opts in.

---

## 8) UX Requirements

- Modern, clean interface with clear sections:
  - Device settings
  - 12-button grid preview
  - Selected button editor panel
  - YAML preview/output panel
- Real-time preview updates when button settings change.
- Fast workflows:
  - Duplicate button config
  - Reset button to defaults
  - Apply style/theme presets
- Clear error messages and inline field validation.

---

## 9) Data Model (v1)

Recommended internal model:
- `appConfig`
  - `device` (name, friendly name, dimensions)
  - `secrets` (secret key names only)
  - `buttons[]` (12 records)
    - `id`, `label`, `icon`, `color`
    - `type` (`stateless` | `stateful`)
    - `shortAction` { `action`, `data`, `minLen`, `maxLen` }
    - `longAction?` { `action`, `data`, `minLen`, `maxLen` }
    - `sync?` { `ha_entity`, `on_state`, `ico_on`, `ico_off` }
  - `advanced` (raw blocks / passthrough if needed)

---

## 10) Technical Constraints

- Static GitHub Pages project only.
- No backend dependency.
- Vanilla JS preferred (or minimal dependency footprint compatible with static hosting).
- Output must remain compatible with current ESPHome versions used in repo patterns.

---

## 11) Acceptance Criteria

1. User can configure 12 buttons and export valid YAML file.
2. Generated YAML contains secret references (`!secret ...`) for wifi/api/ota.
3. User can import an existing YAML and recover editable button settings for known patterns.
4. Stateful button settings correctly produce sync-related YAML sections.
5. App runs directly from GitHub Pages with no backend.
6. Generated result is a single YAML file (self-contained as much as practical).
7. A generated "back-garden target" config can be produced that matches the key behavior and structure of `esphome/back-garden-cyd.yaml`.

---

## 12) Validation & Test Plan (Golden File Based)

### 12.1 Golden File
- Golden reference: `esphome/back-garden-cyd.yaml`

### 12.2 Validation Method
- Create a predefined app preset: **Back Garden Target**.
- Generate YAML from that preset.
- Compare generated output against golden reference using:
  - Required block presence and ordering checks
  - Button action mapping checks (btn_1..btn_12)
  - Stateful sync behavior checks
  - Secret placeholder checks (`!secret` usage)

### 12.3 Pass Criteria
- No missing critical sections used by the golden file.
- No hardcoded sensitive credentials where golden file expects secrets.
- Equivalent button behavior (short/long press actions and state sync logic) for the mapped buttons.
- Any intentional differences (e.g., inlining vs include style) are documented and do not change behavior.

---

## 13) Milestones

### Milestone 1 — Core Generator
- Build UI scaffolding and 12-button editor
- Implement YAML generation from internal model
- Export YAML file

### Milestone 2 — Import & Mapping
- Implement YAML import parser
- Map known `back-garden-cyd.yaml` patterns to UI fields
- Add partial-import warnings for unknown nodes

### Milestone 3 — Polish & Safety
- Improve UX and validation
- Secret handling warnings and conversion helpers
- Final compatibility checks against sample files under `esphome/`
- Golden-file parity validation against `esphome/back-garden-cyd.yaml`

---

## 14) Open Questions (to resolve during implementation)

1. Should v1 support only CYD 320x240 layout, or also `480x320` and `800x480` templates now?
2. For import: should unknown blocks be fully preserved as raw YAML passthrough in export?
3. Should icon selection be codepoint-only (fast) or include searchable MDI catalog in-app?
