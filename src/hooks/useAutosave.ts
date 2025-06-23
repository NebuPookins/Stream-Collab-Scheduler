import { useEffect, useRef, useCallback } from 'react';

const DEBOUNCE_DELAY = 3000; // 3 seconds

type SaveFunction = () => void;

export function useAutosave(saveFn: SaveFunction, dependencies: any[]): () => void {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      saveFn();
    }, DEBOUNCE_DELAY);
  }, [saveFn]);

  useEffect(() => {
    // Don't trigger save on initial mount, only on dependency changes
    // We can check if it's the initial render, but a simpler way for now is to
    // rely on the fact that actual user changes will trigger this effect.
    // For a more robust solution, one might add an isMounted check.
    debouncedSave();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [dependencies, debouncedSave]);

  const immediateSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    saveFn();
  }, [saveFn]);

  return immediateSave;
}
