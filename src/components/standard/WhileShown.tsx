'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Children that exist only while their place on the page is shown. Inside a closed row (a hidden
 * panel) they are left out, so a player there loads nothing and does not take the Space key; they
 * mount when the row opens and unmount, stopping any playback, when it closes.
 */
export function WhileShown({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  // A hidden panel has no width, so the wrapper's width says whether it is on the page.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setShown(entry.contentRect.width > 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return <div ref={ref}>{shown ? children : null}</div>;
}
