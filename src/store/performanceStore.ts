/**
 * Enhanced Performance Store with Zustand
 * 
 * Provides comprehensive performance state management with historical data,
 * real-time metrics updates, dashboard state management, and data persistence.
 */

import { create, StateCreator } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  PerformanceStore,
  PerformanceMetrics,
  HistoricalDataPoint,
  PerformanceInsight,
  TrendAnalysis,
  WebVitalsData,
  ComponentMetrics,
  ApiMetrics,
  MemoryMetrics,
  PerformanceStorageData,
  TimeRange,
  MetricType
} from '../types/store/performance';
import { webVitalsCollector } from '../utils/performance/WebVitalsCollector';
import memoryManager from '../utils/performance/MemoryManager';
// Note: ProductionSafety imports are temporarily commented out due to module export issues
// These will be fixed when ProductionSafety.ts is properly migrated to TypeScript
// import { 
//   EnvironmentDetector, 
//   autoCleanupManager,
//   performanceErrorBoundary
// } from '../utils/performance/ProductionSafety';

// Temporary stubs for ProductionSafety utilities
const EnvironmentDetector = {
  isProduction: () => process.env.NODE_ENV === 'production'
};

const performanceErrorBoundary = {
  safeExecute: <T>(fn: () => T, defaultValue: T, context?: string): T => {
    try {
      return fn();
    } catch (error) {
      console.error(`Error in ${context}:`, error);
      return defaultValue;
    }
  },
  safeExecuteAsync: async <T>(fn: () => Promise<T>, defaultValue: T, context?: string): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      console.error(`Error in ${context}:`, error);
      return defaultValue;
    }
  }
};

// Performance data storage utilities
class PerformanceStorage {
  static STORAGE_KEY = 'performance-metrics';
  static MAX_HISTORY_SIZE = 100;
  static CLEANUP_THRESHOLD = 150;

  static save(data: PerformanceStorageData): void {
    // Don't save in production
    if (EnvironmentDetector.isProduction()) return;
    
    performanceErrorBoundary.safeExecute(() => {
      const storageData = {
        ...data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
    }, null, 'performance-storage-save');
  }

  static load(): PerformanceStorageData | null {
    // Don't load in production
    if (EnvironmentDetector.isProduction()) return null;
    
    return performanceErrorBoundary.safeExecute(() => {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) as PerformanceStorageData : null;
    }, null, 'performance-storage-load');
  }

  static cleanup(): void {
    try {
      // Remove old performance data to free up space
      const keys = Object.keys(localStorage);
      const performanceKeys = keys.filter(key => 
        key.startsWith('performance-') || key === this.STORAGE_KEY
      );
      
      // Sort by timestamp and keep only recent entries
      const entries = performanceKeys.map(key => {
        try {
          const data = localStorage.getItem(key);
          const parsed = data ? JSON.parse(data) : null;
          return { key, timestamp: parsed?.timestamp || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      }).sort((a, b) => b.timestamp - a.timestamp);

      // Remove oldest entries if we have too many
      if (entries.length > this.CLEANUP_THRESHOLD) {
        entries.slice(this.MAX_HISTORY_SIZE).forEach(entry => {
          localStorage.removeItem(entry.key);
        });
      }
    } catch (error) {
      console.warn('Performance storage cleanup failed:', error);
    }
  }
}

// Performance score calculation utilities
class PerformanceScoreCalculator {
  static calculateOverallScore(metrics: Partial<PerformanceMetrics>): number {
    if (!metrics) return 0;

    const scores = {
      webVitals: this.calculateWebVitalsScore(metrics.webVitals),
      component: this.calculateComponentScore(metrics.componentMetrics),
      api: this.calculateApiScore(metrics.apiMetrics),
      memory: this.calculateMemoryScore(metrics.memoryMetrics)
    };

    // Weighted average calculation
    const weights = {
      webVitals: 0.35,  // Core Web Vitals are most important
      component: 0.25,  // Component performance
      api: 0.25,        // API performance
      memory: 0.15      // Memory usage
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(scores).forEach(([metric, score]) => {
      if (score !== null && score !== undefined) {
        totalScore += score * weights[metric as keyof typeof weights];
        totalWeight += weights[metric as keyof typeof weights];
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  static calculateWebVitalsScore(webVitals: WebVitalsData | null | undefined): number | null {
    if (!webVitals || !webVitals.score) return null;
    return webVitals.score.overall || 0;
  }

  static calculateComponentScore(componentMetrics: ComponentMetrics | null | undefined): number | null {
    if (!componentMetrics || componentMetrics.totalRenders === 0) return 100;
    
    const avgRenderTime = componentMetrics.averageRenderTime || 0;
    
    // Score based on average render time (60fps = 16.67ms per frame)
    if (avgRenderTime <= 8) return 100;   // Excellent (< 8ms)
    if (avgRenderTime <= 16) return 85;   // Good (< 16ms, one frame)
    if (avgRenderTime <= 32) return 70;   // Fair (< 32ms, two frames)
    if (avgRenderTime <= 50) return 50;   // Poor (< 50ms)
    return 25; // Very poor (> 50ms)
  }

  static calculateApiScore(apiMetrics: ApiMetrics | null | undefined): number | null {
    if (!apiMetrics || apiMetrics.totalCalls === 0) return 100;
    
    const avgResponseTime = apiMetrics.averageResponseTime || 0;
    const errorRate = apiMetrics.overallErrorRate || 0;
    
    // Score based on response time
    let timeScore = 100;
    if (avgResponseTime > 200) timeScore = 85;
    if (avgResponseTime > 500) timeScore = 70;
    if (avgResponseTime > 1000) timeScore = 50;
    if (avgResponseTime > 2000) timeScore = 25;
    
    // Score based on error rate
    let errorScore = 100;
    if (errorRate > 1) errorScore = 85;
    if (errorRate > 5) errorScore = 70;
    if (errorRate > 10) errorScore = 50;
    if (errorRate > 20) errorScore = 25;
    
    return Math.round((timeScore * 0.7 + errorScore * 0.3));
  }

  static calculateMemoryScore(memoryMetrics: MemoryMetrics | null | undefined): number | null {
    if (!memoryMetrics) return 100;
    
    const isHigh = memoryMetrics.isHigh || false;
    const leakCount = memoryMetrics.leaks ? memoryMetrics.leaks.length : 0;
    
    let score = 100;
    
    if (isHigh) score -= 30;
    if (leakCount > 0) score -= (leakCount * 20);
    
    return Math.max(0, score);
  }
}

// Trend analysis utilities
class TrendAnalyzer {
  static analyzeTrend(historicalData: HistoricalDataPoint[], metric: MetricType): TrendAnalysis {
    if (!historicalData || historicalData.length < 2) {
      return { trend: 'stable', change: 0, confidence: 'low' };
    }

    const recentData = historicalData.slice(-10); // Last 10 data points
    const values = recentData.map(data => this.extractMetricValue(data, metric));
    
    if (values.length < 2) {
      return { trend: 'stable', change: 0, confidence: 'low' };
    }

    // Calculate linear regression to determine trend
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    
    // Determine trend direction and confidence
    const change = Math.abs(slope);
    let trend: TrendAnalysis['trend'] = 'stable';
    if (slope > 0.1) trend = 'improving';
    else if (slope < -0.1) trend = 'declining';
    
    let confidence: TrendAnalysis['confidence'] = 'low';
    if (rSquared > 0.7) confidence = 'high';
    else if (rSquared > 0.4) confidence = 'medium';
    
    return { trend, change, confidence, slope, rSquared };
  }

  static extractMetricValue(data: HistoricalDataPoint, metric: MetricType): number {
    switch (metric) {
      case 'overallScore':
        return data.overallScore || 0;
      case 'webVitals':
        return data.webVitals?.score?.overall || 0;
      case 'componentPerformance':
        return data.componentMetrics?.averageRenderTime || 0;
      case 'apiPerformance':
        return data.apiMetrics?.averageResponseTime || 0;
      case 'memoryUsage':
        return data.memoryMetrics?.current?.usedJSHeapSize || 0;
      default:
        return 0;
    }
  }
}

// Create the enhanced performance store
const performanceStoreCreator: StateCreator<
  PerformanceStore,
  [['zustand/subscribeWithSelector', never], ['zustand/persist', unknown]],
  [],
  PerformanceStore
> = (set, get) => ({
        // Core State
        metrics: {
          webVitals: null,
          componentMetrics: null,
          apiMetrics: null,
          memoryMetrics: null,
          overallScore: 0,
          timestamp: Date.now()
        },
        
        // Historical data for trend analysis
        historicalData: [],
        
        // Monitoring state
        isMonitoring: false,
        monitoringStartTime: null,
        monitoringInterval: null,
        
        // Dashboard state
        dashboardOpen: false,
        selectedTimeRange: '1h',
        selectedMetrics: ['overallScore', 'webVitals', 'componentPerformance', 'apiPerformance'],
        
        // Real-time updates
        lastUpdateTime: null,
        updateFrequency: 5000, // 5 seconds default
        
        // Performance insights
        insights: [],
        alerts: [],
        
        // Actions - Metrics Management
        updateMetrics: (newMetrics: Partial<PerformanceMetrics>) => {
          // No-op in production
          if (EnvironmentDetector.isProduction()) return;
          
          performanceErrorBoundary.safeExecute(() => {
            const state = get();
            const timestamp = Date.now();
            
            // Calculate overall score
            const overallScore = PerformanceScoreCalculator.calculateOverallScore(newMetrics);
            
            const updatedMetrics: PerformanceMetrics = {
              ...state.metrics,
              ...newMetrics,
              overallScore,
              timestamp
            };
            
            // Add to historical data
            const historicalEntry: HistoricalDataPoint = {
              ...updatedMetrics,
              id: `${timestamp}_${Math.random().toString(36).substr(2, 9)}`
            };
            
            const newHistoricalData = [...state.historicalData, historicalEntry];
            
            // Limit historical data size
            const limitedHistoricalData = newHistoricalData.length > PerformanceStorage.MAX_HISTORY_SIZE
              ? newHistoricalData.slice(-PerformanceStorage.MAX_HISTORY_SIZE)
              : newHistoricalData;
            
            // Generate insights based on new data
            const insights = get().generateInsights(updatedMetrics, limitedHistoricalData);
            
            set({
              metrics: updatedMetrics,
              historicalData: limitedHistoricalData,
              lastUpdateTime: timestamp,
              insights
            });
            
            // Persist to localStorage
            PerformanceStorage.save({
              metrics: updatedMetrics,
              historicalData: limitedHistoricalData.slice(-50), // Only persist last 50 entries
              timestamp
            });
          }, null, 'performance-store-update-metrics');
        },
        
        // Actions - Monitoring Control
        startMonitoring: () => {
          // No-op in production
          if (EnvironmentDetector.isProduction()) return;
          
          performanceErrorBoundary.safeExecute(() => {
            const state = get();
            if (state.isMonitoring) return;
            
            const startTime = Date.now();
            
            // Start memory monitoring
            memoryManager.startMemoryMonitoring(state.updateFrequency);
            
            // Start web vitals collection
            webVitalsCollector.reset();
            
            // Set up periodic metrics collection
            const intervalId = setInterval(() => {
              get().collectCurrentMetrics();
            }, state.updateFrequency);
            
            set({
              isMonitoring: true,
              monitoringStartTime: startTime,
              monitoringInterval: intervalId as any
            });
            
            // Initial metrics collection
            get().collectCurrentMetrics();
          }, null, 'performance-store-start-monitoring');
        },
        
        stopMonitoring: () => {
          const state = get();
          if (!state.isMonitoring) return;
          
          // Clear monitoring interval
          if (state.monitoringInterval) {
            clearInterval(state.monitoringInterval as any);
          }
          
          // Stop memory monitoring
          memoryManager.stopMemoryMonitoring();
          
          set({
            isMonitoring: false,
            monitoringStartTime: null,
            monitoringInterval: null
          });
        },
        
        // Actions - Dashboard Management
        toggleDashboard: () => {
          set((state) => ({ dashboardOpen: !state.dashboardOpen }));
        },
        
        openDashboard: () => {
          set({ dashboardOpen: true });
        },
        
        closeDashboard: () => {
          set({ dashboardOpen: false });
        },
        
        setSelectedTimeRange: (timeRange: TimeRange) => {
          set({ selectedTimeRange: timeRange });
        },
        
        setSelectedMetrics: (metrics: MetricType[]) => {
          set({ selectedMetrics: metrics });
        },
        
        setUpdateFrequency: (frequency: number) => {
          const state = get();
          set({ updateFrequency: frequency });
          
          // Restart monitoring with new frequency if currently monitoring
          if (state.isMonitoring) {
            state.stopMonitoring();
            setTimeout(() => state.startMonitoring(), 100);
          }
        },
        
        // Actions - Data Management
        clearHistory: () => {
          set({ historicalData: [], insights: [], alerts: [] });
          PerformanceStorage.cleanup();
        },
        
        clearMetrics: () => {
          set({
            metrics: {
              webVitals: null,
              componentMetrics: null,
              apiMetrics: null,
              memoryMetrics: null,
              overallScore: 0,
              timestamp: Date.now()
            },
            insights: [],
            alerts: []
          });
        },
        
        reset: () => {
          const state = get();
          state.stopMonitoring();
          set({
            metrics: {
              webVitals: null,
              componentMetrics: null,
              apiMetrics: null,
              memoryMetrics: null,
              overallScore: 0,
              timestamp: Date.now()
            },
            historicalData: [],
            isMonitoring: false,
            monitoringStartTime: null,
            monitoringInterval: null,
            dashboardOpen: false,
            selectedTimeRange: '1h',
            selectedMetrics: ['overallScore', 'webVitals', 'componentPerformance', 'apiPerformance'],
            lastUpdateTime: null,
            insights: [],
            alerts: []
          });
          PerformanceStorage.cleanup();
        },
        
        // Utility Actions
        collectCurrentMetrics: async () => {
          // No-op in production
          if (EnvironmentDetector.isProduction()) return;
          
          await performanceErrorBoundary.safeExecuteAsync(async () => {
            // Collect Web Vitals
            const rawWebVitals = webVitalsCollector.getVitals();
            
            // Transform raw web vitals to expected format
            const webVitals: WebVitalsData | null = rawWebVitals ? {
              lcp: rawWebVitals.lcp ? {
                name: 'LCP',
                value: rawWebVitals.lcp,
                rating: rawWebVitals.lcp <= 2500 ? 'good' : rawWebVitals.lcp <= 4000 ? 'needs-improvement' : 'poor',
                delta: 0,
                id: 'lcp-' + Date.now()
              } : null,
              fid: rawWebVitals.fid ? {
                name: 'FID',
                value: rawWebVitals.fid,
                rating: rawWebVitals.fid <= 100 ? 'good' : rawWebVitals.fid <= 300 ? 'needs-improvement' : 'poor',
                delta: 0,
                id: 'fid-' + Date.now()
              } : null,
              cls: rawWebVitals.cls ? {
                name: 'CLS',
                value: rawWebVitals.cls,
                rating: rawWebVitals.cls <= 0.1 ? 'good' : rawWebVitals.cls <= 0.25 ? 'needs-improvement' : 'poor',
                delta: 0,
                id: 'cls-' + Date.now()
              } : null,
              fcp: rawWebVitals.fcp ? {
                name: 'FCP',
                value: rawWebVitals.fcp,
                rating: rawWebVitals.fcp <= 1800 ? 'good' : rawWebVitals.fcp <= 3000 ? 'needs-improvement' : 'poor',
                delta: 0,
                id: 'fcp-' + Date.now()
              } : null,
              ttfb: rawWebVitals.ttfb ? {
                name: 'TTFB',
                value: rawWebVitals.ttfb,
                rating: rawWebVitals.ttfb <= 800 ? 'good' : rawWebVitals.ttfb <= 1800 ? 'needs-improvement' : 'poor',
                delta: 0,
                id: 'ttfb-' + Date.now()
              } : null,
              score: rawWebVitals.score ? {
                lcp: rawWebVitals.score.scores?.lcp || 0,
                fid: rawWebVitals.score.scores?.fid || 0,
                cls: rawWebVitals.score.scores?.cls || 0,
                fcp: rawWebVitals.score.scores?.fcp || 0,
                ttfb: rawWebVitals.score.scores?.ttfb || 0,
                overall: rawWebVitals.score.overall || 0
              } : {
                lcp: 0,
                fid: 0,
                cls: 0,
                fcp: 0,
                ttfb: 0,
                overall: 0
              }
            } : null;
            
            // Collect Memory Metrics
            const memoryStats = memoryManager.getMemoryStats();
            
            // Get component and API metrics from PerformanceTracker
            // Note: This would need to be imported and integrated
            const componentMetrics = null; // Will be integrated with PerformanceTracker
            const apiMetrics = null; // Will be integrated with PerformanceTracker
            
            const newMetrics: Partial<PerformanceMetrics> = {
              webVitals,
              componentMetrics,
              apiMetrics,
              memoryMetrics: memoryStats
            };
            
            get().updateMetrics(newMetrics);
          }, null, 'performance-store-collect-metrics');
        },
        
        generateInsights: (currentMetrics: PerformanceMetrics, historicalData: HistoricalDataPoint[]): PerformanceInsight[] => {
          const insights: PerformanceInsight[] = [];
          
          // Performance score insights
          if (currentMetrics.overallScore < 50) {
            insights.push({
              type: 'warning',
              category: 'performance',
              title: 'Low Performance Score',
              description: `Overall performance score is ${currentMetrics.overallScore}/100. Consider optimizing slow components and API calls.`,
              priority: 'high',
              timestamp: Date.now()
            });
          }
          
          // Memory insights
          if (currentMetrics.memoryMetrics?.isHigh) {
            insights.push({
              type: 'warning',
              category: 'memory',
              title: 'High Memory Usage',
              description: 'Memory usage is above threshold. Check for memory leaks and optimize data structures.',
              priority: 'medium',
              timestamp: Date.now()
            });
          }
          
          // Memory leak insights
          if (currentMetrics.memoryMetrics?.leaks && currentMetrics.memoryMetrics.leaks.length > 0) {
            insights.push({
              type: 'error',
              category: 'memory',
              title: 'Memory Leaks Detected',
              description: `${currentMetrics.memoryMetrics.leaks.length} potential memory leak(s) detected.`,
              priority: 'high',
              timestamp: Date.now()
            });
          }
          
          // Trend insights
          if (historicalData.length >= 5) {
            const overallTrend = TrendAnalyzer.analyzeTrend(historicalData, 'overallScore');
            if (overallTrend.trend === 'declining' && overallTrend.confidence === 'high') {
              insights.push({
                type: 'warning',
                category: 'trend',
                title: 'Performance Declining',
                description: 'Performance has been consistently declining over recent measurements.',
                priority: 'medium',
                timestamp: Date.now()
              });
            }
          }
          
          return insights;
        },
        
        // Computed Properties (Getters)
        getFilteredHistoricalData: (): HistoricalDataPoint[] => {
          const state = get();
          const now = Date.now();
          const timeRanges: Record<TimeRange, number> = {
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000
          };
          
          const cutoff = now - timeRanges[state.selectedTimeRange];
          return state.historicalData.filter(data => data.timestamp >= cutoff);
        },
        
        getTrendAnalysis: () => {
          const state = get();
          const filteredData = state.getFilteredHistoricalData();
          
          return {
            overallScore: TrendAnalyzer.analyzeTrend(filteredData, 'overallScore'),
            webVitals: TrendAnalyzer.analyzeTrend(filteredData, 'webVitals'),
            componentPerformance: TrendAnalyzer.analyzeTrend(filteredData, 'componentPerformance'),
            apiPerformance: TrendAnalyzer.analyzeTrend(filteredData, 'apiPerformance'),
            memoryUsage: TrendAnalyzer.analyzeTrend(filteredData, 'memoryUsage')
          };
        },
        
        getPerformanceScore: () => {
          const state = get();
          return {
            current: state.metrics.overallScore,
            status: state.metrics.overallScore >= 80 ? 'good' : 
                   state.metrics.overallScore >= 50 ? 'needs-improvement' : 'poor',
            breakdown: {
              webVitals: PerformanceScoreCalculator.calculateWebVitalsScore(state.metrics.webVitals),
              component: PerformanceScoreCalculator.calculateComponentScore(state.metrics.componentMetrics),
              api: PerformanceScoreCalculator.calculateApiScore(state.metrics.apiMetrics),
              memory: PerformanceScoreCalculator.calculateMemoryScore(state.metrics.memoryMetrics)
            }
          };
        }
});

export const usePerformanceStore = create<PerformanceStore>()(
  subscribeWithSelector(
    persist(performanceStoreCreator, {
      name: 'performance-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential data
        historicalData: state.historicalData.slice(-50), // Last 50 entries
        selectedTimeRange: state.selectedTimeRange,
        selectedMetrics: state.selectedMetrics,
        updateFrequency: state.updateFrequency
      }),
      onRehydrateStorage: () => (state) => {
        // Restore from localStorage on app start
        if (state) {
          const savedData = PerformanceStorage.load();
          if (savedData && savedData.historicalData) {
            state.historicalData = savedData.historicalData;
          }
          if (savedData && savedData.metrics) {
            state.metrics = savedData.metrics;
          }
        }
      }
    })
  )
);

// Export utilities for external use
export {
  PerformanceStorage,
  PerformanceScoreCalculator,
  TrendAnalyzer
};
