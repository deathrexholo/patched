/**
 * Search Analytics Dashboard Component
 * Displays comprehensive search analytics with charts and metrics
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Search, 
  AlertTriangle, 
  Clock, 
  Users,
  Filter,
  Download,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { searchAnalyticsService, SearchAnalytics, SearchPerformanceMetrics } from '../../services/search/searchAnalyticsService';
import AnalyticsExportDialog from './AnalyticsExportDialog';
import './SearchAnalyticsDashboard.css';

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface ChartDataPoint {
  date: string;
  count: number;
  x: number;
  y: number;
}

const SearchAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<SearchPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
    label: 'Last 30 days'
  });
  const [showExportDialog, setShowExportDialog] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  // Date range options
  const dateRangeOptions: DateRange[] = [
    {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
      label: 'Last 7 days'
    },
    {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
      label: 'Last 30 days'
    },
    {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: new Date(),
      label: 'Last 90 days'
    }
  ];

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [analyticsData, performanceData] = await Promise.all([
        searchAnalyticsService.getSearchAnalytics(selectedDateRange),
        searchAnalyticsService.getPerformanceMetrics(selectedDateRange)
      ]);

      setAnalytics(analyticsData);
      setPerformanceMetrics(performanceData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Handle chart resize
  useEffect(() => {
    const updateChartWidth = () => {
      if (chartRef.current) {
        setChartWidth(chartRef.current.offsetWidth);
      }
    };

    updateChartWidth();
    window.addEventListener('resize', updateChartWidth);
    return () => window.removeEventListener('resize', updateChartWidth);
  }, []);

  // Load data when date range changes
  useEffect(() => {
    loadAnalytics();
  }, [selectedDateRange]);

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setSelectedDateRange(range);
  };

  // Handle export
  const handleExport = () => {
    setShowExportDialog(true);
  };

  // Prepare chart data
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!analytics || !analytics.searchTrends || chartWidth === 0) return [];

    const trends = analytics.searchTrends.slice(0, 30); // Last 30 days
    if (trends.length === 0) return [];

    const maxCount = Math.max(...trends.map(t => t.count));
    const chartHeight = 120;
    const padding = 20;

    return trends.map((trend, index) => ({
      date: trend.date,
      count: trend.count,
      x: (index / (trends.length - 1)) * (chartWidth - padding * 2) + padding,
      y: chartHeight - padding - ((trend.count / maxCount) * (chartHeight - padding * 2))
    }));
  }, [analytics, chartWidth]);

  // Generate chart path
  const chartPath = useMemo(() => {
    if (chartData.length < 2) return '';
    
    let path = `M ${chartData[0].x} ${chartData[0].y}`;
    for (let i = 1; i < chartData.length; i++) {
      path += ` L ${chartData[i].x} ${chartData[i].y}`;
    }
    return path;
  }, [chartData]);

  if (loading) {
    return (
      <div className="search-analytics-dashboard loading">
        <div className="loading-spinner">
          <RefreshCw className="animate-spin" size={24} />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-analytics-dashboard error">
        <div className="error-message">
          <AlertTriangle size={24} />
          <span>{error}</span>
          <button onClick={loadAnalytics} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="search-analytics-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-title">
          <BarChart3 size={24} />
          <h2>Search Analytics</h2>
        </div>
        
        <div className="header-controls">
          {/* Date Range Selector */}
          <div className="date-range-selector">
            <Calendar size={16} />
            <select 
              value={selectedDateRange.label}
              onChange={(e) => {
                const range = dateRangeOptions.find(r => r.label === e.target.value);
                if (range) handleDateRangeChange(range);
              }}
            >
              {dateRangeOptions.map(range => (
                <option key={range.label} value={range.label}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <button 
            onClick={handleExport}
            className="export-button"
          >
            <Download size={16} />
            Export Data
          </button>

          {/* Refresh Button */}
          <button onClick={loadAnalytics} className="refresh-button">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <Search size={20} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{analytics?.totalSearches?.toLocaleString() || 0}</div>
            <div className="metric-label">Total Searches</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <Clock size={20} />
          </div>
          <div className="metric-content">
            <div className="metric-value">{analytics?.averageResponseTime || 0}ms</div>
            <div className="metric-label">Avg Response Time</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <TrendingUp size={20} />
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {performanceMetrics ? (performanceMetrics.cacheHitRate * 100).toFixed(1) : 0}%
            </div>
            <div className="metric-label">Cache Hit Rate</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {performanceMetrics ? (performanceMetrics.errorRate * 100).toFixed(1) : 0}%
            </div>
            <div className="metric-label">Error Rate</div>
          </div>
        </div>
      </div>

      {/* Search Trends Chart */}
      <div className="chart-section">
        <h3>Search Trends</h3>
        <div className="chart-container" ref={chartRef}>
          {chartData.length > 1 ? (
            <svg width={chartWidth} height={120} className="trends-chart">
              <defs>
                <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line
                  key={i}
                  x1={20}
                  y1={20 + (i * 20)}
                  x2={chartWidth - 20}
                  y2={20 + (i * 20)}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  opacity="0.3"
                />
              ))}
              
              {/* Chart line */}
              <path
                d={chartPath}
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
              />
              
              {/* Fill area */}
              <path
                d={`${chartPath} L ${chartData[chartData.length - 1].x} 100 L ${chartData[0].x} 100 Z`}
                fill="url(#trendGradient)"
              />
              
              {/* Data points */}
              {chartData.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="#3b82f6"
                  className="chart-point"
                />
              ))}
            </svg>
          ) : (
            <div className="no-chart-data">
              <TrendingUp size={48} />
              <p>No trend data available for the selected period</p>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Tables */}
      <div className="analytics-tables">
        {/* Popular Search Terms */}
        <div className="analytics-table">
          <h3>Popular Search Terms</h3>
          <div className="table-container">
            {analytics?.topSearchTerms && analytics.topSearchTerms.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Search Term</th>
                    <th>Count</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topSearchTerms.map((term, index) => (
                    <tr key={index}>
                      <td className="term-cell">{term.term}</td>
                      <td className="count-cell">{term.count}</td>
                      <td className="percentage-cell">
                        {analytics.totalSearches > 0 
                          ? ((term.count / analytics.totalSearches) * 100).toFixed(1)
                          : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-data">
                <Search size={32} />
                <p>No search terms data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Zero Result Queries */}
        <div className="analytics-table">
          <h3>Zero Result Queries</h3>
          <div className="table-container">
            {analytics?.zeroResultQueries && analytics.zeroResultQueries.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Count</th>
                    <th>Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.zeroResultQueries.map((query, index) => (
                    <tr key={index}>
                      <td className="term-cell">{query.query}</td>
                      <td className="count-cell">{query.count}</td>
                      <td className="impact-cell">
                        <span className={`impact-badge ${query.count > 5 ? 'high' : query.count > 2 ? 'medium' : 'low'}`}>
                          {query.count > 5 ? 'High' : query.count > 2 ? 'Medium' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-data">
                <AlertTriangle size={32} />
                <p>No zero result queries found</p>
              </div>
            )}
          </div>
        </div>

        {/* Popular Filters */}
        <div className="analytics-table">
          <h3>Popular Filters</h3>
          <div className="table-container">
            {analytics?.popularFilters && analytics.popularFilters.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Filter</th>
                    <th>Usage Count</th>
                    <th>Usage Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.popularFilters.map((filter, index) => (
                    <tr key={index}>
                      <td className="term-cell">
                        <Filter size={14} />
                        {filter.filter}
                      </td>
                      <td className="count-cell">{filter.count}</td>
                      <td className="percentage-cell">
                        {analytics.totalSearches > 0 
                          ? ((filter.count / analytics.totalSearches) * 100).toFixed(1)
                          : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-data">
                <Filter size={32} />
                <p>No filter usage data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Performance Issues */}
        {performanceMetrics?.slowQueries && performanceMetrics.slowQueries.length > 0 && (
          <div className="analytics-table">
            <h3>Slow Queries</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Response Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceMetrics.slowQueries.map((query, index) => (
                    <tr key={index}>
                      <td className="term-cell">{query.query}</td>
                      <td className="time-cell">{query.responseTime}ms</td>
                      <td className="status-cell">
                        <span className={`status-badge ${query.responseTime > 3000 ? 'critical' : 'warning'}`}>
                          {query.responseTime > 3000 ? 'Critical' : 'Slow'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Export Dialog */}
      <AnalyticsExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        defaultDateRange={selectedDateRange}
      />
    </div>
  );
};

export default SearchAnalyticsDashboard;