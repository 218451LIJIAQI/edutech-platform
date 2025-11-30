/**
 * React Query hooks for API data fetching with caching
 * These hooks provide automatic caching, background refetching, and optimistic updates
 */
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import api from '@/services/api';
import { AxiosError } from 'axios';

// ================================
// Course Hooks
// ================================

interface CourseFilters {
  [key: string]: string | number | undefined;
  category?: string;
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export const useCourses = (filters: CourseFilters = {}, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.courses.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      const { data } = await api.get(`/courses?${params.toString()}`);
      return data;
    },
    ...options,
  });
};

export const useCourse = (id: string, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.courses.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/courses/${id}`);
      return data;
    },
    enabled: !!id,
    ...options,
  });
};

// ================================
// Teacher Hooks
// ================================

interface TeacherFilters {
  [key: string]: string | number | undefined;
  search?: string;
  page?: number;
  limit?: number;
}

export const useTeachers = (filters: TeacherFilters = {}, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.teachers.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      const { data } = await api.get(`/teachers?${params.toString()}`);
      return data;
    },
    ...options,
  });
};

export const useTeacher = (id: string, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.teachers.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/teachers/${id}`);
      return data;
    },
    enabled: !!id,
    ...options,
  });
};

// ================================
// Enrollment Hooks
// ================================

export const useEnrollments = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.enrollments.lists(),
    queryFn: async () => {
      const { data } = await api.get('/enrollments/my');
      return data;
    },
    ...options,
  });
};

// ================================
// Cart Hooks
// ================================

export const useCart = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.cart.items(),
    queryFn: async () => {
      const { data } = await api.get('/cart');
      return data;
    },
    ...options,
  });
};

export const useAddToCart = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (packageId: string) => {
      const { data } = await api.post('/cart', { packageId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
};

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data } = await api.delete(`/cart/${itemId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
};

// ================================
// Order Hooks
// ================================

export const useOrders = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.orders.lists(),
    queryFn: async () => {
      const { data } = await api.get('/orders');
      return data;
    },
    ...options,
  });
};

export const useOrder = (id: string, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}`);
      return data;
    },
    enabled: !!id,
    ...options,
  });
};

// ================================
// Notification Hooks
// ================================

export const useNotifications = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data;
    },
    // Refetch notifications more frequently
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Every minute
    ...options,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/notifications/${id}/read`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

// ================================
// Community Hooks
// ================================

interface PostFilters {
  page?: number;
  limit?: number;
  tag?: string;
}

export const useCommunityPosts = (filters: PostFilters = {}, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: [...queryKeys.community.posts(), filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      const { data } = await api.get(`/community/posts?${params.toString()}`);
      return data;
    },
    ...options,
  });
};

export const useCommunityPost = (id: string, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.community.post(id),
    queryFn: async () => {
      const { data } = await api.get(`/community/posts/${id}`);
      return data;
    },
    enabled: !!id,
    ...options,
  });
};

// ================================
// Wallet Hooks (Teacher)
// ================================

export const useWallet = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.wallet.balance(),
    queryFn: async () => {
      const { data } = await api.get('/wallet');
      return data;
    },
    ...options,
  });
};

export const useWalletTransactions = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.wallet.transactions(),
    queryFn: async () => {
      const { data } = await api.get('/wallet/transactions');
      return data;
    },
    ...options,
  });
};

// ================================
// Utility Hooks
// ================================

/**
 * Prefetch data before navigation
 */
export const usePrefetch = () => {
  const queryClient = useQueryClient();
  
  return {
    prefetchCourse: (id: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.courses.detail(id),
        queryFn: async () => {
          const { data } = await api.get(`/courses/${id}`);
          return data;
        },
      });
    },
    prefetchTeacher: (id: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.teachers.detail(id),
        queryFn: async () => {
          const { data } = await api.get(`/teachers/${id}`);
          return data;
        },
      });
    },
  };
};

/**
 * Invalidate queries after mutations
 */
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateCourses: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
    invalidateTeachers: () => queryClient.invalidateQueries({ queryKey: queryKeys.teachers.all }),
    invalidateCart: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
    invalidateOrders: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
    invalidateNotifications: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
};

// Type for API errors
export interface ApiError extends AxiosError {
  response?: {
    data?: {
      message?: string;
    };
  } & AxiosError['response'];
}
