import { useState, useEffect, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import { getErrorMessage } from '@/utils/errorHandler';

/**
 * State for the useFetch hook
 */
interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isError: boolean;
  isSuccess: boolean;
}

/**
 * Options for the useFetch hook
 */
interface UseFetchOptions<T> {
  /** Initial data before fetch completes */
  initialData?: T;
  /** Whether to fetch immediately on mount */
  immediate?: boolean;
  /** Dependencies that trigger refetch */
  deps?: unknown[];
  /** Transform function for the response data */
  transform?: (data: unknown) => T;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Cache key for deduplication */
  cacheKey?: string;
  /** Cache time in milliseconds */
  cacheTime?: number;
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * Generic data fetching hook with loading, error states, and caching
 * 
 * @param fetchFn - Async function that returns data
 * @param options - Configuration options
 * 
 * @example
 * // Basic usage
 * const { data, isLoading, error, refetch } = useFetch(() => 
 *   api.get('/courses').then(res => res.data)
 * );
 * 
 * @example
 * // With options
 * const { data, isLoading } = useFetch(
 *   () => courseService.getCourse(id),
 *   {
 *     initialData: null,
 *     deps: [id],
 *     onSuccess: (course) => console.log('Loaded:', course.title),
 *     cacheKey: `course-${id}`,
 *     cacheTime: 5 * 60 * 1000, // 5 minutes
 *   }
 * );
 */
function useFetch<T>(
  fetchFn: () => Promise<T>,
  options: UseFetchOptions<T> = {}
): FetchState<T> & {
  refetch: () => Promise<void>;
  mutate: (data: T | ((prev: T | null) => T)) => void;
  reset: () => void;
} {
  const {
    initialData = null,
    immediate = true,
    deps = [],
    transform,
    onSuccess,
    onError,
    cacheKey,
    cacheTime = 0,
  } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: initialData as T | null,
    isLoading: immediate,
    error: null,
    isError: false,
    isSuccess: false,
  });

  const isMounted = useRef(true);
  const fetchCount = useRef(0);

  // Check cache
  const getCachedData = useCallback(() => {
    if (!cacheKey) return null;
    
    const cached = cache.get(cacheKey);
    if (!cached) return null;
    
    const isExpired = cacheTime > 0 && Date.now() - cached.timestamp > cacheTime;
    if (isExpired) {
      cache.delete(cacheKey);
      return null;
    }
    
    return cached.data as T;
  }, [cacheKey, cacheTime]);

  // Set cache
  const setCachedData = useCallback((data: T) => {
    if (cacheKey) {
      cache.set(cacheKey, { data, timestamp: Date.now() });
    }
  }, [cacheKey]);

  const fetchData = useCallback(async () => {
    const currentFetchCount = ++fetchCount.current;

    // Check cache first
    const cachedData = getCachedData();
    if (cachedData !== null) {
      setState({
        data: cachedData,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, isError: false }));

    try {
      const rawData = await fetchFn();
      
      // Apply transform if provided
      const data: T = transform ? transform(rawData) : rawData;

      // Only update if this is the latest fetch and component is mounted
      if (currentFetchCount === fetchCount.current && isMounted.current) {
        setCachedData(data);
        setState({
          data,
          isLoading: false,
          error: null,
          isError: false,
          isSuccess: true,
        });
        onSuccess?.(data);
      }
    } catch (err) {
      if (currentFetchCount === fetchCount.current && isMounted.current) {
        const errorMessage = getErrorMessage(err);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          isError: true,
          isSuccess: false,
        }));
        onError?.(errorMessage);
      }
    }
  }, [fetchFn, transform, onSuccess, onError, getCachedData, setCachedData]);

  // Refetch function
  const refetch = useCallback(async () => {
    // Clear cache for this key
    if (cacheKey) {
      cache.delete(cacheKey);
    }
    await fetchData();
  }, [fetchData, cacheKey]);

  // Mutate data locally
  const mutate = useCallback((newData: T | ((prev: T | null) => T)) => {
    setState(prev => {
      const data = typeof newData === 'function' 
        ? (newData as (prev: T | null) => T)(prev.data)
        : newData;
      
      // Update cache
      if (cacheKey) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
      }
      
      return {
        ...prev,
        data,
        isSuccess: true,
      };
    });
  }, [cacheKey]);

  // Reset to initial state
  const reset = useCallback(() => {
    setState({
      data: initialData as T | null,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: false,
    });
  }, [initialData]);

  // Fetch on mount and when deps change
  useEffect(() => {
    isMounted.current = true;
    
    if (immediate) {
      fetchData();
    }

    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps]);

  return {
    ...state,
    refetch,
    mutate,
    reset,
  };
}

export default useFetch;

/**
 * Hook for mutations (POST, PUT, DELETE)
 * 
 * @example
 * const { mutate, isLoading } = useMutation(
 *   (data) => api.post('/courses', data),
 *   {
 *     onSuccess: () => {
 *       toast.success('Course created!');
 *       navigate('/courses');
 *     },
 *   }
 * );
 * 
 * // Later:
 * mutate({ title: 'New Course', ... });
 */
export function useMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: string, variables: TVariables) => void;
    onSettled?: (data: TData | null, error: string | null, variables: TVariables) => void;
  } = {}
) {
  const [state, setState] = useState({
    data: null as TData | null,
    isLoading: false,
    error: null as string | null,
    isError: false,
    isSuccess: false,
  });

  const mutate = useCallback(
    async (variables: TVariables) => {
      setState(prev => ({ ...prev, isLoading: true, error: null, isError: false }));

      try {
        const data = await mutationFn(variables);
        setState({
          data,
          isLoading: false,
          error: null,
          isError: false,
          isSuccess: true,
        });
        options.onSuccess?.(data, variables);
        options.onSettled?.(data, null, variables);
        return data;
      } catch (err) {
        const errorMessage = err instanceof AxiosError 
          ? getErrorMessage(err)
          : (err instanceof Error ? err.message : 'An error occurred');
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          isError: true,
          isSuccess: false,
        }));
        options.onError?.(errorMessage, variables);
        options.onSettled?.(null, errorMessage, variables);
        throw err;
      }
    },
    [mutationFn, options]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: false,
    });
  }, []);

  return {
    ...state,
    mutate,
    mutateAsync: mutate,
    reset,
  };
}
