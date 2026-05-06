export interface ApiResponse<T> {
  readonly status: 'success' | 'error';
  readonly message?: string;
  readonly data?: T;
  readonly errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  readonly status: 'success';
  readonly data: {
    readonly items?: T[];
    readonly teachers?: T[];
    readonly courses?: T[];
    readonly reviews?: T[];
    readonly reports?: T[];
    readonly pagination: {
      readonly total: number;
      readonly page: number;
      readonly limit: number;
      readonly totalPages: number;
    };
  };
}
