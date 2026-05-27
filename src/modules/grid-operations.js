// ============================================================
// GRID OPERATIONS MODULE
// ============================================================

/**
 * Factory for grid drag-and-drop and keyboard navigation.
 * @param {Function} getState - Getter returning current appState
 * @param {Function} getSelectedIndex - Getter returning selectedButtonIndex
 * @param {Function} getGridColumns - Getter for grid columns
 * @param {Function} getGridRows - Getter for grid rows
 * @param {object} store - Store with .update() method
 * @param {Function} selectButton - Callback to select a button by index
 * @param {Function} showToast - Toast notification function
 * @param {Function} renderGridPreview - Callback to re-render grid after changes
 * @param {Function} renderEditorPanel - Callback to re-render editor after changes
 * @param {object} DEFAULT_BUTTON - Default button template
 */
export function createGridOperations(deps) {
  const {
    getState, getSelectedIndex, getGridColumns, getGridRows,
    store, selectButton, showToast, renderGridPreview, renderEditorPanel,
    DEFAULT_BUTTON
  } = deps;

  function getGridDragButtonIndex(cell) {
    if (!cell || cell.dataset.btnIndex === 'empty') return -1;
    const index = Number.parseInt(cell.dataset.btnIndex, 10);
    return Number.isInteger(index) ? index : -1;
  }

  function clearGridDragState() {
    document.querySelectorAll('.grid-cell.dragging, .grid-cell.drag-over').forEach(cell => {
      cell.classList.remove('dragging', 'drag-over');
      cell.removeAttribute('aria-dropeffect');
    });
  }

  function handleGridDragStart(e, btnIndex) {
    if (btnIndex < 0) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(btnIndex));
    e.currentTarget.classList.add('dragging');
    e.currentTarget.setAttribute('aria-grabbed', 'true');
  }

  function handleGridDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleGridDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
    e.currentTarget.setAttribute('aria-dropeffect', 'move');
  }

  function handleGridDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    e.currentTarget.classList.remove('drag-over');
    e.currentTarget.removeAttribute('aria-dropeffect');
  }

  function handleGridDrop(e) {
    e.preventDefault();
    const sourceIndex = Number.parseInt(e.dataTransfer.getData('text/plain'), 10);
    const targetCell = e.currentTarget;
    const targetCol = Number.parseInt(targetCell.dataset.col, 10);
    const targetRow = Number.parseInt(targetCell.dataset.row, 10);

    if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetCol) || !Number.isInteger(targetRow)) {
      clearGridDragState();
      return;
    }

    const appState = getState();
    const sourceButton = appState.buttons[sourceIndex];
    if (!sourceButton || (sourceButton.col === targetCol && sourceButton.row === targetRow)) {
      clearGridDragState();
      return;
    }

    const targetIndex = getGridDragButtonIndex(targetCell);
    store.update('Move grid button', state => {
      const source = state.buttons[sourceIndex];
      if (!source) return;
      const sourceCol = source.col;
      const sourceRow = source.row;
      source.col = targetCol;
      source.row = targetRow;
      if (targetIndex >= 0 && targetIndex !== sourceIndex) {
        const target = state.buttons[targetIndex];
        if (target) {
          target.col = sourceCol;
          target.row = sourceRow;
        }
      }
    });

    selectButton(sourceIndex);
    clearGridDragState();
  }

  function handleGridDragEnd(e) {
    e.currentTarget.setAttribute('aria-grabbed', 'false');
    clearGridDragState();
  }

  function applyGridDragAttributes(cell, btnIndex) {
    cell.draggable = btnIndex >= 0;
    cell.setAttribute('aria-grabbed', 'false');
    cell.setAttribute('aria-dropeffect', 'move');
  }

  function attachGridDragListeners(cell, btnIndex) {
    cell.addEventListener('dragstart', (e) => handleGridDragStart(e, btnIndex));
    cell.addEventListener('dragover', handleGridDragOver);
    cell.addEventListener('dragenter', handleGridDragEnter);
    cell.addEventListener('dragleave', handleGridDragLeave);
    cell.addEventListener('drop', handleGridDrop);
    cell.addEventListener('dragend', handleGridDragEnd);
  }

  function findEmptyPosition() {
    const state = getState();
    const cols = state.gridColumns || getGridColumns();
    const rows = state.gridRows || getGridRows();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const occupied = state.buttons.some(b => !b.empty && b.col === col && b.row === row);
        if (!occupied) return { col, row };
      }
    }
    return null;
  }

  function handleEmptyCellClick(col, row) {
    const state = getState();
    const occupied = state.buttons.some(b => !b.empty && b.col === col && b.row === row);
    const target = occupied ? findEmptyPosition() : { col, row };
    if (!target) {
      showToast('Grid is full — remove a button first', 'error');
      return;
    }
    store.update('Add new button', next => {
      const newBtn = structuredClone(DEFAULT_BUTTON);
      newBtn.id = `btn_${Date.now()}`;
      newBtn.name = `Button ${next.buttons.length + 1}`;
      newBtn.label = `Btn ${next.buttons.length + 1}`;
      newBtn.col = target.col;
      newBtn.row = target.row;
      next.buttons.push(newBtn);
    });
    selectButton(getState().buttons.length - 1);
    renderGridPreview();
    renderEditorPanel();
  }

  function handleGridKeydown(e, col, row, btnIndex) {
    const keyMap = {
      'ArrowRight': [1, 0],
      'ArrowLeft': [-1, 0],
      'ArrowDown': [0, 1],
      'ArrowUp': [0, -1]
    };
    const delta = keyMap[e.key];
    if (!delta) return;
    e.preventDefault();
    const maxCol = getGridColumns() - 1;
    const maxRow = getGridRows() - 1;
    const newCol = Math.max(0, Math.min(maxCol, col + delta[0]));
    const newRow = Math.max(0, Math.min(maxRow, row + delta[1]));
    const targetCell = document.querySelector(`.grid-cell[data-col="${newCol}"][data-row="${newRow}"]`);
    if (targetCell) {
      targetCell.focus();
      const appState = getState();
      const targetBtnIndex = appState.buttons.findIndex(b => b.col === newCol && b.row === newRow);
      if (targetBtnIndex >= 0) {
        selectButton(targetBtnIndex);
      }
    }
  }

  return {
    getGridDragButtonIndex,
    clearGridDragState,
    handleGridDragStart,
    handleGridDragOver,
    handleGridDragEnter,
    handleGridDragLeave,
    handleGridDrop,
    handleGridDragEnd,
    applyGridDragAttributes,
    attachGridDragListeners,
    findEmptyPosition,
    handleEmptyCellClick,
    handleGridKeydown
  };
}
