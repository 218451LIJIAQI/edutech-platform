/**
 * React Query hooks for API data fetching with caching
 */
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import api from '@/services/api';

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
