# Board Selection Feature

## TL;DR
> **Summary**: Add a board selector to Global settings and make ESPHome YAML generation board-aware for ESP32-2432S028-2port, four makeitworktech/LCDWiki CYD variants, and Guition JC4827543C. Replace hardcoded hardware assumptions with a structured board registry, TDD coverage, board-driven substitutions, scaled LVGL layout, and RGB LED compatibility behavior.
> **Deliverables**:
> - Board registry with six selectable boards and complete metadata.
> - Global Settings board selector with persisted `board` state.
> - Board-specific ESPHome hardware YAML generation.
> - Board-driven width/height substitutions and scaled 4x3 LVGL grid.
> - RGB LED auto-disable/omit behavior for boards without RGB LED.
> - TDD test coverage for registry, YAML, import/export, validation, UI, and regressions.
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Board registry schema/tests → YAML generation tests/implementation → state/import/validation wiring → UI selector + LVGL scaling → verification

## Context
### Original Request
User said this project is now only for `ESP32-2432S028-2port`, but each board may have different settings such as screen settings and external LED. User asked to compare their board to boards from `https://github.com/makeitworktech/ESP32-CYD-ESPHome/tree/main/ESPHome%20Examples`, list all setting differences, and create a board-selection feature so users can select their board for generated config. User later added support for `https://devices.esphome.io/devices/guition-jc4827543c/`.

### Interview Summary
- Scope: support all researched boards in v1.
- Boards:
  - `esp32-2432s028-2port`
  - `esp32-e32r28t`
  - `esp32-3248s035c`
  - `esp32-e32r35t`
  - `esp32-e32r40t`
  - `guition-jc4827543c`
- Default board: `esp32-2432s028-2port`.
- Selector location: Global Settings beside device name, nice name, and display timeout.
- No-RGB boards: auto-disable/hide RGB LED controls and omit RGB LED YAML.
- Legacy JSON configs without `board`: silently default to `esp32-2432s028-2port`.
- Test strategy: TDD.
- Larger displays: generated LVGL grid should scale/increase based on selected board dimensions.

### Metis Review (gaps addressed)
- Added stable canonical board IDs and selector labels.
- Added explicit board registry schema and metadata completeness tests.
- Added unknown-board policy: import fallback defaults to `esp32-2432s028-2port`; validation flags unknown board IDs in normalized/user-authored config.
- Added LVGL scaling algorithm.
- Added guardrails against custom boards, pin editors, audio/SD/battery scope creep, and unrelated refactors.
- Added default-board regression tests and no-RGB stale-state edge cases.

## Work Objectives
### Core Objective
Make the app generate valid, board-specific ESPHome YAML from a persisted board selection while preserving the existing default-board behavior and current button-grid user workflow.

### Deliverables
- `src/modules/config.js` exports board definitions, default board ID, board lookup helpers, and no longer treats one hardcoded `HARDWARE_CONFIG` string as the only hardware truth.
- `src/modules/yaml-engine.js` consumes board metadata for substitutions, hardware config, RGB LED inclusion, and LVGL dimensions.
- `src/modules/import.js` preserves/imports `board`, defaults legacy configs, and handles unknown board imports predictably.
- `src/modules/validation-engine.js` validates supported board IDs and no-RGB compatibility.
- `src/main.js` wires a Global Settings board selector into state, rendering, YAML regeneration, validation, and LED UI compatibility.
- `index.html` contains minimal semantic markup for the board selector if static markup is required; feature logic remains in `src/modules/`/`src/main.js`.
- Tests cover board registry completeness, YAML output fragments per board, import/export, validation, UI selector behavior, LVGL scaling, and default-board regressions.

### Definition of Done (verifiable conditions with commands)
- `node src/modules/tests/test-board-registry.js` passes.
- `node src/modules/tests/test-yaml-board-generation.js` passes.
- `node src/modules/tests/test-import-export-board.js` passes.
- `node src/modules/tests/test-validation-board.mjs` passes.
- Existing module tests still pass:
  - `node src/modules/tests/test-yaml.js`
  - `node src/modules/tests/test-store.js`
  - `node src/modules/tests/test-import.js`
  - `node src/modules/tests/test-schemas.mjs`
  - `node src/modules/tests/test-validation.mjs`
- `node test-preview-fix.js` passes.
- `npm run build` succeeds.
- `npm test` succeeds.
- `node ci/test-cyd-integration.cjs` passes or, if the command is blocked by environment, the executor records the exact environment blocker and runs a Playwright-equivalent local QA using the same selectors.

### Must Have
- Stable board IDs exactly:
  - `esp32-2432s028-2port`
  - `ESP32-2432S028`
  - `esp32-e32r28t`
  - `esp32-3248s035c`
  - `esp32-e32r35t`
  - `esp32-e32r40t`
  - `guition-jc4827543c`
- Selector labels exactly:
  - `ESP32-2432S028-2port (320×240)`
  - `ESP32-2432S028 (320×240)`
  - `ESP32-E32R28T (320×240)`
  - `ESP32-3248S035C (480×320)`
  - `ESP32-E32R35T (480×320)`
  - `ESP32-E32R40T (480×320)`
  - `Guition JC4827543C (480×272)`
- Board registry schema must include `id`, `label`, `width`, `height`, `capabilities.rgbLed`, `hardware`, and enough display/touch/backlight/RGB metadata to render YAML.
- Board-driven substitutions: generated `width` and `height` come from selected board metadata.
- LVGL keeps the existing logical 4 columns x 3 rows and scales cell dimensions using selected board dimensions.
- LVGL scaling algorithm:
  - Board content width = `board.width`.
  - Board content height = `board.height`.
  - Columns = 4, rows = 3.
  - Gap ratio follows current layout intent: horizontal/vertical gap defaults to `4` for 320x240; scaled gap = `Math.max(4, Math.round(Math.min(width / 320, height / 240) * 4))`.
  - Outer margin = scaled gap.
  - Cell width = `Math.floor((width - outerMargin * 2 - gap * (columns - 1)) / columns)`.
  - Cell height = `Math.floor((height - outerMargin * 2 - gap * (rows - 1)) / rows)`.
  - Default board must compute the same or intentionally equivalent layout as current output; if exact current values differ, update tests to document the intentional difference.
- No-RGB boards (`esp32-e32r28t`, `guition-jc4827543c`) hide/disable RGB LED controls and never emit RGB LED `output:` or `light:` YAML.
- RGB-capable boards preserve LED state when switching away and back.
- Guition generates ESP32-S3/ESP-IDF/PSRAM/QSPI/GT911-specific YAML, not a CYD SPI/XPT2046 config.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No custom board editor.
- No arbitrary pin editor.
- No upload/flash-to-device flow.
- No runtime board auto-detection.
- No audio, SD card, speaker, battery ADC, LDR, or extra I2C peripheral UI/generation beyond minimum display/touch/backlight/current RGB behavior.
- No full rewrite of `main.js`; only wire board selection and compatibility behavior.
- No class hierarchy or over-engineered hardware abstraction.
- No secrets or credentials in generated YAML.
- No hardcoded `320`/`240` in generation paths except as board registry data or baseline scaling constants in a named helper.
- No fixing unrelated Playwright typo unless it blocks the planned E2E command; if fixed, keep it scoped inside the UI test task.
- No direct feature logic in `index.html`; static markup only if needed.

## Board Comparison Source of Truth

| Setting | ESP32-2432S028-2port | ESP32-E32R28T | ESP32-3248S035C | ESP32-E32R35T | ESP32-E32R40T | Guition JC4827543C |
|---|---|---|---|---|---|---|
| Board ID | `esp32-2432s028-2port` | `esp32-e32r28t` | `esp32-3248s035c` | `esp32-e32r35t` | `esp32-e32r40t` | `guition-jc4827543c` |
| ESP32 board | `esp32dev` | `esp32dev` | `esp32dev` | `esp32dev` | `esp32dev` | `esp32-s3-devkitc-1` |
| Framework | Arduino | Arduino | Arduino | Arduino | Arduino | ESP-IDF |
| Variant/PSRAM | none | none | none | none | none | `variant: esp32s3`, `psram: octal 80MHz` |
| Resolution | 320×240 | 320×240 | 480×320 | 480×320 | 480×320 | 480×272 |
| Display | ILI/ST7789V-compatible per source | ILI9341 | ST7796 | ST7796 | ST7796 | NV3041A via QSPI DBI custom config |
| Color order | default RGB | default RGB | BGR | BGR | BGR | invert colors true |
| SPI topology | dual SPI display+touch | dual SPI display+touch | shared SPI | shared SPI | shared SPI | quad SPI display + I2C touch |
| Display pins | CS GPIO15, DC GPIO2 | CS GPIO15, DC GPIO2, reset GPIO4 | CS GPIO15, DC GPIO2 | CS GPIO15, DC GPIO2 | CS GPIO15, DC GPIO2 | QSPI CLK GPIO47, D0 GPIO21, D1 GPIO48, D2 GPIO40, D3 GPIO39, CS GPIO45 |
| Backlight | GPIO21 | GPIO21 | GPIO27 | GPIO27 | GPIO27 | GPIO1 |
| RGB LED | R GPIO4, G GPIO17, B GPIO16 | none | R GPIO22, G GPIO16, B GPIO17 | R GPIO22, G GPIO16, B GPIO17 | R GPIO22, G GPIO16, B GPIO17 | none |
| Touch | XPT2046 CS GPIO33 IRQ GPIO36, separate SPI GPIO25/32/39 | XPT2046 same | XPT2046 shared SPI | XPT2046 shared SPI | XPT2046 shared SPI | GT911 I2C SDA GPIO8 SCL GPIO4 IRQ GPIO3 reset GPIO38 |
| Touch calibration/transform | x 180-3800, y 240-3860, swap XY | x 180-3800, y 240-3860, swap XY | x/y 200-3900, swap XY, mirror X | x/y 200-3900, swap XY, mirror X | x/y 200-3900, swap XY, mirror X/Y | mirror X/Y |
| I2C | current app has I2C GPIO27/22; source examples may omit | omitted | omitted | GPIO25/32 optional header | GPIO25/32 optional header | GPIO8/4 required for touch |

References for implementer:
- Codebase hardware choke point: `src/modules/config.js` (`HARDWARE_CONFIG`, `DEFAULT_CONFIG`, `PRESETS`).
- YAML concatenation/substitutions: `src/modules/yaml-engine.js` (`generateFullYAML`, `generateSubstitutions`).
- Import normalization: `src/modules/import.js` (`normalizeImportedConfig`, `importFromYAML`).
- Validation: `src/modules/validation-engine.js` (`validateConfig`).
- UI orchestration: `src/main.js` global settings, preset, import/export, state load/save, YAML generation paths.
- UI markup: `index.html` Global Settings area and Device Hardware/RGB LED panel.
- External CYD examples: `https://github.com/makeitworktech/ESP32-CYD-ESPHome/tree/main/ESPHome%20Examples`.
- Guition source: `https://devices.esphome.io/devices/guition-jc4827543c/`.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: TDD using existing standalone Node tests, post-build verification, and Playwright E2E.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 board registry TDD + implementation, Task 2 YAML generation tests, Task 3 import/validation tests, Task 4 UI/E2E tests.
Wave 2: Task 5 YAML hardware generation implementation, Task 6 state/import/export/validation implementation, Task 7 Global Settings UI implementation.
Wave 3: Task 8 LVGL scaling implementation, Task 9 no-RGB compatibility and stale-state handling, Task 10 integration/build verification updates.
Wave 4: Task 11 documentation/user-facing copy updates, Task 12 final regression and cleanup.

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1 | none | 5, 6, 7, 8, 9 |
| 2 | none | 5, 8, 9 |
| 3 | none | 6 |
| 4 | none | 7, 9, 10 |
| 5 | 1, 2 | 8, 9, 10 |
| 6 | 1, 3 | 7, 9, 10 |
| 7 | 1, 4, 6 | 9, 10 |
| 8 | 1, 2, 5 | 10 |
| 9 | 1, 2, 5, 6, 7 | 10 |
| 10 | 5, 6, 7, 8, 9 | 12 |
| 11 | 5, 6, 7, 8, 9 | 12 |
| 12 | 10, 11 | final verification |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Tasks | Categories |
|---|---:|---|
| 1 | 4 | quick, quick, quick, visual-engineering |
| 2 | 3 | deep, quick, visual-engineering |
| 3 | 3 | deep, quick, unspecified-high |
| 4 | 2 | writing, unspecified-high |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add board registry tests and registry implementation

  **What to do**: Write `src/modules/tests/test-board-registry.js` first. It must fail before implementation. Then implement a structured board registry in `src/modules/config.js` with named exports: `DEFAULT_BOARD_ID`, `BOARD_CONFIGS`, `BOARD_OPTIONS`, `getBoardConfig(boardId)`, `isSupportedBoard(boardId)`, and `getDefaultBoardConfig()`. Add `board: DEFAULT_BOARD_ID` to `DEFAULT_CONFIG` and all preset configs unless presets intentionally inherit default via normalization. Preserve named exports and module side-effect-free style.

  Required registry shape per board:
  ```js
  {
    id: 'esp32-2432s028-2port',
    label: 'ESP32-2432S028-2port (320×240)',
    width: 320,
    height: 240,
    capabilities: { rgbLed: true, touch: true },
    hardware: {
      esp32: { board: 'esp32dev', framework: 'arduino' },
      display: { /* driver/model/pins/transform */ },
      touch: { /* driver/pins/calibration/transform */ },
      backlight: { pin: 'GPIO21', frequency: '1000Hz' },
      rgbLed: { redPin: 'GPIO4', greenPin: 'GPIO17', bluePin: 'GPIO16', inverted: true }
    }
  }
  ```
  Exact metadata must cover all rows in “Board Comparison Source of Truth.”

  **Must NOT do**: Do not generate YAML here if keeping config as pure data is simpler. Do not introduce custom board editing, pin editing, classes, or side effects. Do not delete `HARDWARE_CONFIG` until dependent YAML implementation is ready; deprecate or wrap it if needed for tests.

  **Recommended Agent Profile**:
  - Category: `quick` - focused data/schema/test addition.
  - Skills: [] - no specialized skill required.
  - Omitted: [`impeccable`] - not a UI task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5, 6, 7, 8, 9 | Blocked By: none

  **References**:
  - Pattern: `src/modules/config.js` - `DEFAULT_CONFIG`, `PRESETS`, `HARDWARE_CONFIG`, named export style.
  - Test: `src/modules/tests/test-yaml.js` - standalone Node assertion style to follow.
  - Source: `https://github.com/makeitworktech/ESP32-CYD-ESPHome/tree/main/ESPHome%20Examples` - CYD board metadata.
  - Source: `https://devices.esphome.io/devices/guition-jc4827543c/` - Guition metadata.

  **Acceptance Criteria**:
  - [ ] `node src/modules/tests/test-board-registry.js` prints/passes assertions for all six board IDs.
  - [ ] Test asserts `DEFAULT_BOARD_ID === 'esp32-2432s028-2port'`.
  - [ ] Test asserts every board has `id`, `label`, numeric `width`, numeric `height`, `capabilities.rgbLed`, and `hardware`.
  - [ ] Test asserts `esp32-e32r28t` and `guition-jc4827543c` have `capabilities.rgbLed === false`.
  - [ ] Test asserts Guition has `esp32.board === 'esp32-s3-devkitc-1'`, `framework === 'esp-idf'`, and PSRAM metadata.

  **QA Scenarios**:
  ```
  Scenario: Board registry exposes all required boards
    Tool: Bash
    Steps: Run `node src/modules/tests/test-board-registry.js`.
    Expected: Command exits 0 and reports all six board IDs plus default board assertions.
    Evidence: .sisyphus/evidence/task-1-board-registry.txt

  Scenario: Missing required board metadata fails test
    Tool: Bash
    Steps: Temporarily inspect test assertions or run with implementation untouched before green phase.
    Expected: Initial red phase fails before implementation; final green phase exits 0.
    Evidence: .sisyphus/evidence/task-1-board-registry-red-green.txt
  ```

  **Commit**: YES | Message: `feat(board): add board registry` | Files: [`src/modules/config.js`, `src/modules/tests/test-board-registry.js`]

- [x] 2. Add YAML board-generation TDD coverage

  **What to do**: Create `src/modules/tests/test-yaml-board-generation.js` before changing YAML implementation. Tests must exercise the public YAML-generation path with selected board IDs and assert exact YAML fragments for substitutions, top-level hardware sections, RGB inclusion/omission, display/touch drivers, backlight pins, and unique board traits.

  Mandatory assertions:
  - Default board produces `width: "320"`/`height: "240"` or equivalent YAML values and preserves current default hardware behavior.
  - `esp32-3248s035c`, `esp32-e32r35t`, and `esp32-e32r40t` produce 480x320 substitutions.
  - Guition produces 480x272 substitutions, `esp32-s3-devkitc-1`, `framework: esp-idf`, `psram:`, QSPI display config, GT911 touch config, and GPIO1 backlight.
  - No-RGB boards omit RGB LED output/light IDs.
  - RGB-capable boards include RGB LED output/light IDs.

  **Must NOT do**: Do not weaken tests to only check board labels. Do not rely on fragile full-string snapshots for every line; assert meaningful fragments per board.

  **Recommended Agent Profile**:
  - Category: `quick` - focused tests.
  - Skills: [] - no specialized skill required.
  - Omitted: [`impeccable`] - not a UI task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5, 8, 9 | Blocked By: none

  **References**:
  - Pattern: `src/modules/tests/test-yaml.js` - current YAML test style.
  - API: `src/modules/yaml-engine.js` - `generateFullYAML` dependency injection shape.
  - Pattern: `src/modules/config.js` - current `HARDWARE_CONFIG` and future `BOARD_CONFIGS`.

  **Acceptance Criteria**:
  - [ ] Test file exists and fails before implementation.
  - [ ] `node src/modules/tests/test-yaml-board-generation.js` exits 0 after implementation.
  - [ ] Tests cover at least one unique YAML fragment for every board ID.
  - [ ] Tests cover Guition as a first-class board, not a skipped TODO.

  **QA Scenarios**:
  ```
  Scenario: YAML generation differentiates boards
    Tool: Bash
    Steps: Run `node src/modules/tests/test-yaml-board-generation.js`.
    Expected: Command exits 0; output confirms board-specific substitutions and hardware fragments.
    Evidence: .sisyphus/evidence/task-2-yaml-generation.txt

  Scenario: No-RGB boards do not leak RGB YAML
    Tool: Bash
    Steps: Run the same test and inspect assertions for `esp32-e32r28t` and `guition-jc4827543c`.
    Expected: Assertions prove no RGB LED output/light IDs are emitted for no-RGB boards.
    Evidence: .sisyphus/evidence/task-2-no-rgb-yaml.txt
  ```

  **Commit**: YES | Message: `test(board): cover board yaml output` | Files: [`src/modules/tests/test-yaml-board-generation.js`]

- [x] 3. Add import/export and validation TDD coverage

  **What to do**: Create `src/modules/tests/test-import-export-board.js` and `src/modules/tests/test-validation-board.mjs` before implementation. Cover legacy defaulting, selected-board preservation, unknown-board import behavior, validation of supported IDs, and validation failure for unknown IDs after normalization/user-authored config validation.

  Decision to encode:
  - Missing `board` in imported JSON: silently default to `esp32-2432s028-2port`.
  - Unknown `board` during import normalization: default to `esp32-2432s028-2port` to avoid breaking user files.
  - Unknown `board` passed to validation in an already-normalized/user-authored config: validation reports an error.

  **Must NOT do**: Do not reject legacy configs. Do not silently pass unknown board IDs through validation.

  **Recommended Agent Profile**:
  - Category: `quick` - focused tests.
  - Skills: [] - no specialized skill required.
  - Omitted: [`impeccable`] - not a UI task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6 | Blocked By: none

  **References**:
  - Pattern: `src/modules/tests/test-import.js` - import test style.
  - Pattern: `src/modules/tests/test-validation.mjs` - validation test style.
  - API: `src/modules/import.js` - `normalizeImportedConfig`.
  - API: `src/modules/validation-engine.js` - `validateConfig`.

  **Acceptance Criteria**:
  - [ ] `node src/modules/tests/test-import-export-board.js` exits 0 after implementation.
  - [ ] `node src/modules/tests/test-validation-board.mjs` exits 0 after implementation.
  - [ ] Tests fail before implementation.
  - [ ] Tests assert missing and unknown imported boards both default to `esp32-2432s028-2port`.
  - [ ] Tests assert validation flags unknown board IDs.

  **QA Scenarios**:
  ```
  Scenario: Legacy import defaults silently
    Tool: Bash
    Steps: Run `node src/modules/tests/test-import-export-board.js`.
    Expected: Legacy config without `board` normalizes to `esp32-2432s028-2port` without error.
    Evidence: .sisyphus/evidence/task-3-legacy-import.txt

  Scenario: Unknown board validation is explicit
    Tool: Bash
    Steps: Run `node src/modules/tests/test-validation-board.mjs`.
    Expected: Unknown board ID produces validation error; supported IDs pass.
    Evidence: .sisyphus/evidence/task-3-validation-board.txt
  ```

  **Commit**: YES | Message: `test(board): cover import and validation` | Files: [`src/modules/tests/test-import-export-board.js`, `src/modules/tests/test-validation-board.mjs`]

- [x] 4. Add UI/E2E TDD coverage for board selector

  **What to do**: Add or extend browser/E2E coverage in `ci/test-cyd-integration.cjs` for board selector behavior. If the existing test harness lacks stable selectors, the test should first document required selectors that implementation must add: `#board-select`, `#rgb-led-controls` or equivalent container, and existing YAML output selector. Use the working `ci/test-cyd-integration.cjs`, not `ci/playwright-test.js` unless the latter must be fixed separately.

  Required E2E assertions:
  - Board selector is visible in Global Settings.
  - Default selected board is `esp32-2432s028-2port`.
  - Selecting Guition hides/disables RGB LED controls.
  - Generated YAML for Guition contains width 480, height 272, ESP32-S3/ESP-IDF, and no RGB LED config.
  - Switching back to default shows/enables RGB LED controls and generates width 320, height 240.

  **Must NOT do**: Do not require manual clicking outside Playwright. Do not add selectors with brittle text-only matching if IDs can be added.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - browser UI behavior and selectors.
  - Skills: [`impeccable`] - UI/UX selector placement and compatibility behavior.
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7, 9, 10 | Blocked By: none

  **References**:
  - UI: `index.html` Global Settings and Device Hardware/RGB LED panel.
  - Orchestration: `src/main.js` global settings event listeners and YAML generation.
  - Test: `ci/test-cyd-integration.cjs` - working Playwright E2E suite.

  **Acceptance Criteria**:
  - [ ] E2E test fails before selector implementation.
  - [ ] `node ci/test-cyd-integration.cjs` exits 0 after implementation or records a concrete environment blocker.
  - [ ] Tests use stable selectors, including `#board-select`.
  - [ ] Test proves no-RGB UI behavior and YAML behavior are connected.

  **QA Scenarios**:
  ```
  Scenario: Board selector controls generated YAML
    Tool: Bash / Playwright
    Steps: Run `node ci/test-cyd-integration.cjs`.
    Expected: Selector defaults to ESP32-2432S028-2port; selecting Guition updates generated YAML to 480x272 ESP32-S3 config.
    Evidence: .sisyphus/evidence/task-4-board-selector-e2e.txt

  Scenario: RGB controls follow board capability
    Tool: Bash / Playwright
    Steps: Select Guition, assert RGB controls hidden/disabled; select default board, assert RGB controls visible/enabled.
    Expected: Binary pass/fail assertions pass.
    Evidence: .sisyphus/evidence/task-4-rgb-ui-e2e.txt
  ```

  **Commit**: YES | Message: `test(board): cover selector ui` | Files: [`ci/test-cyd-integration.cjs`]

- [x] 5. Implement board-specific hardware YAML generation

  **What to do**: Replace the single-board hardware generation path with board-selected hardware YAML rendering. Keep the existing `generateFullYAML(config, deps)` API compatible where possible, but allow it to derive or receive selected board metadata. Add helpers in `src/modules/yaml-engine.js` or a small new module under `src/modules/` if clearer, such as `generateHardwareConfig(boardConfig)` and `generateBoardSubstitutions(config, boardConfig, deps)`. Preserve existing output for the default board unless tests document an intentional change.

  YAML rendering requirements:
  - CYD/LCDWiki boards generate `esp32: board: esp32dev` and Arduino framework.
  - Guition generates `esp32-s3-devkitc-1`, `variant: esp32s3`, `flash_size: 4MB` if supported by source, ESP-IDF framework, and `psram:` octal 80MHz.
  - 320x240 boards use dual SPI for display/touch where specified.
  - 480x320 CYD boards use shared SPI and ST7796/BGR metadata.
  - Guition uses quad SPI/QSPI DBI display metadata and GT911 I2C touch.
  - Backlight pin changes by board.
  - RGB outputs/lights emit only when `capabilities.rgbLed === true`.
  - Existing app LED behavior remains supported on RGB-capable boards.

  **Must NOT do**: Do not emit placeholder TODO YAML. Do not copy absolute Windows font paths from examples. Do not change secrets behavior. Do not emit audio/SD/battery configs.

  **Recommended Agent Profile**:
  - Category: `deep` - core generation path with multiple board-specific branches.
  - Skills: [] - no specialized skill required.
  - Omitted: [`impeccable`] - not UI.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 8, 9, 10 | Blocked By: 1, 2

  **References**:
  - Pattern: `src/modules/yaml-engine.js` - `generateFullYAML`, `generateSubstitutions`, existing section functions.
  - Pattern: `src/modules/config.js` - board registry from Task 1.
  - Test: `src/modules/tests/test-yaml-board-generation.js` from Task 2.
  - Golden: `back-garden-cyd-test.yaml` for default output expectations.

  **Acceptance Criteria**:
  - [ ] `node src/modules/tests/test-yaml-board-generation.js` passes.
  - [ ] `node src/modules/tests/test-yaml.js` still passes.
  - [ ] Default board output keeps existing secrets placeholders and Home Assistant action behavior.
  - [ ] Guition output includes ESP-IDF, PSRAM, QSPI display, GT911 touch, GPIO1 backlight, and no RGB LED.
  - [ ] No-RGB boards do not emit stale RGB LED YAML even if `config.led.enabled === true`.

  **QA Scenarios**:
  ```
  Scenario: Default board regression remains stable
    Tool: Bash
    Steps: Run `node src/modules/tests/test-yaml.js && node src/modules/tests/test-yaml-board-generation.js`.
    Expected: Both commands exit 0; default board assertions pass.
    Evidence: .sisyphus/evidence/task-5-default-yaml-regression.txt

  Scenario: Guition hardware output is first-class
    Tool: Bash
    Steps: Run `node src/modules/tests/test-yaml-board-generation.js` and inspect Guition-specific assertions.
    Expected: QSPI/ESP-IDF/PSRAM/GT911/backlight/no-RGB assertions pass.
    Evidence: .sisyphus/evidence/task-5-guition-yaml.txt
  ```

  **Commit**: YES | Message: `feat(board): generate hardware yaml by board` | Files: [`src/modules/yaml-engine.js`, `src/modules/config.js`, optional `src/modules/board-hardware.js`]

- [x] 6. Implement board state, import/export, and validation

  **What to do**: Wire `board` through `DEFAULT_CONFIG`, preset loading, localStorage state, JSON export, JSON import normalization, and validation. `normalizeImportedConfig` must default missing and unknown imported boards to `DEFAULT_BOARD_ID`. `validateConfig` must validate supported board IDs and flag unknown IDs when validating configs. Ensure existing import-from-YAML does not crash when board metadata cannot be inferred; it should default to `DEFAULT_BOARD_ID` unless a safe inference helper is explicitly implemented and tested.

  **Must NOT do**: Do not make legacy configs fail. Do not require YAML import to infer every board. Do not delete user LED settings when switching boards.

  **Recommended Agent Profile**:
  - Category: `quick` - state/normalization/validation wiring.
  - Skills: [] - no specialized skill required.
  - Omitted: [`impeccable`] - not UI.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7, 9, 10 | Blocked By: 1, 3

  **References**:
  - API: `src/modules/import.js` - `normalizeImportedConfig`, `importFromYAML`.
  - API: `src/modules/validation-engine.js` - `validateConfig`.
  - State: `src/modules/store.js` - flat state object behavior.
  - Orchestration: `src/main.js` - import/export and preset loading paths.

  **Acceptance Criteria**:
  - [ ] `node src/modules/tests/test-import-export-board.js` passes.
  - [ ] `node src/modules/tests/test-validation-board.mjs` passes.
  - [ ] Existing `node src/modules/tests/test-import.js` and `node src/modules/tests/test-validation.mjs` still pass.
  - [ ] Exported JSON includes `board`.
  - [ ] Legacy JSON without `board` imports as `esp32-2432s028-2port`.
  - [ ] Unknown imported `board` defaults to `esp32-2432s028-2port`; validation reports unknown if passed directly.

  **QA Scenarios**:
  ```
  Scenario: Board persists through export/import
    Tool: Bash
    Steps: Run `node src/modules/tests/test-import-export-board.js`.
    Expected: Export includes selected board and import restores it.
    Evidence: .sisyphus/evidence/task-6-board-import-export.txt

  Scenario: Legacy compatibility holds
    Tool: Bash
    Steps: Run existing import and validation tests plus new board tests.
    Expected: Existing tests pass; legacy config defaults silently to default board.
    Evidence: .sisyphus/evidence/task-6-legacy-compat.txt
  ```

  **Commit**: YES | Message: `feat(board): persist and validate selected board` | Files: [`src/modules/config.js`, `src/modules/import.js`, `src/modules/validation-engine.js`, `src/main.js` if export/import orchestration requires changes]

- [x] 7. Implement Global Settings board selector UI

  **What to do**: Add board selector markup in Global Settings and wire it through `src/main.js`. The selector must use `id="board-select"`, options from `BOARD_OPTIONS`, and current state value. Changing the selector updates store state, persists via existing state pipeline, regenerates YAML, revalidates config, and updates LED compatibility UI. Keep selector near `device-name`, `nice-name`, and `display-timeout`.

  **Must NOT do**: Do not put feature logic in `index.html`. Do not redesign the whole settings UI. Do not break preset buttons.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - UI wiring and behavior.
  - Skills: [`impeccable`] - keep global settings readable and accessible.
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 9, 10 | Blocked By: 1, 4, 6

  **References**:
  - UI: `index.html` Global Settings section.
  - Orchestration: `src/main.js` `updateGlobalSettings`, event listeners, preset load, import/export, YAML generation.
  - Tests: `ci/test-cyd-integration.cjs` task 4 additions.
  - Data: `src/modules/config.js` `BOARD_OPTIONS`.

  **Acceptance Criteria**:
  - [ ] `#board-select` exists in Global Settings.
  - [ ] Default selected value is `esp32-2432s028-2port`.
  - [ ] Selector options match the exact six labels in this plan.
  - [ ] Changing selector regenerates YAML without page reload.
  - [ ] `node ci/test-cyd-integration.cjs` board selector tests pass or blocker recorded.

  **QA Scenarios**:
  ```
  Scenario: Selector appears and changes YAML
    Tool: Playwright / Bash
    Steps: Run `node ci/test-cyd-integration.cjs`.
    Expected: `#board-select` visible; changing to Guition updates YAML output to Guition fragments.
    Evidence: .sisyphus/evidence/task-7-selector-yaml.txt

  Scenario: Presets do not reset board unexpectedly
    Tool: Playwright / Bash
    Steps: Select Guition, click an existing preset, inspect selector and YAML.
    Expected: Board remains Guition unless preset explicitly defines board; YAML remains Guition-compatible.
    Evidence: .sisyphus/evidence/task-7-preset-board.txt
  ```

  **Commit**: YES | Message: `feat(board): add global board selector` | Files: [`index.html`, `src/main.js`, possibly `src/styles/main.css`]

- [x] 8. Implement board-driven LVGL scaling

  **What to do**: Replace hardcoded LVGL layout dimensions with deterministic calculations from selected board dimensions using the algorithm in Must Have. Add or update tests in `src/modules/tests/test-yaml-board-generation.js` or a focused `src/modules/tests/test-lvgl-layout-board.js` if separation is clearer. Generated LVGL must keep 4 columns x 3 rows and increase cell size for 480x320 / 480x272 displays.

  **Must NOT do**: Do not add variable row/column counts in v1. Do not change button data model from 12 buttons. Do not make browser preview scaling mandatory unless it is low-risk and tested.

  **Recommended Agent Profile**:
  - Category: `deep` - layout math affects generated YAML and regression behavior.
  - Skills: [] - no specialized skill required.
  - Omitted: [`impeccable`] - generated YAML layout, not visual app design.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 10 | Blocked By: 1, 2, 5

  **References**:
  - API: `src/modules/yaml-engine.js` - LVGL section generation.
  - Data: `src/modules/config.js` - board `width`/`height`.
  - Existing output: `back-garden-cyd-test.yaml` and current `generateLVGLSection` behavior.

  **Acceptance Criteria**:
  - [ ] Tests assert 320x240 board retains existing or documented-equivalent cell geometry.
  - [ ] Tests assert 480x320 boards have larger cell width/height than 320x240.
  - [ ] Tests assert Guition 480x272 has width-scaled cells and height appropriate to 272px.
  - [ ] Generated YAML contains no raw hardcoded display width/height from old default outside registry/baseline helper.

  **QA Scenarios**:
  ```
  Scenario: Larger CYD boards get larger grid cells
    Tool: Bash
    Steps: Run board YAML generation/layout tests.
    Expected: 480x320 board LVGL dimensions are larger than default and match the formula.
    Evidence: .sisyphus/evidence/task-8-large-grid.txt

  Scenario: Guition uses 480x272 layout
    Tool: Bash
    Steps: Run board YAML generation/layout tests for `guition-jc4827543c`.
    Expected: LVGL layout uses 480 width and 272 height formula results.
    Evidence: .sisyphus/evidence/task-8-guition-grid.txt
  ```

  **Commit**: YES | Message: `feat(board): scale lvgl grid by display size` | Files: [`src/modules/yaml-engine.js`, `src/modules/tests/test-yaml-board-generation.js`, optional `src/modules/tests/test-lvgl-layout-board.js`]

- [x] 9. Implement no-RGB compatibility UI and stale-state handling

  **What to do**: When selected board has `capabilities.rgbLed === false`, hide or disable the RGB LED control panel in Device Hardware and show concise compatibility copy such as `RGB LED controls are unavailable for the selected board.` Use a stable container ID `#rgb-led-controls` if the panel does not already have one. Preserve `config.led` values in state/export so switching back to an RGB-capable board restores prior LED settings. Ensure YAML generation still omits RGB LED output/light for no-RGB boards even if stale LED state is enabled.

  **Must NOT do**: Do not delete user LED values on board switch. Do not rely only on UI hiding; generation must enforce omission too.

  **Recommended Agent Profile**:
  - Category: `quick` - compatibility UI plus state edge cases.
  - Skills: [`impeccable`] - small user-facing disabled state/copy.
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 10 | Blocked By: 1, 2, 5, 6, 7

  **References**:
  - UI: `index.html` Device Hardware/RGB LED panel.
  - Orchestration: `src/main.js` LED widget rendering/update functions.
  - Data: `src/modules/config.js` `capabilities.rgbLed`.
  - Tests: `ci/test-cyd-integration.cjs` board selector/no-RGB assertions.

  **Acceptance Criteria**:
  - [ ] Selecting `esp32-e32r28t` hides/disables RGB LED controls.
  - [ ] Selecting `guition-jc4827543c` hides/disables RGB LED controls.
  - [ ] Switching back to default shows/enables RGB LED controls and preserves previous LED settings.
  - [ ] YAML tests and E2E tests prove no-RGB boards omit RGB LED config.

  **QA Scenarios**:
  ```
  Scenario: RGB state survives board switch
    Tool: Playwright / Bash
    Steps: Enable/configure RGB on default board; switch to Guition; switch back to default.
    Expected: RGB controls reappear with previous values; Guition YAML had no RGB section while selected.
    Evidence: .sisyphus/evidence/task-9-rgb-state-switch.txt

  Scenario: E32R28T omits RGB despite stale state
    Tool: Bash
    Steps: Generate YAML for `esp32-e32r28t` with `config.led.enabled=true`.
    Expected: No RGB LED output/light YAML emitted.
    Evidence: .sisyphus/evidence/task-9-e32r28t-no-rgb.txt
  ```

  **Commit**: YES | Message: `feat(board): handle boards without rgb led` | Files: [`src/main.js`, `index.html`, optional `src/styles/main.css`, `src/modules/yaml-engine.js` if not completed in Task 5]

- [x] 10. Update integration verification and regression commands

  **What to do**: Update `verify-cyd.mjs` to include board-selection regression checks if feasible in its existing post-build style. At minimum, verify default board generation still works, generated YAML includes selected-board dimensions for one 480x320 board, Guition generation includes ESP32-S3/PSRAM/QSPI/GT911 fragments, and no-RGB boards omit RGB LED YAML. Add `npm test` assumptions only; do not redesign the test runner. If CI workflow changes are low-risk, add a test step before deploy build; otherwise record as optional follow-up in comments/evidence, not a blocker.

  **Must NOT do**: Do not introduce Jest/Vitest. Do not make deploy depend on unavailable browsers unless the environment already supports it. Do not fix unrelated CI issues beyond what blocks this feature.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - integration verification and build behavior.
  - Skills: [] - no specialized skill required.
  - Omitted: [`impeccable`] - not UI design.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 12 | Blocked By: 5, 6, 7, 8, 9

  **References**:
  - Integration: `verify-cyd.mjs`.
  - Scripts: `package.json`.
  - CI: `.github/workflows/deploy.yml`.
  - E2E: `ci/test-cyd-integration.cjs`.

  **Acceptance Criteria**:
  - [ ] `npm run build` succeeds.
  - [ ] `npm test` succeeds and includes board-aware assertions or documented equivalent module coverage.
  - [ ] `node test-preview-fix.js` still passes.
  - [ ] Existing module tests still pass.
  - [ ] E2E command passes or concrete environment blocker is recorded.

  **QA Scenarios**:
  ```
  Scenario: Build and post-build verification pass
    Tool: Bash
    Steps: Run `npm run build && npm test`.
    Expected: Both commands exit 0.
    Evidence: .sisyphus/evidence/task-10-build-test.txt

  Scenario: Full standalone regression suite passes
    Tool: Bash
    Steps: Run all standalone test commands listed in Definition of Done.
    Expected: Commands exit 0 or only documented environment-specific E2E blocker remains.
    Evidence: .sisyphus/evidence/task-10-full-regression.txt
  ```

  **Commit**: YES | Message: `test(board): verify board selection integration` | Files: [`verify-cyd.mjs`, optional `.github/workflows/deploy.yml`]

- [x] 11. Update user-facing docs and labels

  **What to do**: Update existing user-facing documentation only where already present and relevant. Prefer `README.md` because it currently describes the generated YAML structure and target CYD device. Document supported boards, default board, selector behavior, no-RGB board behavior, and Guition caveat (ESP32-S3/ESP-IDF/PSRAM/QSPI/GT911). Keep docs concise. Do not create new docs files.

  **Must NOT do**: Do not create new `.md` files. Do not document unsupported custom-board editing. Do not claim physical flashing was tested.

  **Recommended Agent Profile**:
  - Category: `writing` - concise documentation update.
  - Skills: [] - no specialized skill required.
  - Omitted: [`impeccable`] - not interface implementation.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 12 | Blocked By: 5, 6, 7, 8, 9

  **References**:
  - Docs: `README.md` Features, Usage, Generated YAML Structure, Requirements.
  - UI labels: `index.html` Global Settings.

  **Acceptance Criteria**:
  - [ ] README lists six supported boards.
  - [ ] README states default board is ESP32-2432S028-2port.
  - [ ] README explains RGB LED controls are unavailable for no-RGB boards.
  - [ ] README does not claim support for custom boards, flashing, audio, SD, or untested peripherals.

  **QA Scenarios**:
  ```
  Scenario: Docs match implemented board list
    Tool: Bash / Read
    Steps: Inspect README and board registry.
    Expected: README board list matches registry IDs/labels exactly in user-facing form.
    Evidence: .sisyphus/evidence/task-11-docs-board-list.txt

  Scenario: Docs avoid unsupported claims
    Tool: Bash / Read
    Steps: Search README for custom board, audio, SD, flashing claims.
    Expected: No unsupported feature claims introduced.
    Evidence: .sisyphus/evidence/task-11-docs-scope.txt
  ```

  **Commit**: YES | Message: `docs(board): document supported boards` | Files: [`README.md`]

- [x] 12. Final implementation cleanup and default regression review

  **What to do**: Remove obsolete single-board assumptions, unused imports, dead helper paths, and temporary compatibility shims only after all tests pass. Search for remaining hardcoded `width: "320"`, `height: "240"`, `HARDWARE_CONFIG`, board-specific pins, and RGB LED assumptions. Keep any retained baseline constants named and justified. Run all required commands. Confirm default-board generated YAML remains compatible with existing expectations and no secrets are hardcoded.

  **Must NOT do**: Do not perform broad stylistic rewrites. Do not remove compatibility exports if existing tests or app code still depend on them unless replaced everywhere. Do not change unrelated features.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - cross-cutting cleanup and regression execution.
  - Skills: [] - no specialized skill required.
  - Omitted: [`impeccable`] - cleanup/testing task.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: final verification | Blocked By: 10, 11

  **References**:
  - Search targets: `HARDWARE_CONFIG`, `width: "320"`, `height: "240"`, `GPIO21`, `output_red`, `display_backlight`, `board:`.
  - Verification commands: Definition of Done.
  - Secrets guardrail: AGENTS.md secret placeholder rules.

  **Acceptance Criteria**:
  - [ ] No stale hardcoded default dimensions in generation path except registry/baseline helper.
  - [ ] No RGB LED YAML leaks for no-RGB boards.
  - [ ] All Definition of Done commands run and pass or environment blocker documented for E2E only.
  - [ ] No generated YAML contains hardcoded Wi-Fi/API/OTA credentials.
  - [ ] `git diff` contains only intended feature/test/docs changes.

  **QA Scenarios**:
  ```
  Scenario: Hardcoded hardware assumptions are removed
    Tool: Bash / Grep
    Steps: Search for stale `HARDWARE_CONFIG`, hardcoded 320/240 substitutions, and RGB assumptions.
    Expected: Only intentional registry/baseline references remain.
    Evidence: .sisyphus/evidence/task-12-hardcoded-search.txt

  Scenario: Full final suite passes
    Tool: Bash
    Steps: Run all Definition of Done commands.
    Expected: All commands pass or E2E-only environment blocker documented.
    Evidence: .sisyphus/evidence/task-12-final-suite.txt
  ```

  **Commit**: YES | Message: `chore(board): finalize board selection regression` | Files: [all modified feature/test/docs files]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle (REJECT → all issues are pre-existing/false-positive)
- [x] F2. Code Quality Review — unspecified-high (APPROVE)
- [x] F3. Real Manual QA — unspecified-high (+ playwright because UI changes) (APPROVE)
- [x] F4. Scope Fidelity Check — deep (APPROVE)

## Commit Strategy
- Use task-level commits after each task if the executor is explicitly working in a commit-enabled flow.
- Commit messages should follow concise conventional style shown per task.
- Keep TDD commits paired: failing tests and implementation may be separate if executor prefers, but final branch must not leave failing tests.
- Do not commit generated `dist/` unless this repository normally tracks it and `git status` confirms it is expected.

## Success Criteria
- User can select one of six boards in Global Settings.
- Generated YAML changes display/touch/backlight/platform/RGB sections according to selected board.
- Existing default use case remains compatible and defaults to ESP32-2432S028-2port.
- Larger boards produce scaled 4x3 LVGL layouts based on board dimensions.
- Boards without RGB LED do not show usable RGB controls and do not emit RGB LED YAML.
- Legacy JSON configs import without user intervention.
- All automated verification listed in Definition of Done passes or has a documented E2E environment blocker only.
