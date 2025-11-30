import { useState, useCallback } from 'react';

/**
 * useToggle Hook
 * Simple boolean state toggle
 * 
 * @param initialValue - Initial boolean value (default: false)
 * @returns [value, toggle, setValue]
 * 
 * @example
 * const [isOpen, toggleOpen, setOpen] = useToggle(false);
 * 
 * // Toggle
 * <button onClick={toggleOpen}>Toggle</button>
 * 
 * // Set specific value
 * <button onClick={() => setOpen(true)}>Open</button>
 */
function useToggle(initialValue = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  const set = useCallback((newValue: boolean) => {
    setValue(newValue);
  }, []);

  return [value, toggle, set];
}

export default useToggle;
