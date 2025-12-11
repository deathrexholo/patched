/**
 * Enhanced Search Service
 * Main search service that orchestrates all search functionality
 */

import { getDocs, DocumentData, QuerySnapshot } from 'firebase/firestore';
import {
  SearchQuery,
  SearchResults,
  SearchOperationResult,
  SearchType,
  TalentVideo,
  SearchAnalytics,
  SavedSearch,
  SearchFacets
} from '@/types/models/search';
import { User, Event } from '@/types/models';
import { queryBuilder } from './queryBuilder';
import { fuzzyMatcher, relaxedMatcher } from './fuzzyMatcher';
import searchCacheService from './searchCacheService';
import { searchErrorHandler } from './searchErrorHandler';
import { searchPerformanceMonitor } from './searchPerformanceMonitor';
import { searchAnalyticsService } from './searchAnalyticsService';
import { createDebouncedSearch } from '@/utils/performance/debouncedSearch';

interface SearchServiceConfig {
  enableCaching: boolean;
  enableFuzzyMatching: boolean;
  enableAnalytics: boolean;
  defaultLimit: number;
  maxSearchTime: number; // Maximum search time in milliseconds
}

const DEFAULT_CONFIG: SearchServiceConfig = {
  enableCaching: true,
  enableFuzzyMatching: true,
  enableAnalytics: true,
  defaultLimit: 20,
  maxSearchTime: 10000 // 10 seconds
};

class EnhancedSearchService {
  private config: SearchServiceConfig;
  private searchHistory: Map<string, number> = new Map();
  private popularTerms: Map<string, number> = new Map();
  private debouncedSearch: ReturnType<typeof createDebouncedSearch>;

  constructor(config: SearchServiceConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._loadSearchHistory();
    
    // Initialize debounced search with 300ms delay as per requirements
    this.debouncedSearch = createDebouncedSearch(
      (queryString: string, searchQuery: SearchQuery) => this._executeSearchInternal(searchQuery),
      { delay: 300, maxWait: 1000 }
    );
  }

  /**
   * Main search method with performance optimization and debouncing
   */
  async search(searchQuery: SearchQuery, useDebouncing = true): Promise<SearchOperationResult<SearchResults>> {
    const startTime = Date.now();

    try {
      // Validate query
      const validation = queryBuilder.validateQuery(searchQuery);
      if (!validation.valid) {
        throw new Error(`Invalid query: ${validation.errors.join(', ')}`);
      }

      // Use debounced search for real-time queries
      if (useDebouncing && searchQuery.term.trim()) {
        const results = await this.debouncedSearch.execute(searchQuery.term, searchQuery);
        const responseTime = Date.now() - startTime;
        
        return {
          success: true,
          data: results as SearchResults,
          cached: false,
          responseTime
        };
      }

      // Execute immediate search
      return await this._executeSearchWithCaching(searchQuery, startTime);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const searchError = searchErrorHandler.createSearchError(error);

      // Track failed search
      this._trackSearchPerformance(searchQuery, responseTime, 0, false, true);

      return {
        success: false,
        error: searchError,
        responseTime
      };
    }
  }

  /**
   * Execute search with caching and performance monitoring
   */
  private async _executeSearchWithCaching(
    searchQuery: SearchQuery, 
    startTime: number
  ): Promise<SearchOperationResult<SearchResults>> {
    // Check cache first
    if (this.config.enableCaching) {
      const cachedResult = await searchCacheService.get(searchQuery);
      
      if (cachedResult) {
        const responseTime = Date.now() - startTime;
        this._trackSearchPerformance(searchQuery, responseTime, cachedResult.totalCount, true, false);
        
        return {
          success: true,
          data: cachedResult,
          cached: true,
          responseTime
        };
      }
    }

    // Execute search with timeout
    const searchPromise = this._executeSearchInternal(searchQuery);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Search timeout')), this.config.maxSearchTime);
    });

    const results = await Promise.race([searchPromise, timeoutPromise]);
    const responseTime = Date.now() - startTime;

    // Cache results
    if (this.config.enableCaching && results.items.length > 0) {
      await searchCacheService.set(searchQuery, results);
    }

    // Track performance
    this._trackSearchPerformance(searchQuery, responseTime, results.totalCount, false, false);

    return {
      success: true,
      data: results,
      cached: false,
      responseTime
    };
  }

  /**
   * Get auto-complete suggestions
   */
  async getAutoCompleteSuggestions(
    term: string,
    searchType: SearchType
  ): Promise<SearchOperationResult<string[]>> {
    const startTime = Date.now();

    try {
      if (!term.trim()) {
        return {
          success: true,
          data: [],
          responseTime: Date.now() - startTime
        };
      }

      // Auto-complete caching handled by autoCompleteService
      
      // Get suggestions from popular terms and search history
      const suggestions = this._generateSuggestions(term, searchType);

      return {
        success: true,
        data: suggestions,
        cached: false,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      const searchError = searchErrorHandler.createSearchError(error);
      return {
        success: false,
        error: searchError,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Save search query
   */
  async saveSearch(name: string, searchQuery: SearchQuery): Promise<SearchOperationResult<void>> {
    const startTime = Date.now();

    try {
      const savedSearches = this._getSavedSearches();
      const newSearch: SavedSearch = {
        id: `search_${Date.now()}`,
        name,
        query: searchQuery,
        createdAt: new Date(),
        useCount: 0
      };

      savedSearches.push(newSearch);
      localStorage.setItem('savedSearches', JSON.stringify(savedSearches));

      return {
        success: true,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      const searchError = searchErrorHandler.createSearchError(error);
      return {
        success: false,
        error: searchError,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get saved searches
   */
  getSavedSearches(): SavedSearch[] {
    return this._getSavedSearches();
  }

  /**
   * Delete saved search
   */
  async deleteSavedSearch(searchId: string): Promise<SearchOperationResult<void>> {
    const startTime = Date.now();

    try {
      const savedSearches = this._getSavedSearches();
      const filtered = savedSearches.filter(search => search.id !== searchId);
      localStorage.setItem('savedSearches', JSON.stringify(filtered));

      return {
        success: true,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      const searchError = searchErrorHandler.createSearchError(error);
      return {
        success: false,
        error: searchError,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(dateRange: { start: Date; end: Date }): Promise<SearchOperationResult<SearchAnalytics>> {
    const startTime = Date.now();

    try {
      // Analytics caching handled by searchAnalyticsService

      // Generate analytics from stored data
      const analytics = this._generateAnalytics(dateRange);
      
      // Analytics caching handled by searchAnalyticsService

      return {
        success: true,
        data: analytics,
        cached: false,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      const searchError = searchErrorHandler.createSearchError(error);
      return {
        success: false,
        error: searchError,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    searchCacheService.invalidate();
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      searchHistory: this.searchHistory.size,
      popularTerms: this.popularTerms.size,
      config: this.config,
      performance: searchPerformanceMonitor.getRealtimeStatus(),
      cache: {
        searchResults: searchCacheService.getStats()
      }
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(dateRange?: { start: Date; end: Date }) {
    return searchPerformanceMonitor.getMetrics(dateRange);
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions() {
    return searchPerformanceMonitor.getOptimizationSuggestions();
  }

  /**
   * Prefetch popular searches for better performance
   */
  async prefetchPopularSearches(): Promise<void> {
    const popularTerms = Array.from(this.popularTerms.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([term]) => term);

    // Prefetch in background
    const prefetchPromises = popularTerms.map(async (term) => {
      const searchQuery: SearchQuery = {
        term,
        searchType: 'all',
        filters: {},
        limit: 20
      };

      try {
        await this._executeSearchWithCaching(searchQuery, Date.now());
      } catch (error) {
        // Ignore prefetch errors
        console.debug('Prefetch failed for term:', term);
      }
    });

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Execute the actual search operation (internal method)
   */
  private async _executeSearchInternal(searchQuery: SearchQuery): Promise<SearchResults> {
    const { searchType, term } = searchQuery;
    
    // Handle 'all' search type by searching multiple collections
    if (searchType === 'all') {
      return this._searchAllCollections(searchQuery);
    }

    // Handle boolean operators if present
    if (fuzzyMatcher.hasBooleanOperators(term)) {
      return this._executeBooleanSearch(searchQuery);
    }

    // Build and execute query
    const firestoreQuery = queryBuilder.buildQuery(searchQuery);
    const querySnapshot = await getDocs(firestoreQuery);
    
    // Process results
    const items = this._processQueryResults(querySnapshot, searchQuery);
    
    // Apply fuzzy matching and relevance scoring if enabled
    const filteredItems = this.config.enableFuzzyMatching 
      ? this._applyFuzzyMatching(items, term, searchType)
      : items;

    // Calculate relevance scores
    const relevanceScores = this._calculateRelevanceScores(filteredItems, term, searchType);

    // Generate facets
    const facets = this._generateFacets(filteredItems, searchType);

    // Generate suggestions for zero results
    const suggestions = filteredItems.length === 0 
      ? this._generateSuggestions(term, searchType)
      : [];

    // Check if there are more results
    const hasMore = filteredItems.length === (searchQuery.limit || this.config.defaultLimit);
    const nextOffset = hasMore ? (searchQuery.offset || 0) + filteredItems.length : undefined;

    return {
      items: filteredItems,
      totalCount: filteredItems.length,
      searchTime: 0, // Will be calculated by caller
      suggestions,
      facets,
      relevanceScores,
      hasMore,
      nextOffset,
      query: searchQuery
    };
  }

  /**
   * Search across all collections
   */
  private async _searchAllCollections(searchQuery: SearchQuery): Promise<SearchResults> {
    const searchTypes: SearchType[] = ['users', 'events', 'videos'];
    const allResults: (User | Event | TalentVideo)[] = [];

    // Execute searches in parallel
    const searchPromises = searchTypes.map(async (type) => {
      const typeQuery = { ...searchQuery, searchType: type };
      const query = queryBuilder.buildQuery(typeQuery);
      const snapshot = await getDocs(query);
      return this._processQueryResults(snapshot, typeQuery);
    });

    const results = await Promise.all(searchPromises);
    
    // Combine and sort results
    results.forEach(typeResults => {
      allResults.push(...typeResults);
    });

    // Sort by relevance (simplified - by creation date)
    allResults.sort((a, b) => {
      const aCreatedAt = a.createdAt;
      const bCreatedAt = b.createdAt;
      
      let aDate: number;
      let bDate: number;
      
      if (aCreatedAt instanceof Date) {
        aDate = aCreatedAt.getTime();
      } else if (typeof aCreatedAt === 'string') {
        aDate = new Date(aCreatedAt).getTime();
      } else if (aCreatedAt && typeof aCreatedAt === 'object' && 'toDate' in aCreatedAt) {
        aDate = (aCreatedAt as any).toDate().getTime();
      } else {
        aDate = 0;
      }
      
      if (bCreatedAt instanceof Date) {
        bDate = bCreatedAt.getTime();
      } else if (typeof bCreatedAt === 'string') {
        bDate = new Date(bCreatedAt).getTime();
      } else if (bCreatedAt && typeof bCreatedAt === 'object' && 'toDate' in bCreatedAt) {
        bDate = (bCreatedAt as any).toDate().getTime();
      } else {
        bDate = 0;
      }
      
      return bDate - aDate;
    });

    // Apply limit
    const limit = searchQuery.limit || this.config.defaultLimit;
    const limitedResults = allResults.slice(0, limit);

    return {
      items: limitedResults,
      totalCount: limitedResults.length,
      searchTime: 0,
      query: searchQuery
    };
  }

  /**
   * Process Firestore query results
   */
  private _processQueryResults(
    querySnapshot: QuerySnapshot<DocumentData>,
    searchQuery: SearchQuery
  ): (User | Event | TalentVideo)[] {
    const results: (User | Event | TalentVideo)[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const item = {
        id: doc.id,
        ...data
      };

      // Type-specific processing
      switch (searchQuery.searchType) {
        case 'users':
          results.push(item as User);
          break;
        case 'events':
          results.push(item as Event);
          break;
        case 'videos':
          results.push(item as TalentVideo);
          break;
      }
    });

    return results;
  }

  /**
   * Apply fuzzy matching to filter results with relevance scoring
   */
  private _applyFuzzyMatching(
    items: (User | Event | TalentVideo)[],
    term: string,
    searchType: SearchType
  ): (User | Event | TalentVideo)[] {
    if (!term.trim()) return items;

    // Apply fuzzy matching with scoring
    const scoredItems = items.map(item => {
      const searchableText = this._getSearchableText(item, searchType);
      const matchResult = fuzzyMatcher.isMatch(term, searchableText);
      
      return {
        item,
        score: matchResult.match ? matchResult.score : 0,
        match: matchResult.match
      };
    });

    // Filter matched items and sort by relevance score
    return scoredItems
      .filter(scored => scored.match)
      .sort((a, b) => b.score - a.score)
      .map(scored => scored.item);
  }

  /**
   * Get searchable text from item
   */
  private _getSearchableText(item: User | Event | TalentVideo, searchType: SearchType): string {
    switch (searchType) {
      case 'users':
        const user = item as User;
        return [user.displayName, user.email, user.username, user.bio].filter(Boolean).join(' ');
      case 'events':
        const event = item as Event;
        return [event.title, event.description, event.location].filter(Boolean).join(' ');
      case 'videos':
        const video = item as TalentVideo;
        return [video.title, video.description].filter(Boolean).join(' ');
      default:
        return '';
    }
  }



  /**
   * Generate auto-complete suggestions
   */
  private _generateSuggestions(term: string, searchType: SearchType): string[] {
    const suggestions: string[] = [];
    
    // Get suggestions from popular terms
    const popularSuggestions = fuzzyMatcher.generateSuggestions(
      term,
      Array.from(this.popularTerms.keys()),
      3
    );
    suggestions.push(...popularSuggestions);
    
    // Get suggestions from search history
    const historySuggestions = fuzzyMatcher.generateSuggestions(
      term,
      Array.from(this.searchHistory.keys()),
      2
    );
    suggestions.push(...historySuggestions);
    
    // Remove duplicates and return
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * Track search performance and analytics
   */
  private _trackSearchPerformance(
    searchQuery: SearchQuery,
    responseTime: number,
    resultCount: number,
    cached: boolean,
    errorOccurred: boolean
  ): void {
    if (!this.config.enableAnalytics) return;

    // Track with performance monitor
    searchPerformanceMonitor.recordSearch(
      searchQuery,
      responseTime,
      resultCount,
      cached,
      errorOccurred
    );

    // Track with analytics service
    if (errorOccurred) {
      searchAnalyticsService.trackSearchFailure(
        searchQuery,
        responseTime,
        { type: 'SEARCH_ERROR', message: 'Search execution failed' }
      );
    } else {
      searchAnalyticsService.trackSearch(
        searchQuery,
        responseTime,
        resultCount,
        cached,
        errorOccurred
      );
    }

    // Update search history
    const term = searchQuery.term;
    const currentCount = this.searchHistory.get(term) || 0;
    this.searchHistory.set(term, currentCount + 1);

    // Update popular terms
    if (resultCount > 0) {
      const popularCount = this.popularTerms.get(term) || 0;
      this.popularTerms.set(term, popularCount + 1);
    }

    // Save to localStorage
    this._saveSearchHistory();

    // Log analytics data (keep for backward compatibility)
    const analyticsData = {
      term,
      resultCount,
      responseTime,
      cached,
      errorOccurred,
      searchType: searchQuery.searchType,
      filterCount: Object.keys(searchQuery.filters).length,
      timestamp: new Date().toISOString()
    };
    
    this._saveAnalyticsData(analyticsData);
  }

  /**
   * Generate analytics from stored data
   */
  private _generateAnalytics(dateRange: { start: Date; end: Date }): SearchAnalytics {
    const analyticsData = this._getAnalyticsData(dateRange);
    
    const totalSearches = analyticsData.length;
    const averageResponseTime = totalSearches > 0 
      ? analyticsData.reduce((sum, data) => sum + data.responseTime, 0) / totalSearches
      : 0;

    const termCounts = new Map<string, number>();
    const zeroResultQueries = new Map<string, number>();
    
    analyticsData.forEach(data => {
      // Count terms
      const currentCount = termCounts.get(data.term) || 0;
      termCounts.set(data.term, currentCount + 1);
      
      // Track zero result queries
      if (data.resultCount === 0) {
        const zeroCount = zeroResultQueries.get(data.term) || 0;
        zeroResultQueries.set(data.term, zeroCount + 1);
      }
    });

    return {
      totalSearches,
      averageResponseTime,
      topSearchTerms: Array.from(termCounts.entries())
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      zeroResultQueries: Array.from(zeroResultQueries.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      popularFilters: [], // Would be implemented with more detailed tracking
      searchTrends: [] // Would be implemented with time-series data
    };
  }

  /**
   * Load search history from localStorage
   */
  private _loadSearchHistory(): void {
    try {
      const stored = localStorage.getItem('searchHistory');
      if (stored) {
        const data = JSON.parse(stored);
        this.searchHistory = new Map(data.history || []);
        this.popularTerms = new Map(data.popular || []);
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  }

  /**
   * Save search history to localStorage
   */
  private _saveSearchHistory(): void {
    try {
      const data = {
        history: Array.from(this.searchHistory.entries()),
        popular: Array.from(this.popularTerms.entries())
      };
      localStorage.setItem('searchHistory', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  /**
   * Get saved searches from localStorage
   */
  private _getSavedSearches(): SavedSearch[] {
    try {
      const stored = localStorage.getItem('savedSearches');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading saved searches:', error);
      return [];
    }
  }

  /**
   * Save analytics data
   */
  private _saveAnalyticsData(data: any): void {
    try {
      const stored = localStorage.getItem('searchAnalytics');
      const analytics = stored ? JSON.parse(stored) : [];
      analytics.push(data);
      
      // Keep only last 1000 entries
      if (analytics.length > 1000) {
        analytics.splice(0, analytics.length - 1000);
      }
      
      localStorage.setItem('searchAnalytics', JSON.stringify(analytics));
    } catch (error) {
      console.error('Error saving analytics data:', error);
    }
  }

  /**
   * Get analytics data for date range
   */
  private _getAnalyticsData(dateRange: { start: Date; end: Date }): any[] {
    try {
      const stored = localStorage.getItem('searchAnalytics');
      const analytics = stored ? JSON.parse(stored) : [];
      
      return analytics.filter((data: any) => {
        const timestamp = new Date(data.timestamp);
        return timestamp >= dateRange.start && timestamp <= dateRange.end;
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
      return [];
    }
  }

  /**
   * Execute boolean search with AND, OR, NOT operators
   */
  private async _executeBooleanSearch(searchQuery: SearchQuery): Promise<SearchResults> {
    const parsed = fuzzyMatcher.parseBooleanQuery(searchQuery.term);
    const queries = queryBuilder.buildBooleanQuery(searchQuery);
    
    // Execute all queries in parallel
    const queryPromises = queries.map(query => getDocs(query));
    const snapshots = await Promise.all(queryPromises);
    
    // Process results from each query
    const allResults: (User | Event | TalentVideo)[] = [];
    snapshots.forEach((snapshot, index) => {
      const termResults = this._processQueryResults(snapshot, {
        ...searchQuery,
        term: parsed.terms[index] || searchQuery.term
      });
      allResults.push(...termResults);
    });
    
    // Apply boolean logic to combine results
    const combinedResults = this._applyBooleanLogic(allResults, parsed);
    
    // Apply fuzzy matching if enabled
    const filteredItems = this.config.enableFuzzyMatching 
      ? this._applyFuzzyMatching(combinedResults, searchQuery.term, searchQuery.searchType)
      : combinedResults;

    // Calculate relevance scores
    const relevanceScores = this._calculateRelevanceScores(filteredItems, searchQuery.term, searchQuery.searchType);

    // Generate facets
    const facets = this._generateFacets(filteredItems, searchQuery.searchType);

    return {
      items: filteredItems,
      totalCount: filteredItems.length,
      searchTime: 0,
      relevanceScores,
      facets,
      query: searchQuery
    };
  }

  /**
   * Apply boolean logic to combine search results
   */
  private _applyBooleanLogic(
    results: (User | Event | TalentVideo)[],
    parsed: { terms: string[]; operators: string[]; structure: string }
  ): (User | Event | TalentVideo)[] {
    // For now, implement simple AND logic (intersection)
    // In a more advanced implementation, we'd parse the full boolean expression
    if (parsed.operators.includes('AND')) {
      // Remove duplicates and return intersection
      const uniqueResults = new Map<string, User | Event | TalentVideo>();
      results.forEach(item => {
        uniqueResults.set(item.id, item);
      });
      return Array.from(uniqueResults.values());
    }
    
    // Default to OR logic (union)
    const uniqueResults = new Map<string, User | Event | TalentVideo>();
    results.forEach(item => {
      uniqueResults.set(item.id, item);
    });
    return Array.from(uniqueResults.values());
  }

  /**
   * Calculate relevance scores for search results
   */
  private _calculateRelevanceScores(
    items: (User | Event | TalentVideo)[],
    term: string,
    searchType: SearchType
  ): { [itemId: string]: number } {
    const scores: { [itemId: string]: number } = {};
    
    if (!term.trim()) {
      // If no search term, assign equal scores based on recency
      items.forEach((item, index) => {
        scores[item.id] = 1 - (index / items.length);
      });
      return scores;
    }

    items.forEach(item => {
      let score = 0;
      const searchableText = this._getSearchableText(item, searchType);
      
      // Exact match gets highest score
      if (searchableText.toLowerCase().includes(term.toLowerCase())) {
        score += 1.0;
      }
      
      // Fuzzy match score
      const fuzzyResult = fuzzyMatcher.isMatch(term, searchableText);
      if (fuzzyResult.match) {
        score += fuzzyResult.score * 0.8;
      }
      
      // Boost score based on item type and properties
      score += this._getItemTypeBoost(item, searchType);
      
      // Boost score based on popularity/activity
      score += this._getPopularityBoost(item);
      
      scores[item.id] = Math.min(score, 2.0); // Cap at 2.0
    });
    
    return scores;
  }

  /**
   * Get boost score based on item type
   */
  private _getItemTypeBoost(item: User | Event | TalentVideo, searchType: SearchType): number {
    switch (searchType) {
      case 'users':
        const user = item as User;
        return user.isVerified ? 0.2 : 0;
      case 'events':
        const event = item as Event;
        return event.isActive ? 0.2 : 0;
      case 'videos':
        const video = item as TalentVideo;
        return video.verificationStatus === 'approved' ? 0.2 : 0;
      default:
        return 0;
    }
  }

  /**
   * Get boost score based on popularity
   */
  private _getPopularityBoost(item: User | Event | TalentVideo): number {
    // Simple popularity boost based on creation date (newer items get slight boost)
    const createdAt = item.createdAt;
    let itemDate: Date;
    
    if (createdAt instanceof Date) {
      itemDate = createdAt;
    } else if (typeof createdAt === 'string') {
      itemDate = new Date(createdAt);
    } else if (createdAt && typeof createdAt === 'object' && 'toDate' in createdAt) {
      itemDate = (createdAt as any).toDate();
    } else {
      return 0;
    }
    
    const daysSinceCreation = (Date.now() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 0.1 - (daysSinceCreation / 365) * 0.1); // Newer items get slight boost
  }

  /**
   * Generate facets for search results
   */
  private _generateFacets(items: (User | Event | TalentVideo)[], searchType: SearchType): SearchFacets {
    const facets: SearchFacets = {};
    
    if (searchType === 'users' || searchType === 'all') {
      const users = items.filter(item => 'role' in item) as User[];
      
      // Role facets
      facets.roles = {};
      users.forEach(user => {
        const role = user.role || 'unknown';
        facets.roles![role] = (facets.roles![role] || 0) + 1;
      });
      
      // Status facets
      facets.statuses = {};
      users.forEach(user => {
        const status = user.isActive ? 'active' : 'inactive';
        facets.statuses![status] = (facets.statuses![status] || 0) + 1;
      });
      
      // Location facets
      facets.locations = {};
      users.forEach(user => {
        if (user.location) {
          facets.locations![user.location] = (facets.locations![user.location] || 0) + 1;
        }
      });
    }
    
    if (searchType === 'videos' || searchType === 'all') {
      const videos = items.filter(item => 'verificationStatus' in item) as TalentVideo[];
      
      // Verification status facets
      facets.verificationStatuses = {};
      videos.forEach(video => {
        const status = video.verificationStatus;
        facets.verificationStatuses![status] = (facets.verificationStatuses![status] || 0) + 1;
      });
      
      // Category facets
      facets.categories = {};
      videos.forEach(video => {
        if (video.category) {
          facets.categories![video.category] = (facets.categories![video.category] || 0) + 1;
        }
      });
    }
    
    if (searchType === 'events' || searchType === 'all') {
      const events = items.filter(item => 'status' in item && 'title' in item) as Event[];
      
      // Event status facets
      facets.eventStatuses = {};
      events.forEach(event => {
        const status = event.status || 'unknown';
        facets.eventStatuses![status] = (facets.eventStatuses![status] || 0) + 1;
      });
    }
    
    return facets;
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<SearchServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Cleanup service
   */
  destroy(): void {
    this._saveSearchHistory();
    searchErrorHandler.clearRetries();
  }
}

// Create singleton instance
const enhancedSearchService = new EnhancedSearchService();

export default enhancedSearchService;
export { enhancedSearchService, EnhancedSearchService };
export type { SearchServiceConfig };