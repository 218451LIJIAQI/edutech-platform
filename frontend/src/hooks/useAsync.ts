import { useState, useCallback, useRef, useEffect } from 'react';

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
  isError: boolean;
}

interface UseAsyncReturn<T, Args extends unknown[]> extends AsyncState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

/**
 * useAsync Hook
 * Manages async operation states (loading, error, data)
 * 
 * @param asyncFunction - The async function to execute
 * @param immediate - Whether to execute immediately on mount
 * @returns Object with state and execute function
 * 
 * @example
 * const { data, isLoading, error, execute } = useAsync(fetchUser, false);
 * 
 * // Execute manually
 * const handleClick = () => execute(userId);
 * 
 * // Or with immediate execution
 * const { data, isLoading } = useAsync(() => fetchUser(userId), true);
 */
function useAsync<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  immediate = false
): UseAsyncReturn<T, Args> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: immediate,
    error: null,
    isSuccess: false,
    isError: false,
  });

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  
  // Keep track of the latest async function
  const asyncFunctionRef = useRef(asyncFunction);
  asyncFunctionRef.current = asyncFunction;

  const execute = useCallback(async (...args: Args): Promise<T | null> => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      isSuccess: false,
      isError: false,
    }));

    try {
      const response = await asyncFunctionRef.current(...args);
      
      if (isMounted.current) {
        setState({
          data: response,
          isLoading: false,
          error: null,
          isSuccess: true,
          isError: false,
        });
      }
      
      return response;
    } catch (error) {
      if (isMounted.current) {
        setState({
          data: null,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
          isSuccess: false,
          isError: true,
        });
      }
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      isSuccess: false,
      isError: false,
    });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as Args));
    }
  }, [immediate, execute]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
}

export default useAsync;
