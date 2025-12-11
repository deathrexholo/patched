/**
 * Analytics Export Dialog Component
 * Advanced export dialog with format options and progress tracking
 */

import React, { useState } from 'react';
import { 
  Download, 
  X, 
  Calendar, 
  FileText, 
  Database, 
  Settings,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { analyticsExporter, ExportOptions, ExportProgress } from '../../utils/analytics/analyticsExporter';
import './AnalyticsExportDialog.css';

interface AnalyticsExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDateRange?: { start: Date; end: Date };
}

const AnalyticsExportDialog: React.FC<AnalyticsExportDialogProps> = ({
  isOpen,
  onClose,
  defaultDateRange
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: defaultDateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    includePerformanceMetrics: true,
    includeDetailedBreakdown: false,
    customFilename: ''
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Handle form changes
  const handleOptionChange = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle date range change
  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const date = new Date(value);
    setExportOptions(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: date
      }
    }));
  };

  // Handle export
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      setExportProgress(null);

      await analyticsExporter.exportAnalytics(exportOptions, (progress) => {
        setExportProgress(progress);
      });

      // Close dialog after successful export
      setTimeout(() => {
        onClose();
        setIsExporting(false);
        setExportProgress(null);
      }, 2000);

    } catch (error) {
      console.error('Export failed:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isExporting) {
      onClose();
      setExportError(null);
      setExportProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="export-dialog-overlay">
      <div className="export-dialog">
        {/* Header */}
        <div className="export-dialog-header">
          <div className="header-title">
            <Download size={20} />
            <h3>Export Analytics Data</h3>
          </div>
          {!isExporting && (
            <button onClick={handleClose} className="close-button">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="export-dialog-content">
          {!isExporting ? (
            <>
              {/* Export Format */}
              <div className="form-section">
                <label className="section-label">
                  <FileText size={16} />
                  Export Format
                </label>
                <div className="format-options">
                  <label className="format-option">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={exportOptions.format === 'csv'}
                      onChange={(e) => handleOptionChange('format', e.target.value)}
                    />
                    <div className="format-info">
                      <span className="format-name">CSV</span>
                      <span className="format-desc">Comma-separated values, compatible with Excel</span>
                    </div>
                  </label>
                  
                  <label className="format-option">
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={exportOptions.format === 'json'}
                      onChange={(e) => handleOptionChange('format', e.target.value)}
                    />
                    <div className="format-info">
                      <span className="format-name">JSON</span>
                      <span className="format-desc">Structured data format for developers</span>
                    </div>
                  </label>
                  
                  <label className="format-option">
                    <input
                      type="radio"
                      name="format"
                      value="xlsx"
                      checked={exportOptions.format === 'xlsx'}
                      onChange={(e) => handleOptionChange('format', e.target.value)}
                    />
                    <div className="format-info">
                      <span className="format-name">Excel (XLSX)</span>
                      <span className="format-desc">Microsoft Excel format with multiple sheets</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Date Range */}
              <div className="form-section">
                <label className="section-label">
                  <Calendar size={16} />
                  Date Range
                </label>
                <div className="date-range-inputs">
                  <div className="date-input-group">
                    <label>From</label>
                    <input
                      type="date"
                      value={exportOptions.dateRange.start.toISOString().split('T')[0]}
                      onChange={(e) => handleDateRangeChange('start', e.target.value)}
                      max={exportOptions.dateRange.end.toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="date-input-group">
                    <label>To</label>
                    <input
                      type="date"
                      value={exportOptions.dateRange.end.toISOString().split('T')[0]}
                      onChange={(e) => handleDateRangeChange('end', e.target.value)}
                      min={exportOptions.dateRange.start.toISOString().split('T')[0]}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>

              {/* Export Options */}
              <div className="form-section">
                <label className="section-label">
                  <Settings size={16} />
                  Export Options
                </label>
                <div className="export-options">
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={exportOptions.includePerformanceMetrics}
                      onChange={(e) => handleOptionChange('includePerformanceMetrics', e.target.checked)}
                    />
                    <div className="option-info">
                      <span className="option-name">Include Performance Metrics</span>
                      <span className="option-desc">Response times, cache hit rates, and error statistics</span>
                    </div>
                  </label>
                  
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeDetailedBreakdown}
                      onChange={(e) => handleOptionChange('includeDetailedBreakdown', e.target.checked)}
                    />
                    <div className="option-info">
                      <span className="option-name">Include Detailed Analysis</span>
                      <span className="option-desc">Advanced analytics and recommendations (JSON format only)</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Custom Filename */}
              <div className="form-section">
                <label className="section-label">
                  <Database size={16} />
                  Custom Filename (Optional)
                </label>
                <input
                  type="text"
                  className="filename-input"
                  placeholder="Leave empty for auto-generated filename"
                  value={exportOptions.customFilename}
                  onChange={(e) => handleOptionChange('customFilename', e.target.value)}
                />
                <div className="filename-preview">
                  Preview: {exportOptions.customFilename || 
                    `search-analytics-${exportOptions.dateRange.start.toISOString().split('T')[0]}-to-${exportOptions.dateRange.end.toISOString().split('T')[0]}`}.{exportOptions.format}
                </div>
              </div>

              {/* Error Display */}
              {exportError && (
                <div className="export-error">
                  <AlertCircle size={16} />
                  <span>{exportError}</span>
                </div>
              )}
            </>
          ) : (
            /* Export Progress */
            <div className="export-progress">
              <div className="progress-header">
                <Loader className="animate-spin" size={24} />
                <h4>Exporting Analytics Data</h4>
              </div>
              
              {exportProgress && (
                <>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${exportProgress.progress}%` }}
                    />
                  </div>
                  
                  <div className="progress-info">
                    <span className="progress-stage">{exportProgress.stage}</span>
                    <span className="progress-message">{exportProgress.message}</span>
                    <span className="progress-percentage">{exportProgress.progress}%</span>
                  </div>
                </>
              )}

              {exportProgress?.stage === 'complete' && exportProgress.progress === 100 && (
                <div className="export-success">
                  <CheckCircle size={20} />
                  <span>Export completed successfully!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isExporting && (
          <div className="export-dialog-footer">
            <button onClick={handleClose} className="cancel-button">
              Cancel
            </button>
            <button 
              onClick={handleExport} 
              className="export-button"
              disabled={isExporting}
            >
              <Download size={16} />
              Export Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsExportDialog;