import { useEffect, useCallback, useRef } from 'react';

type KeyModifiers = {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

type HotkeyConfig = {
  key: string;
  modifiers?: KeyModifiers;
  handler: (event: KeyboardEvent) => void;
  enabled?: boolean;
  preventDefault?: boolean;
};

/**
 * useHotkeys Hook
 * Register keyboard shortcuts with modifier key support
 * 
 * @param hotkeys - Array of hotkey configurations
 * 
 * @example
 * useHotkeys([
 *   { key: 'k', modifiers: { ctrl: true }, handler: () => openSearch() },
 *   { key: 'Escape', handler: () => closeModal() },
 *   { key: 's', modifiers: { ctrl: true }, handler: saveDocument, preventDefault: true },
 * ]);
 */
function useHotkeys(hotkeys: HotkeyConfig[]): void {
  const hotkeysRef = useRef(hotkeys);
  hotkeysRef.current = hotkeys;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger hotkeys when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Only allow Escape key in inputs
      if (event.key !== 'Escape') {
        return;
      }
    }

    for (const hotkey of hotkeysRef.current) {
      if (hotkey.enabled === false) continue;

      const { key, modifiers = {}, handler, preventDefault = false } = hotkey;

      // Check if the key matches
      if (event.key.toLowerCase() !== key.toLowerCase()) continue;

      // Check modifiers
      const ctrlMatch = modifiers.ctrl === undefined || modifiers.ctrl === (event.ctrlKey || event.metaKey);
      const shiftMatch = modifiers.shift === undefined || modifiers.shift === event.shiftKey;
      const altMatch = modifiers.alt === undefined || modifiers.alt === event.altKey;
      const metaMatch = modifiers.meta === undefined || modifiers.meta === event.metaKey;

      if (ctrlMatch && shiftMatch && altMatch && metaMatch) {
        if (preventDefault) {
          event.preventDefault();
        }
        handler(event);
        return;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * useSingleHotkey Hook
 * Simplified version for a single hotkey
 * 
 * @example
 * useSingleHotkey('Escape', () => setIsOpen(false));
 * useSingleHotkey('k', () => openSearch(), { ctrl: true });
 */
export function useSingleHotkey(
  key: string,
  handler: (event: KeyboardEvent) => void,
  modifiers?: KeyModifiers,
  options?: { enabled?: boolean; preventDefault?: boolean }
): void {
  useHotkeys([
    {
      key,
      modifiers,
      handler,
      enabled: options?.enabled,
      preventDefault: options?.preventDefault,
    },
  ]);
}

export default useHotkeys;
