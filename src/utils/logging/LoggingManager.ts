// Centralized Logging Manager
// Controls all console output across the application

class LoggingManager {
  isProduction: boolean;
  isDevelopment: boolean;
  levels: Record<string, number>;
  currentLevel: number;
  categories: Record<string, boolean>;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Logging levels
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      VERBOSE: 4
    };
    
    // Current log level (can be controlled via environment or localStorage)
    this.currentLevel = this.getCurrentLogLevel();
    
    // Category-specific controls
    this.categories = {
      PERFORMANCE: this.shouldLog('performance'),
      ANALYTICS: this.shouldLog('analytics'),
      RENDERING: this.shouldLog('rendering'),
      CLEANUP: this.shouldLog('cleanup'),
      API: this.shouldLog('api'),
      COMPONENT: this.shouldLog('component')
    };
  }
  
  getCurrentLogLevel() {
    // In production, only show errors and warnings
    if (this.isProduction) {
      return this.levels.WARN;
    }
    
    // Check localStorage for user preference
    const stored = localStorage.getItem('kiro-log-level');
    if (stored && this.levels[stored] !== undefined) {
      return this.levels[stored];
    }
    
    // Default to INFO in development
    return this.levels.INFO;
  }
  
  shouldLog(category) {
    // In production, disable most logging categories
    if (this.isProduction) {
      return category === 'error' || category === 'warn';
    }
    
    // Check localStorage for category-specific controls
    const categoryKey = `kiro-log-${category}`;
    const stored = localStorage.getItem(categoryKey);
    
    if (stored !== null) {
      return stored === 'true';
    }
    
    // Default category settings for development
    const defaults = {
      performance: false, // Disable by default - too noisy (overhead warnings)
      analytics: false,   // Disable by default - too noisy
      rendering: false,   // Disable by default - too noisy
      cleanup: false,     // Disable by default - can be noisy during cleanup operations
      api: false,         // Disable by default - can be noisy
      component: false    // Disable by default - too noisy (mount/unmount logs)
    };
    
    return defaults[category] || false;
  }
  
  // Main logging methods - TEMPORARILY DISABLED TO STOP FLOODING
  error(category, message, ...args) {
    // Only show critical errors
    if (this.currentLevel >= this.levels.ERROR && category === 'CRITICAL') {
      console.error(`❌ [${category.toUpperCase()}]`, message, ...args);
    }
  }
  
  warn(category, message, ...args) {
    // Disabled to stop flooding
    return;
  }
  
  info(category, message, ...args) {
    // Disabled to stop flooding
    return;
  }
  
  debug(category, message, ...args) {
    // Disabled to stop flooding
    return;
  }
  
  verbose(category, message, ...args) {
    // Disabled to stop flooding
    return;
  }
  
  // Specialized logging methods - ALL DISABLED TO STOP FLOODING
  performance(message, ...args) {
    // Disabled
    return;
  }
  
  analytics(message, ...args) {
    // Disabled
    return;
  }
  
  rendering(message, ...args) {
    // Disabled
    return;
  }
  
  cleanup(message, ...args) {
    // Disabled
    return;
  }
  
  api(message, ...args) {
    // Disabled
    return;
  }
  
  component(message, ...args) {
    // Disabled
    return;
  }
  
  // Control methods
  setLogLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
      localStorage.setItem('kiro-log-level', level);
    }
  }
  
  enableCategory(category) {
    const key = category.toUpperCase();
    if (this.categories[key] !== undefined) {
      this.categories[key] = true;
      localStorage.setItem(`kiro-log-${category.toLowerCase()}`, 'true');
    }
  }
  
  disableCategory(category) {
    const key = category.toUpperCase();
    if (this.categories[key] !== undefined) {
      this.categories[key] = false;
      localStorage.setItem(`kiro-log-${category.toLowerCase()}`, 'false');
    }
  }
  
  // Utility methods
  getStatus() {
    return {
      level: Object.keys(this.levels).find(key => this.levels[key] === this.currentLevel),
      categories: this.categories,
      isProduction: this.isProduction,
      isDevelopment: this.isDevelopment
    };
  }
  
  // Quick disable all noisy categories
  silenceNoisyLogs() {
    this.disableCategory('performance');
    this.disableCategory('analytics');
    this.disableCategory('rendering');
    this.disableCategory('component');
    this.disableCategory('cleanup');
    this.disableCategory('api');
    // No console output to avoid more flooding
  }
  
  // Complete silence - disable everything except errors
  completeSilence() {
    this.setLogLevel('ERROR');
    this.silenceNoisyLogs();
    // No console output to avoid more flooding
  }
  
  // Re-enable all categories
  enableAllLogs() {
    Object.keys(this.categories).forEach(category => {
      this.enableCategory(category.toLowerCase());
    });
    // No console output to avoid more flooding
  }
}

// Create singleton instance
const logger = new LoggingManager();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).logger = logger;
  
  // Mark as initialized without console output
  if (!localStorage.getItem('kiro-logging-initialized')) {
    localStorage.setItem('kiro-logging-initialized', 'true');
  }
}

export default logger;