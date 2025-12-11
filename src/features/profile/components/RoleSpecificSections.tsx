import React, { useState } from 'react';
import { UserRole, PersonalDetails, roleConfigurations } from '../types/ProfileTypes';
import OrganizationInfoSection from './OrganizationInfoSection';
import OrganizationInfoModal from './OrganizationInfoModal';
import ConnectedAthletesSection from './ConnectedAthletesSection';
import CoachingInfoSection from './CoachingInfoSection';

interface RoleSpecificSectionsProps {
  currentRole: UserRole;
  personalDetails: PersonalDetails;
  isOwner: boolean;
  onEditProfile: () => void;
  onSaveOrganizationInfo: (personalDetails: PersonalDetails) => void;
  onAddAthlete?: () => void;
}

const RoleSpecificSections: React.FC<RoleSpecificSectionsProps> = ({
  currentRole,
  personalDetails,
  isOwner,
  onEditProfile,
  onSaveOrganizationInfo,
  onAddAthlete
}) => {
  const [isOrganizationModalOpen, setIsOrganizationModalOpen] = useState(false);

  const currentRoleConfig = roleConfigurations[currentRole];
  const sections = currentRoleConfig.sections;

  return (
    <>
      {/* Organization-specific sections */}
      {sections.includes('organizationInfo') && (
        <>
          <OrganizationInfoSection
            personalDetails={personalDetails}
            isOwner={isOwner}
            onEdit={() => setIsOrganizationModalOpen(true)}
          />
          <OrganizationInfoModal
            isOpen={isOrganizationModalOpen}
            personalDetails={personalDetails}
            onClose={() => setIsOrganizationModalOpen(false)}
            onSave={onSaveOrganizationInfo}
          />
        </>
      )}

      {/* Parent-specific sections */}
      {sections.includes('connectedAthletes') && (
        <ConnectedAthletesSection
          personalDetails={personalDetails}
          isOwner={isOwner}
          onEdit={onEditProfile}
          onAddAthlete={onAddAthlete}
        />
      )}

      {/* Coach-specific sections */}
      {sections.includes('coachingInfo') && (
        <CoachingInfoSection
          personalDetails={personalDetails}
          isOwner={isOwner}
          onEdit={onEditProfile}
        />
      )}
    </>
  );
};

export default RoleSpecificSections;