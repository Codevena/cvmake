'use client';
import { useEffect, useRef } from 'react';

type Combo = 'mod+s' | 'mod+k';

export function useHotkey(combo: Combo, handler: (e: KeyboardEvent) => void): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (combo === 'mod+s') {
        if (isMod && e.key.toLowerCase() === 's') handlerRef.current(e);
      } else if (combo === 'mod+k') {
        if (isMod && e.key.toLowerCase() === 'k') handlerRef.current(e);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo]);
}
