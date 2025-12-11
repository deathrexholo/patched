import React, { useState, useEffect } from 'react';
import { X, Building, MapPin, Mail, Globe } from 'lucide-react';
import { PersonalDetails } from '../types/ProfileTypes';
import '../styles/OrganizationInfoModal.css';

interface OrganizationInfoModalProps {
  isOpen: boolean;
  personalDetails: PersonalDetails;
  onClose: () => void;
  onSave: (personalDetails: PersonalDetails) => void;
}

const OrganizationInfoModal: React.FC<OrganizationInfoModalProps> = ({
  isOpen,
  personalDetails,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: '',
    location: '',
    contactEmail: '',
    website: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        organizationName: personalDetails.organizationName || '',
        organizationType: personalDetails.organizationType || '',
        location: personalDetails.location || '',
        contactEmail: personalDetails.contactEmail || '',
        website: personalDetails.website || ''
      });
      setErrors({});
    }
  }, [isOpen, personalDetails]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.organizationName && formData.organizationName.length > 100) {
      newErrors.organizationName = 'Organization name must be 100 characters or less';
    }

    if (formData.organizationType && formData.organizationType.length > 100) {
      newErrors.organizationType = 'Organization type must be 100 characters or less';
    }

    if (formData.location && formData.location.length > 100) {
      newErrors.location = 'Location must be 100 characters or less';
    }

    if (formData.contactEmail && !isValidEmail(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    if (formData.website && !isValidUrl(formData.website)) {
      newErrors.website = 'Please enter a valid website URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string.startsWith('http') ? string : `https://${string}`);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedPersonalDetails: PersonalDetails = {
        ...personalDetails,
        organizationName: formData.organizationName.trim() || undefined,
        organizationType: formData.organizationType.trim() || undefined,
        location: formData.location.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        website: formData.website.trim() || undefined
      };

      onSave(updatedPersonalDetails);
      onClose();
    } catch (error) {
      console.error('Error saving organization info:', error);
      setErrors({ submit: 'Failed to save organization info. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="organization-modal-title"
    >
      <div className="modal-container organization-info-modal">
        <div className="modal-header">
          <div className="modal-title-section">
            <Building size={24} className="modal-icon" aria-hidden="true" />
            <h2 id="organization-modal-title" className="modal-title">
              Organization Information
            </h2>
          </div>
          <button
            className="modal-close-button"
            onClick={handleClose}
            aria-label="Close modal"
            type="button"
            disabled={isSubmitting}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="organization-name" className="form-label">
                <Building size={16} aria-hidden="true" />
                Organization Name
              </label>
              <input
                id="organization-name"
                type="text"
                className={`form-input ${errors.organizationName ? 'error' : ''}`}
                value={formData.organizationName}
                onChange={(e) => handleInputChange('organizationName', e.target.value)}
                placeholder="e.g., ABC Sports Academy"
                maxLength={100}
                aria-describedby={errors.organizationName ? 'name-error' : undefined}
              />
              {errors.organizationName && (
                <span id="name-error" className="form-error" role="alert">
                  {errors.organizationName}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="organization-type" className="form-label">
                <Building size={16} aria-hidden="true" />
                Organization Type
              </label>
              <select
                id="organization-type"
                className={`form-select ${errors.organizationType ? 'error' : ''}`}
                value={formData.organizationType}
                onChange={(e) => handleInputChange('organizationType', e.target.value)}
                aria-describedby={errors.organizationType ? 'type-error' : undefined}
              >
                <option value="">Select organization type</option>
                <option value="Training Facility">Training Facility</option>
                <option value="Sports Club">Sports Club</option>
                <option value="Academy">Academy</option>
                <option value="School">School</option>
                <option value="Professional Team">Professional Team</option>
                <option value="Other">Other</option>
              </select>
              {errors.organizationType && (
                <span id="type-error" className="form-error" role="alert">
                  {errors.organizationType}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="location" className="form-label">
                <MapPin size={16} aria-hidden="true" />
                Location
              </label>
              <input
                id="location"
                type="text"
                className={`form-input ${errors.location ? 'error' : ''}`}
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., New York, NY"
                maxLength={100}
                aria-describedby={errors.location ? 'location-error' : undefined}
              />
              {errors.location && (
                <span id="location-error" className="form-error" role="alert">
                  {errors.location}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="contact-email" className="form-label">
                <Mail size={16} aria-hidden="true" />
                Contact Email
              </label>
              <input
                id="contact-email"
                type="email"
                className={`form-input ${errors.contactEmail ? 'error' : ''}`}
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder="contact@organization.com"
                aria-describedby={errors.contactEmail ? 'email-error' : undefined}
              />
              {errors.contactEmail && (
                <span id="email-error" className="form-error" role="alert">
                  {errors.contactEmail}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="website" className="form-label">
                <Globe size={16} aria-hidden="true" />
                Website
              </label>
              <input
                id="website"
                type="url"
                className={`form-input ${errors.website ? 'error' : ''}`}
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://example.com"
                aria-describedby={errors.website ? 'website-error' : undefined}
              />
              {errors.website && (
                <span id="website-error" className="form-error" role="alert">
                  {errors.website}
                </span>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="form-error submit-error" role="alert">
              {errors.submit}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="modal-button secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-button primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Organization Info'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizationInfoModal;
