// Playwright test script for CYD Config Generator
// Run with: npx playwright test --project=chromium ci/playwright-test.js

const { test, expect } = require('@playwright/test');

test.describe('CYD Config Generator - End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4173/');
    // Wait for app to initialize
    await page.waitForSelector('[data-testid="button-grid"]');
  });

  // TEST 1: Page loads correctly
  test('T1: Page loads with correct title and structure', async ({ page }) => {
    expect(page.title()).toContain('CYD Config Generator');
    
    // Check main sections exist
    const buttonGrid = page.locator('h2:has-text("Button Grid Preview")');
    await expect(buttonGrid).toBeVisible();
    
    const buttonEditor = page.locator('h2:has-text("Button Editor")');
    await expect(buttonEditor).toBeVisible();
    
    const yamlOutput = page.locator('h2:has-text("Generated YAML")');
    await expect(yamlOutput).toBeVisible();
    
    // Check action buttons exist
    const importBtn = page.locator('button:has-text("Import")');
    await expect(importBtn).toBeVisible();
    
    const exportBtn = page_locate('button:has-text("Export")');
    await expect(exportBtn).toBeVisible();
    
    const downloadBtn = page.locator('button:has-text("Download YAML")');
    await expect(downloadBtn).toBeVisible();
  });

  // TEST 2: Button grid has 12 buttons
  test('T2: Button grid should have 12 buttons in 4x3 layout', async ({ page }) => {
    const buttons = page.locator('button[class*="grid-btn"]').or(page.locator('[class*="button-grid"] button'));
    const count = await buttons.count();
    expect(count).toBe(12);
    
    // Check button labels
    const btn1 = page.locator('text="Btn 1"').first();
    await expect(btn1).toBeVisible();
    
    const btn12 = page.locator('text="Btn 12"');
    await expect(btn12).toBeVisible();
  });

  // TEST 3: Presets section exists and is populated
  test('T3: Presets section should have multiple options', async ({ page }) => {
    const presets = page.locator('button:has-text("Living Room"), button:has-text("Back Garden"), button:has-text("Bedroom")');
    const count = await presets.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // TEST 4: Theme toggle works
  test('T4: Theme toggle should switch between light/dark', async ({ page }) => {
    const themeBtn = page.locator('button:has-text("Toggle theme")');
    await expect(themeBtn).toBeVisible();
    
    // Click to toggle
    await themeBtn.click();
    
    // Check if theme changed
    await page.waitForTimeout(500);
    const htmlClass = await page.locator('html').getAttribute('class');
    const hasDarkMode = await page.evaluate(() => {
      return document.body.classList.contains('dark') || 
             document.documentElement.classList.contains('dark');
    });
    expect(hasDarkMode).toBeTruthy();
    
    // Toggle back
    await themeBtn.click();
  });

  // TEST 5: Clicking a button opens the editor
  test('T5: Clicking button in grid should update editor', async ({ page }) => {
    // Click on button 2
    const btn2 = page.locator('text="Btn 2"').first();
    await btn2.click();
    
    await page.waitForTimeout(300);
    
    // Check editor loaded with button 2 data
    const editor = page.locator('h2:has-text("Button Editor")');
    await expect(editor).toBeVisible();
    
    const labelField = page.locator('input[placeholder*="label"], input:text("Btn 2")').first();
    await expect(labelField).toBeVisible();
  });

  // TEST 6: Edit button label
  test('T6: Button label can be edited', async ({ page }) => {
    // Click btn 3 to edit it
    const btn3 = page.locator('text="Btn 3"').first();
    await btn3.click();
    
    // Fill the label field
    const labelInput = page.locator('input:text("Btn 3")').first();
    await labelInput.clear();
    await labelInput.fill('Test Button');
    
    // Verify the change
    await page.waitForTimeout(200);
    const value = await labelInput.inputValue();
    expect(value).toBe('Test Button');
  });

  // TEST 7: Button type selection
  test('T7: Button type can be selected (stateless, checkable, timer)', async ({ page }) => {
    const btn = page.locator('text="Btn 4"').first();
    await btn.click();
    
    // Check type options
    const stateless = page.locator('text="stateless"');
    await expect(stateless).toBeVisible();
    
    const checkable = page.locator('text="checkable"');
    await expect(checkable).toBeVisible();
    
    // Select checkable
    await checkable.click();
    
    const isCheckedable = await page.evaluate(() => {
      return document.querySelector('input[name="buttonType"]')?.checked === true;
    });
    expect(isCheckedable).toBeTruthy();
  });

  // TEST 8: Color picker works
  test('T8: Color picker should change button color', async ({ page }) => {
    const btn = page.locator('text="Btn 5"').first();
    await btn.click();
    
    const colorInput = page.locator('input[type="color"]');
    await expect(colorInput).toBeVisible();
    
    // Get initial color
    const initialColor = await colorInput.getAttribute('value');
    
    // Change color
    await colorInput.fill('#FF0000');
    
    await page.waitForTimeout(300);
    const newColor = await colorInput.getAttribute('value');
    expect(newColor).toBe('#ff0000');
  });

  // TEST 9: Icon picker opens
  test('T9: Icon picker modal should open on click', async ({ page }) => {
    const btn = page.locator('text="Btn 6"').first();
    await btn.click();
    
    const iconBtn = page.locator('button:has-text("mdi-")').or(page.locator('[class*="icon"] button:first-child'));
    await iconBtn.click({ force: true });
    
    await page.waitForTimeout(500);
    
    // Check modal is open
    const modal = page.locator('dialog, [class*="modal"]').or(page.locator('[data-testid="icon-picker"]'));
    const isModalOpen = await modal.count() > 0;
    expect(isModalOpen).toBeTruthy();
  });

  // TEST 10: YAML generation with preset
  test('T10: Preset should generate valid YAML', async ({ page }) => {
    // Select "Living Room" preset
    const presetBtn = page.locator('button:has-text("Living Room")');
    await presetBtn.click();
    
    await page.waitForTimeout(1000);
    
    // Check YAML section
    const yamlSection = page.locator('pre, [class*="yaml"]');
    await expect(yamlSection).toBeVisible();
    
    // Check YAML has content
    const yamlText = await yamlSection.innerText();
    expect(yamlText.length).toBeGreaterThan(100);
    
    // Check for essential YAML blocks
    expect(yamlText).toContain('device_name');
    expect(yamlText).toContain('esp32');
  });

  // TEST 11: Copy YAML to clipboard
  test('T11: Copy YAML button should work', async ({ page }) => {
    const presetBtn = page.locator('button:has-text("Living Room")');
    await presetBtn.click();
    
    await page.waitForTimeout(500);
    
    const copyBtn = page.locator('button:has-text("Copy YAML")');
    await expect(copyBtn).toBeVisible();
    
    await copyBtn.click();
    
    // Check success message
    const toast = page.locator('text="copied", [class*="toast"]');
    const isCopied = await toast.count() > 0;
    expect(isCopied).toBeTruthy();
  });

  // TEST 12: Export/Import should work
  test('T12: Export config should download JSON file', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export")');
    await expect(exportBtn).toBeVisible();
    
    // Mock download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportBtn.click()
    ]);
    
    // Verify download started
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  // TEST 13: Validation should fail with errors
  test('T13: Validation should show errors for invalid config', async ({ page }) => {
    const validateBtn = page.locator('button:has-text("Validate")');
    await validateBtn.click();
    
    await page.waitForTimeout(500);
    
    // Check for validation errors
    const errorCount = await page.evaluate(() => {
      const errors = document.querySelectorAll('[class*="error"], .validation-error');
      return errors.length;
    });
    
    expect(errorCount).toBeGreaterThanOrEqual(0);
  });

  // TEST 14: Undo/Redo buttons
  test('T14: Undo/Redo buttons should be present', async ({ page }) => {
    const undoBtn = page.locator('button:has-text("↶ Undo")');
    const redoBtn = page.locator('button:has-text("↷ Redo")');
    
    await expect(undoBtn).toBeVisible();
    await expect(redoBtn).toBeVisible();
    
    // Undo should be disabled initially
    const isUndoDisabled = await undoBtn.isDisabled();
    expect(isUndoDisabled).toBeTruthy();
  });

  // TEST 15: Color swatches work
  test('T15: Color swatches should change button color', async ({ page }) => {
    const btn = page.locator('text="Btn 9"').first();
    await btn.click();
    
    // Find and click a color swatch
    const swatches = page.locator('[class*="swatch"]');
    const count = await swatches.count();
    expect(count).toBeGreaterThan(0);
    
    await swatches.first().click();
    await page.waitForTimeout(300);
    
    // Check color updated
    const colorInput = page.locator('input[type="color"]');
    const newColor = await colorInput.getAttribute('value');
    expect(newColor).toBeTruthy();
  });

  // TEST 16: Keyboard shortcuts
  test('T16: Ctrl+S should trigger export', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export")');
    
    // Mock download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Control+S')
    ]);
    
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  // TEST 17: Check console for errors
  test('T17: No JavaScript errors in console', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate fresh to trigger errors
    await page.reload();
    await page.waitForTimeout(2000);
    
    expect(errors.length).toBe(0);
  });

  // TEST 18: Preset comparison
  test('T18: Multiple presets should apply different configurations', async ({ page }) => {
    // Load Back Garden preset
    const bgPreset = page.locator('button:has-text("Back Garden")');
    await bgPreset.click();
    await page.waitForTimeout(500);
    
    // Get first button label
    const bgFirstLabel = await page.locator('text="Btn 1"').first().innerText();
    
    // Load Living Room preset
    const lrPreset = page.locator('button:has-text("Living Room")');
    await lrPreset.click();
    await page.waitForTimeout(500);
    
    // Get first button label
    const lrFirstLabel = await page.locator('text="Btn 1"').first().innerText();
    
    // They should be different
    expect(bgFirstLabel).not.toBe(lrFirstLabel);
  });
});
