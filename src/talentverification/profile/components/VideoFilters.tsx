import React from 'react';
import { Filter, X } from 'lucide-react';
import '../styles/VideoFilters.css';

interface VideoFiltersProps {
  selectedSport: string;
  selectedCategory: string;
  onSportChange: (sport: string) => void;
  onCategoryChange: (category: string) => void;
  onClearFilters: () => void;
  availableSports: string[];
  availableCategories: string[];
  totalVideos: number;
  filteredCount: number;
}

const VideoFilters: React.FC<VideoFiltersProps> = ({
  selectedSport,
  selectedCategory,
  onSportChange,
  onCategoryChange,
  onClearFilters,
  availableSports,
  availableCategories,
  totalVideos,
  filteredCount
}) => {
  const hasActiveFilters = selectedSport || selectedCategory;
  const isFiltered = filteredCount < totalVideos;

  return (
    <div className="video-filters">
      <div className="filters-header">
        <div className="filters-title">
          <Filter size={16} />
          <span>Filter Videos</span>
          {isFiltered && (
            <span className="filter-count">
              ({filteredCount} of {totalVideos})
            </span>
          )}
        </div>
        
        {hasActiveFilters && (
          <button 
            className="clear-filters-btn"
            onClick={onClearFilters}
            aria-label="Clear all filters"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      <div className="filters-content">
        <div className="filter-group">
          <label htmlFor="sport-filter" className="filter-label">
            Sport
          </label>
          <select
            id="sport-filter"
            value={selectedSport}
            onChange={(e) => onSportChange(e.target.value)}
            className="filter-select"
          >
            <option value="">All Sports</option>
            {availableSports.map(sport => (
              <option key={sport} value={sport}>
                {sport}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="category-filter" className="filter-label">
            Category
          </label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="active-filters">
          <span className="active-filters-label">Active filters:</span>
          <div className="filter-tags">
            {selectedSport && (
              <div className="filter-tag">
                <span>{selectedSport}</span>
                <button
                  className="remove-filter-btn"
                  onClick={() => onSportChange('')}
                  aria-label={`Remove ${selectedSport} filter`}
                >
                  <X size={12} />
                </button>
              </div>
            )}
            {selectedCategory && (
              <div className="filter-tag">
                <span>{selectedCategory}</span>
                <button
                  className="remove-filter-btn"
                  onClick={() => onCategoryChange('')}
                  aria-label={`Remove ${selectedCategory} filter`}
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoFilters;