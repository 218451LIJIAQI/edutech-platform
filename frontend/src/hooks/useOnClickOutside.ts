import { useEffect, RefObject } from 'react';

/**
 * useOnClickOutside Hook
 * Detects clicks outside of a specified element and triggers a callback
 * Useful for closing dropdowns, modals, and menus
 * 
 * @param ref - React ref object pointing to the element to detect outside clicks
 * @param handler - Callback function to execute when an outside click is detected
 * @param enabled - Optional flag to enable/disable the hook (default: true)
 * 
 * @example
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * const [isOpen, setIsOpen] = useState(false);
 * 
 * useOnClickOutside(dropdownRef, () => setIsOpen(false), isOpen);
 * 
 * return (
 *   <div ref={dropdownRef}>
 *     {isOpen && <DropdownMenu />}
 *   </div>
 * );
 */
function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current;
      
      // Do nothing if clicking ref's element or descendent elements
      if (!el || el.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    // Use mousedown and touchstart for better UX (fires before click)
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]);
}

export default useOnClickOutside;
