import { ApiResponse, PaginatedResponse } from '@/types';

export function extractData<T>(response: { data: ApiResponse<T> }): T {
  if (response.data.data === undefined) {
    throw new Error(response.data.message || 'No data received from server');
  }
  return response.data.data;
}

export function extractDataOrDefault<T>(
  response: { data: ApiResponse<T> },
  fallback: T
): T {
  return response.data.data ?? fallback;
}

export function extractPaginatedData<T>(
  response: { data: PaginatedResponse<T> }
): PaginatedResponse<T>['data'] {
  if (response.data.data === undefined) {
    throw new Error('No data received from server');
  }
  return response.data.data;
}

export function extractPaginatedDataOrDefault<T>(
  response: { data: PaginatedResponse<T> },
  fallback: PaginatedResponse<T>['data']
): PaginatedResponse<T>['data'] {
  return response.data.data ?? fallback;
}
