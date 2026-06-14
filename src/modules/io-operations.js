// ============================================================
// I/O OPERATIONS MODULE
// ============================================================

export function createIOOperations(getState, store, generateYAML, showToast, importFromYAML) {
  function importConfig(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        const { config, warnings } = importFromYAML(text);
        store.update('Import config', state => {
          Object.assign(state, config);
          state.board = config.board || 'esp32-2432s028-2port';
        }, { skipUndo: true });
        if (warnings.length) {
          console.log('Import warnings:', warnings);
          showToast(`Imported with ${warnings.length} adjustments`, 'warning');
        } else {
          showToast('Configuration imported', 'success');
        }
      } catch (err) {
        showToast('Import failed: ' + err.message, 'error');
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

  return { importConfig, downloadYAML, copyYAMLToClipboard };
}
