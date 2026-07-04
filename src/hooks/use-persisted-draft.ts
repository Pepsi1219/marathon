import { useEffect, useRef } from "react";

const DRAFT_KEY = "pace-planner-draft";

/** Persists an arbitrary JSON-serializable draft to localStorage and restores it once on mount. */
export function usePersistedDraft<T>(value: T, onRestore: (value: T) => void) {
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) onRestore(JSON.parse(raw) as T);
    } catch {
      // Corrupt or missing draft — start fresh.
    }
    // Restore only once, right after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
    } catch {
      // Storage full/unavailable — the draft just won't persist this time.
    }
  }, [value]);
}
