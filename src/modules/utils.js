export function clampNumber(value, min, max, fallback) {
  const number = parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

export function cleanYAMLValue(value) {
  if (typeof value !== 'string') return String(value ?? '');
  let cleaned = value.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

export function normalizeColor(value) {
  const cleaned = cleanYAMLValue(value).replace(/^0x/i, '').replace(/^#/, '').toUpperCase();
  return /^[0-9A-F]{6}$/.test(cleaned) ? cleaned : null;
}

export function ensureUniquePositions(buttons, warnings = []) {
  const used = new Set();
  buttons.forEach((btn, index) => {
    const key = `${btn.col},${btn.row}`;
    if (!used.has(key)) {
      used.add(key);
      return;
    }

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const candidate = `${col},${row}`;
        if (!used.has(candidate)) {
          btn.col = col;
          btn.row = row;
          used.add(candidate);
          warnings.push(`Button ${index + 1} had a duplicate position; reset to ${btn.col},${btn.row}.`);
          return;
        }
      }
    }
  });
}

export function getYAMLSection(yaml, sectionName) {
  const lines = yaml.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex(line => new RegExp(`^${sectionName}\\s*:`).test(line));
  if (start < 0) return '';
  const sectionLines = [lines[start]];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^[A-Za-z0-9_]+\s*:/.test(lines[i]) || /^\.\.\.\s*$/.test(lines[i])) break;
    sectionLines.push(lines[i]);
  }
  return sectionLines.join('\n');
}

export function splitTopLevelListItems(section) {
  const lines = section.split('\n').slice(1);
  const items = [];
  let current = [];
  lines.forEach(line => {
    if (/^\s{2}-\s/.test(line) && current.length) {
      items.push(current.join('\n'));
      current = [line];
    } else if (/^\s{2}-\s/.test(line) || current.length) {
      current.push(line);
    }
  });
  if (current.length) items.push(current.join('\n'));
  return items;
}

export function parseYAMLKeyValue(line) {
  const match = line.match(/^\s{0,6}([A-Za-z0-9_]+)\s*:\s*(.*)$/);
  if (!match) return null;
  return { key: match[1], value: cleanYAMLValue(match[2]) };
}

export function generateRandomPassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function sanitizeDeviceName(value) {
  return String(value || '').trim().replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

export function isPlainYAMLObject(value) {
  if (value === null || Array.isArray(value) || typeof value !== 'object') return false;
  return Object.entries(value).every(([key, val]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)) return false;
    if (val === undefined || typeof val === 'function') return false;
    if (typeof val === 'number') return Number.isFinite(val);
    if (Array.isArray(val)) return val.every(item => ['string', 'number', 'boolean'].includes(typeof item) || item === null);
    if (typeof val === 'object' && val !== null) return isPlainYAMLObject(val);
    return true;
  });
}

import YamlPkg from 'yaml';
const {stringify: yamlStringify} = YamlPkg;

const RAW_START = 'YAMLRAWSTART';
const RAW_END = 'YAMLRAWEND';

// Sentinel marker for raw-pass-through values that must not be quoted.
// After yamlStringify(), this sentinel is stripped from the output.

// yamlSecret('api_encryption_key') → renders as !secret api_encryption_key
export function yamlSecret(name) {
  return `${RAW_START}!secret ${name}${RAW_END}`;
}

// yamlInclude('path/to/template.yaml') → renders as !include path...
export function yamlInclude(path) {
  return `${RAW_START}!include ${path}${RAW_END}`;
}

// yamlRaw('...') → renders as-is, no quoting
// Used for ${device_name}, !lambda, multiline, etc.
export function yamlRaw(str) {
  if (typeof str !== 'string') return str;
  return `${RAW_START}${str}${RAW_END}`;
}

// yamlDoc: array of {title, body} → joined YAML sections
// body can be an object, an array of list items, or null (render as bare key)
export function yamlDoc(sections) {
  const parts = [];
  for (const s of sections) {
    if (!s || (s.body === undefined && s.list === undefined)) continue;
    if (s.body === null) {
      parts.push(`${s.title}:\n`);
      continue;
    }
    if (typeof s.body === 'string' && s.body.startsWith(RAW_START) && s.body.endsWith(RAW_END)) {
      const rawBody = s.body.slice(RAW_START.length, -RAW_END.length);
      parts.push(`${s.title}:\n${rawBody.replace(/\n+$/, '')}\n`);
      continue;
    }

    let obj;
    if (s.list !== undefined) {
      obj = {[s.title]: s.list.filter(v => v != null)};
    } else {
      obj = {[s.title]: s.body};
    }
    let out = yamlStringify(obj, {indent: 2, lineWidth: 0});
    // Strip sentinel markers (non-greedy, multiline-safe).
    const raw = new RegExp(`${RAW_START}(.+?)${RAW_END}`, 'gs');
    out = out.replace(raw, '$1');
    // Convert ': null' to ':' for known bare-key ESPHome actions.
    out = out.replace(/ (lvgl\.\w+(\.\w+)*|light\.\w+): null$/gm, ' $1:');
    out = out.replace(/-( (lvgl\.\w+(\.\w+)*)| logger\.log): null$/gm, '- $1:');
    parts.push(out.replace(/\n+$/, '\n'));
  }
  return parts.join('\n');
}



// Debounce: delays execution until `wait` ms have passed since the last call.

// Debounce: delays execution until `wait` ms have passed since the last call.
// Optionally flush on the first call (leading) and cancel prior pending invocations.
export function debounce(fn, wait, opts = {}) {
  const { leading = false, trailing = true } = opts;
  let timer = null;
  let lastArgs = null;
  let lastThis = null;

  function invoke() {
    timer = null;
    fn.apply(lastThis, lastArgs);
    lastArgs = null;
    lastThis = null;
  }

  function scheduled() {
    if (leading && !timer) {
      // Fire immediately on first call, then schedule trailing for latest args
      fn.apply(this, arguments);
      lastArgs = arguments;
      lastThis = this;
      timer = setTimeout(() => {
        // If called again during the wait, fire the latest args
        if (lastArgs) {
          timer = null;
          fn.apply(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
        } else {
          timer = null;
        }
      }, wait);
    } else if (trailing) {
      lastArgs = arguments;
      lastThis = this;
      if (!timer) {
        timer = setTimeout(invoke, wait);
      } else {
        // Reset the timer
        clearTimeout(timer);
        timer = setTimeout(invoke, wait);
      }
    }
  }

  scheduled.cancel = function() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  return scheduled;
}
