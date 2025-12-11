// Predictive Content Prefetching System
// Advanced prefetching based on user behavior analysis and preferences
// Part of Phase 4: Advanced Features implementation

import { queryClient, queryKeys, QUERY_CONFIGS } from '../../lib/queryClient';
import { idbStore } from './indexedDB';

class PredictivePrefetcher {
  userBehavior: Map<string, any>;
  prefetchQueue: Set<string>;
  isAnalyzing: boolean;
  lastAnalysis: number;
  analysisInterval: number;
  preferenceWeights: any;
  prefetchLimits: any;
  currentUser: any;

  constructor() {
    this.userBehavior = new Map();
    this.prefetchQueue = new Set();
    this.isAnalyzing = false;
    this.lastAnalysis = 0;
    this.analysisInterval = 5 * 60 * 1000; // 5 minutes
    
    // User preference weights for prefetching priority
    this.preferenceWeights = {
      favoriteAthletes: 0.4,
      followingSports: 0.3,
      recentlyViewed: 0.2,
      interactionHistory: 0.1
    };
    
    // Prefetch limits to prevent excessive bandwidth usage
    this.prefetchLimits = {
      maxConcurrentPrefetch: 5,
      maxPrefetchSize: 10 * 1024 * 1024, // 10MB
      prefetchTimeWindow: 30 * 60 * 1000 // 30 minutes
    };

    this.init();
  }

  async init() {
    try {
      // Load user behavior data from IndexedDB
      await this.loadUserBehavior();
      
      // Start periodic analysis
      this.startPeriodicAnalysis();
      
      // Listen for network changes
      this.setupNetworkListeners();
      
      // Predictive prefetching system initialized
    } catch (error) {
      // Failed to initialize predictive prefetcher - silent fail
    }
  }

  // Load user behavior data from storage
  async loadUserBehavior() {
    try {
      const behaviorData = await idbStore.get('user_behavior', 'user_behavior_data');
      if (behaviorData) {
        this.userBehavior = new Map((behaviorData as any)?.entries || []);
        // Loaded behavior data
      }
    } catch (error) {
      // Failed to load user behavior - silent fail
    }
  }

  // Save user behavior data to storage
  async saveBehaviorData() {
    try {
      await idbStore.set('user_behavior', {
        id: 'user_behavior_data',
        entries: Array.from(this.userBehavior.entries()),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      // Failed to save behavior data - silent fail
    }
  }

  // Track user behavior for predictive analysis
  trackUserBehavior(action, data) {
    const behaviorKey = `${action}_${data.type || 'general'}`;
    const currentBehavior = this.userBehavior.get(behaviorKey) || {
      count: 0,
      lastAccess: 0,
      patterns: []
    };

    // Update behavior metrics
    currentBehavior.count += 1;
    currentBehavior.lastAccess = Date.now();
    
    // Track patterns (time of day, content type, etc.)
    currentBehavior.patterns.push({
      timestamp: Date.now(),
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      userId: data.userId,
      contentId: data.contentId,
      duration: data.duration || 0
    });

    // Keep only recent patterns (last 100)
    if (currentBehavior.patterns.length > 100) {
      currentBehavior.patterns = currentBehavior.patterns.slice(-100);
    }

    this.userBehavior.set(behaviorKey, currentBehavior);
    
    // Trigger analysis if behavior has changed significantly
    if (currentBehavior.count % 10 === 0) {
      this.scheduleAnalysis();
    }
  }

  // Analyze user preferences for predictive prefetching
  async analyzeUserPreferences(userId) {
    try {
      const preferences = {
        favoriteAthletes: await this.getFavoriteAthletes(userId),
        followingSports: await this.getFollowingSports(userId),
        recentlyViewed: await this.getRecentlyViewedContent(userId),
        interactionHistory: await this.getInteractionPatterns(userId),
        timeBasedPatterns: this.getTimeBasedPatterns(userId),
        contentTypePreferences: this.getContentTypePreferences(userId)
      };

      // User preferences analyzed
      return preferences;
    } catch (error) {
      // Failed to analyze user preferences - silent fail
      return {};
    }
  }

  // Get user's favorite athletes based on interaction frequency
  async getFavoriteAthletes(userId) {
    const athleteInteractions = new Map();
    
    // Analyze behavior patterns for athlete interactions
    for (const [key, behavior] of this.userBehavior.entries()) {
      if (key.includes('athlete_view') || key.includes('athlete_profile')) {
        behavior.patterns.forEach(pattern => {
          if (pattern.userId === userId && pattern.contentId) {
            const count = athleteInteractions.get(pattern.contentId) || 0;
            athleteInteractions.set(pattern.contentId, count + 1);
          }
        });
      }
    }

    // Sort by interaction frequency and return top 10
    return Array.from(athleteInteractions.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([athleteId]) => athleteId);
  }

  // Get sports that user follows or frequently views
  async getFollowingSports(userId) {
    const sportsInteractions = new Map();
    
    for (const [key, behavior] of this.userBehavior.entries()) {
      if (key.includes('sport_') || key.includes('event_')) {
        behavior.patterns.forEach(pattern => {
          if (pattern.userId === userId && pattern.contentId) {
            const sportId = this.extractSportFromContent(pattern.contentId);
            if (sportId) {
              const count = sportsInteractions.get(sportId) || 0;
              sportsInteractions.set(sportId, count + 1);
            }
          }
        });
      }
    }

    return Array.from(sportsInteractions.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([sportId]) => sportId);
  }

  // Get recently viewed content for quick access prefetching
  async getRecentlyViewedContent(userId) {
    const recentContent = [];
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // Last 24 hours
    
    for (const behavior of this.userBehavior.values()) {
      behavior.patterns
        .filter(pattern => pattern.userId === userId && pattern.timestamp > cutoffTime)
        .forEach(pattern => {
          recentContent.push({
            contentId: pattern.contentId,
            timestamp: pattern.timestamp,
            type: this.getContentType(pattern.contentId)
          });
        });
    }

    return recentContent
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }

  // Analyze interaction patterns for predictive modeling
  getInteractionPatterns(userId) {
    const patterns = {
      peakHours: [],
      preferredDays: [],
      sessionDuration: 0,
      interactionTypes: new Map()
    };

    // Analyze time-based patterns
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);
    let totalDuration = 0;
    let sessionCount = 0;

    for (const behavior of this.userBehavior.values()) {
      behavior.patterns
        .filter(pattern => pattern.userId === userId)
        .forEach(pattern => {
          hourCounts[pattern.hour]++;
          dayCounts[pattern.dayOfWeek]++;
          totalDuration += pattern.duration || 0;
          sessionCount++;
        });
    }

    // Find peak hours (top 3)
    patterns.peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    // Find preferred days (top 3)
    patterns.preferredDays = dayCounts
      .map((count, day) => ({ day, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.day);

    patterns.sessionDuration = sessionCount > 0 ? totalDuration / sessionCount : 0;

    return patterns;
  }

  // Get time-based behavior patterns
  getTimeBasedPatterns(userId) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    
    return {
      isActiveTime: this.isUserActiveAtTime(userId, currentHour, currentDay),
      nextActiveWindow: this.getNextActiveWindow(userId),
      weekendBehavior: this.getWeekendBehavior(userId),
      morningPreferences: this.getTimeBasedPreferences(userId, [6, 7, 8, 9, 10]),
      eveningPreferences: this.getTimeBasedPreferences(userId, [18, 19, 20, 21, 22])
    };
  }

  // Get content type preferences
  getContentTypePreferences(userId) {
    const contentTypes = new Map();
    
    for (const [key, behavior] of this.userBehavior.entries()) {
      const contentType = key.split('_')[0]; // Extract content type from behavior key
      behavior.patterns
        .filter(pattern => pattern.userId === userId)
        .forEach(() => {
          const count = contentTypes.get(contentType) || 0;
          contentTypes.set(contentType, count + 1);
        });
    }

    return Array.from(contentTypes.entries())
      .sort(([,a], [,b]) => b - a)
      .reduce((acc, [type, count]) => {
        acc[type] = count;
        return acc;
      }, {});
  }

  // Main prefetching orchestrator
  async performPredictivePrefetching(userId) {
    if (this.isAnalyzing || !navigator.onLine) {
      return;
    }

    this.isAnalyzing = true;
    
    try {
      // Starting predictive prefetching for user
      
      // Analyze user preferences
      const preferences = await this.analyzeUserPreferences(userId);
      
      // Generate prefetch candidates
      const prefetchCandidates = await this.generatePrefetchCandidates(preferences, userId);
      
      // Prioritize and execute prefetching
      const prioritizedCandidates = this.prioritizePrefetchCandidates(prefetchCandidates);
      await this.executePrefetching(prioritizedCandidates);
      
      // Save behavior data
      await this.saveBehaviorData();
      
      // Predictive prefetching completed
      
    } catch (error) {
      // Predictive prefetching failed - silent fail
    } finally {
      this.isAnalyzing = false;
      this.lastAnalysis = Date.now();
    }
  }

  // Generate candidates for prefetching based on preferences
  async generatePrefetchCandidates(preferences, userId) {
    const candidates = [];

    // Prefetch favorite athletes' content
    if (preferences.favoriteAthletes) {
      for (const athleteId of preferences.favoriteAthletes.slice(0, 5)) {
        candidates.push({
          type: 'athlete_profile',
          key: queryKeys.athleteProfile(athleteId),
          priority: this.preferenceWeights.favoriteAthletes,
          fetchFn: () => this.fetchAthleteContent(athleteId)
        });
      }
    }

    // Prefetch followed sports events
    if (preferences.followingSports) {
      for (const sportId of preferences.followingSports) {
        candidates.push({
          type: 'upcoming_events',
          key: queryKeys.eventsByDate(this.getUpcomingEventDate()),
          priority: this.preferenceWeights.followingSports,
          fetchFn: () => this.fetchUpcomingEvents(sportId)
        });
      }
    }

    // Prefetch recently viewed content updates
    if (preferences.recentlyViewed) {
      for (const content of preferences.recentlyViewed.slice(0, 10)) {
        candidates.push({
          type: 'content_update',
          key: this.getQueryKeyForContent(content),
          priority: this.preferenceWeights.recentlyViewed,
          fetchFn: () => this.fetchContentUpdate(content)
        });
      }
    }

    // Prefetch based on time patterns
    if (preferences.timeBasedPatterns.isActiveTime) {
      candidates.push(...await this.getTimeBasedPrefetchCandidates(userId, preferences));
    }

    return candidates;
  }

  // Prioritize prefetch candidates based on multiple factors
  prioritizePrefetchCandidates(candidates) {
    return candidates
      .map(candidate => ({
        ...candidate,
        score: this.calculatePrefetchScore(candidate)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.prefetchLimits.maxConcurrentPrefetch);
  }

  // Calculate prefetch score for prioritization
  calculatePrefetchScore(candidate) {
    let score = candidate.priority * 100;
    
    // Boost score for recently accessed content
    if (candidate.type === 'content_update') {
      score += 20;
    }
    
    // Boost score for time-sensitive content
    if (candidate.type === 'upcoming_events') {
      score += 30;
    }
    
    // Reduce score if already in cache
    if (queryClient.getQueryData(candidate.key)) {
      score -= 50;
    }
    
    return Math.max(0, score);
  }

  // Execute prefetching for prioritized candidates
  async executePrefetching(candidates) {
    const prefetchPromises = candidates.map(async candidate => {
      try {
        // Check if already prefetching this key
        if (this.prefetchQueue.has(candidate.key.toString())) {
          return;
        }
        
        this.prefetchQueue.add(candidate.key.toString());
        
        // Prefetch using React Query
        await queryClient.prefetchQuery({
          queryKey: candidate.key,
          queryFn: candidate.fetchFn,
          staleTime: QUERY_CONFIGS[this.getConfigKey(candidate.type)]?.staleTime || 5 * 60 * 1000
        });
        
        // Prefetched successfully
        
      } catch (error) {
        // Failed to prefetch - silent fail
      } finally {
        this.prefetchQueue.delete(candidate.key.toString());
      }
    });

    await Promise.allSettled(prefetchPromises);
  }

  // Mock fetch functions (replace with actual API calls)
  async fetchAthleteContent(athleteId) {
    // This would be replaced with actual API call
    return {
      id: athleteId,
      name: `Athlete ${athleteId}`,
      sport: 'Football',
      recentPosts: [],
      achievements: []
    };
  }

  async fetchUpcomingEvents(sportId) {
    // This would be replaced with actual API call
    return {
      sport: sportId,
      events: [
        {
          id: `event_${Date.now()}`,
          title: `Upcoming ${sportId} Event`,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          participants: []
        }
      ]
    };
  }

  async fetchContentUpdate(content) {
    // This would be replaced with actual API call
    return {
      id: content.contentId,
      type: content.type,
      updatedAt: new Date().toISOString(),
      changes: []
    };
  }

  // Helper methods
  extractSportFromContent(contentId) {
    // Extract sport ID from content ID pattern
    const sportMatch = contentId.match(/sport_(\w+)/);
    return sportMatch ? sportMatch[1] : null;
  }

  getContentType(contentId) {
    if (contentId.includes('athlete')) return 'athlete';
    if (contentId.includes('event')) return 'event';
    if (contentId.includes('post')) return 'post';
    return 'unknown';
  }

  getUpcomingEventDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  getQueryKeyForContent(content) {
    switch (content.type) {
      case 'athlete':
        return queryKeys.athleteProfile(content.contentId);
      case 'event':
        return queryKeys.eventDetail(content.contentId);
      case 'post':
        return queryKeys.postDetail(content.contentId);
      default:
        return ['unknown', content.contentId];
    }
  }

  getConfigKey(candidateType) {
    switch (candidateType) {
      case 'athlete_profile':
        return 'USER_PROFILE';
      case 'upcoming_events':
        return 'EVENTS';
      case 'content_update':
        return 'POSTS';
      default:
        return 'POSTS';
    }
  }

  isUserActiveAtTime(userId, hour, day) {
    const behavior = this.userBehavior.get(`active_time_${userId}`);
    if (!behavior) return false;
    
    const hourActivity = behavior.patterns.filter(p => p.hour === hour).length;
    const dayActivity = behavior.patterns.filter(p => p.dayOfWeek === day).length;
    
    return hourActivity > 3 || dayActivity > 10; // Thresholds for "active" time
  }

  getNextActiveWindow(userId) {
    // Calculate when user is likely to be active next
    const patterns = this.getInteractionPatterns(userId);
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find next peak hour
    const nextPeakHour = patterns.peakHours.find(hour => hour > currentHour) || patterns.peakHours[0];
    const nextActiveTime = new Date();
    
    if (nextPeakHour <= currentHour) {
      nextActiveTime.setDate(nextActiveTime.getDate() + 1);
    }
    nextActiveTime.setHours(nextPeakHour, 0, 0, 0);
    
    return nextActiveTime;
  }

  getWeekendBehavior(userId) {
    const weekendPatterns = [];
    for (const behavior of this.userBehavior.values()) {
      weekendPatterns.push(
        ...behavior.patterns.filter(
          p => p.userId === userId && (p.dayOfWeek === 0 || p.dayOfWeek === 6)
        )
      );
    }
    return {
      isMoreActive: weekendPatterns.length > 0,
      preferredTimes: this.getPreferredTimesFromPatterns(weekendPatterns)
    };
  }

  getTimeBasedPreferences(userId, hours) {
    const timePatterns = [];
    for (const behavior of this.userBehavior.values()) {
      timePatterns.push(
        ...behavior.patterns.filter(
          p => p.userId === userId && hours.includes(p.hour)
        )
      );
    }
    return this.getPreferredContentFromPatterns(timePatterns);
  }

  getTimeBasedPrefetchCandidates(userId, preferences) {
    const candidates = [];
    
    // If user is active in the morning, prefetch news-style content
    if (preferences.morningPreferences.posts) {
      candidates.push({
        type: 'morning_content',
        key: queryKeys.posts(),
        priority: 0.3,
        fetchFn: () => this.fetchMorningContent()
      });
    }
    
    // If user is active in the evening, prefetch entertainment content
    if (preferences.eveningPreferences.events) {
      candidates.push({
        type: 'evening_content',
        key: queryKeys.events(),
        priority: 0.2,
        fetchFn: () => this.fetchEveningContent()
      });
    }
    
    return candidates;
  }

  getPreferredTimesFromPatterns(patterns) {
    const hourCounts = new Array(24).fill(0);
    patterns.forEach(p => hourCounts[p.hour]++);
    return hourCounts.map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);
  }

  getPreferredContentFromPatterns(patterns) {
    const contentTypes = new Map();
    patterns.forEach(p => {
      const type = this.getContentType(p.contentId);
      contentTypes.set(type, (contentTypes.get(type) || 0) + 1);
    });
    return Object.fromEntries(contentTypes);
  }

  async fetchMorningContent() {
    return { type: 'morning', content: 'Latest sports news and updates' };
  }

  async fetchEveningContent() {
    return { type: 'evening', content: 'Evening sports events and highlights' };
  }

  // Schedule analysis when behavior changes
  scheduleAnalysis() {
    if (Date.now() - this.lastAnalysis > this.analysisInterval) {
      setTimeout(() => {
        if (this.currentUser) {
          this.performPredictivePrefetching(this.currentUser.uid);
        }
      }, 1000);
    }
  }

  // Start periodic behavior analysis
  startPeriodicAnalysis() {
    setInterval(() => {
      if (this.currentUser && navigator.onLine) {
        this.performPredictivePrefetching(this.currentUser.uid);
      }
    }, this.analysisInterval);
  }

  // Setup network change listeners
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      if (this.currentUser) {
        // Trigger prefetching when network comes back online
        setTimeout(() => {
          this.performPredictivePrefetching(this.currentUser.uid);
        }, 2000);
      }
    });
  }

  // Set current user for prefetching
  setCurrentUser(user) {
    this.currentUser = user;
    if (user && navigator.onLine) {
      // Start prefetching for new user
      setTimeout(() => {
        this.performPredictivePrefetching(user.uid);
      }, 3000);
    }
  }

  // Get prefetching statistics
  getPrefetchingStats() {
    return {
      behaviorPatternsTracked: this.userBehavior.size,
      currentlyPrefetching: this.prefetchQueue.size,
      lastAnalysisTime: new Date(this.lastAnalysis).toLocaleString(),
      isAnalyzing: this.isAnalyzing,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  calculateCacheHitRate() {
    // Calculate cache hit rate based on React Query cache
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();
    
    if (queries.length === 0) return 0;
    
    const cachedQueries = queries.filter(query => query.state.data);
    return Math.round((cachedQueries.length / queries.length) * 100);
  }

  // Clear all prefetching data
  async clearPrefetchingData() {
    this.userBehavior.clear();
    this.prefetchQueue.clear();
    
    try {
      await idbStore.delete('user_behavior', 'user_behavior_data');
      // Prefetching data cleared
    } catch (error) {
      // Failed to clear prefetching data - silent fail
    }
  }
}

// Create singleton instance
export const predictivePrefetcher = new PredictivePrefetcher();

// Hook for using predictive prefetching in components
export const usePredictivePrefetch = () => {
  const performPrefetching = async (userId) => {
    return await predictivePrefetcher.performPredictivePrefetching(userId);
  };

  const trackBehavior = (action, data) => {
    predictivePrefetcher.trackUserBehavior(action, data);
  };

  const getStats = () => {
    return predictivePrefetcher.getPrefetchingStats();
  };

  const setUser = (user) => {
    predictivePrefetcher.setCurrentUser(user);
  };

  const clearData = async () => {
    return await predictivePrefetcher.clearPrefetchingData();
  };

  return {
    performPrefetching,
    trackBehavior,
    getStats,
    setUser,
    clearData
  };
};

export default predictivePrefetcher;