import { useRef, useEffect } from 'react';

/**
 * usePrevious Hook
 * Returns the previous value of a variable
 * 
 * @param value - The value to track
 * @returns The previous value (undefined on first render)
 * 
 * @example
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 * 
 * console.log(`Current: ${count}, Previous: ${prevCount}`);
 * // On first render: Current: 0, Previous: undefined
 * // After increment: Current: 1, Previous: 0
 */
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export default usePrevious;
