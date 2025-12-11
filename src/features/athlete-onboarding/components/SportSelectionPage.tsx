import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, X, AlertCircle } from 'lucide-react';
import AthleteOnboardingLayout from './AthleteOnboardingLayout';
import { useOnboardingStore, Sport } from '../store/onboardingStore';
import { SPORTS_CONFIG } from '../data/sportsConfig';
import { 
  validateSportSelection, 
  ValidationMessages,
  formatValidationErrors 
} from '../utils/validationUtils';
import '../styles/SportSelectionPage.css';

const SportSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedSports, toggleSport, setError, error } = useOnboardingStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [justSelected, setJustSelected] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Filter sports based on search term
  const filteredSports = SPORTS_CONFIG.filter(sport =>
    sport.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSportClick = (sport: Sport) => {
    setHasUserInteracted(true);
    
    // Clear any previous errors
    setValidationErrors([]);
    setError(null);
    
    // Toggle the sport selection
    toggleSport(sport);
    setJustSelected(sport.id);
    
    // Clear the selection animation after a delay
    setTimeout(() => {
      setJustSelected(null);
    }, 600);
  };

  const handleContinue = async () => {
    setHasUserInteracted(true);
    
    // Validate that at least one sport is selected
    if (selectedSports.length === 0) {
      setValidationErrors(['Please select at least one sport']);
      setError('Please select at least one sport');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors([]);
      
      // Navigate to appropriate position selection based on number of sports
      if (selectedSports.length > 1) {
        // Multiple sports - use multi-sport position flow
        navigate('/athlete-onboarding/multi-position');
      } else {
        // Single sport - use original position selection
        navigate('/athlete-onboarding/position');
      }
    } catch (error) {
      console.error('Error navigating to position selection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      setError(errorMessage);
      setValidationErrors([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
      setError(null);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    // Clear validation errors when clearing search
    if (validationErrors.length > 0) {
      setValidationErrors([]);
      setError(null);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <AthleteOnboardingLayout
      title="Choose Your Sport"
      showBackButton={true}
      onBack={handleBack}
    >
      <div className="sport-selection-container">
        <div className="sport-selection-header">
          <p className="sport-selection-description">
            Select the sports you're interested in. You can choose multiple sports.
          </p>
          
          {/* Validation Error Display */}
          {(error || validationErrors.length > 0) && hasUserInteracted && (
            <div className="validation-error-container" role="alert" aria-live="polite">
              <div className="validation-error">
                <AlertCircle size={20} className="error-icon" />
                <div className="error-content">
                  <span className="error-message">
                    {error || formatValidationErrors(validationErrors)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Search bar */}
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search sports..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
                aria-label="Search sports"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="clear-search-btn"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sports list */}
        <div className="sports-list">
          {filteredSports.length > 0 ? (
            filteredSports.map((sport) => (
              <SportListItem
                key={sport.id}
                sport={sport}
                isSelected={selectedSports.some(s => s.id === sport.id)}
                onSelect={handleSportClick}
                disabled={isLoading}
                justSelected={justSelected === sport.id}
              />
            ))
          ) : (
            <div className="no-sports-found">
              <p>No sports found matching "{searchTerm}"</p>
              <button onClick={clearSearch} className="clear-search-link">
                Clear search
              </button>
            </div>
          )}
        </div>

        {/* Continue button */}
        <div className="continue-section">
          {selectedSports.length > 0 ? (
            <button
              className={`continue-btn ${isLoading ? 'loading-state' : ''} ${validationErrors.length > 0 ? 'error-state' : ''}`}
              onClick={handleContinue}
              disabled={isLoading || validationErrors.length > 0}
              aria-describedby={validationErrors.length > 0 ? "sport-validation-error" : undefined}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                  Loading...
                </>
              ) : (
                <>
                  Continue with {selectedSports.length} sport{selectedSports.length > 1 ? 's' : ''}
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          ) : (
            <button
              className="continue-btn disabled"
              disabled={true}
              onClick={() => {
                setHasUserInteracted(true);
                setValidationErrors(['Please select at least one sport']);
                setError('Please select at least one sport');
              }}
            >
              Select at least one sport to continue
            </button>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <p>Loading...</p>
          </div>
        )}
      </div>
    </AthleteOnboardingLayout>
  );
};

interface SportListItemProps {
  sport: Sport;
  isSelected: boolean;
  onSelect: (sport: Sport) => void;
  disabled?: boolean;
  justSelected?: boolean;
}

const SportListItem: React.FC<SportListItemProps> = ({ 
  sport, 
  isSelected, 
  onSelect, 
  disabled = false,
  justSelected = false
}) => {
  const handleClick = () => {
    if (!disabled) {
      onSelect(sport);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onSelect(sport);
    }
  };

  return (
    <div
      className={`sport-list-item ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${justSelected ? 'just-selected' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${sport.name}`}
    >
      <div className="sport-checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}} // Handled by parent click
          tabIndex={-1}
          aria-hidden="true"
        />
        <div className="checkbox-custom">
          {isSelected && <span className="checkmark">✓</span>}
        </div>
      </div>
      
      <div className="sport-name">
        {sport.name}
      </div>
    </div>
  );
};

export default SportSelectionPage;