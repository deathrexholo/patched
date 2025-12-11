import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  Zap,
  Shield
} from 'lucide-react';
import { searchConfigService, SearchConfig } from '../../services/search/searchConfigService';
import { SearchPerformanceMetrics } from '../../services/search/searchAnalyticsService';
import './SearchSettingsPanel.css';

interface SearchSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  performanceMetrics?: SearchPerformanceMetrics;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const SearchSettingsPanel: React.FC<SearchSettingsPanelProps> = ({
  isOpen,
  onClose,
  performanceMetrics
}) => {
  const [config, setConfig] = useState<SearchConfig>(searchConfigService.getConfig());
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, errors: [], warnings: [] });
  const [activeTab, setActiveTab] = useState<'features' | 'performance' | 'monitoring' | 'advanced'>('features');
  const [alerts, setAlerts] = useState<Array<any>>([]);

  useEffect(() => {
    if (isOpen) {
      const currentConfig = searchConfigService.getConfig();
      setConfig(currentConfig);
      setHasChanges(false);
      validateConfig();
      
      if (performanceMetrics) {
        const performanceAlerts = searchConfigService.checkPerformanceAlerts(performanceMetrics);
        setAlerts(performanceAlerts);
      }
    }
  }, [isOpen, performanceMetrics]);

  const validateConfig = () => {
    const result = searchConfigService.validateCurrentConfig();
    setValidation(result);
  };

  const handleConfigChange = (updates: Partial<SearchConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setHasChanges(true);
    validateConfig();
  };

  const handleSave = async () => {
    if (!validation.valid) return;

    setSaving(true);
    try {
      searchConfigService.updateConfig(config);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      const defaultConfig = searchConfigService.getConfig();
      searchConfigService.resetToDefaults();
      setConfig(defaultConfig);
      setHasChanges(false);
      validateConfig();
    }
  };

  const handleExport = () => {
    const configJson = searchConfigService.exportConfig();
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const configJson = e.target?.result as string;
        searchConfigService.importConfig(configJson);
        const newConfig = searchConfigService.getConfig();
        setConfig(newConfig);
        setHasChanges(false);
        validateConfig();
      } catch (error) {
        alert('Failed to import configuration: ' + error);
      }
    };
    reader.readAsText(file);
  };

  const getRecommendations = () => {
    return searchConfigService.getOptimizationRecommendations(performanceMetrics);
  };

  if (!isOpen) return null;

  return (
    <div className="search-settings-overlay">
      <div className="search-settings-panel">
        {/* Header */}
        <div className="settings-header">
          <div className="header-content">
            <Settings className="header-icon" />
            <div>
              <h2 className="header-title">Search Settings</h2>
              <p className="header-subtitle">Configure search behavior and performance</p>
            </div>
          </div>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="alerts-section">
            {alerts.map((alert, index) => (
              <div key={index} className={`alert alert-${alert.severity}`}>
                <AlertTriangle className="alert-icon" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Validation Messages */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="validation-section">
            {validation.errors.map((error, index) => (
              <div key={index} className="validation-message error">
                <AlertTriangle className="validation-icon" />
                <span>{error}</span>
              </div>
            ))}
            {validation.warnings.map((warning, index) => (
              <div key={index} className="validation-message warning">
                <Info className="validation-icon" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="settings-tabs">
          <button
            className={`tab ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            <Zap className="tab-icon" />
            Features
          </button>
          <button
            className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            <TrendingUp className="tab-icon" />
            Performance
          </button>
          <button
            className={`tab ${activeTab === 'monitoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitoring')}
          >
            <Shield className="tab-icon" />
            Monitoring
          </button>
          <button
            className={`tab ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            <Settings className="tab-icon" />
            Advanced
          </button>
        </div>

        {/* Content */}
        <div className="settings-content">
          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="tab-content">
              <h3 className="section-title">Feature Toggles</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.enableEnhancedSearch}
                      onChange={(e) => handleConfigChange({ enableEnhancedSearch: e.target.checked })}
                      className="setting-checkbox"
                    />
                    <span>Enhanced Search</span>
                  </label>
                  <p className="setting-description">Enable advanced search functionality with fuzzy matching and relevance scoring</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.enableAutoComplete}
                      onChange={(e) => handleConfigChange({ enableAutoComplete: e.target.checked })}
                      className="setting-checkbox"
                    />
                    <span>Auto-complete</span>
                  </label>
                  <p className="setting-description">Show search suggestions as users type</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.enableSavedSearches}
                      onChange={(e) => handleConfigChange({ enableSavedSearches: e.target.checked })}
                      className="setting-checkbox"
                    />
                    <span>Saved Searches</span>
                  </label>
                  <p className="setting-description">Allow users to save and reuse search queries</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.enableSearchAnalytics}
                      onChange={(e) => handleConfigChange({ enableSearchAnalytics: e.target.checked })}
                      className="setting-checkbox"
                    />
                    <span>Search Analytics</span>
                  </label>
                  <p className="setting-description">Track search usage and performance metrics</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.enableBulkOperations}
                      onChange={(e) => handleConfigChange({ enableBulkOperations: e.target.checked })}
                      className="setting-checkbox"
                    />
                    <span>Bulk Operations</span>
                  </label>
                  <p className="setting-description">Enable bulk actions on search results</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.enableFuzzyMatching}
                      onChange={(e) => handleConfigChange({ enableFuzzyMatching: e.target.checked })}
                      className="setting-checkbox"
                    />
                    <span>Fuzzy Matching</span>
                  </label>
                  <p className="setting-description">Match similar terms even with typos</p>
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="tab-content">
              <h3 className="section-title">Performance Settings</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">
                    <span>Search Timeout (ms)</span>
                    <input
                      type="number"
                      value={config.searchTimeout}
                      onChange={(e) => handleConfigChange({ searchTimeout: parseInt(e.target.value) || 10000 })}
                      className="setting-input"
                      min="1000"
                      max="30000"
                      step="1000"
                    />
                  </label>
                  <p className="setting-description">Maximum time to wait for search results</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <span>Debounce Delay (ms)</span>
                    <input
                      type="number"
                      value={config.debounceDelay}
                      onChange={(e) => handleConfigChange({ debounceDelay: parseInt(e.target.value) || 300 })}
                      className="setting-input"
                      min="100"
                      max="2000"
                      step="100"
                    />
                  </label>
                  <p className="setting-description">Delay before executing search while typing</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <span>Max Search Results</span>
                    <input
                      type="number"
                      value={config.maxSearchResults}
                      onChange={(e) => handleConfigChange({ maxSearchResults: parseInt(e.target.value) || 100 })}
                      className="setting-input"
                      min="10"
                      max="1000"
                      step="10"
                    />
                  </label>
                  <p className="setting-description">Maximum number of results to return</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.cacheEnabled}
                      onChange={(e) => handleConfigChange({ cacheEnabled: e.target.checked })}
                      className="setting-checkbox"
                    />
                    <span>Enable Caching</span>
                  </label>
                  <p className="setting-description">Cache search results for better performance</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <span>Cache TTL (ms)</span>
                    <input
                      type="number"
                      value={config.cacheTTL}
                      onChange={(e) => handleConfigChange({ cacheTTL: parseInt(e.target.value) || 300000 })}
                      className="setting-input"
                      min="60000"
                      max="3600000"
                      step="60000"
                      disabled={!config.cacheEnabled}
                    />
                  </label>
                  <p className="setting-description">How long to keep cached results</p>
                </div>
              </div>

              {/* Recommendations */}
              {performanceMetrics && (
                <div className="recommendations-section">
                  <h4 className="recommendations-title">Performance Recommendations</h4>
                  <div className="recommendations-list">
                    {getRecommendations().map((rec, index) => (
                      <div key={index} className={`recommendation recommendation-${rec.impact}`}>
                        <div className="recommendation-content">
                          <strong>{rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}</strong>
                          <p>{rec.recommendation}</p>
                        </div>
                        {rec.configChanges && (
                          <button
                            onClick={() => handleConfigChange(rec.configChanges!)}
                            className="apply-recommendation-button"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="tab-content">
              <h3 className="section-title">Monitoring & Alerts</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.performanceMonitoringEnabled}
                      onChange={(e) => handleConfigChange({ performanceMonitoringEnabled: e.target.checked })}
                      className="setting-checkbox"
                    />
                    <span>Performance Monitoring</span>
                  </label>
                  <p className="setting-description">Track search performance metrics</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <span>Response Time Alert (ms)</span>
                    <input
                      type="number"
                      value={config.alertThresholds.responseTime}
                      onChange={(e) => handleConfigChange({
                        alertThresholds: {
                          ...config.alertThresholds,
                          responseTime: parseInt(e.target.value) || 2000
                        }
                      })}
                      className="setting-input"
                      min="500"
                      max="10000"
                      step="500"
                    />
                  </label>
                  <p className="setting-description">Alert when average response time exceeds this value</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <span>Error Rate Alert (%)</span>
                    <input
                      type="number"
                      value={config.alertThresholds.errorRate}
                      onChange={(e) => handleConfigChange({
                        alertThresholds: {
                          ...config.alertThresholds,
                          errorRate: parseInt(e.target.value) || 5
                        }
                      })}
                      className="setting-input"
                      min="1"
                      max="50"
                      step="1"
                    />
                  </label>
                  <p className="setting-description">Alert when error rate exceeds this percentage</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <span>Cache Hit Rate Alert (%)</span>
                    <input
                      type="number"
                      value={config.alertThresholds.cacheHitRate}
                      onChange={(e) => handleConfigChange({
                        alertThresholds: {
                          ...config.alertThresholds,
                          cacheHitRate: parseInt(e.target.value) || 80
                        }
                      })}
                      className="setting-input"
                      min="10"
                      max="100"
                      step="5"
                    />
                  </label>
                  <p className="setting-description">Alert when cache hit rate falls below this percentage</p>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="tab-content">
              <h3 className="section-title">Advanced Settings</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">
                    <span>Fuzzy Match Threshold</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.fuzzyMatchThreshold}
                      onChange={(e) => handleConfigChange({ fuzzyMatchThreshold: parseFloat(e.target.value) })}
                      className="setting-range"
                    />
                    <span className="range-value">{config.fuzzyMatchThreshold}</span>
                  </label>
                  <p className="setting-description">Lower values = more strict matching</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <span>Auto-complete Min Characters</span>
                    <input
                      type="number"
                      value={config.autoCompleteMinChars}
                      onChange={(e) => handleConfigChange({ autoCompleteMinChars: parseInt(e.target.value) || 2 })}
                      className="setting-input"
                      min="1"
                      max="5"
                    />
                  </label>
                  <p className="setting-description">Minimum characters before showing suggestions</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <span>Auto-complete Max Suggestions</span>
                    <input
                      type="number"
                      value={config.autoCompleteMaxSuggestions}
                      onChange={(e) => handleConfigChange({ autoCompleteMaxSuggestions: parseInt(e.target.value) || 10 })}
                      className="setting-input"
                      min="3"
                      max="20"
                    />
                  </label>
                  <p className="setting-description">Maximum number of suggestions to show</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <span>Auto-complete Delay (ms)</span>
                    <input
                      type="number"
                      value={config.autoCompleteDelay}
                      onChange={(e) => handleConfigChange({ autoCompleteDelay: parseInt(e.target.value) || 200 })}
                      className="setting-input"
                      min="100"
                      max="1000"
                      step="50"
                    />
                  </label>
                  <p className="setting-description">Delay before fetching suggestions</p>
                </div>
              </div>

              {/* Import/Export */}
              <div className="import-export-section">
                <h4 className="section-subtitle">Configuration Management</h4>
                <div className="import-export-buttons">
                  <button onClick={handleExport} className="export-button">
                    <Download className="button-icon" />
                    Export Config
                  </button>
                  <label className="import-button">
                    <Upload className="button-icon" />
                    Import Config
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="import-input"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <div className="footer-left">
            {validation.valid ? (
              <div className="validation-status valid">
                <CheckCircle className="status-icon" />
                <span>Configuration is valid</span>
              </div>
            ) : (
              <div className="validation-status invalid">
                <AlertTriangle className="status-icon" />
                <span>{validation.errors.length} error(s) found</span>
              </div>
            )}
          </div>
          <div className="footer-right">
            <button onClick={handleReset} className="reset-button">
              <RotateCcw className="button-icon" />
              Reset to Defaults
            </button>
            <button onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || !validation.valid || saving}
              className="save-button"
            >
              {saving ? (
                <div className="button-spinner" />
              ) : (
                <Save className="button-icon" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchSettingsPanel;