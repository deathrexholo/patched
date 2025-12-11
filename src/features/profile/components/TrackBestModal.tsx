import React, { useState, useEffect } from 'react';
import { X, Save, Target } from 'lucide-react';
import { TrackBest } from '../types/ProfileTypes';
import '../styles/SectionModal.css';

export interface TrackBestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trackBest: TrackBest) => void;
  trackBest: TrackBest;
  sport?: string;
}

const TrackBestModal: React.FC<TrackBestModalProps> = ({
  isOpen,
  onClose,
  onSave,
  trackBest,
  sport = 'cricket'
}) => {
  const [formData, setFormData] = useState<TrackBest>(trackBest);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update form data when props change
  useEffect(() => {
    setFormData(trackBest);
    setHasUnsavedChanges(false);
  }, [trackBest, isOpen]);

  const handleFieldChange = (field: keyof TrackBest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    onSave(formData);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        setHasUnsavedChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Get sport-specific field configurations
  const getSportFieldConfig = (sportName: string) => {
    const sportLower = sportName.toLowerCase();
    
    switch (sportLower) {
      case 'cricket':
        return {
          title: 'Cricket Performance',
          fields: [
            { key: 'runs', label: 'Runs Scored', placeholder: 'e.g., 100', unit: 'runs' },
            { key: 'overs', label: 'Overs Faced', placeholder: 'e.g., 10.2', unit: 'overs' },
            { key: 'strikeRate', label: 'Strike Rate', placeholder: 'e.g., 150.5', unit: 'SR' }
          ]
        };
      case 'football':
      case 'soccer':
        return {
          title: 'Football Performance',
          fields: [
            { key: 'goals', label: 'Goals Scored', placeholder: 'e.g., 3', unit: 'goals' },
            { key: 'minutes', label: 'Minutes Played', placeholder: 'e.g., 90', unit: 'min' },
            { key: 'assists', label: 'Assists Made', placeholder: 'e.g., 2', unit: 'assists' }
          ]
        };
      case 'basketball':
        return {
          title: 'Basketball Performance',
          fields: [
            { key: 'points', label: 'Points Scored', placeholder: 'e.g., 35', unit: 'pts' },
            { key: 'rebounds', label: 'Rebounds', placeholder: 'e.g., 12', unit: 'reb' },
            { key: 'gameTime', label: 'Game Time', placeholder: 'e.g., 40', unit: 'min' }
          ]
        };
      case 'tennis':
        return {
          title: 'Tennis Performance',
          fields: [
            { key: 'aces', label: 'Aces Served', placeholder: 'e.g., 15', unit: 'aces' },
            { key: 'winners', label: 'Winners Hit', placeholder: 'e.g., 25', unit: 'winners' },
            { key: 'matchDuration', label: 'Match Duration', placeholder: 'e.g., 120', unit: 'min' }
          ]
        };
      case 'badminton':
        return {
          title: 'Badminton Performance',
          fields: [
            { key: 'field1', label: 'Smashes', placeholder: 'e.g., 20', unit: 'smashes' },
            { key: 'field2', label: 'Game Duration', placeholder: 'e.g., 45', unit: 'min' },
            { key: 'field3', label: 'Points Won', placeholder: 'e.g., 21', unit: 'points' }
          ]
        };
      case 'volleyball':
        return {
          title: 'Volleyball Performance',
          fields: [
            { key: 'field1', label: 'Spikes', placeholder: 'e.g., 15', unit: 'spikes' },
            { key: 'field2', label: 'Blocks', placeholder: 'e.g., 8', unit: 'blocks' },
            { key: 'field3', label: 'Serves', placeholder: 'e.g., 12', unit: 'serves' }
          ]
        };
      default:
        return {
          title: `${sportName} Performance`,
          fields: [
            { key: 'field1', label: 'Performance 1', placeholder: 'Enter value', unit: '' },
            { key: 'field2', label: 'Performance 2', placeholder: 'Enter value', unit: '' },
            { key: 'field3', label: 'Performance 3', placeholder: 'Enter value', unit: '' }
          ]
        };
    }
  };

  if (!isOpen) return null;

  const sportConfig = getSportFieldConfig(sport);

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="section-modal track-best-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <Target size={20} />
            <h2 className="modal-title">Edit Track Best</h2>
          </div>
          <button
            className="modal-close-button"
            onClick={handleClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-section">
            <h3 className="form-section-title">{sportConfig.title}</h3>
            <p className="form-section-description">
              Record your best performance in a single {sport} match or game
            </p>
            
            <div className="form-grid">
              {sportConfig.fields.map((field) => (
                <div key={field.key} className="form-field">
                  <label htmlFor={field.key} className="form-label">
                    {field.label}
                    {field.unit && <span className="field-unit">({field.unit})</span>}
                  </label>
                  <input
                    id={field.key}
                    type="text"
                    className="form-input"
                    placeholder={field.placeholder}
                    value={formData[field.key as keyof TrackBest] || ''}
                    onChange={(e) => handleFieldChange(field.key as keyof TrackBest, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Match Details</h3>
            <p className="form-section-description">
              Optional information about when and where this performance occurred
            </p>
            
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="matchDate" className="form-label">Match Date</label>
                <input
                  id="matchDate"
                  type="date"
                  className="form-input"
                  value={formData.matchDate || ''}
                  onChange={(e) => handleFieldChange('matchDate', e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="opponent" className="form-label">Opponent</label>
                <input
                  id="opponent"
                  type="text"
                  className="form-input"
                  placeholder="e.g., Team Name or Player Name"
                  value={formData.opponent || ''}
                  onChange={(e) => handleFieldChange('opponent', e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="venue" className="form-label">Venue</label>
                <input
                  id="venue"
                  type="text"
                  className="form-input"
                  placeholder="e.g., Stadium Name, City"
                  value={formData.venue || ''}
                  onChange={(e) => handleFieldChange('venue', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-footer-left">
            {hasUnsavedChanges && (
              <span className="unsaved-indicator">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="modal-footer-right">
            <button
              className="modal-button secondary"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              className="modal-button primary"
              onClick={handleSave}
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackBestModal;