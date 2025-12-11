export interface SportPositionPair {
  sport: {
    id: string;
    name: string;
    icon: string;
    image: string;
    description: string;
  };
  position: {
    id: string;
    name: string;
    description: string;
    icon?: string;
  };
  subcategory?: {
    id: string;
    name: string;
    description?: string;
  };
  specializations?: Record<string, string>;
  isPrimary?: boolean; // Mark the main sport
}

export interface MultiSportAthleteProfile {
  sportPositions: SportPositionPair[];
  primarySportId: string; // The main sport for profile display
  completedOnboarding: boolean;
  onboardingCompletedAt: Date | null;
}

export interface ProfileDisplayTag {
  primary: string; // e.g., "Football Quarterback"
  secondary?: string[]; // e.g., ["Basketball Point Guard", "Tennis Singles"]
}