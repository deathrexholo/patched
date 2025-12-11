import React, { useEffect } from 'react';
import { SearchResults, TalentVideo, SearchFacets } from '../../types/models/search';
import { User, Event } from '../../types/models';
import { useBulkSelection, BulkSelectableItem } from '../../contexts/BulkSelectionContext';
import BulkSelectionToolbar from './BulkSelectionToolbar';
import './SearchResultsDisplay.css';
import './BulkSelectionToolbar.css';

interface SearchResultsDisplayProps {
  results: SearchResults;
  searchTerm: string;
  onItemClick?: (item: User | TalentVideo | Event) => void;
  onFacetClick?: (facetType: string, facetValue: string) => void;
  onBulkOperationsClick?: () => void;
  enableBulkSelection?: boolean;
  className?: string;
}

const SearchResultsDisplay: React.FC<SearchResultsDisplayProps> = ({
  results,
  searchTerm,
  onItemClick,
  onFacetClick,
  onBulkOperationsClick,
  enableBulkSelection = false,
  className = ''
}) => {
  const bulkSelection = useBulkSelection();

  // Update current page items when results change
  useEffect(() => {
    if (enableBulkSelection && bulkSelection && results.items.length > 0) {
      bulkSelection.setCurrentPageItems(results.items as BulkSelectableItem[]);
    }
  }, [results.items, bulkSelection, enableBulkSelection]);
  // Highlight search terms in text
  const highlightText = (text: string, term: string): React.ReactNode => {
    if (!term.trim() || !text) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : part
    );
  };

  // Get relevance score for an item
  const getRelevanceScore = (itemId: string): number => {
    return results.relevanceScores?.[itemId] || 0;
  };

  // Handle item selection
  const handleItemSelection = (item: BulkSelectableItem, event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (!enableBulkSelection || !bulkSelection) return;
    
    if (event.target.checked) {
      bulkSelection.selectItem(item);
    } else {
      bulkSelection.deselectItem(item.id);
    }
  };

  // Handle card click
  const handleCardClick = (item: User | TalentVideo | Event, event: React.MouseEvent) => {
    // Don't trigger card click if clicking on checkbox
    if ((event.target as HTMLElement).closest('.bulk-selection-checkbox')) {
      return;
    }
    onItemClick?.(item);
  };

  // Render bulk selection checkbox
  const renderBulkCheckbox = (item: BulkSelectableItem) => {
    if (!enableBulkSelection || !bulkSelection) return null;

    const isSelected = bulkSelection.isItemSelected(item.id);

    return (
      <div className="bulk-selection-checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => handleItemSelection(item, e)}
          className="bulk-checkbox-input"
          aria-label={`Select ${item.id}`}
        />
      </div>
    );
  };

  // Render user card
  const renderUserCard = (user: User) => {
    const relevanceScore = getRelevanceScore(user.id);
    const isSelected = bulkSelection?.isItemSelected(user.id) || false;
    
    return (
      <div 
        key={user.id} 
        className={`result-card user-card ${isSelected ? 'selected' : ''}`}
        onClick={(e) => handleCardClick(user, e)}
      >
        <div className="card-header">
          {renderBulkCheckbox(user as BulkSelectableItem)}
          <div className="user-avatar">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">
                {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="user-info">
            <h3 className="user-name">
              {highlightText(user.displayName || 'Unknown User', searchTerm)}
            </h3>
            <p className="user-email">
              {highlightText(user.email || '', searchTerm)}
            </p>
            {user.username && (
              <p className="user-username">
                @{highlightText(user.username, searchTerm)}
              </p>
            )}
          </div>
          <div className="relevance-score">
            <span className="score-label">Relevance</span>
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${Math.min(relevanceScore * 100, 100)}%` }}
              />
            </div>
            <span className="score-value">{Math.round(relevanceScore * 100)}%</span>
          </div>
        </div>
        
        <div className="card-content">
          {user.bio && (
            <p className="user-bio">
              {highlightText(user.bio, searchTerm)}
            </p>
          )}
          
          <div className="user-metadata">
            {user.role && (
              <span className={`role-badge role-${user.role}`}>
                {user.role}
              </span>
            )}
            {user.isVerified && (
              <span className="verification-badge">
                <svg className="verification-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
            {user.location && (
              <span className="location-badge">
                <svg className="location-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {highlightText(user.location, searchTerm)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render video card
  const renderVideoCard = (video: TalentVideo) => {
    const relevanceScore = getRelevanceScore(video.id);
    const isSelected = bulkSelection?.isItemSelected(video.id) || false;
    
    return (
      <div 
        key={video.id} 
        className={`result-card video-card ${isSelected ? 'selected' : ''}`}
        onClick={(e) => handleCardClick(video, e)}
      >
        <div className="card-header">
          {renderBulkCheckbox(video as BulkSelectableItem)}
          <div className="video-thumbnail">
            {video.thumbnailUrl ? (
              <img src={video.thumbnailUrl} alt={video.title} className="thumbnail-image" />
            ) : (
              <div className="thumbnail-placeholder">
                <svg className="video-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <div className="video-info">
            <h3 className="video-title">
              {highlightText(video.title, searchTerm)}
            </h3>
            {video.userName && (
              <p className="video-author">
                by {highlightText(video.userName, searchTerm)}
              </p>
            )}
          </div>
          <div className="relevance-score">
            <span className="score-label">Relevance</span>
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${Math.min(relevanceScore * 100, 100)}%` }}
              />
            </div>
            <span className="score-value">{Math.round(relevanceScore * 100)}%</span>
          </div>
        </div>
        
        <div className="card-content">
          {video.description && (
            <p className="video-description">
              {highlightText(video.description, searchTerm)}
            </p>
          )}
          
          <div className="video-metadata">
            <span className={`verification-status status-${video.verificationStatus}`}>
              {video.verificationStatus}
            </span>
            {video.category && (
              <span className="category-badge">
                {highlightText(video.category, searchTerm)}
              </span>
            )}
            <span className="date-badge">
              {new Date(video.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render event card
  const renderEventCard = (event: Event) => {
    const relevanceScore = getRelevanceScore(event.id);
    const isSelected = bulkSelection?.isItemSelected(event.id) || false;
    
    return (
      <div 
        key={event.id} 
        className={`result-card event-card ${isSelected ? 'selected' : ''}`}
        onClick={(e) => handleCardClick(event, e)}
      >
        <div className="card-header">
          {renderBulkCheckbox(event as BulkSelectableItem)}
          <div className="event-icon">
            <svg className="calendar-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="event-info">
            <h3 className="event-title">
              {highlightText(event.title, searchTerm)}
            </h3>
            {event.location && (
              <p className="event-location">
                {highlightText(event.location, searchTerm)}
              </p>
            )}
          </div>
          <div className="relevance-score">
            <span className="score-label">Relevance</span>
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${Math.min(relevanceScore * 100, 100)}%` }}
              />
            </div>
            <span className="score-value">{Math.round(relevanceScore * 100)}%</span>
          </div>
        </div>
        
        <div className="card-content">
          {event.description && (
            <p className="event-description">
              {highlightText(event.description, searchTerm)}
            </p>
          )}
          
          <div className="event-metadata">
            <span className={`status-badge status-${event.status || 'unknown'}`}>
              {event.status || 'Unknown'}
            </span>
            <span className="date-badge">
              {event.createdAt instanceof Date 
                ? event.createdAt.toLocaleDateString()
                : typeof event.createdAt === 'string'
                ? new Date(event.createdAt).toLocaleDateString()
                : event.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render facets sidebar
  const renderFacets = (facets: SearchFacets) => {
    const facetEntries = Object.entries(facets).filter(([_, values]) => 
      values && Object.keys(values).length > 0
    );

    if (facetEntries.length === 0) return null;

    return (
      <div className="facets-sidebar">
        <h3 className="facets-title">Filter Results</h3>
        {facetEntries.map(([facetType, facetValues]) => (
          <div key={facetType} className="facet-group">
            <h4 className="facet-group-title">
              {facetType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </h4>
            <ul className="facet-list">
              {Object.entries(facetValues!).map(([value, count]) => (
                <li key={value} className="facet-item">
                  <button
                    type="button"
                    onClick={() => onFacetClick?.(facetType, value)}
                    className="facet-button"
                  >
                    <span className="facet-value">{value}</span>
                    <span className="facet-count">({String(count)})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  // Render no results state
  const renderNoResults = () => (
    <div className="no-results">
      <div className="no-results-icon">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      </div>
      <h3 className="no-results-title">No results found</h3>
      <p className="no-results-message">
        We couldn't find anything matching "{searchTerm}". Try adjusting your search or filters.
      </p>
      {results.suggestions && results.suggestions.length > 0 && (
        <div className="search-suggestions">
          <p className="suggestions-title">Did you mean:</p>
          <ul className="suggestions-list">
            {results.suggestions.map((suggestion, index) => (
              <li key={index} className="suggestion-item">
                <button type="button" className="suggestion-link">
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // Render item based on type
  const renderItem = (item: User | TalentVideo | Event) => {
    if ('role' in item) return renderUserCard(item as User);
    if ('verificationStatus' in item) return renderVideoCard(item as TalentVideo);
    if ('title' in item && 'status' in item) return renderEventCard(item as Event);
    return null;
  };

  return (
    <div className={`search-results-display ${className}`}>
      {results.items.length === 0 ? (
        renderNoResults()
      ) : (
        <div className="results-container">
          {results.facets && renderFacets(results.facets)}
          
          <div className="results-main">
            {enableBulkSelection && (
              <BulkSelectionToolbar 
                onBulkOperationsClick={onBulkOperationsClick}
                className="results-bulk-toolbar"
              />
            )}
            
            <div className="results-header">
              <h2 className="results-count">
                {results.totalCount} result{results.totalCount !== 1 ? 's' : ''} found
                {results.searchTime && (
                  <span className="search-time"> in {results.searchTime}ms</span>
                )}
              </h2>
            </div>
            
            <div className="results-list">
              {results.items.map(renderItem)}
            </div>
            
            {results.hasMore && (
              <div className="load-more">
                <button type="button" className="load-more-button">
                  Load More Results
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResultsDisplay;