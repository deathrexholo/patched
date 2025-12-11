/**
 * Debouncing and Throttling Utilities
 * 
 * These utilities help prevent excessive function calls and state updates
 * that can cause flickering and performance issues in progressive loading.
 */

/**
 * Debounce function - delays execution until after wait time has elapsed
 * since the last time it was invoked
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
    
    if (callNow) {
      func(...args);
    }
  };
}

/**
 * Throttle function - limits execution to at most once per wait period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  const { leading = true, trailing = true } = options;
  
  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();
    
    if (!previous && !leading) {
      previous = now;
    }
    
    const remaining = wait - (now - previous);
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        previous = leading ? Date.now() : 0;
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}

/**
 * Debounced state update utility for React hooks
 * Prevents rapid state updates that cause flickering
 */
export function createDebouncedStateUpdater<T>(
  setState: (value: T | ((prev: T) => T)) => void,
  delay: number = 100
) {
  return debounce(setState, delay);
}

/**
 * Throttled scroll handler utility
 * Reduces frequency of scroll event processing
 */
export function createThrottledScrollHandler(
  handler: (event: Event) => void,
  delay: number = 100
) {
  return throttle(handler, delay, { leading: true, trailing: true });
}

/**
 * Batch state updates utility
 * Collects multiple state updates and applies them in a single batch
 */
export class StateBatcher<T> {
  private updates: Array<(prev: T) => T> = [];
  private timeout: NodeJS.Timeout | null = null;
  private setState: (value: T | ((prev: T) => T)) => void;
  private delay: number;

  constructor(
    setState: (value: T | ((prev: T) => T)) => void,
    delay: number = 50
  ) {
    this.setState = setState;
    this.delay = delay;
  }

  addUpdate(updater: (prev: T) => T) {
    this.updates.push(updater);
    
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    
    this.timeout = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  flush() {
    if (this.updates.length === 0) return;
    
    const allUpdates = [...this.updates];
    this.updates = [];
    
    this.setState((prev: T) => {
      return allUpdates.reduce((acc, updater) => updater(acc), prev);
    });
    
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  clear() {
    this.updates = [];
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

/**
 * Configuration for different debounce/throttle delays
 */
export const PERFORMANCE_DELAYS = {
  STATE_UPDATE: 50,      // For state updates
  SCROLL_HANDLER: 100,   // For scroll event handling
  LOADING_CHECK: 150,    // For loading condition checks
  RESIZE_HANDLER: 200,   // For window resize events
} as const;