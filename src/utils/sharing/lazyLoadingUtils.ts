// Utility functions for lazy loading and pagination in share components

/**
 * Debounce function to delay execution until after a specified wait time
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Paginate an array of items
 * @param {Array} items - Items to paginate
 * @param {number} page - Current page (0-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Object} Paginated result with items and metadata
 */
export const paginateItems = (items, page = 0, pageSize = 20) => {
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = items.slice(startIndex, endIndex);
  
  return {
    items: paginatedItems,
    currentPage: page,
    pageSize,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / pageSize),
    hasMore: endIndex < items.length,
    hasPrevious: page > 0
  };
};

/**
 * Lazy load items in batches
 * @param {Array} allItems - All items to load
 * @param {number} currentCount - Current number of loaded items
 * @param {number} batchSize - Number of items to load per batch
 * @returns {Object} Batch result with items and metadata
 */
export const loadBatch = (allItems, currentCount = 0, batchSize = 20) => {
  const nextBatch = allItems.slice(currentCount, currentCount + batchSize);
  const newCount = currentCount + nextBatch.length;
  
  return {
    items: nextBatch,
    loadedCount: newCount,
    totalCount: allItems.length,
    hasMore: newCount < allItems.length,
    progress: (newCount / allItems.length) * 100
  };
};

/**
 * Virtual scrolling helper to calculate visible items
 * @param {number} scrollTop - Current scroll position
 * @param {number} containerHeight - Height of the container
 * @param {number} itemHeight - Height of each item
 * @param {number} totalItems - Total number of items
 * @param {number} overscan - Number of items to render outside viewport
 * @returns {Object} Visible range information
 */
export const calculateVisibleRange = (
  scrollTop,
  containerHeight,
  itemHeight,
  totalItems,
  overscan = 3
) => {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  return {
    startIndex,
    endIndex,
    visibleCount: endIndex - startIndex + 1,
    offsetY: startIndex * itemHeight
  };
};

/**
 * Intersection Observer helper for infinite scroll
 * @param {Function} callback - Callback when intersection occurs
 * @param {Object} options - Intersection observer options
 * @returns {IntersectionObserver} Observer instance
 */
export const createInfiniteScrollObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '100px',
    threshold: 0.1,
    ...options
  };
  
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback();
      }
    });
  }, defaultOptions);
};

/**
 * Throttle function to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between executions in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 100) => {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Cache manager for storing and retrieving cached data
 */
export class CacheManager {
  private cache: Map<string, { value: any; timestamp: number }>;
  private ttl: number;

  constructor(ttl = 5 * 60 * 1000) { // Default 5 minutes
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }
  
  has(key) {
    return this.get(key) !== null;
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(key) {
    this.cache.delete(key);
  }
}

/**
 * Memoize expensive computations
 * @param {Function} fn - Function to memoize
 * @param {Function} keyGenerator - Function to generate cache key from arguments
 * @returns {Function} Memoized function
 */
export const memoize = (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
  const cache = new Map();
  
  return function memoized(...args) {
    const key = keyGenerator(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  };
};
