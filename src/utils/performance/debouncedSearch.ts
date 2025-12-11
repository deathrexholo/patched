/**
 * Debounced Search Utility
 * Provides debounced search functionality with 300ms delay as per requirements
 */

interface DebouncedSearchOptions {
  delay: number;
  immediate?: boolean;
  maxWait?: number;
}

interface DebouncedSearchResult<T> {
  execute: (query: string, ...args: any[]) => Promise<T>;
  cancel: () => void;
  flush: () => Promise<T | undefined>;
  pending: () => boolean;
}

/**
 * Create a debounced search function
 */
export function createDebouncedSearch<T>(
  searchFunction: (query: string, ...args: any[]) => Promise<T>,
  options: DebouncedSearchOptions = { delay: 300 }
): DebouncedSearchResult<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  let lastArgs: [string, ...any[]] | null = null;
  let lastPromise: Promise<T> | null = null;
  let resolvePromise: ((value: T) => void) | null = null;
  let rejectPromise: ((error: any) => void) | null = null;

  const { delay, immediate = false, maxWait } = options;

  function clearTimeouts() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
  }

  function executeSearch() {
    if (!lastArgs) return;

    const [query, ...args] = lastArgs;
    
    // Clear timeouts
    clearTimeouts();
    
    // Execute the search
    searchFunction(query, ...args)
      .then(result => {
        if (resolvePromise) {
          resolvePromise(result);
          resolvePromise = null;
          rejectPromise = null;
        }
      })
      .catch(error => {
        if (rejectPromise) {
          rejectPromise(error);
          resolvePromise = null;
          rejectPromise = null;
        }
      });
  }

  function execute(query: string, ...args: any[]): Promise<T> {
    const now = Date.now();
    lastCallTime = now;
    lastArgs = [query, ...args];

    // Create new promise if none exists
    if (!lastPromise || !resolvePromise) {
      lastPromise = new Promise<T>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });
    }

    // Clear existing timeout
    clearTimeouts();

    // Execute immediately if requested and no previous calls
    if (immediate && !timeoutId) {
      executeSearch();
      return lastPromise;
    }

    // Set up debounced execution
    timeoutId = setTimeout(() => {
      executeSearch();
    }, delay);

    // Set up max wait timeout if specified
    if (maxWait && maxWait > delay) {
      maxTimeoutId = setTimeout(() => {
        executeSearch();
      }, maxWait);
    }

    return lastPromise;
  }

  function cancel() {
    clearTimeouts();
    if (rejectPromise) {
      rejectPromise(new Error('Search cancelled'));
      resolvePromise = null;
      rejectPromise = null;
    }
    lastArgs = null;
    lastPromise = null;
  }

  function flush(): Promise<T | undefined> {
    if (!lastArgs) {
      return Promise.resolve(undefined);
    }

    clearTimeouts();
    executeSearch();
    return lastPromise || Promise.resolve(undefined);
  }

  function pending(): boolean {
    return timeoutId !== null || maxTimeoutId !== null;
  }

  return {
    execute,
    cancel,
    flush,
    pending
  };
}

/**
 * Create a debounced search hook for React components
 */
export function useDebouncedSearch<T>(
  searchFunction: (query: string, ...args: any[]) => Promise<T>,
  delay = 300
) {
  const debouncedSearch = createDebouncedSearch(searchFunction, { delay });
  
  // Cleanup on unmount
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      debouncedSearch.cancel();
    });
  }

  return debouncedSearch;
}

/**
 * Search query optimizer
 */
export class SearchQueryOptimizer {
  private queryHistory: Map<string, number> = new Map();
  private popularQueries: Set<string> = new Set();
  private recentQueries: string[] = [];
  private maxHistorySize = 100;

  /**
   * Track a search query
   */
  trackQuery(query: string): void {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Update query count
    const count = this.queryHistory.get(normalizedQuery) || 0;
    this.queryHistory.set(normalizedQuery, count + 1);
    
    // Add to recent queries
    this.recentQueries.unshift(normalizedQuery);
    if (this.recentQueries.length > this.maxHistorySize) {
      this.recentQueries.pop();
    }
    
    // Update popular queries (queries with count > 3)
    if (count + 1 > 3) {
      this.popularQueries.add(normalizedQuery);
    }
  }

  /**
   * Get query suggestions based on history
   */
  getSuggestions(partialQuery: string, maxSuggestions = 5): string[] {
    const normalized = partialQuery.toLowerCase().trim();
    
    if (!normalized) {
      // Return recent popular queries
      return Array.from(this.popularQueries).slice(0, maxSuggestions);
    }

    const suggestions: Array<{ query: string; score: number }> = [];
    
    // Check recent queries
    for (const query of this.recentQueries) {
      if (query.includes(normalized)) {
        const score = this.calculateSuggestionScore(query, normalized, 'recent');
        suggestions.push({ query, score });
      }
    }
    
    // Check popular queries
    for (const query of this.popularQueries) {
      if (query.includes(normalized) && !suggestions.find(s => s.query === query)) {
        const score = this.calculateSuggestionScore(query, normalized, 'popular');
        suggestions.push({ query, score });
      }
    }
    
    // Sort by score and return top suggestions
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(s => s.query);
  }

  /**
   * Calculate suggestion score
   */
  private calculateSuggestionScore(
    query: string,
    partialQuery: string,
    type: 'recent' | 'popular'
  ): number {
    let score = 0;
    
    // Base score based on type
    score += type === 'popular' ? 0.6 : 0.4;
    
    // Boost for exact prefix match
    if (query.startsWith(partialQuery)) {
      score += 0.3;
    }
    
    // Boost for query frequency
    const frequency = this.queryHistory.get(query) || 0;
    score += Math.min(frequency / 10, 0.2);
    
    // Penalty for length difference
    const lengthDiff = Math.abs(query.length - partialQuery.length);
    score -= lengthDiff / 100;
    
    return Math.max(0, score);
  }

  /**
   * Clear query history
   */
  clearHistory(): void {
    this.queryHistory.clear();
    this.popularQueries.clear();
    this.recentQueries = [];
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalQueries: this.queryHistory.size,
      popularQueries: this.popularQueries.size,
      recentQueries: this.recentQueries.length
    };
  }
}

// Create singleton optimizer instance
export const searchQueryOptimizer = new SearchQueryOptimizer();