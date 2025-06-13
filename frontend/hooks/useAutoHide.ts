import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages the visibility of controls for messages.
 * Only one set of controls can be visible at a time.
 * @param delay Time in ms after which controls should auto-hide.
 */
export function useAutoHide(delay: number) {
  const [id, setId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((nextId: string) => {
    setId(nextId);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setId(null), delay);
  }, [delay]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { id, show } as const;
}
