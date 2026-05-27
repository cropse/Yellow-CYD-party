// ============================================================
// STATE ACCESSORS MODULE
// ============================================================

/**
 * Factory for state accessor getters.
 * @param {Function} getState - Getter returning current appState (not a value)
 * @param {object} defaults - DEFAULT_CONFIG
 * @param {string} defaultBoardId - DEFAULT_BOARD_ID
 */
export function createStateAccessors(getState, defaults, defaultBoardId) {
  const getBoardId = () => getState().board || defaultBoardId;
  const getGridColumns = () => getState().gridColumns || defaults.gridColumns;
  const getGridRows = () => getState().gridRows || defaults.gridRows;
  const getIconSize = () => getState().iconSize || defaults.iconSize;

  return { getBoardId, getGridColumns, getGridRows, getIconSize };
}

export function getPreviewFontSize(font) {
  return font === 'roboto_12' ? '18px' : font === 'arimo14' ? '20px' : '22px';
}
