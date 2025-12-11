/**
 * Search Services Export
 * Central export point for all search-related services
 */

// Main search service
export { default as enhancedSearchService } from './enhancedSearchService';
export type { SearchServiceConfig } from './enhancedSearchService';

// Individual service components
export { queryBuilder } from './queryBuilder';
export { fuzzyMatcher, strictMatcher, relaxedMatcher, exactMatcher } from './fuzzyMatcher';
export type { FuzzyMatchOptions, FuzzyMatchResult } from './fuzzyMatcher';

// Cache services
export { searchCacheService } from './searchCacheService';

// Error handling
export { searchErrorHandler } from './searchErrorHandler';

// Performance monitoring
export { searchPerformanceMonitor } from './searchPerformanceMonitor';

// Analytics service
export { searchAnalyticsService } from './searchAnalyticsService';

// Auto-complete service
export { default as autoCompleteService } from './autoCompleteService';
export type { AutoCompleteConfig, SuggestionData } from './autoCompleteService';

// Saved search service
export { SavedSearchService } from './savedSearchService';

// Performance utilities
export { 
  createDebouncedSearch, 
  useDebouncedSearch, 
  SearchQueryOptimizer,
  searchQueryOptimizer 
} from '../../utils/performance/debouncedSearch';

// Re-export types
export type {
  SearchQuery,
  SearchResults,
  SearchFilters,
  SearchType,
  SearchError,
  SearchErrorType,
  SearchAnalytics,
  SavedSearch,
  SearchOperationResult,
  TalentVideo,
  SearchFacets,
  SearchPerformanceMetrics,
  AutoCompleteSuggestion,
  BulkOperation,
  BulkOperationResult
} from '../../types/models/search';