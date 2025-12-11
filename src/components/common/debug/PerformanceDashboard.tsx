import React, { useState, useEffect, useMemo } from 'react';
import { usePerformanceStore } from '../../../store/appStore';
import { 
  VirtualizedComponentList, 
  VirtualizedApiList, 
  VirtualizedHistoricalChart,
  ComponentMetric,
  ApiMetric
} from './VirtualizedPerformanceList';
import { PerformanceOptimizations } from '../../../utils/performance/PerformanceOptimizations';
import './PerformanceDashboard.css';

type TabType = 'overview' | 'components' | 'api' | 'memory' | 'insights';
type SortField = 'renderTime' | 'averageTime' | 'renderCount' | 'totalTime' | 'lastRender' | 'callCount' | 'errorRate';
type SortOrder = 'asc' | 'desc';
type VitalStatus = 'good' | 'needs-improvement' | 'poor' | 'unknown';
type PerformanceStatus = 'excellent' | 'good' | 'needs-improvement' | 'poor';

const PerformanceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sortBy, setSortBy] = useState<SortField>('renderTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const {
    // State
    metrics,
    isMonitoring,
    dashboardOpen,
    insights,
    selectedTimeRange,
    
    // Actions
    toggleDashboard,
    startMonitoring,
    stopMonitoring,
    setSelectedTimeRange,
    clearHistory,
    collectCurrentMetrics,
    
    // Computed
    getPerformanceScore,
    getFilteredHistoricalData,
    getTrendAnalysis
  } = usePerformanceStore();

  // Auto-start monitoring when dashboard opens
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && dashboardOpen && !isMonitoring) {
      startMonitoring();
    }
  }, [dashboardOpen, isMonitoring, startMonitoring]);

  // Refresh data periodically with throttling to reduce overhead
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && dashboardOpen && isMonitoring) {
      // Create throttled metrics collection to reduce dashboard overhead
      const throttledCollectMetrics = PerformanceOptimizations.createThrottledFunction(
        collectCurrentMetrics,
        { interval: 5000, key: 'dashboard-metrics-collection' }
      );
      
      const interval = setInterval(() => {
        throttledCollectMetrics();
      }, 5000);
      
      return () => {
        clearInterval(interval);
      };
    }
    
    // Return empty cleanup function when conditions aren't met
    return () => {};
  }, [dashboardOpen, isMonitoring, collectCurrentMetrics]);

  const performanceScore = getPerformanceScore();
  const trendAnalysis = getTrendAnalysis();
  const filteredData = getFilteredHistoricalData();

  // Sorted component metrics for display
  const sortedComponents = useMemo<ComponentMetric[]>(() => {
    if (!metrics.componentMetrics) return [];
    
    // If componentMetrics is a single metric, wrap it in an array
    const components: ComponentMetric[] = Array.isArray(metrics.componentMetrics)
      ? metrics.componentMetrics
      : [{
          name: metrics.componentMetrics.componentName || 'Unknown',
          averageTime: metrics.componentMetrics.averageRenderTime || 0,
          renderCount: metrics.componentMetrics.totalRenders || 0,
          totalTime: (metrics.componentMetrics.averageRenderTime || 0) * (metrics.componentMetrics.totalRenders || 0),
          lastRender: Date.now()
        }];
    return components.sort((a, b) => {
      const aValue = (a as any)[sortBy] || 0;
      const bValue = (b as any)[sortBy] || 0;
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  }, [metrics.componentMetrics, sortBy, sortOrder]);

  // Sorted API metrics for display
  const sortedApis = useMemo<ApiMetric[]>(() => {
    if (!metrics.apiMetrics || !(metrics.apiMetrics as any).responseTimes) return [];
    
    const responseTimes = (metrics.apiMetrics as any).responseTimes;
    const errorRates = (metrics.apiMetrics as any).errorRates;
    
    const apis = Array.from(responseTimes.entries()).map((entry: any) => {
      const [endpoint, times] = entry as [string, number[]];
      return {
        endpoint,
        averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
        callCount: times.length,
        totalTime: times.reduce((sum, time) => sum + time, 0),
        errorRate: errorRates?.get(endpoint) || 0
      };
    });
    
    return apis.sort((a, b) => {
      const aValue = (a as any)[sortBy] || 0;
      const bValue = (b as any)[sortBy] || 0;
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  }, [metrics.apiMetrics, sortBy, sortOrder]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const formatTime = (time: number | undefined): string => {
    if (!time) return 'N/A';
    if (time < 1000) return `${time.toFixed(1)}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const formatMemory = (bytes: number | undefined): string => {
    if (!bytes) return 'N/A';
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#4CAF50';
    if (score >= 70) return '#FF9800';
    return '#F44336';
  };

  const getVitalStatus = (metric: string, value: number | undefined): VitalStatus => {
    if (!value) return 'unknown';
    
    const thresholds: Record<string, { good: number; poor: number }> = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1800, poor: 3000 },
      ttfb: { good: 800, poor: 1800 }
    };
    
    const threshold = thresholds[metric];
    if (!threshold) return 'unknown';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const getStatusColor = (status: VitalStatus): string => {
    switch (status) {
      case 'good': return '#4CAF50';
      case 'needs-improvement': return '#FF9800';
      case 'poor': return '#F44336';
      default: return '#666';
    }
  };

  const renderPerformanceScore = (): React.JSX.Element => (
    <div className="performance-score-section">
      <div className="score-circle-container">
        <div 
          className="score-circle"
          style={{ 
            background: `conic-gradient(${getScoreColor(performanceScore.current)} ${performanceScore.current * 3.6}deg, #333 0deg)` 
          }}
        >
          <div className="score-inner">
            <span className="score-number">{performanceScore.current}</span>
            <span className="score-label">Score</span>
          </div>
        </div>
        <div className="score-status">
          <span className={`status-badge ${performanceScore.status}`}>
            {performanceScore.status.replace('-', ' ')}
          </span>
        </div>
      </div>
      
      <div className="score-breakdown">
        <h4>Score Breakdown</h4>
        <div className="breakdown-items">
          {Object.entries(performanceScore.breakdown).map(([metric, score]) => (
            score !== null && (
              <div key={metric} className="breakdown-item">
                <span className="breakdown-label">{metric}</span>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill"
                    style={{ 
                      width: `${score}%`,
                      backgroundColor: getScoreColor(score)
                    }}
                  />
                </div>
                <span className="breakdown-value">{score}</span>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );

  const renderWebVitals = (): React.JSX.Element => (
    <div className="web-vitals-section">
      <h4>Core Web Vitals</h4>
      <div className="vitals-grid">
        {metrics.webVitals && Object.entries(metrics.webVitals).map(([vital, value]) => {
          if (vital === 'score') return null;
          
          const status = getVitalStatus(vital, value as number);
          const statusColor = getStatusColor(status);
          
          return (
            <div key={vital} className="vital-item">
              <div className="vital-header">
                <span className="vital-name">{vital.toUpperCase()}</span>
                <div 
                  className="vital-status-indicator"
                  style={{ backgroundColor: statusColor }}
                />
              </div>
              <div className="vital-value">
                {vital === 'cls' ? ((value as number)?.toFixed(3) || 'N/A') : formatTime(value as number)}
              </div>
              <div className="vital-status">{status.replace('-', ' ')}</div>
            </div>
          );
        })}
      </div>
      
      {metrics.webVitals?.score && (
        <div className="vitals-trend">
          <h5>Web Vitals Trend</h5>
          <div className="trend-indicator">
            <span className={`trend-arrow ${trendAnalysis.webVitals?.trend || 'stable'}`}>
              {trendAnalysis.webVitals?.trend === 'improving' ? '↗' : 
               trendAnalysis.webVitals?.trend === 'declining' ? '↘' : '→'}
            </span>
            <span className="trend-text">
              {trendAnalysis.webVitals?.trend || 'stable'} 
              ({trendAnalysis.webVitals?.confidence || 'low'} confidence)
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderComponentMetrics = (): React.JSX.Element => (
    <div className="component-metrics-section">
      <h4>Component Performance</h4>
      {sortedComponents.length > 0 ? (
        <VirtualizedComponentList
          components={sortedComponents}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(newSortBy, newSortOrder) => {
            setSortBy(newSortBy as SortField);
            setSortOrder(newSortOrder);
          }}
          containerHeight={400}
          itemHeight={60}
        />
      ) : (
        <div className="no-data">No component metrics available</div>
      )}
    </div>
  );

  const renderApiMetrics = (): React.JSX.Element => (
    <div className="api-metrics-section">
      <h4>API Performance</h4>
      {sortedApis.length > 0 ? (
        <VirtualizedApiList
          apis={sortedApis}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(newSortBy, newSortOrder) => {
            setSortBy(newSortBy as SortField);
            setSortOrder(newSortOrder);
          }}
          containerHeight={400}
          itemHeight={60}
        />
      ) : (
        <div className="no-data">No API metrics available</div>
      )}
      
      {filteredData.length > 1 && (
        <div className="api-chart">
          <h5>Response Time Trend</h5>
          <VirtualizedHistoricalChart
            data={filteredData as any}
            metric="apiPerformance"
            containerHeight={200}
            maxDataPoints={50}
          />
        </div>
      )}
    </div>
  );

  const renderMemoryMetrics = (): React.JSX.Element => (
    <div className="memory-metrics-section">
      <h4>Memory Usage</h4>
      
      <div className="memory-overview">
        <div className="memory-stats">
          <div className="memory-stat">
            <span className="stat-label">Current</span>
            <span className="stat-value">
              {formatMemory(metrics.memoryMetrics?.current?.usedJSHeapSize)}
            </span>
          </div>
          <div className="memory-stat">
            <span className="stat-label">Peak</span>
            <span className="stat-value">
              {formatMemory(metrics.memoryMetrics?.peak?.usedJSHeapSize)}
            </span>
          </div>
          <div className="memory-stat">
            <span className="stat-label">Limit</span>
            <span className="stat-value">
              {formatMemory(metrics.memoryMetrics?.current?.jsHeapSizeLimit)}
            </span>
          </div>
        </div>
        
        {metrics.memoryMetrics?.isHigh && (
          <div className="memory-warning">
            ⚠️ High memory usage detected
          </div>
        )}
      </div>
      
      {(metrics.memoryMetrics as any)?.trends && (metrics.memoryMetrics as any).trends.length > 1 && (
        <div className="memory-trend-chart">
          <h5>Memory Trend</h5>
          <div className="chart-container">
            <div className="trend-line">
              {(metrics.memoryMetrics as any).trends.slice(-20).map((trend: any, index: number) => (
                <div 
                  key={index}
                  className="trend-point"
                  style={{
                    height: `${Math.min(100, (trend.memoryUsage / (metrics.memoryMetrics?.current?.jsHeapSizeLimit || 100000000)) * 100)}%`,
                    backgroundColor: trend.trend === 'increasing' ? '#F44336' : 
                                   trend.trend === 'decreasing' ? '#4CAF50' : '#FF9800'
                  }}
                  title={`${formatMemory(trend.memoryUsage)} (${trend.trend})`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
      {(metrics.memoryMetrics as any)?.leaks && (metrics.memoryMetrics as any).leaks.length > 0 && (
        <div className="memory-leaks">
          <h5>⚠️ Memory Leaks Detected</h5>
          {(metrics.memoryMetrics as any).leaks.map((leak: any, index: number) => (
            <div key={index} className={`leak-item ${leak.severity || 'medium'}`}>
              <div className="leak-header">
                <span className="leak-type">{leak.type || 'Unknown'}</span>
                <span className="leak-severity">{leak.severity || 'medium'}</span>
              </div>
              <div className="leak-description">{leak.description || 'Memory leak detected'}</div>
              {leak.recommendations && (
                <div className="leak-recommendations">
                  {leak.recommendations.slice(0, 2).map((rec: string, i: number) => (
                    <div key={i} className="recommendation">• {rec}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPerformanceTips = (): React.JSX.Element => (
    <div className="performance-tips-section">
      <h4>Performance Insights</h4>
      
      <div className="insights-list">
        {insights.length > 0 ? (
          insights.map((insight, index) => (
            <div key={index} className={`insight-item ${insight.type} ${insight.priority}`}>
              <div className="insight-header">
                <span className="insight-icon">
                  {insight.type === 'error' ? '🚨' : 
                   insight.type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span className="insight-title">{insight.title}</span>
                <span className="insight-priority">{insight.priority}</span>
              </div>
              <div className="insight-description">{insight.description}</div>
            </div>
          ))
        ) : (
          <div className="no-insights">
            <div className="success-message">
              ✅ No performance issues detected. Great job!
            </div>
          </div>
        )}
      </div>
      
      <div className="general-tips">
        <h5>General Optimization Tips</h5>
        <div className="tips-grid">
          <div className="tip-item">
            <span className="tip-icon">🚀</span>
            <span className="tip-text">Use React.memo() for expensive components</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">📦</span>
            <span className="tip-text">Implement code splitting for large bundles</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🔄</span>
            <span className="tip-text">Add caching for frequently accessed data</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🧹</span>
            <span className="tip-text">Clean up event listeners and subscriptions</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Performance Monitor Toggle */}
      <button 
        className="performance-monitor-toggle"
        onClick={toggleDashboard}
        title="Performance Monitor (Dev Only)"
      >
        <span className="toggle-icon">⚡</span>
        <span className="toggle-score">{performanceScore.current}</span>
        <span className="toggle-status">{isMonitoring ? '●' : '○'}</span>
      </button>

      {/* Performance Dashboard Panel */}
      {dashboardOpen && (
        <div className="performance-dashboard-panel">
          <div className="performance-dashboard-header">
            <h3>⚡ Performance Dashboard</h3>
            <div className="dashboard-controls">
              <select 
                value={selectedTimeRange} 
                onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                className="time-range-select"
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
              </select>
              <button 
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
                className={`monitoring-btn ${isMonitoring ? 'active' : ''}`}
                title={isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              >
                {isMonitoring ? '⏸' : '▶'}
              </button>
              <button onClick={clearHistory} title="Clear History" className="clear-btn">
                🗑
              </button>
              <button onClick={toggleDashboard} title="Close" className="close-btn">
                ✕
              </button>
            </div>
          </div>

          <div className="performance-dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'components' ? 'active' : ''}`}
              onClick={() => setActiveTab('components')}
            >
              Components
            </button>
            <button 
              className={`tab-btn ${activeTab === 'api' ? 'active' : ''}`}
              onClick={() => setActiveTab('api')}
            >
              API
            </button>
            <button 
              className={`tab-btn ${activeTab === 'memory' ? 'active' : ''}`}
              onClick={() => setActiveTab('memory')}
            >
              Memory
            </button>
            <button 
              className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              Insights
            </button>
          </div>

          <div className="performance-dashboard-content">
            {activeTab === 'overview' && (
              <div className="overview-tab">
                {renderPerformanceScore()}
                {renderWebVitals()}
              </div>
            )}
            
            {activeTab === 'components' && renderComponentMetrics()}
            {activeTab === 'api' && renderApiMetrics()}
            {activeTab === 'memory' && renderMemoryMetrics()}
            {activeTab === 'insights' && renderPerformanceTips()}
          </div>
        </div>
      )}
    </>
  );
};

export default PerformanceDashboard;
