// Filter modal for feed content with advanced filtering options
import { memo, useState, useCallback, ChangeEvent } from 'react';
import { X, Filter, RefreshCw } from 'lucide-react';
import './Modal.css';

interface FilterValues {
  contentType: string;
  sortBy: string;
  timeRange: string;
  category: string;
  minLikes: string;
  minViews: string;
  hasMedia: string;
  userType: string;
  location: string;
  language: string;
  engagementLevel?: string;
  verifiedOnly?: boolean;
  originalContent?: boolean;
  followingStatus?: string;
}

interface FilterModalProps {
  currentFilters?: Partial<FilterValues>;
  onApply: (filters: Partial<FilterValues>) => void;
  onClose: () => void;
}

const FilterModal = memo<FilterModalProps>(({ currentFilters = {}, onApply, onClose }) => {
  const [filters, setFilters] = useState<FilterValues>({
    contentType: currentFilters.contentType || 'all',
    sortBy: currentFilters.sortBy || 'newest',
    timeRange: currentFilters.timeRange || 'all',
    category: currentFilters.category || '',
    minLikes: currentFilters.minLikes || '',
    minViews: currentFilters.minViews || '',
    hasMedia: currentFilters.hasMedia || 'all',
    userType: currentFilters.userType || 'all',
    location: currentFilters.location || '',
    language: currentFilters.language || 'all'
  });

  const [activeTab, setActiveTab] = useState<'content' | 'engagement' | 'user'>('content');

  const handleFilterChange = useCallback((key: keyof FilterValues, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    // Remove empty string values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '' && value !== 'all')
    );
    onApply(cleanFilters);
  }, [filters, onApply]);

  const handleResetFilters = useCallback(() => {
    const resetFilters: FilterValues = {
      contentType: 'all',
      sortBy: 'newest',
      timeRange: 'all',
      category: '',
      minLikes: '',
      minViews: '',
      hasMedia: 'all',
      userType: 'all',
      location: '',
      language: 'all'
    };
    setFilters(resetFilters);
  }, []);

  const getActiveFiltersCount = useCallback((): number => {
    return Object.values(filters).filter(value => value !== '' && value !== 'all').length;
  }, [filters]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="filter-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="filter-header-title">
            <Filter size={20} />
            <h3>Filters</h3>
            <span className="active-filters-count">
              {getActiveFiltersCount()} active
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            Content
          </button>
          <button 
            className={`filter-tab ${activeTab === 'engagement' ? 'active' : ''}`}
            onClick={() => setActiveTab('engagement')}
          >
            Engagement
          </button>
          <button 
            className={`filter-tab ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
          >
            User
          </button>
        </div>

        {/* Filter Content */}
        <div className="filter-content">
          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="filter-tab-content">
              <div className="filter-group">
                <label>Content Type</label>
                <select 
                  value={filters.contentType}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => handleFilterChange('contentType', e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Content</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                  <option value="talent">Talent Showcase</option>
                  <option value="profile">Profiles</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Sort By</label>
                <select 
                  value={filters.sortBy}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => handleFilterChange('sortBy', e.target.value)}
                  className="filter-select"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="trending">Trending</option>
                  <option value="mostLiked">Most Liked</option>
                  <option value="mostViewed">Most Viewed</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Time Range</label>
                <select 
                  value={filters.timeRange}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => handleFilterChange('timeRange', e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Category</label>
                <select 
                  value={filters.category}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => handleFilterChange('category', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Categories</option>
                  <option value="Sports">Sports</option>
                  <option value="Training">Training</option>
                  <option value="Competition">Competition</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Nutrition">Nutrition</option>
                  <option value="Motivation">Motivation</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Technique">Technique</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Media Content</label>
                <select 
                  value={filters.hasMedia}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => handleFilterChange('hasMedia', e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Any Content</option>
                  <option value="with_media">With Media Only</option>
                  <option value="text_only">Text Only</option>
                </select>
              </div>
            </div>
          )}

          {/* Engagement Tab */}
          {activeTab === 'engagement' && (
            <div className="filter-tab-content">
              <div className="filter-group">
                <label>Minimum Likes</label>
                <input
                  type="number"
                  placeholder="e.g., 10"
                  value={filters.minLikes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('minLikes', e.target.value)}
                  className="filter-input"
                  min="0"
                />
              </div>

              <div className="filter-group">
                <label>Minimum Views</label>
                <input
                  type="number"
                  placeholder="e.g., 100"
                  value={filters.minViews}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('minViews', e.target.value)}
                  className="filter-input"
                  min="0"
                />
              </div>

              <div className="filter-group">
                <label>Engagement Level</label>
                <div className="filter-radio-group">
                  <label className="radio-option">
                    <input 
                      type="radio" 
                      name="engagement" 
                      value="all"
                      checked={!filters.engagementLevel || filters.engagementLevel === 'all'}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('engagementLevel', e.target.value)}
                    />
                    <span>All Posts</span>
                  </label>
                  <label className="radio-option">
                    <input 
                      type="radio" 
                      name="engagement" 
                      value="high"
                      checked={filters.engagementLevel === 'high'}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('engagementLevel', e.target.value)}
                    />
                    <span>High Engagement</span>
                  </label>
                  <label className="radio-option">
                    <input 
                      type="radio" 
                      name="engagement" 
                      value="viral"
                      checked={filters.engagementLevel === 'viral'}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('engagementLevel', e.target.value)}
                    />
                    <span>Viral Content</span>
                  </label>
                </div>
              </div>

              <div className="filter-group">
                <label>Content Quality</label>
                <div className="filter-checkbox-group">
                  <label className="checkbox-option">
                    <input 
                      type="checkbox" 
                      checked={filters.verifiedOnly || false}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('verifiedOnly', e.target.checked)}
                    />
                    <span>Verified users only</span>
                  </label>
                  <label className="checkbox-option">
                    <input 
                      type="checkbox" 
                      checked={filters.originalContent || false}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('originalContent', e.target.checked)}
                    />
                    <span>Original content only</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* User Tab */}
          {activeTab === 'user' && (
            <div className="filter-tab-content">
              <div className="filter-group">
                <label>User Type</label>
                <select 
                  value={filters.userType}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => handleFilterChange('userType', e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Users</option>
                  <option value="athlete">Athletes</option>
                  <option value="coach">Coaches</option>
                  <option value="organization">Organizations</option>
                  <option value="fan">Fans</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Location</label>
                <input
                  type="text"
                  placeholder="Enter city, state, or country"
                  value={filters.location}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('location', e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label>Language</label>
                <select 
                  value={filters.language}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => handleFilterChange('language', e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Languages</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="pa">Punjabi</option>
                  <option value="mr">Marathi</option>
                  <option value="bn">Bengali</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                  <option value="kn">Kannada</option>
                  <option value="ml">Malayalam</option>
                  <option value="gu">Gujarati</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Following Status</label>
                <div className="filter-radio-group">
                  <label className="radio-option">
                    <input 
                      type="radio" 
                      name="following" 
                      value="all"
                      checked={!filters.followingStatus || filters.followingStatus === 'all'}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('followingStatus', e.target.value)}
                    />
                    <span>All Users</span>
                  </label>
                  <label className="radio-option">
                    <input 
                      type="radio" 
                      name="following" 
                      value="following"
                      checked={filters.followingStatus === 'following'}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('followingStatus', e.target.value)}
                    />
                    <span>People I Follow</span>
                  </label>
                  <label className="radio-option">
                    <input 
                      type="radio" 
                      name="following" 
                      value="not_following"
                      checked={filters.followingStatus === 'not_following'}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange('followingStatus', e.target.value)}
                    />
                    <span>New Discoveries</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filter Actions */}
        <div className="filter-actions">
          <button 
            className="reset-filters-btn"
            onClick={handleResetFilters}
          >
            <RefreshCw size={16} />
            Reset All
          </button>
          
          <div className="primary-actions">
            <button 
              className="cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="apply-filters-btn"
              onClick={handleApplyFilters}
            >
              Apply Filters ({getActiveFiltersCount()})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

FilterModal.displayName = 'FilterModal';

export default FilterModal;
