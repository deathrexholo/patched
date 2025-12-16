import React, { useState, useEffect } from 'react';
import { X, Building, MapPin, Mail, Globe, User, Award, Phone, FileText, Calendar, Users, Trophy } from 'lucide-react';
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
    // Basic Information
    organizationName: '',
    organizationType: '',
    registrationNumber: '',
    yearEstablished: '',
    website: '',

    // Contact Information
    contactPerson: '',
    designation: '',
    contactEmail: '',
    primaryPhone: '',
    secondaryPhone: '',

    // Address
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
    location: '',

    // Sports & Players
    sports: '',
    numberOfPlayers: '',
    ageGroups: '',

    // Facilities
    facilities: '',

    // Achievements
    achievements: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        // Basic Information
        organizationName: personalDetails.organizationName || '',
        organizationType: personalDetails.organizationType || '',
        registrationNumber: personalDetails.registrationNumber || '',
        yearEstablished: personalDetails.yearEstablished || '',
        website: personalDetails.website || '',

        // Contact Information
        contactPerson: personalDetails.contactPerson || '',
        designation: personalDetails.designation || '',
        contactEmail: personalDetails.contactEmail || '',
        primaryPhone: personalDetails.primaryPhone || '',
        secondaryPhone: personalDetails.secondaryPhone || '',

        // Address
        addressLine1: personalDetails.address?.line1 || '',
        addressLine2: personalDetails.address?.line2 || '',
        city: personalDetails.address?.city || personalDetails.city || '',
        state: personalDetails.address?.state || personalDetails.state || '',
        pincode: personalDetails.address?.pincode || '',
        country: personalDetails.address?.country || personalDetails.country || '',
        location: personalDetails.location || '',

        // Sports & Players (convert arrays to comma-separated strings)
        sports: personalDetails.sports?.join(', ') || '',
        numberOfPlayers: personalDetails.numberOfPlayers || '',
        ageGroups: personalDetails.ageGroups?.join(', ') || '',

        // Facilities (convert array to comma-separated string)
        facilities: personalDetails.facilities?.join(', ') || '',

        // Achievements
        achievements: personalDetails.achievements || ''
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
      // Convert comma-separated strings back to arrays
      const sportsArray = formData.sports
        ? formData.sports.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : [];
      const ageGroupsArray = formData.ageGroups
        ? formData.ageGroups.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : [];
      const facilitiesArray = formData.facilities
        ? formData.facilities.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : [];

      const updatedPersonalDetails: PersonalDetails = {
        ...personalDetails,
        // Basic Information
        organizationName: formData.organizationName.trim() || undefined,
        organizationType: formData.organizationType.trim() || undefined,
        registrationNumber: formData.registrationNumber.trim() || undefined,
        yearEstablished: formData.yearEstablished.trim() || undefined,
        website: formData.website.trim() || undefined,

        // Contact Information
        contactPerson: formData.contactPerson.trim() || undefined,
        designation: formData.designation.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        primaryPhone: formData.primaryPhone.trim() || undefined,
        secondaryPhone: formData.secondaryPhone.trim() || undefined,

        // Address
        address: {
          line1: formData.addressLine1.trim(),
          line2: formData.addressLine2.trim() || undefined,
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          country: formData.country.trim()
        },
        location: formData.location.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        country: formData.country.trim() || undefined,

        // Sports & Players
        sports: sportsArray.length > 0 ? sportsArray : undefined,
        numberOfPlayers: formData.numberOfPlayers.trim() || undefined,
        ageGroups: ageGroupsArray.length > 0 ? ageGroupsArray : undefined,

        // Facilities
        facilities: facilitiesArray.length > 0 ? facilitiesArray : undefined,

        // Achievements
        achievements: formData.achievements.trim() || undefined
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
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="section-subtitle">Basic Information</h3>

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
              />
              {errors.organizationName && (
                <span className="form-error" role="alert">{errors.organizationName}</span>
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
              >
                <option value="">Select organization type</option>
                <option value="Sports Academy">Sports Academy</option>
                <option value="School">School</option>
                <option value="College/University">College/University</option>
                <option value="Sports Club">Sports Club</option>
                <option value="Training Center">Training Center</option>
                <option value="Government Organization">Government Organization</option>
                <option value="NGO">NGO</option>
                <option value="Private Organization">Private Organization</option>
                <option value="Professional Team">Professional Team</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="registration-number" className="form-label">
                <FileText size={16} aria-hidden="true" />
                Registration Number
              </label>
              <input
                id="registration-number"
                type="text"
                className="form-input"
                value={formData.registrationNumber}
                onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                placeholder="e.g., REG123456"
              />
            </div>

            <div className="form-group">
              <label htmlFor="year-established" className="form-label">
                <Calendar size={16} aria-hidden="true" />
                Year Established
              </label>
              <input
                id="year-established"
                type="text"
                className="form-input"
                value={formData.yearEstablished}
                onChange={(e) => handleInputChange('yearEstablished', e.target.value)}
                placeholder="e.g., 2020"
                maxLength={4}
              />
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
              />
              {errors.website && (
                <span className="form-error" role="alert">{errors.website}</span>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="form-section">
            <h3 className="section-subtitle">Contact Information</h3>

            <div className="form-group">
              <label htmlFor="contact-person" className="form-label">
                <User size={16} aria-hidden="true" />
                Contact Person
              </label>
              <input
                id="contact-person"
                type="text"
                className="form-input"
                value={formData.contactPerson}
                onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                placeholder="e.g., John Doe"
              />
            </div>

            <div className="form-group">
              <label htmlFor="designation" className="form-label">
                <Award size={16} aria-hidden="true" />
                Designation
              </label>
              <input
                id="designation"
                type="text"
                className="form-input"
                value={formData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                placeholder="e.g., Director"
              />
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
              />
              {errors.contactEmail && (
                <span className="form-error" role="alert">{errors.contactEmail}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="primary-phone" className="form-label">
                <Phone size={16} aria-hidden="true" />
                Primary Phone
              </label>
              <input
                id="primary-phone"
                type="tel"
                className="form-input"
                value={formData.primaryPhone}
                onChange={(e) => handleInputChange('primaryPhone', e.target.value)}
                placeholder="e.g., +1234567890"
              />
            </div>

            <div className="form-group">
              <label htmlFor="secondary-phone" className="form-label">
                <Phone size={16} aria-hidden="true" />
                Secondary Phone (Optional)
              </label>
              <input
                id="secondary-phone"
                type="tel"
                className="form-input"
                value={formData.secondaryPhone}
                onChange={(e) => handleInputChange('secondaryPhone', e.target.value)}
                placeholder="e.g., +0987654321"
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="form-section">
            <h3 className="section-subtitle">Address</h3>

            <div className="form-group">
              <label htmlFor="address-line1" className="form-label">
                <MapPin size={16} aria-hidden="true" />
                Address Line 1
              </label>
              <input
                id="address-line1"
                type="text"
                className="form-input"
                value={formData.addressLine1}
                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="form-group">
              <label htmlFor="address-line2" className="form-label">
                <MapPin size={16} aria-hidden="true" />
                Address Line 2 (Optional)
              </label>
              <input
                id="address-line2"
                type="text"
                className="form-input"
                value={formData.addressLine2}
                onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city" className="form-label">City</label>
                <input
                  id="city"
                  type="text"
                  className="form-input"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label htmlFor="state" className="form-label">State</label>
                <input
                  id="state"
                  type="text"
                  className="form-input"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="State"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pincode" className="form-label">Pincode</label>
                <input
                  id="pincode"
                  type="text"
                  className="form-input"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                  placeholder="Postal code"
                  maxLength={10}
                />
              </div>

              <div className="form-group">
                <label htmlFor="country" className="form-label">Country</label>
                <input
                  id="country"
                  type="text"
                  className="form-input"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="Country"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="location" className="form-label">
                <MapPin size={16} aria-hidden="true" />
                Location (City, State)
              </label>
              <input
                id="location"
                type="text"
                className="form-input"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., New York, NY"
              />
            </div>
          </div>

          {/* Sports & Players */}
          <div className="form-section">
            <h3 className="section-subtitle">Sports & Players</h3>

            <div className="form-group">
              <label htmlFor="sports" className="form-label">
                <Trophy size={16} aria-hidden="true" />
                Sports Offered (comma-separated)
              </label>
              <input
                id="sports"
                type="text"
                className="form-input"
                value={formData.sports}
                onChange={(e) => handleInputChange('sports', e.target.value)}
                placeholder="e.g., Cricket, Football, Basketball"
              />
              <small className="form-hint">Enter multiple sports separated by commas</small>
            </div>

            <div className="form-group">
              <label htmlFor="number-of-players" className="form-label">
                <Users size={16} aria-hidden="true" />
                Number of Players
              </label>
              <input
                id="number-of-players"
                type="text"
                className="form-input"
                value={formData.numberOfPlayers}
                onChange={(e) => handleInputChange('numberOfPlayers', e.target.value)}
                placeholder="e.g., 100-200"
              />
            </div>

            <div className="form-group">
              <label htmlFor="age-groups" className="form-label">
                <Users size={16} aria-hidden="true" />
                Age Groups (comma-separated)
              </label>
              <input
                id="age-groups"
                type="text"
                className="form-input"
                value={formData.ageGroups}
                onChange={(e) => handleInputChange('ageGroups', e.target.value)}
                placeholder="e.g., U-10, U-12, U-14, U-16, U-18, Adults"
              />
              <small className="form-hint">Enter multiple age groups separated by commas</small>
            </div>
          </div>

          {/* Facilities */}
          <div className="form-section">
            <h3 className="section-subtitle">Facilities</h3>

            <div className="form-group">
              <label htmlFor="facilities" className="form-label">
                <Building size={16} aria-hidden="true" />
                Facilities (comma-separated)
              </label>
              <input
                id="facilities"
                type="text"
                className="form-input"
                value={formData.facilities}
                onChange={(e) => handleInputChange('facilities', e.target.value)}
                placeholder="e.g., Training Ground, Gym, Hostel, Coaching Staff"
              />
              <small className="form-hint">Enter multiple facilities separated by commas</small>
            </div>
          </div>

          {/* Achievements */}
          <div className="form-section">
            <h3 className="section-subtitle">Achievements</h3>

            <div className="form-group">
              <label htmlFor="achievements" className="form-label">
                <Award size={16} aria-hidden="true" />
                Achievements (Optional)
              </label>
              <textarea
                id="achievements"
                className="form-textarea"
                value={formData.achievements}
                onChange={(e) => handleInputChange('achievements', e.target.value)}
                placeholder="Describe your organization's achievements..."
                rows={4}
              />
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
