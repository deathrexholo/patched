/**
 * Search Analytics Service
 * Comprehensive analytics tracking for search functionality
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  serverTimestamp,
  updateDoc,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  SearchQuery, 
  SearchAnalytics, 
  SearchPerformanceMetrics 
} from '../../types/models/search';

interface SearchAnalyticsEvent {
  eventType: 'search_executed' | 'search_failed' | 'zero_results' | 'suggestion_clicked';
  searchTerm: string;
  searchType: string;
  filterCount: number;
  resultCount: number;
  responseTime: number;
  cached: boolean;
  errorOccurred: boolean;
  errorType?: string;
  errorMessage?: string;
  userId?: string;
  sessionId: string;
  timestamp: Timestamp;
  metadata?: {
    userAgent?: string;
    platform?: string;
    filters?: Record<string, any>;
    suggestions?: string[];
    selectedSuggestion?: string;
  };
}

interface AggregatedMetrics {
  totalSearches: number;
  totalFailures: number;
  totalZeroResults: number;
  averageResponseTime: number;
  cacheHitRate: number;
  searchesByType: Record<string, number>;
  popularTerms: Record<string, number>;
  lastUpdated: Timestamp;
}

class SearchAnalyticsService {
  private analyticsCollection = 'searchAnalytics';
  private metricsCollection = 'searchMetrics';
  private sessionId: string;

  constructor() {
    this.sessionId = this._generateSessionId();
  }

  /**
   * Track search execution for analytics
   */
  async trackSearch(
    searchQuery: SearchQuery,
    responseTime: number,
    resultCount: number,
    cached = false,
    errorOccurred = false,
    errorDetails?: { type: string; message: string }
  ): Promise<string | null> {
    try {
      const eventData: SearchAnalyticsEvent = {
        eventType: resultCount === 0 ? 'zero_results' : 'search_executed',
        searchTerm: searchQuery.term.toLowerCase().trim(),
        searchType: searchQuery.searchType,
        filterCount: Object.keys(searchQuery.filters).length,
        resultCount,
        responseTime,
        cached,
        errorOccurred,
        errorType: errorDetails?.type,
        errorMessage: errorDetails?.message,
        sessionId: this.sessionId,
        timestamp: serverTimestamp() as Timestamp,
        metadata: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          platform: this._detectPlatform(),
          filters: searchQuery.filters,
        }
      };

      // Store individual event
      const eventRef = await addDoc(collection(db, this.analyticsCollection), eventData);
      
      // Update aggregated metrics
      await this._updateAggregatedMetrics(eventData);
      
      console.log('📊 Search analytics event tracked:', eventRef.id);
      return eventRef.id;
    } catch (error) {
      console.error('❌ Error tracking search event:', error);
      return null;
    }
  }

  /**
   * Track search failure
   */
  async trackSearchFailure(
    searchQuery: SearchQuery,
    responseTime: number,
    error: { type: string; message: string }
  ): Promise<string | null> {
    try {
      const eventData: SearchAnalyticsEvent = {
        eventType: 'search_failed',
        searchTerm: searchQuery.term.toLowerCase().trim(),
        searchType: searchQuery.searchType,
        filterCount: Object.keys(searchQuery.filters).length,
        resultCount: 0,
        responseTime,
        cached: false,
        errorOccurred: true,
        errorType: error.type,
        errorMessage: error.message,
        sessionId: this.sessionId,
        timestamp: serverTimestamp() as Timestamp,
        metadata: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          platform: this._detectPlatform(),
          filters: searchQuery.filters,
        }
      };

      const eventRef = await addDoc(collection(db, this.analyticsCollection), eventData);
      await this._updateAggregatedMetrics(eventData);
      
      return eventRef.id;
    } catch (error) {
      console.error('❌ Error tracking search failure:', error);
      return null;
    }
  }

  /**
   * Track suggestion click
   */
  async trackSuggestionClick(
    originalTerm: string,
    selectedSuggestion: string,
    suggestions: string[]
  ): Promise<string | null> {
    try {
      const eventData: SearchAnalyticsEvent = {
        eventType: 'suggestion_clicked',
        searchTerm: originalTerm.toLowerCase().trim(),
        searchType: 'suggestion',
        filterCount: 0,
        resultCount: 0,
        responseTime: 0,
        cached: false,
        errorOccurred: false,
        sessionId: this.sessionId,
        timestamp: serverTimestamp() as Timestamp,
        metadata: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          platform: this._detectPlatform(),
          suggestions,
          selectedSuggestion,
        }
      };

      const eventRef = await addDoc(collection(db, this.analyticsCollection), eventData);
      
      return eventRef.id;
    } catch (error) {
      console.error('❌ Error tracking suggestion click:', error);
      return null;
    }
  }

  /**
   * Get search analytics for a date range
   */
  async getSearchAnalytics(dateRange: { start: Date; end: Date }): Promise<SearchAnalytics> {
    try {
      // Get events within date range
      const startTimestamp = Timestamp.fromDate(dateRange.start);
      const endTimestamp = Timestamp.fromDate(dateRange.end);

      const eventsQuery = query(
        collection(db, this.analyticsCollection),
        where('timestamp', '>=', startTimestamp),
        where('timestamp', '<=', endTimestamp),
        orderBy('timestamp', 'desc'),
        firestoreLimit(10000)
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        } as unknown as SearchAnalyticsEvent;
      });

      return this._generateAnalyticsFromEvents(events);
    } catch (error) {
      console.error('❌ Error getting search analytics:', error);
      return this._getDefaultAnalytics();
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(dateRange?: { start: Date; end: Date }): Promise<SearchPerformanceMetrics> {
    try {
      let eventsQuery;
      
      if (dateRange) {
        const startTimestamp = Timestamp.fromDate(dateRange.start);
        const endTimestamp = Timestamp.fromDate(dateRange.end);
        
        eventsQuery = query(
          collection(db, this.analyticsCollection),
          where('timestamp', '>=', startTimestamp),
          where('timestamp', '<=', endTimestamp),
          orderBy('timestamp', 'desc'),
          firestoreLimit(5000)
        );
      } else {
        // Get last 30 days by default
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        eventsQuery = query(
          collection(db, this.analyticsCollection),
          where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo)),
          orderBy('timestamp', 'desc'),
          firestoreLimit(5000)
        );
      }

      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map(doc => doc.data()) as SearchAnalyticsEvent[];

      return this._generatePerformanceMetrics(events);
    } catch (error) {
      console.error('❌ Error getting performance metrics:', error);
      return this._getDefaultPerformanceMetrics();
    }
  }

  /**
   * Get aggregated metrics
   */
  async getAggregatedMetrics(): Promise<AggregatedMetrics> {
    try {
      const metricsRef = doc(db, this.metricsCollection, 'global');
      const metricsDoc = await getDoc(metricsRef);
      
      if (!metricsDoc.exists()) {
        return this._getDefaultAggregatedMetrics();
      }

      return metricsDoc.data() as AggregatedMetrics;
    } catch (error) {
      console.error('❌ Error getting aggregated metrics:', error);
      return this._getDefaultAggregatedMetrics();
    }
  }

  /**
   * Export analytics data as CSV format
   */
  async exportAnalyticsData(dateRange: { start: Date; end: Date }): Promise<string> {
    try {
      const analytics = await this.getSearchAnalytics(dateRange);
      const performanceMetrics = await this.getPerformanceMetrics(dateRange);

      // Create CSV content
      const csvRows = [
        // Header
        'Metric,Value,Description',
        
        // Basic metrics
        `Total Searches,${analytics.totalSearches},Total number of searches performed`,
        `Average Response Time,${analytics.averageResponseTime}ms,Average search response time`,
        `Cache Hit Rate,${(performanceMetrics.cacheHitRate * 100).toFixed(1)}%,Percentage of cached results`,
        `Error Rate,${(performanceMetrics.errorRate * 100).toFixed(1)}%,Percentage of failed searches`,
        
        // Empty row
        '',
        
        // Top search terms header
        'Top Search Terms,Count,Percentage',
        ...analytics.topSearchTerms.map(term => 
          `"${term.term}",${term.count},${((term.count / analytics.totalSearches) * 100).toFixed(1)}%`
        ),
        
        // Empty row
        '',
        
        // Zero result queries header
        'Zero Result Queries,Count,Percentage',
        ...analytics.zeroResultQueries.map(query => 
          `"${query.query}",${query.count},${((query.count / analytics.totalSearches) * 100).toFixed(1)}%`
        ),
        
        // Empty row
        '',
        
        // Search trends header
        'Date,Search Count,Trend',
        ...analytics.searchTrends.map(trend => 
          `${trend.date},${trend.count},${this._calculateTrendDirection(analytics.searchTrends, trend.date)}`
        )
      ];

      return csvRows.join('\n');
    } catch (error) {
      console.error('❌ Error exporting analytics data:', error);
      throw error;
    }
  }

  /**
   * Clear old analytics data (cleanup)
   */
  async cleanupOldData(daysToKeep = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const oldEventsQuery = query(
        collection(db, this.analyticsCollection),
        where('timestamp', '<', Timestamp.fromDate(cutoffDate)),
        firestoreLimit(500)
      );

      const oldEventsSnapshot = await getDocs(oldEventsQuery);
      
      // Note: In a production environment, you'd want to use batch deletes
      // For now, we'll just log the cleanup operation
      console.log(`🧹 Found ${oldEventsSnapshot.size} old analytics events to cleanup`);
      
      // TODO: Implement batch delete in production
    } catch (error) {
      console.error('❌ Error cleaning up old analytics data:', error);
    }
  }

  // Private helper methods

  /**
   * Update aggregated metrics in Firestore
   */
  private async _updateAggregatedMetrics(eventData: SearchAnalyticsEvent): Promise<void> {
    try {
      const metricsRef = doc(db, this.metricsCollection, 'global');
      
      const updates: Partial<AggregatedMetrics> = {
        lastUpdated: serverTimestamp() as Timestamp
      };

      // Update counters based on event type
      if (eventData.eventType === 'search_executed' || eventData.eventType === 'zero_results') {
        (updates as any).totalSearches = increment(1);
        (updates as any)[`searchesByType.${eventData.searchType}`] = increment(1);
        
        // Update popular terms
        if (eventData.searchTerm.trim()) {
          updates[`popularTerms.${eventData.searchTerm}`] = increment(1);
        }
        
        if (eventData.eventType === 'zero_results') {
          (updates as any).totalZeroResults = increment(1);
        }
      } else if (eventData.eventType === 'search_failed') {
        (updates as any).totalFailures = increment(1);
      }

      await updateDoc(metricsRef, updates);
    } catch (error) {
      // If document doesn't exist, create it
      if (error.code === 'not-found') {
        await this._createInitialMetrics();
        // Retry the update
        await this._updateAggregatedMetrics(eventData);
      } else {
        console.error('❌ Error updating aggregated metrics:', error);
      }
    }
  }

  /**
   * Create initial metrics document
   */
  private async _createInitialMetrics(): Promise<void> {
    try {
      const metricsRef = doc(db, this.metricsCollection, 'global');
      const initialMetrics: AggregatedMetrics = {
        totalSearches: 0,
        totalFailures: 0,
        totalZeroResults: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        searchesByType: {},
        popularTerms: {},
        lastUpdated: serverTimestamp() as Timestamp
      };

      await updateDoc(metricsRef, initialMetrics as any);
    } catch (error) {
      console.error('❌ Error creating initial metrics:', error);
    }
  }

  /**
   * Generate analytics from events
   */
  private _generateAnalyticsFromEvents(events: SearchAnalyticsEvent[]): SearchAnalytics {
    const totalSearches = events.filter(e => 
      e.eventType === 'search_executed' || e.eventType === 'zero_results'
    ).length;

    const searchEvents = events.filter(e => e.eventType === 'search_executed');
    const zeroResultEvents = events.filter(e => e.eventType === 'zero_results');
    
    // Calculate average response time
    const totalResponseTime = searchEvents.reduce((sum, e) => sum + (e.responseTime || 0), 0);
    const averageResponseTime = searchEvents.length > 0 ? totalResponseTime / searchEvents.length : 0;

    // Count search terms
    const termCounts = new Map<string, number>();
    events.forEach(event => {
      if (event.searchTerm && event.searchTerm.trim()) {
        const term = event.searchTerm.trim();
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
    });

    // Count zero result queries
    const zeroResultCounts = new Map<string, number>();
    zeroResultEvents.forEach(event => {
      if (event.searchTerm && event.searchTerm.trim()) {
        const term = event.searchTerm.trim();
        zeroResultCounts.set(term, (zeroResultCounts.get(term) || 0) + 1);
      }
    });

    // Generate search trends (daily counts)
    const trendMap = new Map<string, number>();
    events.forEach(event => {
      if (event.eventType === 'search_executed' || event.eventType === 'zero_results') {
        const date = event.timestamp.toDate().toISOString().split('T')[0];
        trendMap.set(date, (trendMap.get(date) || 0) + 1);
      }
    });

    return {
      totalSearches,
      averageResponseTime: Math.round(averageResponseTime),
      topSearchTerms: Array.from(termCounts.entries())
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      zeroResultQueries: Array.from(zeroResultCounts.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      popularFilters: this._analyzePopularFilters(events),
      searchTrends: Array.from(trendMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 30) // Last 30 days
    };
  }

  /**
   * Generate performance metrics from events
   */
  private _generatePerformanceMetrics(events: SearchAnalyticsEvent[]): SearchPerformanceMetrics {
    const searchEvents = events.filter(e => 
      e.eventType === 'search_executed' || e.eventType === 'zero_results'
    );
    const errorEvents = events.filter(e => e.eventType === 'search_failed');
    const cachedEvents = events.filter(e => e.cached);

    const totalEvents = searchEvents.length + errorEvents.length;
    const totalResponseTime = searchEvents.reduce((sum, e) => sum + (e.responseTime || 0), 0);

    // Popular search terms
    const termCounts = new Map<string, number>();
    searchEvents.forEach(event => {
      if (event.searchTerm && event.searchTerm.trim()) {
        const term = event.searchTerm.trim();
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
    });

    // Slow queries
    const slowQueries = searchEvents
      .filter(e => (e.responseTime || 0) > 1000) // Slower than 1 second
      .map(e => ({
        query: e.searchTerm || 'unknown',
        responseTime: e.responseTime || 0
      }))
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);

    return {
      averageResponseTime: searchEvents.length > 0 ? totalResponseTime / searchEvents.length : 0,
      cacheHitRate: totalEvents > 0 ? cachedEvents.length / totalEvents : 0,
      totalSearches: totalEvents,
      errorRate: totalEvents > 0 ? errorEvents.length / totalEvents : 0,
      popularSearchTerms: Array.from(termCounts.entries())
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      slowQueries
    };
  }

  /**
   * Analyze popular filters from events
   */
  private _analyzePopularFilters(events: SearchAnalyticsEvent[]): Array<{ filter: string; count: number }> {
    const filterCounts = new Map<string, number>();
    
    events.forEach(event => {
      if (event.metadata?.filters) {
        Object.keys(event.metadata.filters).forEach(filterKey => {
          if (event.metadata.filters[filterKey] !== undefined && 
              event.metadata.filters[filterKey] !== null &&
              event.metadata.filters[filterKey] !== '') {
            filterCounts.set(filterKey, (filterCounts.get(filterKey) || 0) + 1);
          }
        });
      }
    });

    return Array.from(filterCounts.entries())
      .map(([filter, count]) => ({ filter, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Calculate trend direction for CSV export
   */
  private _calculateTrendDirection(trends: Array<{ date: string; count: number }>, currentDate: string): string {
    const currentIndex = trends.findIndex(t => t.date === currentDate);
    if (currentIndex === -1 || currentIndex === trends.length - 1) return 'stable';
    
    const current = trends[currentIndex].count;
    const previous = trends[currentIndex + 1].count;
    
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  }

  /**
   * Generate session ID
   */
  private _generateSessionId(): string {
    return `search_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Detect user platform
   */
  private _detectPlatform(): string {
    if (typeof navigator === 'undefined') return 'server';
    
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return 'mobile';
    } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Get default analytics when no data is available
   */
  private _getDefaultAnalytics(): SearchAnalytics {
    return {
      totalSearches: 0,
      averageResponseTime: 0,
      topSearchTerms: [],
      zeroResultQueries: [],
      popularFilters: [],
      searchTrends: []
    };
  }

  /**
   * Get default performance metrics
   */
  private _getDefaultPerformanceMetrics(): SearchPerformanceMetrics {
    return {
      averageResponseTime: 0,
      cacheHitRate: 0,
      totalSearches: 0,
      errorRate: 0,
      popularSearchTerms: [],
      slowQueries: []
    };
  }

  /**
   * Get default aggregated metrics
   */
  private _getDefaultAggregatedMetrics(): AggregatedMetrics {
    return {
      totalSearches: 0,
      totalFailures: 0,
      totalZeroResults: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      searchesByType: {},
      popularTerms: {},
      lastUpdated: Timestamp.now()
    };
  }
}

// Create singleton instance
export const searchAnalyticsService = new SearchAnalyticsService();
export default searchAnalyticsService;

// Export types for external use
export type { SearchAnalytics, SearchPerformanceMetrics } from '../../types/models/search';