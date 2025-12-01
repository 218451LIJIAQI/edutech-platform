/**
 * Custom hooks index
 * Central export point for all custom hooks
 */

export { default as useDebounce } from './useDebounce';
export { default as usePageTitle } from './usePageTitle';
export { useSmoothLoading, useFadeIn } from './useSmoothLoading';
export { default as useOnClickOutside } from './useOnClickOutside';
export { default as useOnlineStatus } from './useOnlineStatus';

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
