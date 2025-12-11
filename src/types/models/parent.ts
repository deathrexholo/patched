import { Timestamp } from 'firebase/firestore';

// Parent profile for role-specific collection (parents/{uid})
export interface ParentProfile {
  uid: string;
  email: string;
  role: 'parent';
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Parent/Guardian Information
  parentFullName: string;
  relationshipToChild: 'mother' | 'father' | 'guardian' | 'other';
  mobileNumber: string;
  photoURL?: string;

  // Child (Player) Information
  child: {
    fullName: string;
    dateOfBirth: string; // dd-mm-yyyy format
    age: number; // calculated from DOB
    gender: 'male' | 'female' | 'other';
    state: string;
    city: string;
    country: string;
  };

  // Child's School Information (Optional)
  schoolInfo?: {
    schoolName: string;
    board: 'CBSE' | 'ICSE' | 'State Board' | 'International';
    schoolClass: string;
    schoolCity: string;
    schoolCoachName: string;
    teamParticipation: boolean;
  };

  // Child's Sports Details
  sports: {
    primary: string;
    secondary?: string;
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    playingCategory: 'recreational' | 'school' | 'district' | 'state' | 'national';
  };

  // Additional Details (Optional)
  achievements?: string;
  aspirations?: string;

  // Parent Consent
  contentConsent: boolean;

  // System fields
  isActive: boolean;
  isVerified: boolean;
}

// Full parent user type with ID (for queries)
export interface Parent extends ParentProfile {
  id: string;
}

// Legacy parent profile structure (for backward compatibility with users collection)
export interface LegacyParentProfile {
  parentFullName: string;
  relationshipToChild: 'Mother' | 'Father' | 'Guardian' | 'Other';
  mobile: string;
  email: string;
  childFullName: string;
  childDateOfBirth: string;
  childGender: string;
  childState: string;
  childCity: string;
  childCountry: string;
  schoolName?: string;
  schoolBoard?: 'CBSE' | 'ICSE' | 'State Board' | 'International';
  schoolClass?: string;
  schoolCity?: string;
  schoolCoachName?: string;
  schoolTeamParticipation?: 'Yes' | 'No';
  primarySport: string;
  secondarySport?: string;
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
  playingCategory: 'Recreational' | 'School Level' | 'District Level' | 'State Level' | 'National Level';
  achievements?: string;
  aspirations?: string;
  contentConsent: boolean;
}

// Legacy parent user type (for backward compatibility)
export interface LegacyParent {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'parent';

  // Parent-specific profile (nested structure)
  parentProfile: LegacyParentProfile;

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

// Data for creating parent profile
export interface CreateParentData {
  uid: string;
  email: string;
  photoURL?: string | null;
  role: 'parent';

  parentFullName: string;
  relationshipToChild: 'mother' | 'father' | 'guardian' | 'other';
  mobileNumber: string;

  child: {
    fullName: string;
    dateOfBirth: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    state: string;
    city: string;
    country: string;
  };

  schoolInfo?: {
    schoolName: string;
    board: 'CBSE' | 'ICSE' | 'State Board' | 'International';
    schoolClass: string;
    schoolCity: string;
    schoolCoachName: string;
    teamParticipation: boolean;
  };

  sports: {
    primary: string;
    secondary?: string;
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    playingCategory: 'recreational' | 'school' | 'district' | 'state' | 'national';
  };

  achievements?: string;
  aspirations?: string;
  contentConsent: boolean;
}
