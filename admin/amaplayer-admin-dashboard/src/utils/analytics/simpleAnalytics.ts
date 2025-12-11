// Simple, error-free analytics system
// This replaces the complex offline analytics to prevent IndexedDB errors

import { useCallback, useMemo } from 'react';

interface AnalyticsEvent {
  id: string;
  type: string;
  timestamp: number;
  sessionId: string;
  data: {
    url: string;
    userAgent: string;
    offline: boolean;
    [key: string]: unknown;
  };
}

interface AnalyticsStats {
  sessionId: string;
  sessionDuration: number;
  eventsTracked: number;
  isEnabled: boolean;
}

interface AnalyticsExport {
  sessionId: string;
  sessionStart: number;
  events: AnalyticsEvent[];
  stats: AnalyticsStats;
}

interface UseSimpleAnalyticsReturn {
  track: (eventType: string, data?: Record<string, unknown>) => void;
  trackPageView: (page: string, data?: Record<string, unknown>) => void;
  trackInteraction: (action: string, target: string, data?: Record<string, unknown>) => void;
  trackError: (error: Error | string, context?: Record<string, unknown>) => void;
  getStats: () => AnalyticsStats;
  getRecentEvents: (count?: number) => AnalyticsEvent[];
  clear: () => void;
}

class SimpleAnalytics {
  private events: AnalyticsEvent[];
  private maxEvents: number;
  private sessionId: string;
  private sessionStart: number;
  private isEnabled: boolean;

  constructor() {
    this.events = [];
    this.maxEvents = 100; // Keep only last 100 events in memory
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionStart = Date.now();
    this.isEnabled = true;
  }

  // Track any event
  track(eventType: string, data: Record<string, unknown> = {}): void {
    if (!this.isEnabled) return;

    try {
      const event: AnalyticsEvent = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: eventType,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        data: {
          ...data,
          url: window.location.href,
          userAgent: navigator.userAgent,
          offline: !navigator.onLine
        }
      };

      this.events.push(event);

      // Keep events array manageable
      if (this.events.length > this.maxEvents) {
        this.events = this.events.slice(-this.maxEvents);
      }

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        const logger = require('../logging/LoggingManager').default;
        logger.analytics(`${eventType}`, data);
      }

    } catch (error) {
      // Fail silently to prevent breaking the app
      if (process.env.NODE_ENV === 'development') {
        const logger = require('../logging/LoggingManager').default;
        logger.warn('ANALYTICS', 'Analytics tracking failed:', error);
      }
    }
  }

  // Track page view
  trackPageView(page: string, data: Record<string, unknown> = {}): void {
    this.track('PAGE_VIEW', { page, ...data });
  }

  // Track user interaction
  trackInteraction(action: string, target: string, data: Record<string, unknown> = {}): void {
    this.track('USER_INTERACTION', { action, target, ...data });
  }

  // Track error
  trackError(error: Error | string, context: Record<string, unknown> = {}): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;
    
    this.track('ERROR', {
      message: errorMessage,
      stack: errorStack,
      context
    });
  }

  // Get session stats
  getStats(): AnalyticsStats {
    return {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStart,
      eventsTracked: this.events.length,
      isEnabled: this.isEnabled
    };
  }

  // Get recent events
  getRecentEvents(count: number = 10): AnalyticsEvent[] {
    return this.events.slice(-count);
  }

  // Clear all events
  clear(): void {
    this.events = [];
  }

  // Enable/disable tracking
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Export events for debugging
  export(): AnalyticsExport {
    return {
      sessionId: this.sessionId,
      sessionStart: this.sessionStart,
      events: this.events,
      stats: this.getStats()
    };
  }
}

// Create singleton instance
const simpleAnalytics = new SimpleAnalytics();

// Hook for React components
export const useSimpleAnalytics = (): UseSimpleAnalyticsReturn => {
  const track = useCallback((eventType: string, data?: Record<string, unknown>) => simpleAnalytics.track(eventType, data), []);
  const trackPageView = useCallback((page: string, data?: Record<string, unknown>) => simpleAnalytics.trackPageView(page, data), []);
  const trackInteraction = useCallback((action: string, target: string, data?: Record<string, unknown>) => simpleAnalytics.trackInteraction(action, target, data), []);
  const trackError = useCallback((error: Error | string, context?: Record<string, unknown>) => simpleAnalytics.trackError(error, context), []);
  const getStats = useCallback(() => simpleAnalytics.getStats(), []);
  const getRecentEvents = useCallback((count?: number) => simpleAnalytics.getRecentEvents(count), []);
  const clear = useCallback(() => simpleAnalytics.clear(), []);

  return useMemo(() => ({
    track,
    trackPageView,
    trackInteraction,
    trackError,
    getStats,
    getRecentEvents,
    clear
  }), [track, trackPageView, trackInteraction, trackError, getStats, getRecentEvents, clear]);
};

export default simpleAnalytics;
