// ============================================================
// I/O OPERATIONS MODULE
// ============================================================

/**
 * Factory for import/export/download operations.
 * @param {Function} getState - Getter returning current appState
 * @param {object} store - Store with .update() method
 * @param {Function} generateYAML - YAML generation function
 * @param {Function} showToast - Toast notification function
 * @param {Function} normalizeImportedConfig - Config normalization from import.js
 * @param {string} defaultBoardId - DEFAULT_BOARD_ID constant
 */
export function createIOOperations(getState, store, generateYAML, showToast, normalizeImportedConfig, defaultBoardId) {
  function exportConfig() {
    const state = getState();
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.deviceName || 'cyd'}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Configuration exported', 'success');
  }

  function importConfig(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target.result);
        const { config, warnings } = normalizeImportedConfig(raw);
        store.update('Import config', state => {
          Object.assign(state, config);
          state.board = config.board || defaultBoardId;
        }, { skipUndo: true });
        if (warnings.length) {
          console.log('Import warnings:', warnings);
          showToast(`Imported with ${warnings.length} adjustments`, 'warning');
        } else {
          showToast('Configuration imported', 'success');
        }
      } catch (err) {
        showToast('Import failed: invalid JSON', 'error');
        console.error('Import error:', err);
      }
    };
    reader.readAsText(file);
  }

  function downloadYAML() {
    const yaml = generateYAML();
    if (!yaml) {
      showToast('Cannot download: fix validation errors first', 'error');
      return;
    }
    const state = getState();
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.deviceName || 'cyd'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('YAML downloaded', 'success');
  }

  function copyYAMLToClipboard() {
    const yaml = generateYAML();
    if (!yaml) {
      showToast('Cannot copy: fix validation errors first', 'error');
      return;
    }
    navigator.clipboard.writeText(yaml).then(() => {
      showToast('YAML copied to clipboard', 'success');
    }).catch(() => {
      showToast('Failed to copy YAML', 'error');
    });
  }

  function copyConfigToClipboard() {
    const state = getState();
    const json = JSON.stringify(state, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      showToast('Config copied to clipboard', 'success');
    }).catch(() => {
      showToast('Failed to copy config', 'error');
    });
  }

  return { exportConfig, importConfig, downloadYAML, copyYAMLToClipboard, copyConfigToClipboard };
}
