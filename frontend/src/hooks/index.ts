/**
 * Custom hooks index
 * Central export point for all custom hooks
 */

export { default as useDebounce } from './useDebounce';
export { default as usePageTitle } from './usePageTitle';
export { default as useLocalStorage } from './useLocalStorage';
export { useSmoothLoading, useFadeIn } from './useSmoothLoading';
export { default as useOnClickOutside } from './useOnClickOutside';
export { default as useMediaQuery, useBreakpoint, breakpoints } from './useMediaQuery';
export { default as useCopyToClipboard } from './useCopyToClipboard';
export { default as useOnlineStatus } from './useOnlineStatus';
export { default as useHotkeys, useSingleHotkey } from './useHotkeys';
export { default as useFormValidation, validators } from './useFormValidation';
export { default as useIntersectionObserver, useInView } from './useIntersectionObserver';
export { default as useAsync } from './useAsync';
export { default as usePrevious } from './usePrevious';
export { default as useToggle } from './useToggle';
export { default as usePortal } from './usePortal';
export { default as useFocusTrap } from './useFocusTrap';
export { default as useScrollLock } from './useScrollLock';
export { default as useEventListener } from './useEventListener';
export { default as useTimeout, useTimeoutFn } from './useTimeout';
export { default as useInterval, useIntervalFn } from './useInterval';
export { default as useWindowSize, useIsMobile, useIsTablet, useIsDesktop } from './useWindowSize';
export { default as useDocumentTitle, setDocumentTitle } from './useDocumentTitle';
export { default as useFetch, useMutation } from './useFetch';
export { default as useCountdown } from './useCountdown';

// React Query hooks for cached API data
export {
  useCourses,
  useCourse,
  useTeachers,
  useTeacher,
  useEnrollments,
  useCart,
  useAddToCart,
  useRemoveFromCart,
  useOrders,
  useOrder,
  useNotifications,
  useMarkNotificationRead,
  useCommunityPosts,
  useCommunityPost,
  useWallet,
  useWalletTransactions,
  usePrefetch,
  useInvalidateQueries,
} from './useQuery';
