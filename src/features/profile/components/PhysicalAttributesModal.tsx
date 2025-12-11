import React, { useState, useEffect } from 'react';
import { X, Save, Activity } from 'lucide-react';
import { PhysicalAttributes } from '../types/ProfileTypes';
import '../styles/SectionModal.css';

export interface PhysicalAttributesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (physicalAttributes: PhysicalAttributes) => void;
  physicalAttributes: PhysicalAttributes;
}

const PhysicalAttributesModal: React.FC<PhysicalAttributesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  physicalAttributes
}) => {
  const [formData, setFormData] = useState<PhysicalAttributes>(physicalAttributes);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update form data when props change
  useEffect(() => {
    setFormData(physicalAttributes);
    setHasUnsavedChanges(false);
  }, [physicalAttributes, isOpen]);

  const handleFieldChange = (field: keyof PhysicalAttributes, value: string | number) => {
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="section-modal physical-attributes-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <Activity size={20} />
            <h2 className="modal-title">Edit Physical Attributes</h2>
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
            <h3 className="form-section-title">Physical Measurements</h3>
            <div className="form-grid">
              {/* Height */}
              <div className="form-field">
                <label htmlFor="height" className="form-label">Height (cm)</label>
                <input
                  id="height"
                  type="number"
                  className="form-input"
                  placeholder="e.g., 178"
                  value={formData.height || ''}
                  onChange={(e) => handleFieldChange('height', e.target.value ? Number(e.target.value) : '')}
                />
              </div>

              {/* Weight */}
              <div className="form-field">
                <label htmlFor="weight" className="form-label">Weight (kg)</label>
                <input
                  id="weight"
                  type="number"
                  className="form-input"
                  placeholder="e.g., 68"
                  value={formData.weight || ''}
                  onChange={(e) => handleFieldChange('weight', e.target.value ? Number(e.target.value) : '')}
                />
              </div>

              {/* Hand Preference */}
              <div className="form-field">
                <label htmlFor="dominantSide" className="form-label">Hand Preference</label>
                <select
                  id="dominantSide"
                  className="form-input"
                  value={formData.dominantSide || ''}
                  onChange={(e) => handleFieldChange('dominantSide', e.target.value)}
                >
                  <option value="">Select hand preference</option>
                  <option value="Left">Left-Handed</option>
                  <option value="Right">Right-Handed</option>
                </select>
              </div>
            </div>

            <h3 className="form-section-title">Performance Metrics</h3>
            <div className="form-grid">
              {/* Personal Best */}
              <div className="form-field">
                <label htmlFor="personalBest" className="form-label">Personal Best</label>
                <input
                  id="personalBest"
                  type="text"
                  className="form-input"
                  placeholder="e.g., 100m in 10.5s"
                  value={formData.personalBest || ''}
                  onChange={(e) => handleFieldChange('personalBest', e.target.value)}
                />
              </div>

              {/* Season Best */}
              <div className="form-field">
                <label htmlFor="seasonBest" className="form-label">Season Best</label>
                <input
                  id="seasonBest"
                  type="text"
                  className="form-input"
                  placeholder="e.g., 200m in 21.2s"
                  value={formData.seasonBest || ''}
                  onChange={(e) => handleFieldChange('seasonBest', e.target.value)}
                />
              </div>
            </div>

            <h3 className="form-section-title">Training Information</h3>
            <div className="form-grid">
              {/* Coach Name */}
              <div className="form-field">
                <label htmlFor="coachName" className="form-label">Coach Name</label>
                <input
                  id="coachName"
                  type="text"
                  className="form-input"
                  placeholder="Enter coach's name"
                  value={formData.coachName || ''}
                  onChange={(e) => handleFieldChange('coachName', e.target.value)}
                />
              </div>

              {/* Coach Contact */}
              <div className="form-field">
                <label htmlFor="coachContact" className="form-label">Coach Contact</label>
                <input
                  id="coachContact"
                  type="text"
                  className="form-input"
                  placeholder="Phone or email"
                  value={formData.coachContact || ''}
                  onChange={(e) => handleFieldChange('coachContact', e.target.value)}
                />
              </div>

              {/* Training Academy */}
              <div className="form-field">
                <label htmlFor="trainingAcademy" className="form-label">Training Academy</label>
                <input
                  id="trainingAcademy"
                  type="text"
                  className="form-input"
                  placeholder="Enter academy name"
                  value={formData.trainingAcademy || ''}
                  onChange={(e) => handleFieldChange('trainingAcademy', e.target.value)}
                />
              </div>

              {/* School Name */}
              <div className="form-field">
                <label htmlFor="schoolName" className="form-label">School</label>
                <input
                  id="schoolName"
                  type="text"
                  className="form-input"
                  placeholder="Enter school name"
                  value={formData.schoolName || ''}
                  onChange={(e) => handleFieldChange('schoolName', e.target.value)}
                />
              </div>

              {/* Club Name */}
              <div className="form-field">
                <label htmlFor="clubName" className="form-label">Club</label>
                <input
                  id="clubName"
                  type="text"
                  className="form-input"
                  placeholder="Enter club name"
                  value={formData.clubName || ''}
                  onChange={(e) => handleFieldChange('clubName', e.target.value)}
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

export default PhysicalAttributesModal;