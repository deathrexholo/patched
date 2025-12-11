import React from 'react';
import { Edit3, MapPin, Mail, Globe, Building } from 'lucide-react';
import { PersonalDetails } from '../types/ProfileTypes';
import '../styles/OrganizationInfoSection.css';

interface OrganizationInfoSectionProps {
  personalDetails: PersonalDetails;
  isOwner: boolean;
  onEdit: () => void;
}

const OrganizationInfoSection: React.FC<OrganizationInfoSectionProps> = ({
  personalDetails,
  isOwner,
  onEdit
}) => {
  const hasOrganizationInfo = personalDetails.organizationName ||
                             personalDetails.organizationType ||
                             personalDetails.location ||
                             personalDetails.contactEmail ||
                             personalDetails.website;

  return (
    <section className="profile-section organization-info-section" aria-labelledby="organization-info-heading">
      <div className="section-header">
        <h2 id="organization-info-heading" className="section-title">
          Organization Information
        </h2>
        {isOwner && (
          <button
            className="section-action"
            onClick={onEdit}
            aria-label="Edit organization information"
            type="button"
          >
            <Edit3 size={16} aria-hidden="true" />
            <span>Edit</span>
          </button>
        )}
      </div>

      <div className="section-content">
        {!hasOrganizationInfo ? (
          <div className="empty-state">
            <Building size={48} className="empty-state-icon" aria-hidden="true" />
            <p className="empty-state-text">No organization information added yet</p>
            {isOwner && (
              <button
                className="empty-state-button"
                onClick={onEdit}
                type="button"
              >
                Add Organization Info
              </button>
            )}
          </div>
        ) : (
          <div className="organization-info-grid">
            {personalDetails.organizationName && (
              <div className="info-item">
                <div className="info-icon">
                  <Building size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Organization Name</span>
                  <span className="info-value">{personalDetails.organizationName}</span>
                </div>
              </div>
            )}

            {personalDetails.organizationType && (
              <div className="info-item">
                <div className="info-icon">
                  <Building size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Organization Type</span>
                  <span className="info-value">{personalDetails.organizationType}</span>
                </div>
              </div>
            )}

            {personalDetails.location && (
              <div className="info-item">
                <div className="info-icon">
                  <MapPin size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Location</span>
                  <span className="info-value">{personalDetails.location}</span>
                </div>
              </div>
            )}

            {personalDetails.contactEmail && (
              <div className="info-item">
                <div className="info-icon">
                  <Mail size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Contact Email</span>
                  <span className="info-value">{personalDetails.contactEmail}</span>
                </div>
              </div>
            )}

            {personalDetails.website && (
              <div className="info-item">
                <div className="info-icon">
                  <Globe size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Website</span>
                  <span className="info-value">
                    <a
                      href={personalDetails.website.startsWith('http') ? personalDetails.website : `https://${personalDetails.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="website-link"
                    >
                      {personalDetails.website}
                    </a>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default OrganizationInfoSection;