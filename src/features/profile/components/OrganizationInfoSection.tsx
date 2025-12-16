import React from 'react';
import { Edit3, MapPin, Mail, Globe, Building, Phone, User, Award, Calendar, FileText, Users, Trophy } from 'lucide-react';
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
                             personalDetails.website ||
                             personalDetails.contactPerson ||
                             personalDetails.primaryPhone ||
                             personalDetails.registrationNumber ||
                             personalDetails.yearEstablished;

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
            {/* Basic Information */}
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

            {personalDetails.registrationNumber && (
              <div className="info-item">
                <div className="info-icon">
                  <FileText size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Registration Number</span>
                  <span className="info-value">{personalDetails.registrationNumber}</span>
                </div>
              </div>
            )}

            {personalDetails.yearEstablished && (
              <div className="info-item">
                <div className="info-icon">
                  <Calendar size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Year Established</span>
                  <span className="info-value">{personalDetails.yearEstablished}</span>
                </div>
              </div>
            )}

            {/* Contact Information */}
            {personalDetails.contactPerson && (
              <div className="info-item">
                <div className="info-icon">
                  <User size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Contact Person</span>
                  <span className="info-value">{personalDetails.contactPerson}</span>
                </div>
              </div>
            )}

            {personalDetails.designation && (
              <div className="info-item">
                <div className="info-icon">
                  <Award size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Designation</span>
                  <span className="info-value">{personalDetails.designation}</span>
                </div>
              </div>
            )}

            {personalDetails.primaryPhone && (
              <div className="info-item">
                <div className="info-icon">
                  <Phone size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Primary Phone</span>
                  <span className="info-value">{personalDetails.primaryPhone}</span>
                </div>
              </div>
            )}

            {personalDetails.secondaryPhone && (
              <div className="info-item">
                <div className="info-icon">
                  <Phone size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Alternate Phone</span>
                  <span className="info-value">{personalDetails.secondaryPhone}</span>
                </div>
              </div>
            )}

            {personalDetails.contactEmail && (
              <div className="info-item">
                <div className="info-icon">
                  <Mail size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Email</span>
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

            {/* Address */}
            {personalDetails.address && (
              <div className="info-item">
                <div className="info-icon">
                  <MapPin size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Address</span>
                  <span className="info-value">
                    {personalDetails.address.line1}
                    {personalDetails.address.line2 && `, ${personalDetails.address.line2}`}
                    {`, ${personalDetails.address.city}`}
                    {`, ${personalDetails.address.state}`}
                    {`, ${personalDetails.address.pincode}`}
                    {`, ${personalDetails.address.country}`}
                  </span>
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

            {/* Sports & Players */}
            {personalDetails.sports && personalDetails.sports.length > 0 && (
              <div className="info-item">
                <div className="info-icon">
                  <Trophy size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Sports Offered</span>
                  <span className="info-value">{personalDetails.sports.join(', ')}</span>
                </div>
              </div>
            )}

            {personalDetails.numberOfPlayers && (
              <div className="info-item">
                <div className="info-icon">
                  <Users size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Number of Players</span>
                  <span className="info-value">{personalDetails.numberOfPlayers}</span>
                </div>
              </div>
            )}

            {personalDetails.ageGroups && personalDetails.ageGroups.length > 0 && (
              <div className="info-item">
                <div className="info-icon">
                  <Users size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Age Groups</span>
                  <span className="info-value">{personalDetails.ageGroups.join(', ')}</span>
                </div>
              </div>
            )}

            {/* Facilities */}
            {personalDetails.facilities && personalDetails.facilities.length > 0 && (
              <div className="info-item">
                <div className="info-icon">
                  <Building size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Facilities</span>
                  <span className="info-value">{personalDetails.facilities.join(', ')}</span>
                </div>
              </div>
            )}

            {/* Achievements */}
            {personalDetails.achievements && (
              <div className="info-item info-item-full">
                <div className="info-icon">
                  <Award size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Achievements</span>
                  <span className="info-value">{personalDetails.achievements}</span>
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