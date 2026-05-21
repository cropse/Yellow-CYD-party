
## F1 Plan Compliance Audit — 2026-05-22
- Rejected: DoD suite is not green. `node src/modules/tests/test-yaml.js`, `npm test`, and `node ci/test-cyd-integration.cjs` fail.
- Missing plan-listed `ESP32-2432S028` board ID/label; registry has only six entries while the Must Have list includes this additional board.
- LVGL scaled cell dimensions are calculated but not emitted/used in generated YAML.
- `yaml-engine.js` duplicates board fallback metadata with hardcoded dimensions outside `config.js`, violating the no-hardcoded-dimensions guardrail.
- LSP diagnostics are blocked by a broken global Biome package (`@biomejs/cli-linux-x64/biome` missing).

## 2026-05-22 F4 Scope Fidelity Check
- No material scope creep found: no custom board editor, pin editor, flashing flow, runtime auto-detection, unsupported peripheral UI/generation, class hierarchy, index.html feature logic, or hardcoded secrets.
- Preset board-choice guardrail issue observed: setupPresets resets board to preset/default instead of preserving current selected board. This is a behavior bug, not scope creep.
- LSP diagnostics are blocked by environment: global Biome wrapper cannot resolve @biomejs/cli-linux-x64/biome.
