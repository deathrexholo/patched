import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, AlertCircle } from 'lucide-react';
import AthleteOnboardingLayout from './AthleteOnboardingLayout';
import { useOnboardingStore, Subcategory } from '../store/onboardingStore';
import { getSubcategoriesByPositionId } from '../data/subcategoriesConfig';
import '../styles/SubcategorySelectionPage.css';

const SubcategorySelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    selectedPosition, 
    selectedSubcategory, 
    setSubcategory, 
    setError, 
    error 
  } = useOnboardingStore();
  
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [justSelected, setJustSelected] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Initialize subcategories on component mount
  useEffect(() => {
    // Check if we have a selected position
    if (!selectedPosition) {
      const errorMsg = 'No position selected. Please select a position first.';
      setError(errorMsg);
      setValidationErrors([errorMsg]);
      navigate('/athlete-onboarding/position');
      return;
    }

    // Load subcategories for the selected position
    const positionSubcategories = getSubcategoriesByPositionId(selectedPosition.id);
    if (positionSubcategories.length === 0) {
      const errorMsg = `No subcategories available for ${selectedPosition.name}.`;
      setError(errorMsg);
      setValidationErrors([errorMsg]);
      navigate('/athlete-onboarding/position');
      return;
    }

    setSubcategories(positionSubcategories);
    // Clear any previous errors when successfully loading subcategories
    setValidationErrors([]);
    setError(null);
  }, [selectedPosition, setError, navigate]);

  const handleSubcategoryClick = (subcategory: Subcategory) => {
    setHasUserInteracted(true);
    
    // Clear any previous errors
    setValidationErrors([]);
    setError(null);
    
    // Select the subcategory
    setSubcategory(subcategory);
    setJustSelected(subcategory.id);
    
    // Clear the selection animation after a delay
    setTimeout(() => {
      setJustSelected(null);
    }, 600);
  };

  const handleContinue = async () => {
    setHasUserInteracted(true);
    
    // Validate that a subcategory is selected
    if (!selectedSubcategory) {
      setValidationErrors(['Please select a subcategory']);
      setError('Please select a subcategory');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors([]);
      
      // Navigate to specialization page or complete onboarding
      navigate('/athlete-onboarding/specialization');
    } catch (error) {
      console.error('Error navigating to specialization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      setError(errorMessage);
      setValidationErrors([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/athlete-onboarding/position');
  };

  if (!selectedPosition) {
    return (
      <AthleteOnboardingLayout
        title="Loading..."
        showBackButton={false}
        onBack={() => {}}
      >
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading position information...</p>
        </div>
      </AthleteOnboardingLayout>
    );
  }

  return (
    <AthleteOnboardingLayout
      title="Choose Your Subcategory"
      showBackButton={true}
      onBack={handleBack}
    >
      <div className="subcategory-selection-container">
        <div className="subcategory-selection-header">
          <div className="selected-position-info">
            <span className="position-name">{selectedPosition.name}</span>
          </div>
          <p className="subcategory-selection-description">
            Select your specific area of expertise within {selectedPosition.name}.
          </p>
          {selectedPosition.description && (
            <p className="position-description">{selectedPosition.description}</p>
          )}
          
          {/* Validation Error Display */}
          {(error || validationErrors.length > 0) && hasUserInteracted && (
            <div className="validation-error-container" role="alert" aria-live="polite">
              <div className="validation-error">
                <AlertCircle size={20} className="error-icon" />
                <div className="error-content">
                  <span className="error-message">
                    {error || validationErrors.join(', ')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Subcategories list */}
        <div className="subcategories-list">
          {subcategories.length > 0 ? (
            subcategories.map((subcategory) => (
              <SubcategoryListItem
                key={subcategory.id}
                subcategory={subcategory}
                isSelected={selectedSubcategory?.id === subcategory.id}
                onSelect={handleSubcategoryClick}
                disabled={isLoading}
                justSelected={justSelected === subcategory.id}
              />
            ))
          ) : (
            <div className="no-subcategories-found">
              <p>No subcategories available for {selectedPosition.name}</p>
              <button onClick={handleBack} className="back-to-position-btn">
                <ArrowLeft size={16} />
                Choose Different Position
              </button>
            </div>
          )}
        </div>

        {/* Continue button */}
        <div className="continue-section">
          {selectedSubcategory ? (
            <button
              className={`continue-btn ${isLoading ? 'loading-state' : ''} ${validationErrors.length > 0 ? 'error-state' : ''}`}
              onClick={handleContinue}
              disabled={isLoading || validationErrors.length > 0}
              aria-describedby={validationErrors.length > 0 ? "subcategory-validation-error" : undefined}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner" style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                  Loading...
                </>
              ) : (
                <>
                  Continue with {selectedSubcategory.name}
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
                setValidationErrors(['Please select a subcategory']);
                setError('Please select a subcategory');
              }}
            >
              Select a subcategory to continue
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

interface SubcategoryListItemProps {
  subcategory: Subcategory;
  isSelected: boolean;
  onSelect: (subcategory: Subcategory) => void;
  disabled?: boolean;
  justSelected?: boolean;
}

const SubcategoryListItem: React.FC<SubcategoryListItemProps> = ({ 
  subcategory, 
  isSelected, 
  onSelect, 
  disabled = false,
  justSelected = false
}) => {
  const handleClick = () => {
    if (!disabled) {
      onSelect(subcategory);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onSelect(subcategory);
    }
  };

  return (
    <div
      className={`subcategory-list-item ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${justSelected ? 'just-selected' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Select ${subcategory.name}`}
    >
      <div className="subcategory-radio">
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
      
      <div className="subcategory-name">
        {subcategory.name}
      </div>
    </div>
  );
};

export default SubcategorySelectionPage;