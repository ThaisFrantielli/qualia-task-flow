// Global interaction guards to prevent select-originated events from
// triggering document-level handlers (which have been causing unexpected
// navigation/view changes in some flows).

const state = {
  lastSelectTs: 0,
};

function markSelectInteraction() {
  state.lastSelectTs = Date.now();
}

export function isRecentSelectInteraction(ms = 1500) {
  return Date.now() - state.lastSelectTs < ms;
}

function onPointerDownCapture(e: Event) {
  try {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest && target.closest('select')) {
      markSelectInteraction();
      // Stop propagation so document-level mousedown handlers won't run
      // for interactions that originated inside a SELECT/OPTION.
      (e as Event).stopPropagation();
    }
  } catch (err) {}
}

// Install listeners in capture phase early
document.addEventListener('pointerdown', onPointerDownCapture, true);
document.addEventListener('mousedown', onPointerDownCapture, true);
document.addEventListener('click', onPointerDownCapture, true);

// Export nothing else; simply importing this module activates the guards.

export default null;
