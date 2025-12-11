import { Timestamp } from 'firebase/firestore';

// Organization profile for role-specific collection (organizations/{uid})
export interface OrganizationProfile {
  uid: string;
  email: string;
  role: 'organization';
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Basic Information
  organizationName: string;
  organizationType: string;
  registrationNumber: string;
  yearEstablished: string;
  website?: string;
  photoURL?: string;

  // Contact Information
  contactPerson: string;
  designation: string;
  primaryEmail: string;
  primaryPhone: string;
  secondaryPhone?: string;

  // Address
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };

  // Sports & Players
  sports: string[];
  numberOfPlayers: string;
  ageGroups: string[];

  // Facilities
  facilities: string[];

  // Additional Information
  achievements?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };

  // Declaration
  termsAccepted: boolean;

  // System fields
  isActive: boolean;
  isVerified: boolean;
}

// Full organization user type with ID (for queries)
export interface Organization extends OrganizationProfile {
  id: string;
}

// Legacy organization profile structure (for backward compatibility with users collection)
export interface LegacyOrganizationProfile {
  organizationName: string;
  organizationType: string;
  establishedYear: string;
  registrationNumber: string;
  contactPersonName: string;
  designation: string;
  phone: string;
  alternatePhone?: string;
  email: string;
  website?: string;
  street: string;
  state: string;
  city: string;
  pincode: string;
  country: string;
  location?: string;
  sportsOffered: string[];
  numberOfPlayers?: string;
  ageGroups?: string[];
  trainingGrounds: boolean;
  gymFitness: boolean;
  coachingStaff: boolean;
  hostel: boolean;
  achievements?: string;
  specialNotes?: string;
}

// Legacy organization user type (for backward compatibility)
export interface LegacyOrganization {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'organization';

  // Organization-specific profile (nested structure)
  organizationProfile: LegacyOrganizationProfile;

  // Standard user fields
  postsCount: number;
  storiesCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;

  // Language preference
  languagePreference?: string;
  languagePreferenceUpdatedAt?: Timestamp | Date | string;
}

// Data for creating organization profile
export interface CreateOrganizationData {
  uid: string;
  email: string;
  photoURL?: string | null;
  role: 'organization';

  organizationName: string;
  organizationType: string;
  registrationNumber: string;
  yearEstablished: string;
  website?: string;
  contactPerson: string;
  designation: string;
  primaryEmail: string;
  primaryPhone: string;
  secondaryPhone?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  sports: string[];
  numberOfPlayers: string;
  ageGroups: string[];
  facilities: string[];
  achievements?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  termsAccepted: boolean;
}
