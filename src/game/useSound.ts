import { useCallback, useState } from 'react';

const KEY = 'backguard.sound';

export interface SoundState {
  enabled: boolean;
  toggle: () => void;
}

/**
 * Sound preference. Off by default: an app that makes noise the moment it opens
 * gets muted, and once muted the player stops hearing the reward cues that make
 * the loop stick.
 */
export function useSound(): SoundState {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY, next ? '1' : '0');
      } catch {
        // Preference is a nicety. Ignore storage failures.
      }
      return next;
    });
  }, []);

  return { enabled, toggle };
}
