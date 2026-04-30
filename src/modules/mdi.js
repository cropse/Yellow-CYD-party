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
    const response = await fetch('https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/meta.json');
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

function populateMdiMap(data) {
  if (!Array.isArray(data)) return;
  mdiData.clear();
  data.forEach(icon => {
    const codepoint = icon.codepoint || icon.id;
    const hex = String(codepoint).toUpperCase().padStart(4, '0');
    mdiData.set(`\\U000F${hex}`, {
      name: icon.name,
      codepoint: `\\U000F${hex}`,
      char: String.fromCodePoint(0xF0000 + parseInt(hex, 16)),
      category: icon.category || 'other',
      tags: icon.tags || []
    });
  });
}

export function getIconByCodepoint(codepoint) {
  if (!codepoint) return null;
  return mdiData.get(codepoint) || null;
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
