import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Zap,
  Database,
  Users
} from 'lucide-react';
import { searchPerformanceMonitor } from '../../services/search/searchPerformanceMonitor';
import { searchConfigService } from '../../services/search/searchConfigService';
import './SearchPerformanceDashboard.css';

interface PerformanceMetric {
  label: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
}

const SearchPerformanceDashboard: React.FC = () => {
  const [realtimeStatus, setRealtimeStatus] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateMetrics = () => {
      const status = searchPerformanceMonitor.getRealtimeStatus();
      const performanceTrends = searchPerformanceMonitor.getPerformanceTrends(24);
      const activeAlerts = searchPerformanceMonitor.getActiveAlerts();

      setRealtimeStatus(status);
      setTrends(performanceTrends);
      setAlerts(activeAlerts);
      setIsLoading(false);
    };

    // Initial load
    updateMetrics();

    // Update every 30 seconds
    const interval = setInterval(updateMetrics, 30000);

    // Subscribe to alerts
    const unsubscribe = searchPerformanceMonitor.onAlert((alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const getMetricStatus = (value: number, thresholds: { warning: number; critical: number }, inverted = false): 'good' | 'warning' | 'critical' => {
    if (inverted) {
      if (value < thresholds.critical) return 'critical';
      if (value < thresholds.warning) return 'warning';
      return 'good';
    } else {
      if (value > thresholds.critical) return 'critical';
      if (value > thresholds.warning) return 'warning';
      return 'good';
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="performance-dashboard loading">
        <div className="loading-spinner" />
        <p>Loading performance metrics...</p>
      </div>
    );
  }

  const metrics: PerformanceMetric[] = [
    {
      label: 'Avg Response Time',
      value: formatDuration(realtimeStatus.averageResponseTime),
      status: getMetricStatus(realtimeStatus.averageResponseTime, { warning: 1000, critical: 2000 })
    },
    {
      label: 'Error Rate',
      value: formatPercentage(realtimeStatus.errorRate),
      status: getMetricStatus(realtimeStatus.errorRate, { warning: 3, critical: 10 })
    },
    {
      label: 'Cache Hit Rate',
      value: formatPercentage(realtimeStatus.cacheHitRate),
      status: getMetricStatus(realtimeStatus.cacheHitRate, { warning: 70, critical: 50 }, true)
    },
    {
      label: 'Searches/Min',
      value: realtimeStatus.searchesPerMinute,
      status: 'good'
    },
    {
      label: 'Total Searches',
      value: realtimeStatus.totalSearches,
      status: 'good'
    },
    {
      label: 'Active Alerts',
      value: realtimeStatus.activeAlerts,
      status: realtimeStatus.activeAlerts > 0 ? 'warning' : 'good'
    }
  ];

  return (
    <div className="performance-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <Activity className="header-icon" />
          <div>
            <h2 className="header-title">Search Performance Dashboard</h2>
            <p className="header-subtitle">Real-time monitoring and analytics</p>
          </div>
        </div>
        <div className="dashboard-status">
          {alerts.length === 0 ? (
            <div className="status-indicator good">
              <CheckCircle className="status-icon" />
              <span>All Systems Operational</span>
            </div>
          ) : (
            <div className="status-indicator warning">
              <AlertTriangle className="status-icon" />
              <span>{alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {metrics.map((metric, index) => (
          <div key={index} className={`metric-card ${metric.status}`}>
            <div className="metric-header">
              <span className="metric-label">{metric.label}</span>
              {metric.status === 'critical' && <AlertTriangle className="metric-status-icon critical" />}
              {metric.status === 'warning' && <AlertTriangle className="metric-status-icon warning" />}
              {metric.status === 'good' && <CheckCircle className="metric-status-icon good" />}
            </div>
            <div className="metric-value">
              {metric.value}
              {metric.unit && <span className="metric-unit">{metric.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Trends Chart */}
      <div className="trends-section">
        <h3 className="section-title">
          <TrendingUp className="section-icon" />
          Performance Trends (24 Hours)
        </h3>
        <div className="trends-chart">
          {trends.length > 0 ? (
            <div className="chart-container">
              <div className="chart-grid">
                {trends.map((trend, index) => (
                  <div key={index} className="trend-bar">
                    <div 
                      className="response-time-bar"
                      style={{ 
                        height: `${Math.min((trend.averageResponseTime / 3000) * 100, 100)}%`,
                        backgroundColor: trend.averageResponseTime > 2000 ? '#ef4444' : 
                                       trend.averageResponseTime > 1000 ? '#f59e0b' : '#10b981'
                      }}
                    />
                    <div className="trend-label">
                      {new Date(trend.timestamp).getHours()}:00
                    </div>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color good" />
                  <span>&lt; 1s</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color warning" />
                  <span>1-2s</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color critical" />
                  <span>&gt; 2s</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-data">
              <Clock className="no-data-icon" />
              <p>No trend data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          <h3 className="section-title">
            <AlertTriangle className="section-icon" />
            Recent Alerts
          </h3>
          <div className="alerts-list">
            {alerts.slice(0, 5).map((alert, index) => (
              <div key={alert.id || index} className={`alert-item ${alert.severity}`}>
                <div className="alert-content">
                  <div className="alert-header">
                    <span className="alert-type">{alert.type.replace('_', ' ').toUpperCase()}</span>
                    <span className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="alert-message">{alert.message}</p>
                </div>
                <div className="alert-severity">
                  {alert.severity === 'critical' ? (
                    <AlertTriangle className="severity-icon critical" />
                  ) : (
                    <AlertTriangle className="severity-icon warning" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3 className="section-title">
          <Zap className="section-icon" />
          Quick Actions
        </h3>
        <div className="actions-grid">
          <button 
            className="action-button"
            onClick={() => searchPerformanceMonitor.cleanup()}
          >
            <Database className="action-icon" />
            <span>Clear Old Data</span>
          </button>
          <button 
            className="action-button"
            onClick={() => {
              const data = searchPerformanceMonitor.exportData();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `search-performance-${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            <TrendingUp className="action-icon" />
            <span>Export Data</span>
          </button>
          <button 
            className="action-button"
            onClick={() => window.location.reload()}
          >
            <Activity className="action-icon" />
            <span>Refresh Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchPerformanceDashboard;