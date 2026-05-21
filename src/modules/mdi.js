let mdiData = new Map();
let mdiLoaded = false;

export function isMdiLoaded() { return mdiLoaded; }
export function getMdiData() { return mdiData; }

export async function loadMDIData() {
  const CACHE_KEY = 'cyd-mdi-data';
  const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        populateMdiMap(parsed);
        mdiLoaded = true;
        return;
      }
    }
  } catch (e) {
    console.warn('MDI cache read failed:', e);
  }

  try {
    const response = await fetch('https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/meta.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    populateMdiMap(data);

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) {
      console.warn('MDI cache write failed:', e);
    }

    mdiLoaded = true;
  } catch (e) {
    console.error('Failed to load MDI data:', e);
    mdiLoaded = false;
  }
}

function normalizeIconCodepoint(codepoint) {
  if (!codepoint || typeof codepoint !== 'string') return '';

  let cleaned = codepoint.trim().toLowerCase().replace(/^\\?u(000)?f/i, '');
  cleaned = cleaned.replace(/^f/i, '');

  if (!/^[0-9a-f]{4,5}$/i.test(cleaned)) return '';
  return cleaned.padStart(4, '0').toUpperCase();
}

function populateMdiMap(data) {
  if (!Array.isArray(data)) return;
  mdiData.clear();
  data.forEach(icon => {
    // Skip deprecated icons
    if (icon.deprecated) return;

    const hex = normalizeIconCodepoint(icon.codepoint || icon.id);
    if (!hex) return;

    const unicode = 0xF0000 + parseInt(hex, 16);
    if (unicode > 0x10FFFF) return;

    const tags = Array.isArray(icon.tags) ? icon.tags : [];

    mdiData.set(`\\U000F${hex}`, {
      name: icon.name,
      codepoint: `\\U000F${hex}`,
      char: String.fromCodePoint(unicode),
      categories: tags,
      tags: tags
    });
  });
}

export function getMdiCategories() {
  const cats = new Set();

  for (const [, icon] of mdiData) {
    for (const category of icon.categories || []) {
      cats.add(category);
    }
  }

  return [...cats].sort();
}

export function searchIconsByCategory(category, limit = 200) {
  const results = [];

  for (const [, icon] of mdiData) {
    if ((icon.categories || []).includes(category)) {
      results.push(icon);
      if (results.length >= limit) break;
    }
  }

  return results;
}

export function getIconByCodepoint(codepoint) {
  const hex = normalizeIconCodepoint(codepoint);
  if (!hex) return null;
  return mdiData.get(`\\U000F${hex}`) || null;
}

export function searchIcons(query, limit = 200) {
  if (!query || !mdiLoaded) {
    return Array.from(mdiData.values()).slice(0, limit);
  }

  const lower = query.toLowerCase();
  const results = [];

  for (const [key, icon] of mdiData) {
    if (icon.name.toLowerCase().includes(lower) || 
        icon.tags?.some(t => t.toLowerCase().includes(lower))) {
      results.push(icon);
      if (results.length >= limit) break;
    }
  }

  return results;
}

// --- Recent icons ---
const RECENT_KEY = 'cyd-recent-icons';
const MAX_RECENT = 15;

export function getRecentIcons() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch { return []; }
}

export function addRecentIcon(codepoint) {
  let recent = getRecentIcons();
  recent = recent.filter(c => c !== codepoint);
  recent.unshift(codepoint);
  if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
}

// --- Favorites ---
const FAV_KEY = 'cyd-favorite-icons';

export function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
  } catch { return []; }
}

export function toggleFavorite(codepoint) {
  let favs = getFavorites();
  if (favs.includes(codepoint)) {
    favs = favs.filter(c => c !== codepoint);
  } else {
    favs.push(codepoint);
  }
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  return favs.includes(codepoint);
}

export function isFavorite(codepoint) {
  return getFavorites().includes(codepoint);
}
