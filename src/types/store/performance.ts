/**
 * Type definitions for Enhanced Performance Store
 * 
 * Provides comprehensive type definitions for performance monitoring,
 * metrics collection, trend analysis, and dashboard management.
 */

// ============================================================================
// Web Vitals Types
// ============================================================================

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

export interface WebVitalsScore {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
  overall: number;
}

export interface WebVitalsData {
  lcp: WebVitalsMetric | null;
  fid: WebVitalsMetric | null;
  cls: WebVitalsMetric | null;
  fcp: WebVitalsMetric | null;
  ttfb: WebVitalsMetric | null;
  score: WebVitalsScore;
}

// ============================================================================
// Component Performance Types
// ============================================================================

export interface ComponentMetrics {
  totalRenders: number;
  averageRenderTime: number;
  slowestRender: number;
  fastestRender: number;
  componentName?: string;
}

// ============================================================================
// API Performance Types
// ============================================================================

export interface ApiMetrics {
  totalCalls: number;
  averageResponseTime: number;
  slowestCall: number;
  fastestCall: number;
  overallErrorRate: number;
  endpointStats?: Record<string, {
    calls: number;
    avgTime: number;
    errors: number;
  }>;
}

// ============================================================================
// Memory Performance Types
// ============================================================================

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface MemoryLeak {
  id: string;
  timestamp: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface MemoryMetrics {
  current: MemoryInfo | null;
  peak: MemoryInfo | null;
  isHigh: boolean;
  leaks: MemoryLeak[];
  trend?: 'increasing' | 'stable' | 'decreasing';
}

// ============================================================================
// Performance Metrics Types
// ============================================================================

export interface PerformanceMetrics {
  webVitals: WebVitalsData | null;
  componentMetrics: ComponentMetrics | null;
  apiMetrics: ApiMetrics | null;
  memoryMetrics: MemoryMetrics | null;
  overallScore: number;
  timestamp: number;
}

// ============================================================================
// Historical Data Types
// ============================================================================

export interface HistoricalDataPoint extends PerformanceMetrics {
  id: string;
}

// ============================================================================
// Insights and Alerts Types
// ============================================================================

export type InsightType = 'info' | 'warning' | 'error' | 'success';
export type InsightCategory = 'performance' | 'memory' | 'api' | 'component' | 'trend';
export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

export interface PerformanceInsight {
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  priority: InsightPriority;
  timestamp: number;
  actionable?: boolean;
  action?: string;
}

export interface PerformanceAlert extends PerformanceInsight {
  acknowledged: boolean;
  dismissible: boolean;
}

// ============================================================================
// Trend Analysis Types
// ============================================================================

export type TrendDirection = 'improving' | 'stable' | 'declining';
export type TrendConfidence = 'low' | 'medium' | 'high';

export interface TrendAnalysis {
  trend: TrendDirection;
  change: number;
  confidence: TrendConfidence;
  slope?: number;
  rSquared?: number;
}

export interface TrendAnalysisResult {
  overallScore: TrendAnalysis;
  webVitals: TrendAnalysis;
  componentPerformance: TrendAnalysis;
  apiPerformance: TrendAnalysis;
  memoryUsage: TrendAnalysis;
}

// ============================================================================
// Performance Score Types
// ============================================================================

export type PerformanceStatus = 'good' | 'needs-improvement' | 'poor';

export interface PerformanceScoreBreakdown {
  webVitals: number | null;
  component: number | null;
  api: number | null;
  memory: number | null;
}

export interface PerformanceScore {
  current: number;
  status: PerformanceStatus;
  breakdown: PerformanceScoreBreakdown;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export type TimeRange = '1h' | '6h' | '24h' | '7d';
export type MetricType = 'overallScore' | 'webVitals' | 'componentPerformance' | 'apiPerformance' | 'memoryUsage';

// ============================================================================
// Performance Store State
// ============================================================================

export interface PerformanceState {
  // Core metrics
  metrics: PerformanceMetrics;
  
  // Historical data
  historicalData: HistoricalDataPoint[];
  
  // Monitoring state
  isMonitoring: boolean;
  monitoringStartTime: number | null;
  monitoringInterval: NodeJS.Timeout | null;
  
  // Dashboard state
  dashboardOpen: boolean;
  selectedTimeRange: TimeRange;
  selectedMetrics: MetricType[];
  
  // Real-time updates
  lastUpdateTime: number | null;
  updateFrequency: number;
  
  // Insights and alerts
  insights: PerformanceInsight[];
  alerts: PerformanceAlert[];
}

// ============================================================================
// Performance Store Actions
// ============================================================================

export interface PerformanceActions {
  // Metrics management
  updateMetrics: (newMetrics: Partial<PerformanceMetrics>) => void;
  
  // Monitoring control
  startMonitoring: () => void;
  stopMonitoring: () => void;
  
  // Dashboard management
  toggleDashboard: () => void;
  openDashboard: () => void;
  closeDashboard: () => void;
  setSelectedTimeRange: (timeRange: TimeRange) => void;
  setSelectedMetrics: (metrics: MetricType[]) => void;
  setUpdateFrequency: (frequency: number) => void;
  
  // Data management
  clearHistory: () => void;
  clearMetrics: () => void;
  reset: () => void;
  
  // Utility actions
  collectCurrentMetrics: () => Promise<void>;
  generateInsights: (currentMetrics: PerformanceMetrics, historicalData: HistoricalDataPoint[]) => PerformanceInsight[];
  
  // Computed properties (getters)
  getFilteredHistoricalData: () => HistoricalDataPoint[];
  getTrendAnalysis: () => TrendAnalysisResult;
  getPerformanceScore: () => PerformanceScore;
}

// ============================================================================
// Combined Performance Store Type
// ============================================================================

export type PerformanceStore = PerformanceState & PerformanceActions;

// ============================================================================
// Storage Types
// ============================================================================

export interface PerformanceStorageData {
  metrics: PerformanceMetrics;
  historicalData: HistoricalDataPoint[];
  timestamp: number;
}

// ============================================================================
// Utility Types for Store Creation
// ============================================================================

export type PerformanceStoreCreator = (
  set: (partial: Partial<PerformanceState> | ((state: PerformanceState) => Partial<PerformanceState>)) => void,
  get: () => PerformanceStore
) => PerformanceStore;
