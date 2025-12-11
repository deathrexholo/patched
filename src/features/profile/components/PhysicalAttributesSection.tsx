import React from 'react';
import { Edit3, Activity } from 'lucide-react';
import '../styles/PhysicalAttributesSection.css';

interface PhysicalAttributes {
  height?: string | number;
  weight?: string | number;
  dominantSide?: 'Left' | 'Right' | string;
  personalBest?: string;
  seasonBest?: string;
  coachName?: string;
  coachContact?: string;
  trainingAcademy?: string;
  schoolName?: string;
  clubName?: string;
}

interface PhysicalAttributesSectionProps {
  physicalAttributes: PhysicalAttributes;
  isOwner: boolean;
  onEditSection?: () => void;
}

const PhysicalAttributesSection: React.FC<PhysicalAttributesSectionProps> = ({
  physicalAttributes,
  isOwner,
  onEditSection
}) => {
  // Check if any physical attributes are set
  const hasPhysicalData = physicalAttributes.height || physicalAttributes.weight || physicalAttributes.dominantSide;

  return (
    <section className="physical-attributes-section" aria-labelledby="physical-attributes-heading">
      <div className="section-header">
        <div className="section-header-left">
          <Activity size={24} className="section-icon" />
          <h2 id="physical-attributes-heading" className="section-title">
            Physical Details
          </h2>
        </div>
        {isOwner && (
          <button
            className="section-edit-button"
            onClick={onEditSection}
            aria-label="Edit physical attributes"
            type="button"
          >
            <Edit3 size={16} />
            <span>Edit</span>
          </button>
        )}
      </div>

      {!hasPhysicalData && isOwner ? (
        <div className="empty-section-state">
          <Activity size={48} className="empty-icon" />
          <p className="empty-message">Add your physical details</p>
          <p className="empty-description">
            Share your height, weight, and hand preference to complete your profile
          </p>
          <button
            className="empty-state-button"
            onClick={onEditSection}
            type="button"
          >
            <Edit3 size={16} />
            Add Physical Details
          </button>
        </div>
      ) : !hasPhysicalData ? (
        <div className="empty-section-state">
          <p className="empty-message">No physical details available</p>
        </div>
      ) : (
        <div className="physical-attributes-grid">
          {/* Height */}
          {physicalAttributes.height && (
            <div className="attribute-card">
              <div className="attribute-icon height-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L12 22M12 2L8 6M12 2L16 6M12 22L8 18M12 22L16 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="attribute-content">
                <span className="attribute-label">Height</span>
                <span className="attribute-value">{physicalAttributes.height} cm</span>
              </div>
            </div>
          )}

          {/* Weight */}
          {physicalAttributes.weight && (
            <div className="attribute-card">
              <div className="attribute-icon weight-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="attribute-content">
                <span className="attribute-label">Weight</span>
                <span className="attribute-value">{physicalAttributes.weight} kg</span>
              </div>
            </div>
          )}

          {/* Hand Preference */}
          {physicalAttributes.dominantSide && (
            <div className="attribute-card">
              <div className="attribute-icon hand-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 6V16M13 6C13 4.89543 13.8954 4 15 4C16.1046 4 17 4.89543 17 6V11M13 6C13 4.89543 12.1046 4 11 4C9.89543 4 9 4.89543 9 6V13M17 11C17 9.89543 17.8954 9 19 9C20.1046 9 21 9.89543 21 11V15C21 18.3137 18.3137 21 15 21H14C10.6863 21 8 18.3137 8 15V13M9 13C9 11.8954 8.10457 11 7 11C5.89543 11 5 11.8954 5 13V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="attribute-content">
                <span className="attribute-label">Hand Preference</span>
                <span className="attribute-value">{physicalAttributes.dominantSide}-Handed</span>
              </div>
            </div>
          )}

          {/* Personal Best */}
          {physicalAttributes.personalBest && (
            <div className="attribute-card full-width">
              <div className="attribute-icon best-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 15L9 18H15L12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="9" r="7" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 6V9M12 9L14 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="attribute-content">
                <span className="attribute-label">Personal Best</span>
                <span className="attribute-value">{physicalAttributes.personalBest}</span>
              </div>
            </div>
          )}

          {/* Season Best */}
          {physicalAttributes.seasonBest && (
            <div className="attribute-card full-width">
              <div className="attribute-icon best-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="attribute-content">
                <span className="attribute-label">Season Best</span>
                <span className="attribute-value">{physicalAttributes.seasonBest}</span>
              </div>
            </div>
          )}

          {/* Training Information */}
          {(physicalAttributes.coachName || physicalAttributes.trainingAcademy || physicalAttributes.schoolName || physicalAttributes.clubName) && (
            <div className="training-info full-width">
              <h3 className="training-info-title">Training Information</h3>
              <div className="training-details">
                {physicalAttributes.coachName && (
                  <div className="training-detail-row">
                    <span className="detail-label">Coach:</span>
                    <span className="detail-value">{physicalAttributes.coachName}</span>
                  </div>
                )}
                {physicalAttributes.coachContact && (
                  <div className="training-detail-row">
                    <span className="detail-label">Coach Contact:</span>
                    <span className="detail-value">{physicalAttributes.coachContact}</span>
                  </div>
                )}
                {physicalAttributes.trainingAcademy && (
                  <div className="training-detail-row">
                    <span className="detail-label">Training Academy:</span>
                    <span className="detail-value">{physicalAttributes.trainingAcademy}</span>
                  </div>
                )}
                {physicalAttributes.schoolName && (
                  <div className="training-detail-row">
                    <span className="detail-label">School:</span>
                    <span className="detail-value">{physicalAttributes.schoolName}</span>
                  </div>
                )}
                {physicalAttributes.clubName && (
                  <div className="training-detail-row">
                    <span className="detail-label">Club:</span>
                    <span className="detail-value">{physicalAttributes.clubName}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default PhysicalAttributesSection;
