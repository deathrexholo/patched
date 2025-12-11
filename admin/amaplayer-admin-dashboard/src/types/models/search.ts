import { User, Event } from './index';

/**
 * Search-related type definitions for the enhanced admin search functionality
 */

export type SearchType = 'users' | 'videos' | 'events' | 'all';
export type SortOption = 'relevance' | 'date' | 'name' | 'status';
export type SortOrder = 'asc' | 'desc';

/**
 * Search query interface
 */
export interface SearchQuery {
  term: string;
  filters: SearchFilters;
  sortBy?: SortOption;
  sortOrder?: SortOrder;
  limit?: number;
  offset?: number;
  searchType: SearchType;
  booleanOperators?: BooleanOperator[];
  fuzzyMatching?: boolean;
  exactMatch?: boolean;
}

/**
 * Boolean operator for complex queries
 */
export interface BooleanOperator {
  operator: 'AND' | 'OR' | 'NOT';
  field: string;
  value: string;
}

/**
 * Search filters interface
 */
export interface SearchFilters {
  // Common filters
  dateRange?: {
    start: Date;
    end: Date;
    field: 'createdAt' | 'updatedAt' | 'lastLoginAt';
  };
  
  // User-specific filters
  role?: ('athlete' | 'coach' | 'organization')[];
  status?: ('active' | 'suspended' | 'verified')[];
  location?: string;
  sport?: string;
  ageRange?: { min: number; max: number; };
  
  // Video-specific filters
  verificationStatus?: ('pending' | 'approved' | 'rejected')[];
  category?: string[];
  
  // Event-specific filters
  eventStatus?: ('active' | 'inactive' | 'completed')[];
}

/**
 * Search facets for result categorization
 */
export interface SearchFacets {
  roles?: { [key: string]: number };
  statuses?: { [key: string]: number };
  locations?: { [key: string]: number };
  sports?: { [key: string]: number };
  categories?: { [key: string]: number };
  verificationStatuses?: { [key: string]: number };
  eventStatuses?: { [key: string]: number };
}

/**
 * Search results interface
 */
export interface SearchResults {
  items: (User | TalentVideo | Event)[];
  totalCount: number;
  searchTime: number;
  suggestions?: string[];
  facets?: SearchFacets;
  query: SearchQuery;
  relevanceScores?: { [itemId: string]: number };
  hasMore?: boolean;
  nextOffset?: number;
}

/**
 * Video interface for search results (simplified)
 */
export interface TalentVideo {
  id: string;
  title?: string;
  description?: string;
  userId: string;
  userName?: string;
  userPhotoURL?: string;
  videoUrl: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  category?: string;
  tags?: string[];
  createdAt: Date | string | any;
  updatedAt: Date | string | any;
  isActive: boolean;
}

/**
 * Search error types
 */
export enum SearchErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_QUERY = 'INVALID_QUERY',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS'
}

/**
 * Search error interface
 */
export interface SearchError {
  type: SearchErrorType;
  message: string;
  details?: any;
  retryable: boolean;
}

/**
 * Search analytics interface
 */
export interface SearchAnalytics {
  totalSearches: number;
  averageResponseTime: number;
  topSearchTerms: Array<{ term: string; count: number; }>;
  zeroResultQueries: Array<{ query: string; count: number; }>;
  popularFilters: Array<{ filter: string; count: number; }>;
  searchTrends: Array<{ date: string; count: number; }>;
}

/**
 * Saved search interface
 */
export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  searchResults: {
    ttl: number; // Time to live in milliseconds
    maxSize: number; // Maximum number of cached queries
  };
  autoComplete: {
    ttl: number;
    maxSize: number;
  };
  analytics: {
    ttl: number;
    maxSize: number;
  };
}

/**
 * Search operation result
 */
export interface SearchOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: SearchError;
  cached?: boolean;
  responseTime: number;
}

/**
 * Auto-complete suggestion interface
 */
export interface AutoCompleteSuggestion {
  text: string;
  type: 'term' | 'filter' | 'saved_search';
  category?: string;
  count?: number;
  highlighted?: string;
}

/**
 * Search suggestion options
 */
export interface SearchSuggestionOptions {
  maxSuggestions: number;
  includeHistory: boolean;
  includePopular: boolean;
  includeSavedSearches: boolean;
  fuzzyThreshold: number;
}

/**
 * Bulk operation interface
 */
export interface BulkOperation {
  type: 'user_suspend' | 'user_verify' | 'user_activate' | 'video_approve' | 'video_reject' | 'video_flag' | 'event_activate' | 'event_deactivate';
  itemIds: string[];
  reason?: string;
  metadata?: { [key: string]: any };
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ itemId: string; error: string; }>;
  operationId: string;
}

/**
 * Search performance metrics
 */
export interface SearchPerformanceMetrics {
  averageResponseTime: number;
  cacheHitRate: number;
  totalSearches: number;
  errorRate: number;
  popularSearchTerms: Array<{ term: string; count: number; }>;
  slowQueries: Array<{ query: string; responseTime: number; }>;
}