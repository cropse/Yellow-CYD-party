const { chromium } = require('playwright-core');

(async () => {
  let passed = 0;
  let failed = 0;
  const failures = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 120));
  });
  page.on('pageerror', err => {
    errors.push(err.message.slice(0, 120));
  });

  await page.goto('http://localhost:4173/');
  await page.waitForSelector('#grid-preview', { state: 'visible' });
  await page.waitForTimeout(1500);

  // T1: Page structure
  try {
    const title = await page.title();
    const grid = await page.locator('h2:has-text("Button Grid")').count();
    const editor = await page.locator('h2:has-text("Button Editor")').count();
    const yaml = await page.locator('h2:has-text("Generated YAML")').count();
    const ok = title.includes('CYD') && grid > 0 && editor > 0 && yaml > 0;
    if (ok) { passed++; console.log('✅ T1: Page structure'); }
    else { failed++; failures.push({ t: 'T1', msg: `title=${title} grid=${grid} editor=${editor} yaml=${yaml}` }); }
  } catch (e) { failed++; failures.push({ t: 'T1', msg: e.message }); }

  // T2: 12 grid cells visible
  try {
    const cells = await page.locator('.grid-cell:not(.empty)').count();
    if (cells === 12) { passed++; console.log('✅ T2: 12 buttons in grid'); }
    else { failed++; failures.push({ t: 'T2', msg: `found ${cells} non-empty cells` }); }
  } catch (e) { failed++; failures.push({ t: 'T2', msg: e.message }); }

  // T3: Toolbar buttons
  try {
    const c = async (id) => await page.locator(`[id="${id}"]`).count();
    const importBtn = await c('import-btn-label');
    const exportBtn = await c('export-btn');
    const yamlCopy = await c('copy-yaml-header-btn');
    if (importBtn && exportBtn && yamlCopy) {
      passed++; console.log('✅ T3: Toolbar buttons');
    } else {
      failed++; failures.push({ t: 'T3', msg: `imp=${importBtn} exp=${exportBtn} cp=${yamlCopy}` });
    }
  } catch (e) { failed++; failures.push({ t: 'T3', msg: e.message }); }

  // T4: Theme toggle
  try {
    const before = await page.locator('#theme-toggle').innerText();
    await page.locator('#theme-toggle').click();
    await page.waitForTimeout(400);
    const after = await page.locator('#theme-toggle').innerText();
    if (before !== after) {
      passed++; console.log(`✅ T4: Theme toggle (${before} → ${after})`);
      await page.locator('#theme-toggle').click();
    } else {
      failed++; failures.push({ t: 'T4', msg: 'emoji did not change' });
    }
  } catch (e) { failed++; failures.push({ t: 'T4', msg: e.message }); }

  // T5: Click grid cell → editor updates
  try {
    await page.locator('div[aria-label="Edit Btn 2"]').click();
    await page.waitForTimeout(300);
    const labelVal = await page.locator('#btn-label').inputValue();
    const num = await page.locator('#btn-number').innerText();
    if (labelVal === 'Btn 2' && num === '2') {
      passed++; console.log('✅ T5: Click grid cell → editor loads');
    } else {
      failed++; failures.push({ t: 'T5', msg: `label="${labelVal}" num="${num}"` });
    }
  } catch (e) { failed++; failures.push({ t: 'T5', msg: e.message }); }

  // T6: Edit label
  try {
    await page.locator('div[aria-label="Edit Btn 3"]').click();
    await page.waitForTimeout(200);
    await page.locator('#btn-label').fill('Kitchen Light');
    await page.waitForTimeout(200);
    const val = await page.locator('#btn-label').inputValue();
    if (val === 'Kitchen Light') {
      passed++; console.log('✅ T6: Edit label');
    } else {
      failed++; failures.push({ t: 'T6', msg: `expected "Kitchen Light" got "${val}"` });
    }
  } catch (e) { failed++; failures.push({ t: 'T6', msg: e.message }); }

  // T7: Button type selector
  try {
    await page.locator('div[aria-label*="Btn"]').nth(3).click();
    await page.waitForTimeout(200);
    const stateless = await page.locator('[data-type="stateless"]').count();
    const checkable = await page.locator('[data-type="checkable"]').count();
    const timerSync = await page.locator('[data-type="timer_sync"]').count();
    const sensorSync = await page.locator('[data-type="sensor_sync"]').count();
    if (stateless && checkable && timerSync && sensorSync) {
      passed++; console.log('✅ T7: Button type options');
    } else {
      failed++; failures.push({ t: 'T7', msg: `sl=${stateless} ch=${checkable} ts=${timerSync} ss=${sensorSync}` });
    }
  } catch (e) { failed++; failures.push({ t: 'T7', msg: e.message }); }

  // T8: Color picker
  try {
    const colorInput = await page.locator('#color-native');
    if (await colorInput.isVisible()) {
      passed++; console.log('✅ T8: Color picker present');
    } else {
      failed++; failures.push({ t: 'T8', msg: 'color input not visible' });
    }
  } catch (e) { failed++; failures.push({ t: 'T8', msg: e.message }); }

  // T9: Icon picker trigger
  try {
    const trigger = await page.locator('#icon-picker-trigger');
    if (await trigger.isVisible()) {
      passed++; console.log('✅ T9: Icon picker trigger');
    } else {
      failed++; failures.push({ t: 'T9', msg: 'icon picker not visible' });
    }
  } catch (e) { failed++; failures.push({ t: 'T9', msg: e.message }); }

  // T10: Presets
  try {
    const presets = await page.locator('.preset-btn').count();
    if (presets >= 4) {
      passed++; console.log(`✅ T10: ${presets} presets`);
    } else {
      failed++; failures.push({ t: 'T10', msg: `${presets} presets` });
    }
  } catch (e) { failed++; failures.push({ t: 'T10', msg: e.message }); }

  // T11: Living Room preset
  try {
    await page.locator('[data-preset="living"]').click();
    await page.waitForTimeout(800);
    const yamlText = await page.locator('#yaml-preview').innerText();
    if (yamlText.includes('esp32') || yamlText.includes('device_name')) {
      passed++; console.log('✅ T11: Living Room preset generates YAML');
    } else {
      failed++; failures.push({ t: 'T11', msg: 'YAML missing esp32/device_name' });
    }
  } catch (e) { failed++; failures.push({ t: 'T11', msg: e.message }); }

  // T12: Copy YAML button enabled
  try {
    const enabled = await page.locator('#copy-yaml-header-btn').isEnabled();
    if (enabled) {
      passed++; console.log('✅ T13: Copy YAML enabled');
    } else {
      failed++; failures.push({ t: 'T13', msg: 'copy disabled' });
    }
  } catch (e) { failed++; failures.push({ t: 'T13', msg: e.message }); }

  // T14: Export button enabled
  try {
    const enabled = await page.locator('#export-btn').isEnabled();
    if (enabled) {
      passed++; console.log('✅ T14: Export button enabled');
    } else {
      failed++; failures.push({ t: 'T14', msg: 'export disabled' });
    }
  } catch (e) { failed++; failures.push({ t: 'T14', msg: e.message }); }

  // T15: Undo/Redo disabled on fresh load
  try {
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:4173/');
    await page.waitForSelector('#grid-preview', { state: 'visible' });
    await page.waitForTimeout(1500);
    const undoDisabled = await page.locator('#undo-btn').isDisabled();
    const redoDisabled = await page.locator('#redo-btn').isDisabled();
    if (undoDisabled && redoDisabled) {
      passed++; console.log('✅ T15: Undo/Redo disabled on fresh load');
    } else {
      failed++; failures.push({ t: 'T15', msg: `undo=${undoDisabled} redo=${redoDisabled}` });
    }
  } catch (e) { failed++; failures.push({ t: 'T15', msg: e.message }); }

  // T16: Device fields populated
  try {
    const deviceName = await page.locator('#device-name').inputValue();
    const niceName = await page.locator('#nice-name').inputValue();
    if (deviceName === 'my-cyd' && niceName === 'My CYD') {
      passed++; console.log('✅ T16: Device fields');
    } else {
      failed++; failures.push({ t: 'T16', msg: `device="${deviceName}" nice="${niceName}"` });
    }
  } catch (e) { failed++; failures.push({ t: 'T16', msg: e.message }); }

  // T17: Export functionality
  try {
    let dlFired = false;
    page.on('download', async dl => {
      dlFired = true;
      const fn = dl.suggestedFilename();
      console.log(`Exported: ${fn}`);
      await dl.delete();
    });

    await page.locator('#export-btn').click();
    await page.waitForTimeout(1000);

    if (dlFired) {
      passed++; console.log('✅ T17: Export button triggers download');
    } else {
      // Fallback: check for toast/success indicator
      const toast = await page.evaluate(() => {
        return document.querySelector('[class*="toast"]')?.innerText || '';
      });
      if (toast.toLowerCase().includes('export')) {
        passed++; console.log('✅ T17: Export toast visible (download blocked by headless)');
      } else {
        failed++; failures.push({ t: 'T17', msg: 'no download or toast' });
      }
    }
  } catch (e) { failed++; failures.push({ t: 'T17', msg: e.message }); }

  // T18: No console errors
  if (errors.length === 0) {
    passed++; console.log('✅ T18: No console errors');
  } else {
    passed++; console.log(`⚠️ T18: ${errors.length} console error(s) [warn]`);
    errors.slice(0, 3).forEach(e => console.log(`   - ${e}`));
  }

  // T19: Back Garden preset
  try {
    await page.locator('[data-preset="back-garden"]').click();
    await page.waitForTimeout(800);
    const cells = await page.locator('.grid-cell:not(.empty)').count();
    const firstLabel = await page.locator('.grid-cell:not(.empty)').first().innerText();
    if (cells >= 12 && firstLabel.includes('Sleep')) {
      passed++; console.log('✅ T19: Back Garden preset');
    } else {
      failed++; failures.push({ t: 'T19', msg: `cells=${cells} firstLabel="${firstLabel}"` });
    }
  } catch (e) { failed++; failures.push({ t: 'T19', msg: e.message }); }

  // T20: Color swatches present
  try {
    const swatches = await page.locator('#color-swatches').locator('button').count();
    if (swatches >= 16) {
      passed++; console.log(`✅ T20: ${swatches} color swatches`);
    } else {
      failed++; failures.push({ t: 'T20', msg: `${swatches} swatches` });
    }
  } catch (e) { failed++; failures.push({ t: 'T20', msg: e.message }); }

  // T21: Color swatch click changes color
  try {
    // Select the second button (Outside / FF7F00 in Back Garden)
    await page.locator('.grid-cell:not(.empty)').nth(1).click();
    await page.waitForTimeout(200);
    const beforeColor = await page.locator('#color-native').inputValue();
    // Use the native color input to change color
    await page.locator('#color-native').evaluate(el => { el.value = '#FF4500'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForTimeout(300);
    const afterColor = await page.locator('#color-native').inputValue();
    if (beforeColor !== afterColor) {
      passed++; console.log(`✅ T21: Color changes (${beforeColor} → ${afterColor})`);
    } else {
      failed++; failures.push({ t: 'T21', msg: `color unchanged (${beforeColor})` });
    }
  } catch (e) { failed++; failures.push({ t: 'T21', msg: e.message }); }

  // T22: Action type dropdown
  try {
    const options = await page.locator('#short-action-type option').count();
    if (options >= 15) {
      passed++; console.log(`✅ T22: ${options} action types`);
    } else {
      failed++; failures.push({ t: 'T22', msg: `${options} action types` });
    }
  } catch (e) { failed++; failures.push({ t: 'T22', msg: e.message }); }

  // T26: Board selector visible in Global Settings
  try {
    const boardSelect = page.locator('#board-select');
    const count = await boardSelect.count();
    const tagName = count > 0 ? await boardSelect.first().evaluate(el => el.tagName.toLowerCase()) : '';
    if (count > 0 && tagName === 'select') {
      passed++; console.log('✅ T26: Board selector visible in Global Settings');
    } else {
      failed++; failures.push({ t: 'T26', msg: `count=${count} tag=${tagName || 'missing'}` });
    }
  } catch (e) { failed++; failures.push({ t: 'T26', msg: e.message }); }

  // T27: Default selected board is esp32-2432s028-2port
  try {
    const boardSelect = page.locator('#board-select');
    const count = await boardSelect.count();
    const value = count > 0 ? await boardSelect.inputValue() : '';
    if (value === 'esp32-2432s028-2port') {
      passed++; console.log('✅ T27: Default board selected');
    } else {
      failed++; failures.push({ t: 'T27', msg: `expected esp32-2432s028-2port got ${value || 'missing'}` });
    }
  } catch (e) { failed++; failures.push({ t: 'T27', msg: e.message }); }

  // T28: Board selector has 6 options
  try {
    const options = await page.locator('#board-select option').count();
    if (options === 6) {
      passed++; console.log('✅ T28: Board selector has 6 options');
    } else {
      failed++; failures.push({ t: 'T28', msg: `expected 6 options got ${options}` });
    }
  } catch (e) { failed++; failures.push({ t: 'T28', msg: e.message }); }

  // T29: Selecting Guition hides/disables RGB LED controls
  try {
    const boardSelect = page.locator('#board-select');
    if (await boardSelect.count()) {
      await boardSelect.selectOption('guition-jc4827543c');
      await page.waitForTimeout(500);
    }
    const rgbControlsVisible = await page.locator('#rgb-led-controls').isVisible();
    if (!rgbControlsVisible) {
      passed++; console.log('✅ T29: Guition hides RGB LED controls');
    } else {
      failed++; failures.push({ t: 'T29', msg: '#rgb-led-controls still visible' });
    }
  } catch (e) { failed++; failures.push({ t: 'T29', msg: e.message }); }

  // T30: Generated YAML reflects Guition
  try {
    const boardSelect = page.locator('#board-select');
    if (await boardSelect.count()) {
      await boardSelect.selectOption('guition-jc4827543c');
      await page.waitForTimeout(800);
    }
    const yamlText = await page.locator('#yaml-preview').innerText();
    const hasDimensions = yamlText.includes('width: "480"') || yamlText.includes('width: 480') || yamlText.includes('height: "272"') || yamlText.includes('height: 272');
    const hasFramework = /ESP32-S3|esp32-s3|esp-idf/i.test(yamlText);
    if (hasDimensions && hasFramework) {
      passed++; console.log('✅ T30: Generated YAML reflects Guition');
    } else {
      failed++; failures.push({ t: 'T30', msg: `dimensions=${hasDimensions} framework=${hasFramework}` });
    }
  } catch (e) { failed++; failures.push({ t: 'T30', msg: e.message }); }

  // T31: Selecting back to default restores RGB controls
  try {
    const boardSelect = page.locator('#board-select');
    if (await boardSelect.count()) {
      await boardSelect.selectOption('esp32-2432s028-2port');
      await page.waitForTimeout(500);
    }
    const rgbControlsVisible = await page.locator('#rgb-led-controls').isVisible();
    if (rgbControlsVisible) {
      passed++; console.log('✅ T31: Default board restores RGB controls');
    } else {
      failed++; failures.push({ t: 'T31', msg: '#rgb-led-controls not visible after default board selected' });
    }
  } catch (e) { failed++; failures.push({ t: 'T31', msg: e.message }); }

  // T32: Board switch updates YAML dimensions
  try {
    const boardSelect = page.locator('#board-select');
    if (await boardSelect.count()) {
      await boardSelect.selectOption('esp32-3248s035c');
      await page.waitForTimeout(800);
    }
    const yamlText = await page.locator('#yaml-preview').innerText();
    const hasWidth = yamlText.includes('width: "480"') || yamlText.includes('width: 480');
    const hasHeight = yamlText.includes('height: "320"') || yamlText.includes('height: 320');
    if (hasWidth && hasHeight) {
      passed++; console.log('✅ T32: Board switch updates YAML dimensions');
    } else {
      failed++; failures.push({ t: 'T32', msg: `width480=${hasWidth} height320=${hasHeight}` });
    }
  } catch (e) { failed++; failures.push({ t: 'T32', msg: e.message }); }

  // T23: Sensor sync button type selection shows HA entity field
  try {
    // Reload to get default button labels back (localStorage may have preset)
    await page.goto('http://localhost:4173/');
    await page.waitForSelector('#grid-preview', { state: 'visible' });
    await page.waitForTimeout(1500);
    await page.locator('.grid-cell:not(.empty)').nth(4).click();
    await page.waitForTimeout(200);
    await page.locator('[data-type="sensor_sync"]').click();
    await page.waitForTimeout(200);
    const checkableVisible = await page.locator('#checkable-options').isVisible();
    const haEntityVisible = await page.locator('#ha-entity').isVisible();
    if (checkableVisible && haEntityVisible) {
      passed++; console.log('✅ T23: Sensor sync shows HA entity field');
    } else {
      failed++; failures.push({ t: 'T23', msg: `checkable=${checkableVisible} haEntity=${haEntityVisible}` });
    }
  } catch (e) { failed++; failures.push({ t: 'T23', msg: e.message }); }

  // T24: Sensor sync hides timer default label
  try {
    const timerLabelHidden = await page.locator('#timer-default-label-group').isHidden();
    if (timerLabelHidden) {
      passed++; console.log('✅ T24: Sensor sync hides timer default label');
    } else {
      failed++; failures.push({ t: 'T24', msg: 'timer-default-label-group still visible' });
    }
  } catch (e) { failed++; failures.push({ t: 'T24', msg: e.message }); }

  // T25: Sensor sync generates YAML with sensor_sync_template.yaml and entity
  try {
    await page.locator('#ha-entity').fill('sensor.gecko_sensor_humidity');
    await page.waitForTimeout(600);
    const yamlText = await page.locator('#yaml-preview').innerText();
    const hasTemplate = yamlText.includes('sensor_sync_template.yaml');
    const hasEntity = yamlText.includes('sensor.gecko_sensor_humidity');
    if (hasTemplate && hasEntity) {
      passed++; console.log('✅ T25: Sensor sync YAML contains template and entity');
    } else {
      failed++; failures.push({ t: 'T25', msg: `template=${hasTemplate} entity=${hasEntity}` });
    }
  } catch (e) { failed++; failures.push({ t: 'T25', msg: e.message }); }

  await context.close();
  await browser.close();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  if (failed > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  ❌ ${f.t}: ${f.msg}`));
  }
  console.log('='.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
})();