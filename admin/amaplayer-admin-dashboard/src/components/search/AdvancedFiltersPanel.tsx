import React, { useState, useCallback } from 'react';
import { SearchFilters, SearchType } from '../../types/models/search';
import './AdvancedFiltersPanel.css';

interface AdvancedFiltersPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  searchType: SearchType;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

interface FilterState {
  dateRange: {
    start: string;
    end: string;
    field: 'createdAt' | 'updatedAt' | 'lastLoginAt';
  };
  roles: string[];
  statuses: string[];
  location: string;
  sport: string;
  ageRange: {
    min: number;
    max: number;
  };
  verificationStatuses: string[];
  categories: string[];
  eventStatuses: string[];
}

const ROLE_OPTIONS = [
  { value: 'athlete', label: 'Athlete' },
  { value: 'coach', label: 'Coach' },
  { value: 'organization', label: 'Organization' }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'verified', label: 'Verified' }
];

const VERIFICATION_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const EVENT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'completed', label: 'Completed' }
];

const CATEGORY_OPTIONS = [
  { value: 'skills', label: 'Skills' },
  { value: 'highlights', label: 'Highlights' },
  { value: 'training', label: 'Training' },
  { value: 'competition', label: 'Competition' }
];

const DATE_FIELD_OPTIONS = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Updated Date' },
  { value: 'lastLoginAt', label: 'Last Login' }
];

const AdvancedFiltersPanel: React.FC<AdvancedFiltersPanelProps> = ({
  filters,
  onFiltersChange,
  searchType,
  isCollapsed = false,
  onToggleCollapse,
  className = ''
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>({
    dateRange: {
      start: filters.dateRange?.start ? new Date(filters.dateRange.start).toISOString().split('T')[0] : '',
      end: filters.dateRange?.end ? new Date(filters.dateRange.end).toISOString().split('T')[0] : '',
      field: filters.dateRange?.field || 'createdAt'
    },
    roles: filters.role || [],
    statuses: filters.status || [],
    location: filters.location || '',
    sport: filters.sport || '',
    ageRange: {
      min: filters.ageRange?.min || 13,
      max: filters.ageRange?.max || 65
    },
    verificationStatuses: filters.verificationStatus || [],
    categories: filters.category || [],
    eventStatuses: filters.eventStatus || []
  });

  // Apply filters to parent component
  const applyFilters = useCallback(() => {
    const newFilters: SearchFilters = {};

    // Date range
    if (localFilters.dateRange.start && localFilters.dateRange.end) {
      newFilters.dateRange = {
        start: new Date(localFilters.dateRange.start),
        end: new Date(localFilters.dateRange.end),
        field: localFilters.dateRange.field
      };
    }

    // User-specific filters
    if (searchType === 'users' || searchType === 'all') {
      if (localFilters.roles.length > 0) {
        newFilters.role = localFilters.roles as ('athlete' | 'coach' | 'organization')[];
      }
      if (localFilters.statuses.length > 0) {
        newFilters.status = localFilters.statuses as ('active' | 'suspended' | 'verified')[];
      }
      if (localFilters.location.trim()) {
        newFilters.location = localFilters.location.trim();
      }
      if (localFilters.sport.trim()) {
        newFilters.sport = localFilters.sport.trim();
      }
      if (localFilters.ageRange.min !== 13 || localFilters.ageRange.max !== 65) {
        newFilters.ageRange = {
          min: localFilters.ageRange.min,
          max: localFilters.ageRange.max
        };
      }
    }

    // Video-specific filters
    if (searchType === 'videos' || searchType === 'all') {
      if (localFilters.verificationStatuses.length > 0) {
        newFilters.verificationStatus = localFilters.verificationStatuses as ('pending' | 'approved' | 'rejected')[];
      }
      if (localFilters.categories.length > 0) {
        newFilters.category = localFilters.categories;
      }
    }

    // Event-specific filters
    if (searchType === 'events' || searchType === 'all') {
      if (localFilters.eventStatuses.length > 0) {
        newFilters.eventStatus = localFilters.eventStatuses as ('active' | 'inactive' | 'completed')[];
      }
    }

    onFiltersChange(newFilters);
  }, [localFilters, searchType, onFiltersChange]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedFilters: FilterState = {
      dateRange: { start: '', end: '', field: 'createdAt' },
      roles: [],
      statuses: [],
      location: '',
      sport: '',
      ageRange: { min: 13, max: 65 },
      verificationStatuses: [],
      categories: [],
      eventStatuses: []
    };
    setLocalFilters(clearedFilters);
    onFiltersChange({});
  }, [onFiltersChange]);

  // Handle multi-select changes
  const handleMultiSelectChange = (
    field: keyof FilterState,
    value: string,
    checked: boolean
  ) => {
    setLocalFilters(prev => {
      const currentArray = prev[field] as string[];
      const newArray = checked
        ? [...currentArray, value]
        : currentArray.filter(item => item !== value);
      
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  // Handle input changes
  const handleInputChange = (field: keyof FilterState, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle age range changes
  const handleAgeRangeChange = (type: 'min' | 'max', value: number) => {
    setLocalFilters(prev => ({
      ...prev,
      ageRange: {
        ...prev.ageRange,
        [type]: value
      }
    }));
  };

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.dateRange.start && localFilters.dateRange.end) count++;
    if (localFilters.roles.length > 0) count++;
    if (localFilters.statuses.length > 0) count++;
    if (localFilters.location.trim()) count++;
    if (localFilters.sport.trim()) count++;
    if (localFilters.ageRange.min !== 13 || localFilters.ageRange.max !== 65) count++;
    if (localFilters.verificationStatuses.length > 0) count++;
    if (localFilters.categories.length > 0) count++;
    if (localFilters.eventStatuses.length > 0) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={`advanced-filters-panel ${className}`}>
      {/* Header */}
      <div className="filters-header">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="filters-toggle-button"
          aria-expanded={!isCollapsed}
        >
          <span className="filters-title">
            Advanced Filters
            {activeFilterCount > 0 && (
              <span className="active-filter-count">{activeFilterCount}</span>
            )}
          </span>
          <svg
            className={`chevron-icon ${isCollapsed ? 'collapsed' : 'expanded'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Filters Content */}
      {!isCollapsed && (
        <div className="filters-content">
          {/* Date Range Filter */}
          <div className="filter-group">
            <label className="filter-label">Date Range</label>
            <div className="date-range-container">
              <select
                value={localFilters.dateRange.field}
                onChange={(e) => handleInputChange('dateRange', {
                  ...localFilters.dateRange,
                  field: e.target.value as 'createdAt' | 'updatedAt' | 'lastLoginAt'
                })}
                className="date-field-select"
              >
                {DATE_FIELD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={localFilters.dateRange.start}
                onChange={(e) => handleInputChange('dateRange', {
                  ...localFilters.dateRange,
                  start: e.target.value
                })}
                className="date-input"
                placeholder="Start date"
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                value={localFilters.dateRange.end}
                onChange={(e) => handleInputChange('dateRange', {
                  ...localFilters.dateRange,
                  end: e.target.value
                })}
                className="date-input"
                placeholder="End date"
              />
            </div>
          </div>

          {/* User-specific filters */}
          {(searchType === 'users' || searchType === 'all') && (
            <>
              {/* Roles Filter */}
              <div className="filter-group">
                <label className="filter-label">Roles</label>
                <div className="checkbox-group">
                  {ROLE_OPTIONS.map(option => (
                    <label key={option.value} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={localFilters.roles.includes(option.value)}
                        onChange={(e) => handleMultiSelectChange('roles', option.value, e.target.checked)}
                        className="checkbox-input"
                      />
                      <span className="checkbox-label">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="filter-group">
                <label className="filter-label">Status</label>
                <div className="checkbox-group">
                  {STATUS_OPTIONS.map(option => (
                    <label key={option.value} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={localFilters.statuses.includes(option.value)}
                        onChange={(e) => handleMultiSelectChange('statuses', option.value, e.target.checked)}
                        className="checkbox-input"
                      />
                      <span className="checkbox-label">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              <div className="filter-group">
                <label className="filter-label">Location</label>
                <input
                  type="text"
                  value={localFilters.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Enter location..."
                  className="text-input"
                />
              </div>

              {/* Sport Filter */}
              <div className="filter-group">
                <label className="filter-label">Sport</label>
                <input
                  type="text"
                  value={localFilters.sport}
                  onChange={(e) => handleInputChange('sport', e.target.value)}
                  placeholder="Enter sport..."
                  className="text-input"
                />
              </div>

              {/* Age Range Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  Age Range: {localFilters.ageRange.min} - {localFilters.ageRange.max}
                </label>
                <div className="age-range-container">
                  <input
                    type="range"
                    min="13"
                    max="65"
                    value={localFilters.ageRange.min}
                    onChange={(e) => handleAgeRangeChange('min', parseInt(e.target.value))}
                    className="age-slider"
                  />
                  <input
                    type="range"
                    min="13"
                    max="65"
                    value={localFilters.ageRange.max}
                    onChange={(e) => handleAgeRangeChange('max', parseInt(e.target.value))}
                    className="age-slider"
                  />
                </div>
                <div className="age-inputs">
                  <input
                    type="number"
                    min="13"
                    max="65"
                    value={localFilters.ageRange.min}
                    onChange={(e) => handleAgeRangeChange('min', parseInt(e.target.value) || 13)}
                    className="age-number-input"
                  />
                  <input
                    type="number"
                    min="13"
                    max="65"
                    value={localFilters.ageRange.max}
                    onChange={(e) => handleAgeRangeChange('max', parseInt(e.target.value) || 65)}
                    className="age-number-input"
                  />
                </div>
              </div>
            </>
          )}

          {/* Video-specific filters */}
          {(searchType === 'videos' || searchType === 'all') && (
            <>
              {/* Verification Status Filter */}
              <div className="filter-group">
                <label className="filter-label">Verification Status</label>
                <div className="checkbox-group">
                  {VERIFICATION_STATUS_OPTIONS.map(option => (
                    <label key={option.value} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={localFilters.verificationStatuses.includes(option.value)}
                        onChange={(e) => handleMultiSelectChange('verificationStatuses', option.value, e.target.checked)}
                        className="checkbox-input"
                      />
                      <span className="checkbox-label">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Categories Filter */}
              <div className="filter-group">
                <label className="filter-label">Categories</label>
                <div className="checkbox-group">
                  {CATEGORY_OPTIONS.map(option => (
                    <label key={option.value} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={localFilters.categories.includes(option.value)}
                        onChange={(e) => handleMultiSelectChange('categories', option.value, e.target.checked)}
                        className="checkbox-input"
                      />
                      <span className="checkbox-label">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Event-specific filters */}
          {(searchType === 'events' || searchType === 'all') && (
            <div className="filter-group">
              <label className="filter-label">Event Status</label>
              <div className="checkbox-group">
                {EVENT_STATUS_OPTIONS.map(option => (
                  <label key={option.value} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={localFilters.eventStatuses.includes(option.value)}
                      onChange={(e) => handleMultiSelectChange('eventStatuses', option.value, e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-label">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="filter-actions">
            <button
              type="button"
              onClick={applyFilters}
              className="apply-filters-button"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="clear-filters-button"
              disabled={activeFilterCount === 0}
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFiltersPanel;