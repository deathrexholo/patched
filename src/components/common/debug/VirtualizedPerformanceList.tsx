/**
 * Virtualized Performance List Component
 * 
 * Optimizes dashboard rendering performance by virtualizing large lists
 * of performance data, rendering only visible items.
 * 
 * Requirements: 7.3, 7.4 - Dashboard rendering optimization
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface VisibleRange {
  startIndex: number;
  endIndex: number;
}

interface VisibleItem<T> extends Record<string, unknown> {
  index: number;
  top: number;
}

interface VirtualListResult<T> {
  visibleItems: (T & VisibleItem<T>)[];
  totalHeight: number;
  setScrollTop: (scrollTop: number) => void;
  visibleRange: VisibleRange;
}

/**
 * Virtual List Hook for performance optimization
 */
const useVirtualList = <T extends any>(
  items: T[], 
  itemHeight: number, 
  containerHeight: number, 
  overscan = 5
): VirtualListResult<T> => {
  const [scrollTop, setScrollTop] = useState<number>(0);
  
  const visibleRange = useMemo<VisibleRange>(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      ...item as any,
      index: visibleRange.startIndex + index,
      top: (visibleRange.startIndex + index) * itemHeight
    }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  return {
    visibleItems,
    totalHeight,
    setScrollTop,
    visibleRange
  };
};

interface ComponentMetric {
  name: string;
  averageTime: number;
  renderCount: number;
  totalTime: number;
  lastRender: number;
}

interface VirtualizedComponentListProps {
  components: ComponentMetric[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  containerHeight?: number;
  itemHeight?: number;
}

/**
 * Virtualized Component List
 */
const VirtualizedComponentList: React.FC<VirtualizedComponentListProps> = ({ 
  components, 
  sortBy, 
  sortOrder, 
  onSort,
  containerHeight = 300,
  itemHeight = 60 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { visibleItems, totalHeight, setScrollTop } = useVirtualList(
    components, 
    itemHeight, 
    containerHeight
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, [setScrollTop]);

  const formatTime = (time: number | undefined): string => {
    if (!time) return 'N/A';
    if (time < 1000) return `${time.toFixed(1)}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const getPerformanceColor = (averageTime: number): string => {
    if (averageTime <= 8) return '#4CAF50';   // Green - Excellent
    if (averageTime <= 16) return '#8BC34A';  // Light Green - Good
    if (averageTime <= 32) return '#FF9800';  // Orange - Fair
    if (averageTime <= 50) return '#FF5722';  // Deep Orange - Poor
    return '#F44336'; // Red - Very Poor
  };

  return (
    <div className="virtualized-component-list">
      <div className="list-header">
        <div className="sort-controls">
          <select 
            value={sortBy} 
            onChange={(e) => onSort(e.target.value, sortOrder)}
            className="sort-select"
          >
            <option value="averageTime">Avg Time</option>
            <option value="renderCount">Render Count</option>
            <option value="totalTime">Total Time</option>
            <option value="lastRender">Last Render</option>
          </select>
          <button 
            onClick={() => onSort(sortBy, sortOrder === 'desc' ? 'asc' : 'desc')}
            className="sort-order-btn"
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
        <div className="list-stats">
          {components.length} components
        </div>
      </div>

      <div 
        ref={containerRef}
        className="virtual-list-container"
        style={{ height: containerHeight, overflow: 'auto' }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map((component) => (
            <div
              key={`${component.name}-${component.index}`}
              className="virtual-component-item"
              style={{
                position: 'absolute',
                top: component.top,
                left: 0,
                right: 0,
                height: itemHeight,
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                borderBottom: '1px solid #333',
                backgroundColor: component.index % 2 === 0 ? '#1a1a1a' : '#222'
              }}
            >
              <div className="component-info" style={{ flex: 1 }}>
                <div className="component-name" style={{ 
                  fontWeight: 'bold', 
                  color: '#fff',
                  fontSize: '14px',
                  marginBottom: '2px'
                }}>
                  {component.name}
                </div>
                <div className="component-renders" style={{ 
                  fontSize: '12px', 
                  color: '#888' 
                }}>
                  {component.renderCount} renders
                </div>
              </div>
              
              <div className="component-metrics" style={{ 
                display: 'flex', 
                gap: '16px',
                alignItems: 'center'
              }}>
                <div className="metric">
                  <div style={{ fontSize: '10px', color: '#666' }}>AVG</div>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    color: getPerformanceColor(component.averageTime)
                  }}>
                    {formatTime(component.averageTime)}
                  </div>
                </div>
                <div className="metric">
                  <div style={{ fontSize: '10px', color: '#666' }}>TOTAL</div>
                  <div style={{ fontSize: '12px', color: '#ccc' }}>
                    {formatTime(component.totalTime)}
                  </div>
                </div>
              </div>

              <div className="performance-indicator" style={{
                width: '60px',
                height: '4px',
                backgroundColor: '#333',
                borderRadius: '2px',
                overflow: 'hidden',
                marginLeft: '12px'
              }}>
                <div 
                  style={{
                    width: `${Math.min(100, (component.averageTime / 50) * 100)}%`,
                    height: '100%',
                    backgroundColor: getPerformanceColor(component.averageTime),
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ApiMetric {
  endpoint: string;
  averageTime: number;
  callCount: number;
  totalTime: number;
  errorRate: number;
}

interface VirtualizedApiListProps {
  apis: ApiMetric[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  containerHeight?: number;
  itemHeight?: number;
}

/**
 * Virtualized API List
 */
const VirtualizedApiList: React.FC<VirtualizedApiListProps> = ({ 
  apis, 
  sortBy, 
  sortOrder, 
  onSort,
  containerHeight = 300,
  itemHeight = 60 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { visibleItems, totalHeight, setScrollTop } = useVirtualList(
    apis, 
    itemHeight, 
    containerHeight
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, [setScrollTop]);

  const formatTime = (time: number | undefined): string => {
    if (!time) return 'N/A';
    if (time < 1000) return `${time.toFixed(1)}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const getResponseTimeColor = (responseTime: number): string => {
    if (responseTime <= 200) return '#4CAF50';   // Green - Excellent
    if (responseTime <= 500) return '#8BC34A';   // Light Green - Good
    if (responseTime <= 1000) return '#FF9800';  // Orange - Fair
    if (responseTime <= 2000) return '#FF5722';  // Deep Orange - Poor
    return '#F44336'; // Red - Very Poor
  };

  const getErrorRateColor = (errorRate: number): string => {
    if (errorRate === 0) return '#4CAF50';       // Green - No errors
    if (errorRate <= 1) return '#8BC34A';        // Light Green - Low
    if (errorRate <= 5) return '#FF9800';        // Orange - Medium
    if (errorRate <= 10) return '#FF5722';       // Deep Orange - High
    return '#F44336'; // Red - Very High
  };

  return (
    <div className="virtualized-api-list">
      <div className="list-header">
        <div className="sort-controls">
          <select 
            value={sortBy} 
            onChange={(e) => onSort(e.target.value, sortOrder)}
            className="sort-select"
          >
            <option value="averageTime">Avg Time</option>
            <option value="callCount">Call Count</option>
            <option value="errorRate">Error Rate</option>
          </select>
          <button 
            onClick={() => onSort(sortBy, sortOrder === 'desc' ? 'asc' : 'desc')}
            className="sort-order-btn"
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
        <div className="list-stats">
          {apis.length} endpoints
        </div>
      </div>

      <div 
        ref={containerRef}
        className="virtual-list-container"
        style={{ height: containerHeight, overflow: 'auto' }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map((api) => (
            <div
              key={`${api.endpoint}-${api.index}`}
              className="virtual-api-item"
              style={{
                position: 'absolute',
                top: api.top,
                left: 0,
                right: 0,
                height: itemHeight,
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                borderBottom: '1px solid #333',
                backgroundColor: api.index % 2 === 0 ? '#1a1a1a' : '#222'
              }}
            >
              <div className="api-info" style={{ flex: 1 }}>
                <div className="api-endpoint" style={{ 
                  fontWeight: 'bold', 
                  color: '#fff',
                  fontSize: '14px',
                  marginBottom: '2px',
                  fontFamily: 'monospace'
                }}>
                  {api.endpoint}
                </div>
                <div className="api-calls" style={{ 
                  fontSize: '12px', 
                  color: '#888' 
                }}>
                  {api.callCount} calls
                </div>
              </div>
              
              <div className="api-metrics" style={{ 
                display: 'flex', 
                gap: '16px',
                alignItems: 'center'
              }}>
                <div className="metric">
                  <div style={{ fontSize: '10px', color: '#666' }}>AVG</div>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    color: getResponseTimeColor(api.averageTime)
                  }}>
                    {formatTime(api.averageTime)}
                  </div>
                </div>
                <div className="metric">
                  <div style={{ fontSize: '10px', color: '#666' }}>ERRORS</div>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    color: getErrorRateColor(api.errorRate)
                  }}>
                    {api.errorRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="performance-indicator" style={{
                width: '60px',
                height: '4px',
                backgroundColor: '#333',
                borderRadius: '2px',
                overflow: 'hidden',
                marginLeft: '12px'
              }}>
                <div 
                  style={{
                    width: `${Math.min(100, (api.averageTime / 2000) * 100)}%`,
                    height: '100%',
                    backgroundColor: getResponseTimeColor(api.averageTime),
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface HistoricalDataPoint {
  timestamp: number;
  overallScore?: number;
  webVitals?: {
    score?: {
      overall?: number;
    };
  };
  memoryMetrics?: {
    current?: {
      usedJSHeapSize?: number;
    };
  };
}

interface ChartDataPoint extends HistoricalDataPoint {
  index: number;
  value: number;
  normalizedValue: number;
  x: number;
  y: number;
}

interface VirtualizedHistoricalChartProps {
  data: HistoricalDataPoint[];
  metric?: 'overallScore' | 'webVitals' | 'memory' | 'apiPerformance';
  containerHeight?: number;
  maxDataPoints?: number;
}

/**
 * Virtualized Historical Data Chart
 */
const VirtualizedHistoricalChart: React.FC<VirtualizedHistoricalChartProps> = ({ 
  data, 
  metric = 'overallScore',
  containerHeight = 200,
  maxDataPoints = 100 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    const updateWidth = (): void => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!data || data.length === 0) return [];
    
    // Sample data if too many points
    const sampledData = data.length > maxDataPoints 
      ? data.filter((_, index) => index % Math.ceil(data.length / maxDataPoints) === 0)
      : data;

    const values = sampledData.map(d => {
      switch (metric) {
        case 'overallScore':
          return d.overallScore || 0;
        case 'webVitals':
          return d.webVitals?.score?.overall || 0;
        case 'memory':
          return d.memoryMetrics?.current?.usedJSHeapSize || 0;
        default:
          return 0;
      }
    });

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    return sampledData.map((d, index) => ({
      ...d,
      index,
      value: values[index],
      normalizedValue: (values[index] - minValue) / range,
      x: (index / (sampledData.length - 1)) * containerWidth,
      y: containerHeight - ((values[index] - minValue) / range) * (containerHeight - 20)
    }));
  }, [data, metric, containerWidth, containerHeight, maxDataPoints]);

  const pathData = useMemo<string>(() => {
    if (chartData.length < 2) return '';
    
    let path = `M ${chartData[0].x} ${chartData[0].y}`;
    for (let i = 1; i < chartData.length; i++) {
      path += ` L ${chartData[i].x} ${chartData[i].y}`;
    }
    return path;
  }, [chartData]);

  return (
    <div 
      ref={containerRef}
      className="virtualized-chart"
      style={{ 
        height: containerHeight, 
        width: '100%', 
        position: 'relative',
        backgroundColor: '#1a1a1a',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      {containerWidth > 0 && chartData.length > 1 && (
        <svg 
          width={containerWidth} 
          height={containerHeight}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4CAF50" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <line
              key={ratio}
              x1="0"
              y1={containerHeight * ratio}
              x2={containerWidth}
              y2={containerHeight * ratio}
              stroke="#333"
              strokeWidth="1"
              opacity="0.3"
            />
          ))}
          
          {/* Chart line */}
          <path
            d={pathData}
            fill="none"
            stroke="#4CAF50"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Fill area */}
          <path
            d={`${pathData} L ${chartData[chartData.length - 1].x} ${containerHeight} L ${chartData[0].x} ${containerHeight} Z`}
            fill="url(#chartGradient)"
          />
          
          {/* Data points */}
          {chartData.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="#4CAF50"
              stroke="#fff"
              strokeWidth="1"
            >
              <title>
                {`${metric}: ${point.value} at ${new Date(point.timestamp).toLocaleTimeString()}`}
              </title>
            </circle>
          ))}
        </svg>
      )}
      
      {chartData.length === 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#666',
          fontSize: '14px'
        }}>
          No data available
        </div>
      )}
    </div>
  );
};

export {
  VirtualizedComponentList,
  VirtualizedApiList,
  VirtualizedHistoricalChart,
  useVirtualList
};

export type {
  ComponentMetric,
  ApiMetric,
  HistoricalDataPoint,
  VirtualizedComponentListProps,
  VirtualizedApiListProps,
  VirtualizedHistoricalChartProps
};
