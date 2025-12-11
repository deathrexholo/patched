/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  nextPageToken: string | null;
  hasMore: boolean;
  total?: number;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp?: Date;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

/**
 * Response for authentication operations
 */
export interface AuthResponse {
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
  };
  token?: string;
  refreshToken?: string;
}

/**
 * Response for file upload operations
 */
export interface UploadResponse {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * Response for batch operations
 */
export interface BatchOperationResponse {
  successCount: number;
  failureCount: number;
  errors?: Array<{
    id: string;
    error: ApiError;
  }>;
}

/**
 * Response for analytics/metrics queries
 */
export interface MetricsResponse {
  metrics: Record<string, number | string>;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Response for validation operations
 */
export interface ValidationResponse {
  valid: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Response for search operations with highlights
 */
export interface SearchResponse<T> {
  results: T[];
  total: number;
  query: string;
  highlights?: Record<string, string[]>;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

/**
 * Response for health check
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, {
    status: 'up' | 'down';
    latency?: number;
  }>;
  timestamp: Date;
}
