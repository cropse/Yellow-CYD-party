// Test the icon preview fix with comprehensive test coverage

// Simulate mdiData as loaded from MDI meta.json
// Codepoints are stored WITHOUT the F prefix (e.g., "0335" not "F0335")
const mdiData = new Map([
  ['lightbulb', { name: 'lightbulb', codepoint: '0335', unicode: '\uF0335' }],
  ['fan', { name: 'fan', codepoint: '0210', unicode: '\uF0210' }],
  ['home', { name: 'home', codepoint: '0002', unicode: '\uF0002' }],
  ['power', { name: 'power', codepoint: '034b', unicode: '\uF034B' }],
]);

// THE NEW normalizeIconCodepoint function (as implemented in index.html)
function normalizeIconCodepoint(icon) {
  if (!icon || typeof icon !== 'string') return '';
  // Remove common prefixes: \U000F, \uF, U000F, uF
  let cleaned = icon.toLowerCase().replace(/^\\?u(000)?f/i, '');
  // Strip leading F/f if present (handles F0335 -> 0335)
  cleaned = cleaned.replace(/^f/i, '');
  // Validate: must be 4-5 hex characters
  if (!/^[0-9a-f]{4,5}$/i.test(cleaned)) return '';
  return cleaned.toLowerCase();
}

// THE NEW getIconByCodepoint function (using normalizeIconCodepoint)
function getIconByCodepoint(codepoint) {
  const cleanCodepoint = normalizeIconCodepoint(codepoint);
  if (!cleanCodepoint) return null;
  for (const [name, data] of mdiData) {
    if (data.codepoint.toLowerCase() === cleanCodepoint) {
      return data;
    }
  }
  return null;
}

// ============================================================
// TEST UTILITIES
// ============================================================
let passed = 0;
let failed = 0;

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.log(`  ✗ ${testName}`);
    console.log(`    Expected: ${JSON.stringify(expected)}`);
    console.log(`    Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertNotNull(actual, testName) {
  if (actual !== null) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.log(`  ✗ ${testName} (got null)`);
    failed++;
  }
}

function assertNull(actual, testName) {
  if (actual === null) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.log(`  ✗ ${testName} (expected null, got: ${JSON.stringify(actual)})`);
    failed++;
  }
}

// ============================================================
// TEST SUITE: normalizeIconCodepoint
// ============================================================
console.log('\n=== TEST SUITE: normalizeIconCodepoint ===\n');

console.log('Format: \\U000Fxxxx (standard YAML format)');
assertEqual(normalizeIconCodepoint('\\U000F0335'), '0335', 'lightbulb with backslash');
assertEqual(normalizeIconCodepoint('\\U000F0210'), '0210', 'fan with backslash');
assertEqual(normalizeIconCodepoint('\\U000F0002'), '0002', 'home with backslash');

console.log('\nFormat: \\uFxxxx (JS/DOM format)');
assertEqual(normalizeIconCodepoint('\\uF0335'), '0335', 'lightbulb');
assertEqual(normalizeIconCodepoint('\\uF0210'), '0210', 'fan');

console.log('\nFormat: Fxxxx (MDI meta.json format)');
assertEqual(normalizeIconCodepoint('F0335'), '0335', 'lightbulb uppercase');
assertEqual(normalizeIconCodepoint('f0335'), '0335', 'lightbulb lowercase');

console.log('\nFormat: xxxx (already normalized)');
assertEqual(normalizeIconCodepoint('0335'), '0335', 'lightbulb');
assertEqual(normalizeIconCodepoint('0210'), '0210', 'fan');

console.log('\nEdge cases: mixed case');
assertEqual(normalizeIconCodepoint('F0335'), '0335', 'uppercase F prefix');
assertEqual(normalizeIconCodepoint('f0335'), '0335', 'lowercase f prefix');
assertEqual(normalizeIconCodepoint('\\U000Ff0335'), '0335', 'mixed case with prefix');

console.log('\nEdge cases: invalid/empty values');
assertEqual(normalizeIconCodepoint(''), '', 'empty string');
assertEqual(normalizeIconCodepoint(null), '', 'null');
assertEqual(normalizeIconCodepoint(undefined), '', 'undefined');
assertEqual(normalizeIconCodepoint('xyz'), '', 'non-hex string');
assertEqual(normalizeIconCodepoint('123'), '', 'too short');
assertEqual(normalizeIconCodepoint('abcdef'), '', 'too long (6 chars)');
assertEqual(normalizeIconCodepoint('GGGG'), '', 'invalid hex (G)');

// ============================================================
// TEST SUITE: getIconByCodepoint
// ============================================================
console.log('\n=== TEST SUITE: getIconByCodepoint ===\n');

console.log('Format: \\U000Fxxxx (standard YAML format)');
assertNotNull(getIconByCodepoint('\\U000F0335'), 'lightbulb with backslash');
assertEqual(getIconByCodepoint('\\U000F0335')?.name, 'lightbulb', 'lightbulb name matches');
assertNotNull(getIconByCodepoint('\\U000F0210'), 'fan with backslash');
assertEqual(getIconByCodepoint('\\U000F0210')?.name, 'fan', 'fan name matches');

console.log('\nFormat: \\uFxxxx (JS/DOM format)');
assertNotNull(getIconByCodepoint('\\uF0335'), 'lightbulb');
assertEqual(getIconByCodepoint('\\uF0335')?.name, 'lightbulb', 'name matches');
assertNotNull(getIconByCodepoint('\\uF0210'), 'fan');
assertEqual(getIconByCodepoint('\\uF0210')?.name, 'fan', 'name matches');

console.log('\nFormat: Fxxxx (MDI meta.json format)');
assertNotNull(getIconByCodepoint('F0335'), 'lightbulb uppercase');
assertEqual(getIconByCodepoint('F0335')?.name, 'lightbulb', 'name matches');
assertNotNull(getIconByCodepoint('f0335'), 'lightbulb lowercase');
assertEqual(getIconByCodepoint('f0335')?.name, 'lightbulb', 'name matches');

console.log('\nFormat: xxxx (already normalized)');
assertNotNull(getIconByCodepoint('0335'), 'lightbulb');
assertEqual(getIconByCodepoint('0335')?.name, 'lightbulb', 'name matches');
assertNotNull(getIconByCodepoint('0210'), 'fan');
assertEqual(getIconByCodepoint('0210')?.name, 'fan', 'name matches');

console.log('\nEdge cases: invalid/empty values');
assertNull(getIconByCodepoint(''), 'empty string returns null');
assertNull(getIconByCodepoint(null), 'null returns null');
assertNull(getIconByCodepoint(undefined), 'undefined returns null');
assertNull(getIconByCodepoint('xyz'), 'non-hex returns null');
assertNull(getIconByCodepoint('xyzabc'), 'invalid returns null');

// ============================================================
// TEST SUITE: Integration - Simulate UI workflow
// ============================================================
console.log('\n=== TEST SUITE: Integration (UI workflow) ===\n');

// Simulate button data as stored in appState
const testButtons = [
  { icon: '\\U000F0335', iconOn: '\\U000F034b', iconOff: '\\U000F0002' },
  { icon: 'F0210', iconOn: null, iconOff: null },
  { icon: '0335', iconOn: null, iconOff: null },
  { icon: '\\uF0335', iconOn: null, iconOff: null },
];

console.log('Simulating renderGridPreview (uses getIconByCodepoint):');
testButtons.forEach((btn, i) => {
  const iconData = getIconByCodepoint(btn.icon);
  console.log(`  Button ${i + 1}: icon=${btn.icon} -> ${iconData ? iconData.name : 'NOT FOUND'}`);
  assertNotNull(iconData, `Button ${i + 1} icon lookup succeeds`);
});

console.log('\nSimulating updateIconPreview (uses getIconByCodepoint):');
testButtons.forEach((btn, i) => {
  const iconData = getIconByCodepoint(btn.icon);
  const char = iconData ? iconData.unicode : '?';
  console.log(`  Button ${i + 1}: icon=${btn.icon} -> char=${char}`);
  assertEqual(char.length > 0, true, `Button ${i + 1} shows valid char`);
});

// ============================================================
// SUMMARY
// ============================================================
console.log('\n========================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  console.error('TESTS FAILED');
  process.exit(1);
} else {
  console.log('All tests passed!');
  process.exit(0);
}