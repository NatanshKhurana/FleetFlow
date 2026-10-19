// A blocking, local script initializes the single theme store before React or CSS paint.
(() => {
  const storageKey = 'fleetflow.theme';
  let theme = 'dark';
  const listeners = new Set();
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {
    // Private browsing or blocked storage still gets the required dark default.
  }
  document.documentElement.dataset.theme = theme;

  window.fleetflowTheme = {
    getSnapshot: () => theme,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setTheme(next) {
      if (!['dark', 'light'].includes(next) || next === theme) return;
      theme = next;
      document.documentElement.dataset.theme = theme;
      try {
        window.localStorage.setItem(storageKey, theme);
      } catch {
        // Switching works for this page even when persistence is unavailable.
      }
      for (const listener of listeners) listener();
    },
  };
})();
