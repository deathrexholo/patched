import React, { useState, useEffect } from 'react';
import { X, Award, Upload, Calendar, Building, ExternalLink } from 'lucide-react';
import { Certificate } from '../types/ProfileTypes';
import '../styles/CertificateModal.css';

interface CertificateModalProps {
  isOpen: boolean;
  certificate?: Certificate | null;
  onClose: () => void;
  onSave: (certificate: Omit<Certificate, 'id'>) => void;
}

const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  certificate,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    issuingOrganization: '',
    dateIssued: '',
    expirationDate: '',
    verificationUrl: '',
    certificateImageUrl: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or certificate changes
  useEffect(() => {
    if (isOpen) {
      if (certificate) {
        // Edit mode - populate form with existing data
        setFormData({
          name: certificate.name,
          issuingOrganization: certificate.issuingOrganization,
          dateIssued: new Date(certificate.dateIssued).toISOString().split('T')[0],
          expirationDate: certificate.expirationDate 
            ? new Date(certificate.expirationDate).toISOString().split('T')[0] 
            : '',
          verificationUrl: certificate.verificationUrl || '',
          certificateImageUrl: certificate.certificateImageUrl || ''
        });
      } else {
        // Add mode - reset form
        setFormData({
          name: '',
          issuingOrganization: '',
          dateIssued: '',
          expirationDate: '',
          verificationUrl: '',
          certificateImageUrl: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, certificate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Only validate name length if provided
    if (formData.name.trim() && formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    // Only validate organization name length if provided
    if (formData.issuingOrganization.trim() && formData.issuingOrganization.length > 100) {
      newErrors.issuingOrganization = 'Organization name must be 100 characters or less';
    }

    // Only validate date issued if provided
    if (formData.dateIssued) {
      const issuedDate = new Date(formData.dateIssued);
      const today = new Date();
      if (issuedDate > today) {
        newErrors.dateIssued = 'Date issued cannot be in the future';
      }
    }

    // Only validate expiration date relationship if both dates are provided
    if (formData.dateIssued && formData.expirationDate) {
      const issuedDate = new Date(formData.dateIssued);
      const expirationDate = new Date(formData.expirationDate);
      if (expirationDate <= issuedDate) {
        newErrors.expirationDate = 'Expiration date must be after the issue date';
      }
    }

    // Validate URL only if provided
    if (formData.verificationUrl && !isValidUrl(formData.verificationUrl)) {
      newErrors.verificationUrl = 'Please enter a valid verification URL';
    }

    // Validate URL only if provided
    if (formData.certificateImageUrl && !isValidUrl(formData.certificateImageUrl)) {
      newErrors.certificateImageUrl = 'Please enter a valid image URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
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
      const certificateData: Omit<Certificate, 'id'> = {
        name: formData.name.trim(),
        issuingOrganization: formData.issuingOrganization.trim(),
        dateIssued: new Date(formData.dateIssued),
        expirationDate: formData.expirationDate ? new Date(formData.expirationDate) : undefined,
        verificationUrl: formData.verificationUrl.trim() || undefined,
        certificateImageUrl: formData.certificateImageUrl.trim() || undefined
      };

      onSave(certificateData);
      onClose();
    } catch (error) {
      console.error('Error saving certificate:', error);
      setErrors({ submit: 'Failed to save certificate. Please try again.' });
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
      aria-labelledby="certificate-modal-title"
    >
      <div className="modal-container certificate-modal">
        <div className="modal-header">
          <div className="modal-title-section">
            <Award size={24} className="modal-icon" aria-hidden="true" />
            <h2 id="certificate-modal-title" className="modal-title">
              {certificate ? 'Edit Certificate' : 'Add Certificate'}
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
              <label htmlFor="certificate-name" className="form-label">
                <Award size={16} aria-hidden="true" />
                Certificate Title / Name
                <span className="form-label-optional">(Optional)</span>
              </label>
              <input
                id="certificate-name"
                type="text"
                className={`form-input ${errors.name ? 'error' : ''}`}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Advanced First Aid, Fitness Instructor Certification, Coaching License"
                maxLength={100}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <span id="name-error" className="form-error" role="alert">
                  {errors.name}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="certificate-organization" className="form-label">
                <Building size={16} aria-hidden="true" />
                Who issued this certificate?
                <span className="form-label-optional">(Optional)</span>
              </label>
              <input
                id="certificate-organization"
                type="text"
                className={`form-input ${errors.issuingOrganization ? 'error' : ''}`}
                value={formData.issuingOrganization}
                onChange={(e) => handleInputChange('issuingOrganization', e.target.value)}
                placeholder="e.g., American Red Cross, National Safety Council"
                maxLength={100}
                aria-describedby={errors.issuingOrganization ? 'organization-error' : undefined}
              />
              {errors.issuingOrganization && (
                <span id="organization-error" className="form-error" role="alert">
                  {errors.issuingOrganization}
                </span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="certificate-date-issued" className="form-label">
                  <Calendar size={16} aria-hidden="true" />
                  Date Issued
                  <span className="form-label-optional">(Optional)</span>
                </label>
                <input
                  id="certificate-date-issued"
                  type="date"
                  className={`form-input ${errors.dateIssued ? 'error' : ''}`}
                  value={formData.dateIssued}
                  onChange={(e) => handleInputChange('dateIssued', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  aria-describedby={errors.dateIssued ? 'date-issued-error' : undefined}
                />
                {errors.dateIssued && (
                  <span id="date-issued-error" className="form-error" role="alert">
                    {errors.dateIssued}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="certificate-expiration" className="form-label">
                  <Calendar size={16} aria-hidden="true" />
                  Expiration Date
                  <span className="form-label-optional">(Optional)</span>
                </label>
                <input
                  id="certificate-expiration"
                  type="date"
                  className={`form-input ${errors.expirationDate ? 'error' : ''}`}
                  value={formData.expirationDate}
                  onChange={(e) => handleInputChange('expirationDate', e.target.value)}
                  min={formData.dateIssued || undefined}
                  aria-describedby={errors.expirationDate ? 'expiration-error' : 'expiration-help'}
                />
                <div id="expiration-help" className="form-help">
                  Leave blank if the certificate doesn't expire
                </div>
                {errors.expirationDate && (
                  <span id="expiration-error" className="form-error" role="alert">
                    {errors.expirationDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-group">
              <label htmlFor="certificate-verification" className="form-label">
                <ExternalLink size={16} aria-hidden="true" />
                Verification URL
                <span className="form-label-optional">(Optional)</span>
              </label>
              <input
                id="certificate-verification"
                type="url"
                className={`form-input ${errors.verificationUrl ? 'error' : ''}`}
                value={formData.verificationUrl}
                onChange={(e) => handleInputChange('verificationUrl', e.target.value)}
                placeholder="https://verify.organization.com/certificate/123456"
                aria-describedby={errors.verificationUrl ? 'verification-error' : 'verification-help'}
              />
              <div id="verification-help" className="form-help">
                Add a URL where others can verify this certificate online
              </div>
              {errors.verificationUrl && (
                <span id="verification-error" className="form-error" role="alert">
                  {errors.verificationUrl}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="certificate-image" className="form-label">
                <Upload size={16} aria-hidden="true" />
                Certificate Image URL
                <span className="form-label-optional">(Optional)</span>
              </label>
              <input
                id="certificate-image"
                type="url"
                className={`form-input ${errors.certificateImageUrl ? 'error' : ''}`}
                value={formData.certificateImageUrl}
                onChange={(e) => handleInputChange('certificateImageUrl', e.target.value)}
                placeholder="https://example.com/certificate.jpg"
                aria-describedby={errors.certificateImageUrl ? 'image-error' : 'image-help'}
              />
              <div id="image-help" className="form-help">
                Add a URL to an image of your certificate
              </div>
              {errors.certificateImageUrl && (
                <span id="image-error" className="form-error" role="alert">
                  {errors.certificateImageUrl}
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
              {isSubmitting ? 'Saving...' : (certificate ? 'Update Certificate' : 'Add Certificate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CertificateModal;