// ============================================================
// ICON PICKER MODULE
// ============================================================

const MDI_CATEGORIES = [
  { key: 'home-automation', label: 'Home Automation', icon: '🏠', tag: 'Home Automation' },
  { key: 'account-user', label: 'Account / User', icon: '👤', tag: 'Account / User' },
  { key: 'arrow', label: 'Arrow', icon: '➡️', tag: 'Arrow' },
  { key: 'alert-error', label: 'Alert / Error', icon: '⚠️', tag: 'Alert / Error' },
  { key: 'automotive', label: 'Automotive', icon: '🚗', tag: 'Automotive' },
  { key: 'battery', label: 'Battery', icon: '🔋', tag: 'Battery' },
  { key: 'banking', label: 'Banking', icon: '🏦', tag: 'Banking' },
  { key: 'brand-logo', label: 'Brand / Logo', icon: '🏷️', tag: 'Brand / Logo' },
  { key: 'weather', label: 'Weather', icon: '☀️', tag: 'Weather' },
  { key: 'settings', label: 'Settings', icon: '⚙️', tag: 'Settings' },
  { key: 'lock', label: 'Lock', icon: '🔒', tag: 'Lock' },
  { key: 'device-tech', label: 'Device / Tech', icon: '📱', tag: 'Device / Tech' },
  { key: 'files-folders', label: 'Files / Folders', icon: '📁', tag: 'Files / Folders' },
  { key: 'food-drink', label: 'Food / Drink', icon: '🍕', tag: 'Food / Drink' },
  { key: 'gaming-rpg', label: 'Gaming / RPG', icon: '🎮', tag: 'Gaming / RPG' },
  { key: 'music', label: 'Music', icon: '🎵', tag: 'Music' },
  { key: 'navigation', label: 'Navigation', icon: '🧭', tag: 'Navigation' },
  { key: 'text-format', label: 'Text / Format', icon: '✏️', tag: 'Text / Content / Format' },
  { key: 'transport-road', label: 'Transport + Road', icon: '🛣️', tag: 'Transportation + Road' },
  { key: 'video-movie', label: 'Video / Movie', icon: '🎬', tag: 'Video / Movie' },
  { key: 'medical', label: 'Medical / Hospital', icon: '🏥', tag: 'Medical / Hospital' },
  { key: 'sport', label: 'Sport', icon: '⚽', tag: 'Sport' },
  { key: 'shopping', label: 'Shopping', icon: '🛒', tag: 'Shopping' },
  { key: 'math', label: 'Math', icon: '🔢', tag: 'Math' },
  { key: 'nature', label: 'Nature', icon: '🌿', tag: 'Nature' },
  { key: 'photography', label: 'Photography', icon: '📷', tag: 'Photography' },
  { key: 'edit-modify', label: 'Edit / Modify', icon: '📝', tag: 'Edit / Modify' },
  { key: 'audio', label: 'Audio', icon: '🔊', tag: 'Audio' },
  { key: 'shape', label: 'Shape', icon: '⬜', tag: 'Shape' },
];

/**
 * Factory for icon picker UI.
 * @param {object} deps - Dependencies
 * @param {object} deps.store - Store with .button() method
 * @param {Function} deps.updateIconPreview - Updates icon preview in editor
 * @param {Function} deps.openModal - Modal manager open
 * @param {Function} deps.closeModal - Modal manager close
 * @param {Function} deps.escapeHTML - HTML escaping utility
 * @param {Function} deps.getMdiData - Returns MDI icon map
 * @param {Function} deps.getIconByCodepoint - Lookup icon by codepoint
 * @param {Function} deps.searchIcons - Search icons by query
 * @param {Function} deps.searchIconsByCategory - Search icons by category tag
 * @param {Function} deps.getRecentIcons - Get recent icon codepoints
 * @param {Function} deps.addRecentIcon - Add icon to recent list
 * @param {Function} deps.getFavorites - Get favorite icon codepoints
 * @param {Function} deps.toggleFavorite - Toggle favorite status
 */
export function createIconPicker(deps) {
  const {
    store, updateIconPreview, openModal, closeModal, escapeHTML,
    getMdiData, getIconByCodepoint, searchIcons, searchIconsByCategory,
    getRecentIcons, addRecentIcon, getFavorites, toggleFavorite
  } = deps;

  let currentIconTarget = 'main';
  let selectedIconInModal = null;
  let selectedIconCategory = 'all';
  let iconSearchTimer = null;

  function openIconPicker(target) {
    currentIconTarget = target;
    const search = document.getElementById('icon-search');
    if (search) search.value = '';
    renderIconCategories();
    renderIconResults('');
    openModal('icon-modal', search);
  }

  function closeIconPicker() {
    clearTimeout(iconSearchTimer);
    iconSearchTimer = null;
    closeModal('icon-modal');
    selectedIconInModal = null;
  }

  function renderIconCategories() {
    const container = document.getElementById('icon-category-tabs');
    if (!container) return;

    const mdiData = getMdiData();
    const categoryCounts = new Map();
    for (const [, icon] of mdiData) {
      for (const cat of icon.categories || []) {
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      }
    }

    const tabs = [
      { key: 'recent', name: 'Recent', icon: '⏱' },
      { key: 'favorites', name: 'Favorites', icon: '★' },
      { key: 'all', name: 'All', icon: '🔀' },
      ...MDI_CATEGORIES.filter(cat => categoryCounts.has(cat.tag))
        .map(cat => ({ key: cat.key, name: cat.label, icon: cat.icon }))
    ];

    if (!tabs.some(tab => tab.key === selectedIconCategory)) {
      selectedIconCategory = 'all';
    }

    container.className = 'icon-category-tabs';
    container.innerHTML = tabs.map(tab => `
      <button type="button" class="icon-cat-btn ${tab.key === selectedIconCategory ? 'active' : ''}"
              data-category="${escapeHTML(tab.key)}">
        ${tab.icon ? `<span class="cat-icon">${tab.icon}</span>` : ''}${escapeHTML(tab.name)}
      </button>
    `).join('');

    container.querySelectorAll('.icon-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedIconCategory = btn.dataset.category;
        renderIconCategories();
        renderIconResults(document.getElementById('icon-search')?.value || '');
      });
    });
  }

  function renderIconResults(query) {
    const container = document.getElementById('icon-results');
    if (!container) return;

    let icons = [];
    if (query) {
      icons = searchIcons(query, 200);
    } else if (selectedIconCategory === 'recent') {
      icons = getRecentIcons().map(cp => getIconByCodepoint(cp)).filter(Boolean);
    } else if (selectedIconCategory === 'favorites') {
      icons = getFavorites().map(cp => getIconByCodepoint(cp)).filter(Boolean);
    } else if (selectedIconCategory !== 'all') {
      const catDef = MDI_CATEGORIES.find(c => c.key === selectedIconCategory);
      if (catDef) icons = searchIconsByCategory(catDef.tag, 200);
    } else {
      icons = searchIcons('', 200);
    }

    if (icons.length === 0) {
      const emptyMsg = selectedIconCategory === 'favorites'
        ? 'No favorites yet. Double-click any icon to pin it here.'
        : selectedIconCategory === 'recent'
          ? 'No recent icons. Select icons and they appear here.'
          : (query ? 'No icons match your search.' : 'No icons available.');
      container.innerHTML = `<div class="icon-empty"><p>${emptyMsg}</p></div>`;
      return;
    }

    const favSet = new Set(getFavorites());
    const countLabel = document.createElement('div');
    countLabel.className = 'icon-count';
    countLabel.textContent = `${icons.length} icon${icons.length === 1 ? '' : 's'}`;

    const grid = document.createElement('div');
    grid.className = 'icon-grid';
    grid.innerHTML = icons.map(icon => {
      const fav = favSet.has(icon.codepoint);
      return `
        <button type="button" class="icon-result ${selectedIconInModal === icon.codepoint ? 'selected' : ''}"
                data-codepoint="${icon.codepoint}" data-name="${escapeHTML(icon.name)}">
          <span class="icon-char" style="font-family: 'Material Design Icons'">${icon.char}</span>
          <span class="icon-name">${escapeHTML(icon.name)}</span>
          ${fav ? '<span class="icon-fav-badge" title="Favorited">★</span>' : ''}
        </button>
      `;
    }).join('');

    container.innerHTML = '';
    container.appendChild(countLabel);
    container.appendChild(grid);

    const clickTimers = new Map();
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.icon-result');
      if (!btn) return;
      const codepoint = btn.dataset.codepoint;
      const timer = clickTimers.get(codepoint);
      if (timer) {
        clearTimeout(timer);
        clickTimers.delete(codepoint);
        toggleFavorite(codepoint);
        renderIconResults(document.getElementById('icon-search')?.value || '');
        return;
      }
      clickTimers.set(codepoint, setTimeout(() => {
        clickTimers.delete(codepoint);
        selectIcon(codepoint);
      }, 250));
    });
  }

  function selectIcon(codepoint) {
    if (currentIconTarget === 'main') {
      store.button('icon', codepoint);
      updateIconPreview('icon', codepoint);
    } else if (currentIconTarget === 'on') {
      store.button('iconOn', codepoint);
      updateIconPreview('icon-on', codepoint);
    } else if (currentIconTarget === 'off') {
      store.button('iconOff', codepoint);
      updateIconPreview('icon-off', codepoint);
    }
    addRecentIcon(codepoint);
    closeIconPicker();
  }

  return { openIconPicker, closeIconPicker, renderIconCategories, renderIconResults, selectIcon };
}
