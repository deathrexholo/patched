import React from 'react';
import { useBulkSelection } from '../../contexts/BulkSelectionContext';
import './BulkSelectionToolbar.css';

interface BulkSelectionToolbarProps {
  className?: string;
  onBulkOperationsClick?: () => void;
}

const BulkSelectionToolbar: React.FC<BulkSelectionToolbarProps> = ({
  className = '',
  onBulkOperationsClick
}) => {
  const { state, toggleSelectAll, deselectAll } = useBulkSelection();
  const { selectedCount, isAllSelected, currentPageItems } = state;

  if (currentPageItems.length === 0) {
    return null;
  }

  return (
    <div className={`bulk-selection-toolbar ${className}`}>
      <div className="toolbar-left">
        <label className="select-all-checkbox">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={toggleSelectAll}
            className="checkbox-input"
          />
          <span className="checkbox-label">
            Select all on page ({currentPageItems.length})
          </span>
        </label>
      </div>

      <div className="toolbar-center">
        {selectedCount > 0 && (
          <div className="selection-info">
            <span className="selected-count">
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
        )}
      </div>

      <div className="toolbar-right">
        {selectedCount > 0 && (
          <>
            <button
              type="button"
              onClick={deselectAll}
              className="clear-selection-btn"
            >
              <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Clear Selection
            </button>
            
            {onBulkOperationsClick && (
              <button
                type="button"
                onClick={onBulkOperationsClick}
                className="bulk-operations-btn"
              >
                <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Bulk Operations ({selectedCount})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BulkSelectionToolbar;