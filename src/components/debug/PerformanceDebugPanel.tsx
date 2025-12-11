/**
 * Performance Debug Panel Component
 * 
 * A development-only component that provides real-time performance monitoring,
 * render tracking, and debugging information.
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { renderTracker, type RenderInfo } from '../../utils/performance/RenderTracker';
import { performanceTimer, type TimingStats } from '../../utils/performance/PerformanceTimer';
import { performanceMonitoringUtils, type PerformanceAlert } from '../../utils/performance/PerformanceMonitoringUtils';

interface PerformanceDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const PerformanceDebugPanelComponent: React.FC<PerformanceDebugPanelProps> = ({
  isOpen,
  onClose,
  position = 'top-right'
}) => {
  const [activeTab, setActiveTab] = useState<'renders' | 'timing' | 'alerts' | 'report'>('renders');
  const [renderStats, setRenderStats] = useState<Map<string, RenderInfo>>(new Map());
  const [timingStats, setTimingStats] = useState<Map<string, TimingStats>>(new Map());
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Memoize updateData callback to prevent recreation
  const updateData = useCallback(() => {
    setRenderStats(renderTracker.getAllRenderStats());
    setTimingStats(performanceTimer.getAllStats());
    setAlerts(performanceMonitoringUtils.getRecentAlerts());
  }, []);

  // Update data periodically
  useEffect(() => {
    if (!isOpen) return;

    updateData();
    const interval = setInterval(updateData, 1000);

    return () => clearInterval(interval);
  }, [isOpen, updateData]);

  // Memoize alert handler to prevent recreation
  const handleAlertUpdate = useCallback((alert: PerformanceAlert) => {
    setAlerts(prev => [...prev.slice(-19), alert]);
  }, []);

  // Subscribe to alerts
  useEffect(() => {
    const unsubscribe = performanceMonitoringUtils.subscribeToAlerts(handleAlertUpdate);
    return unsubscribe;
  }, [handleAlertUpdate]);

  const handleStartMonitoring = useCallback(() => {
    performanceMonitoringUtils.startMonitoring();
    setIsMonitoring(true);
  }, []);

  const handleStopMonitoring = useCallback(() => {
    performanceMonitoringUtils.stopMonitoring();
    setIsMonitoring(false);
  }, []);

  const handleClearData = useCallback(() => {
    renderTracker.clear();
    performanceTimer.clear();
    performanceMonitoringUtils.clearAlerts();
    setRenderStats(new Map());
    setTimingStats(new Map());
    setAlerts([]);
  }, []);

  const handleGenerateReport = useCallback(() => {
    performanceMonitoringUtils.logPerformanceReport();
  }, []);

  // Memoize position styles to prevent recreation
  const positionStyles = useMemo(() => ({
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' }
  }), []);

  // Early return for production environment or when closed
  if (process.env.NODE_ENV === 'production' || !isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        width: '400px',
        maxHeight: '600px',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        border: '1px solid #333',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 10000,
        fontFamily: 'monospace',
        fontSize: '12px',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#2a2a2a'
        }}
      >
        <span style={{ fontWeight: 'bold' }}>🔍 Performance Debug</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
            style={{
              padding: '4px 8px',
              backgroundColor: isMonitoring ? '#dc3545' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            {isMonitoring ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={handleClearData}
            style={{
              padding: '4px 8px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            Clear
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #333',
          backgroundColor: '#2a2a2a'
        }}
      >
        {(['renders', 'timing', 'alerts', 'report'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '8px',
              backgroundColor: activeTab === tab ? '#007bff' : 'transparent',
              color: activeTab === tab ? 'white' : '#ccc',
              border: 'none',
              cursor: 'pointer',
              fontSize: '10px',
              textTransform: 'capitalize'
            }}
          >
            {tab}
            {tab === 'alerts' && alerts.length > 0 && (
              <span
                style={{
                  marginLeft: '4px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '2px 6px',
                  fontSize: '8px'
                }}
              >
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          padding: '12px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}
      >
        {activeTab === 'renders' && (
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Component Renders</h4>
            {renderStats.size === 0 ? (
              <p style={{ color: '#888', margin: 0 }}>No render data available</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Array.from(renderStats.entries())
                  .sort(([, a], [, b]) => b.renderCount - a.renderCount)
                  .slice(0, 10)
                  .map(([name, stats]) => (
                    <div
                      key={name}
                      style={{
                        padding: '8px',
                        backgroundColor: '#333',
                        borderRadius: '4px',
                        border: stats.renderCount > 10 ? '1px solid #dc3545' : '1px solid transparent'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{name}</div>
                      <div style={{ fontSize: '10px', color: '#ccc' }}>
                        Renders: {stats.renderCount} | 
                        Avg: {stats.averageRenderTime.toFixed(2)}ms |
                        Reason: {stats.renderReason}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'timing' && (
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Operation Timing</h4>
            {timingStats.size === 0 ? (
              <p style={{ color: '#888', margin: 0 }}>No timing data available</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Array.from(timingStats.entries())
                  .sort(([, a], [, b]) => b.averageTime - a.averageTime)
                  .slice(0, 10)
                  .map(([key, stats]) => (
                    <div
                      key={key}
                      style={{
                        padding: '8px',
                        backgroundColor: '#333',
                        borderRadius: '4px',
                        border: stats.averageTime > 100 ? '1px solid #dc3545' : '1px solid transparent'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {stats.name} ({stats.category})
                      </div>
                      <div style={{ fontSize: '10px', color: '#ccc' }}>
                        Count: {stats.count} | 
                        Avg: {stats.averageTime.toFixed(2)}ms |
                        Min: {stats.minTime.toFixed(2)}ms |
                        Max: {stats.maxTime.toFixed(2)}ms
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Performance Alerts</h4>
            {alerts.length === 0 ? (
              <p style={{ color: '#888', margin: 0 }}>No alerts</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {alerts.slice(-10).reverse().map((alert, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '8px',
                      backgroundColor: alert.type === 'error' ? '#4a1a1a' : '#4a3a1a',
                      borderRadius: '4px',
                      border: `1px solid ${alert.type === 'error' ? '#dc3545' : '#ffc107'}`
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {alert.type === 'error' ? '🚨' : '⚠️'} {alert.component || alert.operation}
                    </div>
                    <div style={{ fontSize: '10px', color: '#ccc', marginBottom: '4px' }}>
                      {alert.message}
                    </div>
                    <div style={{ fontSize: '9px', color: '#888' }}>
                      Value: {alert.value.toFixed(2)} | Threshold: {alert.threshold} |
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'report' && (
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Performance Report</h4>
            <button
              onClick={handleGenerateReport}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '12px'
              }}
            >
              Generate Console Report
            </button>
            <div style={{ fontSize: '10px', color: '#ccc' }}>
              <p>Click the button above to generate a detailed performance report in the browser console.</p>
              <p>The report includes:</p>
              <ul style={{ margin: '8px 0', paddingLeft: '16px' }}>
                <li>Performance summary</li>
                <li>Component analysis</li>
                <li>Operation timing</li>
                <li>Optimization recommendations</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export const PerformanceDebugPanel = memo(PerformanceDebugPanelComponent);

// Add displayName to clearly mark as debug component
PerformanceDebugPanel.displayName = 'PerformanceDebugPanel [DEV ONLY]';

export default PerformanceDebugPanel;