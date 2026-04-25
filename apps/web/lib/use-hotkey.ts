'use client';
import { useEffect } from 'react';

type Combo = 'mod+s';

export function useHotkey(combo: Combo, handler: (e: KeyboardEvent) => void): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (combo === 'mod+s') {
        const isMod = e.metaKey || e.ctrlKey;
        if (isMod && e.key.toLowerCase() === 's') handler(e);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, handler]);
}
