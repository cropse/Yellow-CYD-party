// ============================================================
// MODAL MANAGEMENT MODULE
// ============================================================

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function createModalManager() {
  let lastModalTrigger = null;

  function openModal(modalId, initialFocus) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    lastModalTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    initialFocus?.focus();
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    if (lastModalTrigger?.isConnected) lastModalTrigger.focus();
    lastModalTrigger = null;
  }

  function trapModalFocus(e, modal) {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(el => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return { openModal, closeModal, trapModalFocus };
}
