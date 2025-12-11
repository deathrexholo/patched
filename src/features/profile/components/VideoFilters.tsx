import React from 'react';
import { Filter, X } from 'lucide-react';
import '../styles/VideoFilters.css';

interface VideoFiltersProps {
  selectedSport: string;
  selectedSkillCategory: string;
  onSportChange: (sport: string) => void;
  onSkillCategoryChange: (skillCategory: string) => void;
  availableSports: string[];
  availableSkillCategories: string[];
  totalVideos: number;
  filteredVideos: number;
}

const VideoFilters: React.FC<VideoFiltersProps> = ({
  selectedSport,
  selectedSkillCategory,
  onSportChange,
  onSkillCategoryChange,
  availableSports,
  availableSkillCategories,
  totalVideos,
  filteredVideos
}) => {
  const hasActiveFilters = selectedSport || selectedSkillCategory;

  const clearAllFilters = () => {
    onSportChange('');
    onSkillCategoryChange('');
  };

  const clearSportFilter = () => {
    onSportChange('');
    onSkillCategoryChange(''); // Clear skill category when sport is cleared
  };

  const clearSkillCategoryFilter = () => {
    onSkillCategoryChange('');
  };

  return (
    <div className="video-filters">
      <div className="filters-header">
        <div className="filters-title">
          <Filter size={16} />
          <span>Filter Videos</span>
        </div>
        {hasActiveFilters && (
          <button
            className="clear-all-btn"
            onClick={clearAllFilters}
            aria-label="Clear all filters"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="filters-content">
        <div className="filter-group">
          <label htmlFor="sport-filter" className="filter-label">
            Sport
          </label>
          <div className="filter-select-wrapper">
            <select
              id="sport-filter"
              className="filter-select"
              value={selectedSport}
              onChange={(e) => onSportChange(e.target.value)}
            >
              <option value="">All Sports</option>
              {availableSports.map(sport => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
            {selectedSport && (
              <button
                className="clear-filter-btn"
                onClick={clearSportFilter}
                aria-label="Clear sport filter"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="skill-filter" className="filter-label">
            Skill Category
          </label>
          <div className="filter-select-wrapper">
            <select
              id="skill-filter"
              className="filter-select"
              value={selectedSkillCategory}
              onChange={(e) => onSkillCategoryChange(e.target.value)}
              disabled={!selectedSport}
            >
              <option value="">All Skills</option>
              {availableSkillCategories.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
            {selectedSkillCategory && (
              <button
                className="clear-filter-btn"
                onClick={clearSkillCategoryFilter}
                aria-label="Clear skill category filter"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="filter-results">
          <span className="results-text">
            Showing {filteredVideos} of {totalVideos} videos
          </span>
        </div>
      )}

      {hasActiveFilters && (
        <div className="active-filters">
          {selectedSport && (
            <div className="filter-tag">
              <span>Sport: {selectedSport}</span>
              <button
                className="remove-tag-btn"
                onClick={clearSportFilter}
                aria-label={`Remove ${selectedSport} filter`}
              >
                <X size={12} />
              </button>
            </div>
          )}
          {selectedSkillCategory && (
            <div className="filter-tag">
              <span>Skill: {selectedSkillCategory}</span>
              <button
                className="remove-tag-btn"
                onClick={clearSkillCategoryFilter}
                aria-label={`Remove ${selectedSkillCategory} filter`}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoFilters;