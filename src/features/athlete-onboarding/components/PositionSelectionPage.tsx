import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ArrowLeft, AlertCircle } from 'lucide-react';
import AthleteOnboardingLayout from './AthleteOnboardingLayout';
import { useOnboardingStore, Position } from '../store/onboardingStore';
import { getPositionsBySportId } from '../data/positionsConfig';
import { getSportById } from '../data/sportsConfig';
import { getSubcategoriesByPositionId } from '../data/subcategoriesConfig';
import {
  validatePositionSelection,
  validateSportSelection,
  ValidationMessages,
  formatValidationErrors
} from '../utils/validationUtils';
import '../styles/PositionSelectionPage.css';

const PositionSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { sportId } = useParams<{ sportId?: string }>();
  const { 
    selectedSports, 
    selectedPosition, 
    setPosition, 
    setError, 
    setSports,
    error 
  } = useOnboardingStore();
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [justSelected, setJustSelected] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Initialize sport and positions on component mount
  useEffect(() => {
    // Check if we have any selected sports
    if (selectedSports.length === 0) {
      const errorMsg = 'No sports selected. Please select at least one sport.';
      setError(errorMsg);
      setValidationErrors([errorMsg]);
      navigate('/athlete-onboarding/sport');
      return;
    }

    // If sport ID is provided in URL, ensure it's in the selected sports
    if (sportId) {
      const currentSport = selectedSports.find(s => s.id === sportId);
      if (!currentSport) {
        const sport = getSportById(sportId);
        if (sport) {
        // Validate the sport before setting it
        const sportValidation = validateSportSelection(sport);
        if (!sportValidation.isValid) {
          setValidationErrors(sportValidation.errors);
          setError(formatValidationErrors(sportValidation.errors));
          navigate('/athlete-onboarding/sport');
          return;
        }
          setSports([...selectedSports.filter(s => s.id !== sport.id), sport]);
        } else {
          const errorMsg = 'Sport not found. Please select a valid sport.';
          setError(errorMsg);
          setValidationErrors([errorMsg]);
          navigate('/athlete-onboarding/sport');
          return;
        }
      }
    }

    // Load positions for the primary sport (first selected sport or sport from URL)
    const primarySport = sportId ? selectedSports.find(s => s.id === sportId) || selectedSports[0] : selectedSports[0];
    
    if (primarySport) {
      const sportPositions = getPositionsBySportId(primarySport.id);
      if (sportPositions.length === 0) {
        const errorMsg = `No positions available for ${primarySport.name}.`;
        setError(errorMsg);
        setValidationErrors([errorMsg]);
        navigate('/athlete-onboarding/sport');
        return;
      }

      setPositions(sportPositions);
    }
    // Clear any previous errors when successfully loading positions
    setValidationErrors([]);
    setError(null);
  }, [sportId, selectedSports, setSports, setError, navigate]);

  const handlePositionClick = (position: Position) => {
    setHasUserInteracted(true);
    
    // Validate position selection
    const currentSport = selectedSports.find(s => s.id === sportId) || selectedSports[0];
    const validation = validatePositionSelection(position, currentSport);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setError(formatValidationErrors(validation.errors));
      return;
    }
    
    // Clear any previous errors
    setValidationErrors([]);
    setError(null);
    
    // Select the position
    setPosition(position);
    setJustSelected(position.id);
    
    // Clear the selection animation after a delay
    setTimeout(() => {
      setJustSelected(null);
    }, 600);
  };

  const handleContinue = async () => {
    setHasUserInteracted(true);

    // Validate position selection before proceeding
    const currentSport = selectedSports.find(s => s.id === sportId) || selectedSports[0];
    const positionValidation = validatePositionSelection(selectedPosition, currentSport);
    if (!positionValidation.isValid) {
      setValidationErrors(positionValidation.errors);
      setError(formatValidationErrors(positionValidation.errors));
      return;
    }

    // Validate sport selection as well
    const sportValidation = selectedSports.length > 0 ? { isValid: true, errors: [] } : { isValid: false, errors: ['No sports selected'] };
    if (!sportValidation.isValid) {
      setValidationErrors(sportValidation.errors);
      setError(formatValidationErrors(sportValidation.errors));
      navigate('/athlete-onboarding/sport');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors([]);

      // Additional validation for navigation
      if (selectedSports.length === 0 || !selectedPosition?.id) {
        throw new Error('Invalid sport or position selection');
      }

      // Check if the position has subcategories
      const positionSubcategories = getSubcategoriesByPositionId(selectedPosition.id);

      if (positionSubcategories.length > 0) {
        // Navigate to subcategory selection page if subcategories exist
        navigate('/athlete-onboarding/subcategory');
      } else {
        // Skip subcategory page and go directly to specialization or login
        navigate('/athlete-onboarding/specialization');
      }
    } catch (error) {
      console.error('Error navigating to specialization:', error);
      const errorMessage = error instanceof Error ? error.message : ValidationMessages.NETWORK_ERROR;
      setError(errorMessage);
      setValidationErrors([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/athlete-onboarding/sport');
  };

  const currentSport = selectedSports.find(s => s.id === sportId) || selectedSports[0];
  
  if (!currentSport) {
    return (
      <AthleteOnboardingLayout
        title="Loading..."
        showBackButton={false}
        onBack={() => {}}
      >
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading sport information...</p>
        </div>
      </AthleteOnboardingLayout>
    );
  }

  return (
    <AthleteOnboardingLayout
      title={`Choose Your Position`}
      showBackButton={true}
      onBack={handleBack}
    >
      <div className="position-selection-container">
        <div className="position-selection-header">
          <div className="selected-sport-info">
            <span className="sport-name">{currentSport.name}</span>
          </div>
          <p className="position-selection-description">
            What position do you play in {currentSport.name}? This helps us provide relevant content and connect you with similar players.
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
        </div>

        {/* Positions list */}
        <div className="positions-list">
          {positions.length > 0 ? (
            positions.map((position) => (
              <PositionListItem
                key={position.id}
                position={position}
                isSelected={selectedPosition?.id === position.id}
                onSelect={handlePositionClick}
                disabled={isLoading}
                justSelected={justSelected === position.id}
              />
            ))
          ) : (
            <div className="no-positions-found">
              <p>No positions available for {currentSport.name}</p>
              <button onClick={handleBack} className="back-to-sport-btn">
                <ArrowLeft size={16} />
                Choose Different Sport
              </button>
            </div>
          )}
        </div>

        {/* Continue button */}
        <div className="continue-section">
          {selectedPosition ? (
            <button
              className={`continue-btn ${isLoading ? 'loading-state' : ''} ${validationErrors.length > 0 ? 'error-state' : ''}`}
              onClick={handleContinue}
              disabled={isLoading || validationErrors.length > 0}
              aria-describedby={validationErrors.length > 0 ? "position-validation-error" : undefined}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                  Loading...
                </>
              ) : (
                <>
                  Continue as {selectedPosition.name}
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
                const validation = validatePositionSelection(selectedPosition, currentSport);
                setValidationErrors(validation.errors);
                setError(formatValidationErrors(validation.errors));
              }}
            >
              Select a position to continue
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

interface PositionListItemProps {
  position: Position;
  isSelected: boolean;
  onSelect: (position: Position) => void;
  disabled?: boolean;
  justSelected?: boolean;
}

const PositionListItem: React.FC<PositionListItemProps> = ({ 
  position, 
  isSelected, 
  onSelect, 
  disabled = false,
  justSelected = false
}) => {
  const handleClick = () => {
    if (!disabled) {
      onSelect(position);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onSelect(position);
    }
  };

  return (
    <div
      className={`position-list-item ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${justSelected ? 'just-selected' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Select ${position.name}`}
    >
      <div className="position-radio">
        <input
          type="radio"
          checked={isSelected}
          onChange={() => {}} // Handled by parent click
          tabIndex={-1}
          aria-hidden="true"
        />
        <div className="radio-custom">
          {isSelected && <span className="radio-dot"></span>}
        </div>
      </div>
      
      <div className="position-name">
        {position.name}
      </div>
    </div>
  );
};

export default PositionSelectionPage;