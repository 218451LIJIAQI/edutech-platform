import { QueryClient } from '@tanstack/react-query';

/**
 * Global React Query client configuration
 * Provides smart caching, background refetching, and error handling
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache data for 30 minutes
      gcTime: 30 * 60 * 1000,
      // Retry failed requests up to 3 times
      retry: 3,
      // Exponential backoff for retries
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (useful for real-time data)
      refetchOnWindowFocus: false,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
      // Don't refetch on reconnect automatically
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

/**
 * Query key factory for consistent cache key management
 */
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    profile: () => [...queryKeys.auth.all, 'profile'] as const,
  },
  
  // Courses
  courses: {
    all: ['courses'] as const,
    lists: () => [...queryKeys.courses.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.courses.lists(), filters] as const,
    details: () => [...queryKeys.courses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.courses.details(), id] as const,
  },
  
  // Teachers
  teachers: {
    all: ['teachers'] as const,
    lists: () => [...queryKeys.teachers.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.teachers.lists(), filters] as const,
    details: () => [...queryKeys.teachers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.teachers.details(), id] as const,
  },
  
  // Enrollments
  enrollments: {
    all: ['enrollments'] as const,
    lists: () => [...queryKeys.enrollments.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.enrollments.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.enrollments.all, 'detail', id] as const,
  },
  
  // Orders
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.orders.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
  },
  
  // Cart
  cart: {
    all: ['cart'] as const,
    items: () => [...queryKeys.cart.all, 'items'] as const,
  },
  
  // Notifications
  notifications: {
    all: ['notifications'] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
  },
  
  // Messages
  messages: {
    all: ['messages'] as const,
    threads: () => [...queryKeys.messages.all, 'threads'] as const,
    thread: (id: string) => [...queryKeys.messages.all, 'thread', id] as const,
  },
  
  // Community
  community: {
    all: ['community'] as const,
    posts: () => [...queryKeys.community.all, 'posts'] as const,
    post: (id: string) => [...queryKeys.community.all, 'post', id] as const,
  },
  
  // Wallet
  wallet: {
    all: ['wallet'] as const,
    balance: () => [...queryKeys.wallet.all, 'balance'] as const,
    transactions: () => [...queryKeys.wallet.all, 'transactions'] as const,
  },
  
  // Admin
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
  },
} as const;

export default queryClient;
