import { Specialization } from '../store/onboardingStore';

export interface SpecializationCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  options?: Specialization[];
  type?: 'select' | 'input';
  placeholder?: string;
  unit?: string;
}

export interface SportPositionSpecializations {
  sportId: string;
  positionId: string;
  subcategoryId?: string;
  categories: SpecializationCategory[];
}

export const SPECIALIZATIONS_CONFIG: SportPositionSpecializations[] = [
  // Cricket specializations
  {
    sportId: 'cricket',
    positionId: 'batting',
    categories: [
      {
        id: 'batting-hand',
        name: 'Batting Hand',
        description: 'Which hand do you prefer for batting?',
        required: true,
        options: [
          {
            id: 'right-handed',
            name: 'Right-handed',
            description: 'Bat with right hand leading',
            category: 'batting-hand'
          },
          {
            id: 'left-handed',
            name: 'Left-handed',
            description: 'Bat with left hand leading',
            category: 'batting-hand'
          }
        ]
      }
    ]
  },
  {
    sportId: 'cricket',
    positionId: 'bowling',
    subcategoryId: 'spin',
    categories: [
      {
        id: 'bowling-style',
        name: 'Bowling Style',
        description: 'What type of bowling do you specialize in?',
        required: true,
        options: [
          {
            id: 'finger-spin',
            name: 'Finger spin',
            description: 'Off-spin and orthodox bowling using fingers',
            category: 'bowling-style'
          },
          {
            id: 'wrist-spin',
            name: 'Wrist spin',
            description: 'Leg-spin and googly bowling using wrist',
            category: 'bowling-style'
          }
        ]
      },
      {
        id: 'bowling-arm',
        name: 'Bowling Arm',
        description: 'Which arm do you bowl with?',
        required: true,
        options: [
          {
            id: 'right-arm',
            name: 'Right Arm',
            description: 'Bowl with right arm',
            category: 'bowling-arm'
          },
          {
            id: 'left-arm',
            name: 'Left Arm',
            description: 'Bowl with left arm',
            category: 'bowling-arm'
          }
        ]
      }
    ]
  },
  {
    sportId: 'cricket',
    positionId: 'bowling',
    subcategoryId: 'pace',
    categories: [
      {
        id: 'bowling-pace',
        name: 'Bowling Pace',
        description: 'What type of pace bowling do you specialize in?',
        required: true,
        options: [
          {
            id: 'fast-pace',
            name: 'Fast Pace',
            description: 'High speed pace bowling',
            category: 'bowling-pace'
          },
          {
            id: 'medium-pace',
            name: 'Medium Pace',
            description: 'Medium speed pace bowling',
            category: 'bowling-pace'
          }
        ]
      },
      {
        id: 'bowling-arm',
        name: 'Bowling Arm',
        description: 'Which arm do you bowl with?',
        required: true,
        options: [
          {
            id: 'right-arm',
            name: 'Right Arm',
            description: 'Bowl with right arm',
            category: 'bowling-arm'
          },
          {
            id: 'left-arm',
            name: 'Left Arm',
            description: 'Bowl with left arm',
            category: 'bowling-arm'
          }
        ]
      },
      {
        id: 'bowling-speed',
        name: 'Bowling Speed',
        description: 'What is your approximate bowling speed?',
        required: false,
        type: 'input',
        placeholder: 'e.g., 140',
        unit: 'km/hr'
      }
    ]
  },
  // Football specializations
  {
    sportId: 'football',
    positionId: 'goalkeeper',
    categories: [
      {
        id: 'goalkeeper-style',
        name: 'Goalkeeper Style',
        description: 'What type of goalkeeper are you?',
        required: true,
        options: [
          {
            id: 'shot-stopping',
            name: 'Shot-stopping Specialist',
            description: 'Focus on making saves and blocking shots',
            category: 'goalkeeper-style'
          },
          {
            id: 'sweeper-keeper',
            name: 'Sweeper Keeper',
            description: 'Active outside the box, good with feet',
            category: 'goalkeeper-style'
          },
          {
            id: 'distribution-specialist',
            name: 'Distribution Specialist',
            description: 'Excellent at starting attacks with passes',
            category: 'goalkeeper-style'
          }
        ]
      }
    ]
  },
  {
    sportId: 'football',
    positionId: 'defender',
    categories: [
      {
        id: 'preferred-foot',
        name: 'Preferred Foot',
        description: 'Which foot do you prefer to use?',
        required: true,
        options: [
          {
            id: 'right-foot',
            name: 'Right Foot',
            description: 'Stronger with right foot',
            category: 'preferred-foot'
          },
          {
            id: 'left-foot',
            name: 'Left Foot',
            description: 'Stronger with left foot',
            category: 'preferred-foot'
          },
          {
            id: 'both-feet',
            name: 'Both Feet',
            description: 'Equally comfortable with both feet',
            category: 'preferred-foot'
          }
        ]
      }
    ]
  },
  {
    sportId: 'football',
    positionId: 'midfielder',
    categories: [
      {
        id: 'preferred-foot',
        name: 'Preferred Foot',
        description: 'Which foot do you prefer to use?',
        required: true,
        options: [
          {
            id: 'right-foot',
            name: 'Right Foot',
            description: 'Stronger with right foot',
            category: 'preferred-foot'
          },
          {
            id: 'left-foot',
            name: 'Left Foot',
            description: 'Stronger with left foot',
            category: 'preferred-foot'
          },
          {
            id: 'both-feet',
            name: 'Both Feet',
            description: 'Equally comfortable with both feet',
            category: 'preferred-foot'
          }
        ]
      }
    ]
  },
  {
    sportId: 'football',
    positionId: 'forward',
    categories: [
      {
        id: 'preferred-foot',
        name: 'Preferred Foot',
        description: 'Which foot do you prefer to use?',
        required: true,
        options: [
          {
            id: 'right-foot',
            name: 'Right Foot',
            description: 'Stronger with right foot',
            category: 'preferred-foot'
          },
          {
            id: 'left-foot',
            name: 'Left Foot',
            description: 'Stronger with left foot',
            category: 'preferred-foot'
          },
          {
            id: 'both-feet',
            name: 'Both Feet',
            description: 'Equally comfortable with both feet',
            category: 'preferred-foot'
          }
        ]
      }
    ]
  },
  // Tennis specializations
  {
    sportId: 'tennis',
    positionId: 'singles-specialist',
    categories: [
      {
        id: 'playing-hand',
        name: 'Playing Hand',
        description: 'Which hand do you play with?',
        required: true,
        options: [
          {
            id: 'right-handed',
            name: 'Right-handed',
            description: 'Play with right hand',
            category: 'playing-hand'
          },
          {
            id: 'left-handed',
            name: 'Left-handed',
            description: 'Play with left hand',
            category: 'playing-hand'
          }
        ]
      },
      {
        id: 'court-surface',
        name: 'Preferred Court Surface',
        description: 'Which surface do you prefer?',
        required: false,
        options: [
          {
            id: 'hard-court',
            name: 'Hard Court',
            description: 'Fast, consistent surface',
            category: 'court-surface'
          },
          {
            id: 'clay-court',
            name: 'Clay Court',
            description: 'Slower surface with high bounce',
            category: 'court-surface'
          },
          {
            id: 'grass-court',
            name: 'Grass Court',
            description: 'Fast, low-bouncing surface',
            category: 'court-surface'
          }
        ]
      }
    ]
  },
  {
    sportId: 'tennis',
    positionId: 'doubles-specialist',
    categories: [
      {
        id: 'playing-hand',
        name: 'Playing Hand',
        description: 'Which hand do you play with?',
        required: true,
        options: [
          {
            id: 'right-handed',
            name: 'Right-handed',
            description: 'Play with right hand',
            category: 'playing-hand'
          },
          {
            id: 'left-handed',
            name: 'Left-handed',
            description: 'Play with left hand',
            category: 'playing-hand'
          }
        ]
      }
    ]
  },
  // Kabaddi specializations
  {
    sportId: 'kabaddi',
    positionId: 'raider',
    categories: [
      {
        id: 'playing-side',
        name: 'Playing Side',
        description: 'Which is your strong playing side?',
        required: true,
        options: [
          {
            id: 'left',
            name: 'Left',
            description: 'Stronger on left side',
            category: 'playing-side'
          },
          {
            id: 'right',
            name: 'Right',
            description: 'Stronger on right side',
            category: 'playing-side'
          }
        ]
      },
      {
        id: 'match-fitness',
        name: 'Match Fitness',
        description: 'Rate your match fitness level (0-10)',
        required: false,
        type: 'input',
        placeholder: 'e.g., 8',
        unit: '/10'
      },
      {
        id: 'years-experience',
        name: 'Years of Experience',
        description: 'How many years have you been playing Kabaddi?',
        required: false,
        type: 'input',
        placeholder: 'e.g., 5',
        unit: 'years'
      },
      {
        id: 'kabaddi-format',
        name: 'Preferred Kabaddi Format',
        description: 'Which format do you prefer?',
        required: false,
        options: [
          {
            id: 'circle',
            name: 'Circle',
            description: 'Traditional circle style Kabaddi',
            category: 'kabaddi-format'
          },
          {
            id: 'standard',
            name: 'Standard',
            description: 'Standard mat Kabaddi',
            category: 'kabaddi-format'
          }
        ]
      },
      {
        id: 'level-played',
        name: 'Level Played',
        description: 'What level have you competed at?',
        required: false,
        options: [
          {
            id: 'local',
            name: 'Local level',
            description: 'Local tournaments and competitions',
            category: 'level-played'
          },
          {
            id: 'district',
            name: 'District level',
            description: 'District level competitions',
            category: 'level-played'
          },
          {
            id: 'state',
            name: 'State level',
            description: 'State level championships',
            category: 'level-played'
          },
          {
            id: 'national',
            name: 'National',
            description: 'National level competitions',
            category: 'level-played'
          },
          {
            id: 'international',
            name: 'International',
            description: 'International level competitions',
            category: 'level-played'
          }
        ]
      }
    ]
  },
  {
    sportId: 'kabaddi',
    positionId: 'defender',
    categories: [
      {
        id: 'playing-side',
        name: 'Playing Side',
        description: 'Which is your strong playing side?',
        required: true,
        options: [
          {
            id: 'left',
            name: 'Left',
            description: 'Stronger on left side',
            category: 'playing-side'
          },
          {
            id: 'right',
            name: 'Right',
            description: 'Stronger on right side',
            category: 'playing-side'
          }
        ]
      },
      {
        id: 'match-fitness',
        name: 'Match Fitness',
        description: 'Rate your match fitness level (0-10)',
        required: false,
        type: 'input',
        placeholder: 'e.g., 8',
        unit: '/10'
      },
      {
        id: 'years-experience',
        name: 'Years of Experience',
        description: 'How many years have you been playing Kabaddi?',
        required: false,
        type: 'input',
        placeholder: 'e.g., 5',
        unit: 'years'
      },
      {
        id: 'kabaddi-format',
        name: 'Preferred Kabaddi Format',
        description: 'Which format do you prefer?',
        required: false,
        options: [
          {
            id: 'circle',
            name: 'Circle',
            description: 'Traditional circle style Kabaddi',
            category: 'kabaddi-format'
          },
          {
            id: 'standard',
            name: 'Standard',
            description: 'Standard mat Kabaddi',
            category: 'kabaddi-format'
          }
        ]
      },
      {
        id: 'level-played',
        name: 'Level Played',
        description: 'What level have you competed at?',
        required: false,
        options: [
          {
            id: 'local',
            name: 'Local level',
            description: 'Local tournaments and competitions',
            category: 'level-played'
          },
          {
            id: 'district',
            name: 'District level',
            description: 'District level competitions',
            category: 'level-played'
          },
          {
            id: 'state',
            name: 'State level',
            description: 'State level championships',
            category: 'level-played'
          },
          {
            id: 'national',
            name: 'National',
            description: 'National level competitions',
            category: 'level-played'
          },
          {
            id: 'international',
            name: 'International',
            description: 'International level competitions',
            category: 'level-played'
          }
        ]
      }
    ]
  },
  {
    sportId: 'kabaddi',
    positionId: 'all-rounder',
    categories: [
      {
        id: 'playing-side',
        name: 'Playing Side',
        description: 'Which is your strong playing side?',
        required: true,
        options: [
          {
            id: 'left',
            name: 'Left',
            description: 'Stronger on left side',
            category: 'playing-side'
          },
          {
            id: 'right',
            name: 'Right',
            description: 'Stronger on right side',
            category: 'playing-side'
          }
        ]
      },
      {
        id: 'match-fitness',
        name: 'Match Fitness',
        description: 'Rate your match fitness level (0-10)',
        required: false,
        type: 'input',
        placeholder: 'e.g., 8',
        unit: '/10'
      },
      {
        id: 'years-experience',
        name: 'Years of Experience',
        description: 'How many years have you been playing Kabaddi?',
        required: false,
        type: 'input',
        placeholder: 'e.g., 5',
        unit: 'years'
      },
      {
        id: 'kabaddi-format',
        name: 'Preferred Kabaddi Format',
        description: 'Which format do you prefer?',
        required: false,
        options: [
          {
            id: 'circle',
            name: 'Circle',
            description: 'Traditional circle style Kabaddi',
            category: 'kabaddi-format'
          },
          {
            id: 'standard',
            name: 'Standard',
            description: 'Standard mat Kabaddi',
            category: 'kabaddi-format'
          }
        ]
      },
      {
        id: 'level-played',
        name: 'Level Played',
        description: 'What level have you competed at?',
        required: false,
        options: [
          {
            id: 'local',
            name: 'Local level',
            description: 'Local tournaments and competitions',
            category: 'level-played'
          },
          {
            id: 'district',
            name: 'District level',
            description: 'District level competitions',
            category: 'level-played'
          },
          {
            id: 'state',
            name: 'State level',
            description: 'State level championships',
            category: 'level-played'
          },
          {
            id: 'national',
            name: 'National',
            description: 'National level competitions',
            category: 'level-played'
          },
          {
            id: 'international',
            name: 'International',
            description: 'International level competitions',
            category: 'level-played'
          }
        ]
      }
    ]
  },
  // Wrestling - Freestyle specializations
  {
    sportId: 'wrestling',
    positionId: 'freestyle-wrestling',
    categories: [
      {
        id: 'weight-class',
        name: 'Weight Class',
        description: 'Select your competition weight class',
        required: true,
        options: [
          {
            id: '57kg',
            name: '57kg',
            description: 'Lightweight category - 57 kilograms',
            category: 'weight-class'
          },
          {
            id: '65kg',
            name: '65kg',
            description: 'Welterweight category - 65 kilograms',
            category: 'weight-class'
          },
          {
            id: '74kg',
            name: '74kg',
            description: 'Middleweight category - 74 kilograms',
            category: 'weight-class'
          },
          {
            id: '86kg',
            name: '86kg',
            description: 'Light heavyweight category - 86 kilograms',
            category: 'weight-class'
          },
          {
            id: '97kg',
            name: '97kg',
            description: 'Heavyweight category - 97 kilograms',
            category: 'weight-class'
          },
          {
            id: '125kg',
            name: '125kg',
            description: 'Super heavyweight category - 125 kilograms',
            category: 'weight-class'
          }
        ]
      }
    ]
  },
  // Wrestling - Greco-Roman specializations
  {
    sportId: 'wrestling',
    positionId: 'greco-roman-wrestling',
    categories: [
      {
        id: 'weight-class',
        name: 'Weight Class',
        description: 'Select your competition weight class',
        required: true,
        options: [
          {
            id: '57kg',
            name: '57kg',
            description: 'Lightweight category - 57 kilograms',
            category: 'weight-class'
          },
          {
            id: '65kg',
            name: '65kg',
            description: 'Welterweight category - 65 kilograms',
            category: 'weight-class'
          },
          {
            id: '74kg',
            name: '74kg',
            description: 'Middleweight category - 74 kilograms',
            category: 'weight-class'
          },
          {
            id: '86kg',
            name: '86kg',
            description: 'Light heavyweight category - 86 kilograms',
            category: 'weight-class'
          },
          {
            id: '97kg',
            name: '97kg',
            description: 'Heavyweight category - 97 kilograms',
            category: 'weight-class'
          },
          {
            id: '125kg',
            name: '125kg',
            description: 'Super heavyweight category - 125 kilograms',
            category: 'weight-class'
          }
        ]
      }
    ]
  },
  // Weightlifting - Male specializations
  {
    sportId: 'weightlifting',
    positionId: 'male',
    categories: [
      {
        id: 'weight-class',
        name: 'Weight Class',
        description: 'Select your competition weight class',
        required: true,
        options: [
          {
            id: '55kg',
            name: '55 kg',
            description: 'Bantamweight category - 55 kilograms',
            category: 'weight-class'
          },
          {
            id: '61kg',
            name: '61 kg',
            description: 'Featherweight category - 61 kilograms',
            category: 'weight-class'
          },
          {
            id: '67kg',
            name: '67 kg',
            description: 'Lightweight category - 67 kilograms',
            category: 'weight-class'
          },
          {
            id: '73kg',
            name: '73 kg',
            description: 'Middleweight category - 73 kilograms',
            category: 'weight-class'
          },
          {
            id: '81kg',
            name: '81 kg',
            description: 'Light heavyweight category - 81 kilograms',
            category: 'weight-class'
          },
          {
            id: '89kg',
            name: '89 kg',
            description: 'Heavyweight category - 89 kilograms',
            category: 'weight-class'
          },
          {
            id: '96kg',
            name: '96 kg',
            description: 'Heavyweight category - 96 kilograms',
            category: 'weight-class'
          },
          {
            id: '102kg',
            name: '102 kg (Super Heavyweight)',
            description: 'Super heavyweight category - 102 kilograms',
            category: 'weight-class'
          }
        ]
      }
    ]
  },
  // Weightlifting - Female specializations
  {
    sportId: 'weightlifting',
    positionId: 'female',
    categories: [
      {
        id: 'weight-class',
        name: 'Weight Class',
        description: 'Select your competition weight class',
        required: true,
        options: [
          {
            id: '49kg',
            name: '49 kg',
            description: 'Flyweight category - 49 kilograms',
            category: 'weight-class'
          },
          {
            id: '59kg',
            name: '59 kg',
            description: 'Lightweight category - 59 kilograms',
            category: 'weight-class'
          },
          {
            id: '71kg',
            name: '71 kg',
            description: 'Middleweight category - 71 kilograms',
            category: 'weight-class'
          },
          {
            id: '81kg',
            name: '81 kg',
            description: 'Light heavyweight category - 81 kilograms',
            category: 'weight-class'
          },
          {
            id: '81plus-kg',
            name: '81+ kg (Super Heavyweight)',
            description: 'Super heavyweight category - over 81 kilograms',
            category: 'weight-class'
          }
        ]
      }
    ]
  },
  // Archery - Recurve Archer - Individual Event
  {
    sportId: 'archery',
    positionId: 'recurve-archer',
    subcategoryId: 'individual',
    categories: [
      {
        id: 'range-focus',
        name: 'Range Focus',
        description: 'Select your range specialization',
        required: true,
        options: [
          {
            id: 'short-range',
            name: 'Short Range Specialist',
            description: 'Specializes in short-range archery',
            category: 'range-focus'
          },
          {
            id: 'mid-range',
            name: 'Mid Range Specialist',
            description: 'Specializes in mid-range archery',
            category: 'range-focus'
          },
          {
            id: 'long-range',
            name: 'Long Range Specialist',
            description: 'Specializes in long-range archery',
            category: 'range-focus'
          }
        ]
      },
      {
        id: 'venue-type',
        name: 'Competition Venue',
        description: 'Select your preferred competition venue',
        required: true,
        options: [
          {
            id: 'indoor-competitor',
            name: 'Indoor Competitor',
            description: 'Specializes in indoor archery competitions',
            category: 'venue-type'
          },
          {
            id: 'outdoor-competitor',
            name: 'Outdoor Competitor',
            description: 'Specializes in outdoor archery competitions',
            category: 'venue-type'
          }
        ]
      }
    ]
  },
  // Archery - Recurve Archer - Team Event
  {
    sportId: 'archery',
    positionId: 'recurve-archer',
    subcategoryId: 'team-event',
    categories: [
      {
        id: 'range-focus',
        name: 'Range Focus',
        description: 'Select your range specialization',
        required: true,
        options: [
          {
            id: 'short-range',
            name: 'Short Range Specialist',
            description: 'Specializes in short-range archery',
            category: 'range-focus'
          },
          {
            id: 'mid-range',
            name: 'Mid Range Specialist',
            description: 'Specializes in mid-range archery',
            category: 'range-focus'
          },
          {
            id: 'long-range',
            name: 'Long Range Specialist',
            description: 'Specializes in long-range archery',
            category: 'range-focus'
          }
        ]
      },
      {
        id: 'venue-type',
        name: 'Competition Venue',
        description: 'Select your preferred competition venue',
        required: true,
        options: [
          {
            id: 'indoor-competitor',
            name: 'Indoor Competitor',
            description: 'Specializes in indoor archery competitions',
            category: 'venue-type'
          },
          {
            id: 'outdoor-competitor',
            name: 'Outdoor Competitor',
            description: 'Specializes in outdoor archery competitions',
            category: 'venue-type'
          }
        ]
      }
    ]
  },
  // Archery - Compound Archer - Individual Event
  {
    sportId: 'archery',
    positionId: 'compound-archer',
    subcategoryId: 'individual',
    categories: [
      {
        id: 'range-focus',
        name: 'Range Focus',
        description: 'Select your range specialization',
        required: true,
        options: [
          {
            id: 'short-range',
            name: 'Short Range Specialist',
            description: 'Specializes in short-range archery',
            category: 'range-focus'
          },
          {
            id: 'mid-range',
            name: 'Mid Range Specialist',
            description: 'Specializes in mid-range archery',
            category: 'range-focus'
          },
          {
            id: 'long-range',
            name: 'Long Range Specialist',
            description: 'Specializes in long-range archery',
            category: 'range-focus'
          }
        ]
      },
      {
        id: 'venue-type',
        name: 'Competition Venue',
        description: 'Select your preferred competition venue',
        required: true,
        options: [
          {
            id: 'indoor-competitor',
            name: 'Indoor Competitor',
            description: 'Specializes in indoor archery competitions',
            category: 'venue-type'
          },
          {
            id: 'outdoor-competitor',
            name: 'Outdoor Competitor',
            description: 'Specializes in outdoor archery competitions',
            category: 'venue-type'
          }
        ]
      }
    ]
  },
  // Archery - Compound Archer - Team Event
  {
    sportId: 'archery',
    positionId: 'compound-archer',
    subcategoryId: 'team-event',
    categories: [
      {
        id: 'range-focus',
        name: 'Range Focus',
        description: 'Select your range specialization',
        required: true,
        options: [
          {
            id: 'short-range',
            name: 'Short Range Specialist',
            description: 'Specializes in short-range archery',
            category: 'range-focus'
          },
          {
            id: 'mid-range',
            name: 'Mid Range Specialist',
            description: 'Specializes in mid-range archery',
            category: 'range-focus'
          },
          {
            id: 'long-range',
            name: 'Long Range Specialist',
            description: 'Specializes in long-range archery',
            category: 'range-focus'
          }
        ]
      },
      {
        id: 'venue-type',
        name: 'Competition Venue',
        description: 'Select your preferred competition venue',
        required: true,
        options: [
          {
            id: 'indoor-competitor',
            name: 'Indoor Competitor',
            description: 'Specializes in indoor archery competitions',
            category: 'venue-type'
          },
          {
            id: 'outdoor-competitor',
            name: 'Outdoor Competitor',
            description: 'Specializes in outdoor archery competitions',
            category: 'venue-type'
          }
        ]
      }
    ]
  },
  // Boxing - Flyweight
  {
    sportId: 'boxing',
    positionId: 'boxer',
    subcategoryId: 'flyweight',
    categories: [
      {
        id: 'style-of-play',
        name: 'Style of Play',
        description: 'Select your boxing style',
        required: true,
        options: [
          {
            id: 'out-boxer',
            name: 'Out-Boxer (Distance Fighter)',
            description: 'Fights from distance using long-range punches',
            category: 'style-of-play'
          },
          {
            id: 'pressure-fighter',
            name: 'Pressure Fighter',
            description: 'Applies constant forward pressure on opponent',
            category: 'style-of-play'
          },
          {
            id: 'counter-puncher',
            name: 'Counter Puncher',
            description: 'Defensive style focusing on counterattacking',
            category: 'style-of-play'
          },
          {
            id: 'swarmer',
            name: 'Swarmer',
            description: 'Aggressive in-fighting style with close-range combat',
            category: 'style-of-play'
          }
        ]
      }
    ]
  },
  // Boxing - Featherweight
  {
    sportId: 'boxing',
    positionId: 'boxer',
    subcategoryId: 'featherweight',
    categories: [
      {
        id: 'style-of-play',
        name: 'Style of Play',
        description: 'Select your boxing style',
        required: true,
        options: [
          {
            id: 'out-boxer',
            name: 'Out-Boxer (Distance Fighter)',
            description: 'Fights from distance using long-range punches',
            category: 'style-of-play'
          },
          {
            id: 'pressure-fighter',
            name: 'Pressure Fighter',
            description: 'Applies constant forward pressure on opponent',
            category: 'style-of-play'
          },
          {
            id: 'counter-puncher',
            name: 'Counter Puncher',
            description: 'Defensive style focusing on counterattacking',
            category: 'style-of-play'
          },
          {
            id: 'swarmer',
            name: 'Swarmer',
            description: 'Aggressive in-fighting style with close-range combat',
            category: 'style-of-play'
          }
        ]
      }
    ]
  },
  // Boxing - Lightweight
  {
    sportId: 'boxing',
    positionId: 'boxer',
    subcategoryId: 'lightweight',
    categories: [
      {
        id: 'style-of-play',
        name: 'Style of Play',
        description: 'Select your boxing style',
        required: true,
        options: [
          {
            id: 'out-boxer',
            name: 'Out-Boxer (Distance Fighter)',
            description: 'Fights from distance using long-range punches',
            category: 'style-of-play'
          },
          {
            id: 'pressure-fighter',
            name: 'Pressure Fighter',
            description: 'Applies constant forward pressure on opponent',
            category: 'style-of-play'
          },
          {
            id: 'counter-puncher',
            name: 'Counter Puncher',
            description: 'Defensive style focusing on counterattacking',
            category: 'style-of-play'
          },
          {
            id: 'swarmer',
            name: 'Swarmer',
            description: 'Aggressive in-fighting style with close-range combat',
            category: 'style-of-play'
          }
        ]
      }
    ]
  },
  // Boxing - Welterweight
  {
    sportId: 'boxing',
    positionId: 'boxer',
    subcategoryId: 'welterweight',
    categories: [
      {
        id: 'style-of-play',
        name: 'Style of Play',
        description: 'Select your boxing style',
        required: true,
        options: [
          {
            id: 'out-boxer',
            name: 'Out-Boxer (Distance Fighter)',
            description: 'Fights from distance using long-range punches',
            category: 'style-of-play'
          },
          {
            id: 'pressure-fighter',
            name: 'Pressure Fighter',
            description: 'Applies constant forward pressure on opponent',
            category: 'style-of-play'
          },
          {
            id: 'counter-puncher',
            name: 'Counter Puncher',
            description: 'Defensive style focusing on counterattacking',
            category: 'style-of-play'
          },
          {
            id: 'swarmer',
            name: 'Swarmer',
            description: 'Aggressive in-fighting style with close-range combat',
            category: 'style-of-play'
          }
        ]
      }
    ]
  },
  // Boxing - Middleweight
  {
    sportId: 'boxing',
    positionId: 'boxer',
    subcategoryId: 'middleweight',
    categories: [
      {
        id: 'style-of-play',
        name: 'Style of Play',
        description: 'Select your boxing style',
        required: true,
        options: [
          {
            id: 'out-boxer',
            name: 'Out-Boxer (Distance Fighter)',
            description: 'Fights from distance using long-range punches',
            category: 'style-of-play'
          },
          {
            id: 'pressure-fighter',
            name: 'Pressure Fighter',
            description: 'Applies constant forward pressure on opponent',
            category: 'style-of-play'
          },
          {
            id: 'counter-puncher',
            name: 'Counter Puncher',
            description: 'Defensive style focusing on counterattacking',
            category: 'style-of-play'
          },
          {
            id: 'swarmer',
            name: 'Swarmer',
            description: 'Aggressive in-fighting style with close-range combat',
            category: 'style-of-play'
          }
        ]
      }
    ]
  },
  // Boxing - Heavyweight
  {
    sportId: 'boxing',
    positionId: 'boxer',
    subcategoryId: 'heavyweight',
    categories: [
      {
        id: 'style-of-play',
        name: 'Style of Play',
        description: 'Select your boxing style',
        required: true,
        options: [
          {
            id: 'out-boxer',
            name: 'Out-Boxer (Distance Fighter)',
            description: 'Fights from distance using long-range punches',
            category: 'style-of-play'
          },
          {
            id: 'pressure-fighter',
            name: 'Pressure Fighter',
            description: 'Applies constant forward pressure on opponent',
            category: 'style-of-play'
          },
          {
            id: 'counter-puncher',
            name: 'Counter Puncher',
            description: 'Defensive style focusing on counterattacking',
            category: 'style-of-play'
          },
          {
            id: 'swarmer',
            name: 'Swarmer',
            description: 'Aggressive in-fighting style with close-range combat',
            category: 'style-of-play'
          }
        ]
      }
    ]
  },
  // Golf - Professional - Long Drive Specialist
  {
    sportId: 'golf',
    positionId: 'professional-golfer',
    subcategoryId: 'long-drive-specialist',
    categories: [
      {
        id: 'tournament-type',
        name: 'Tournament Type',
        description: 'Select your preferred tournament type',
        required: true,
        options: [
          {
            id: 'stroke-play',
            name: 'Stroke Play',
            description: 'Total strokes counted throughout the round',
            category: 'tournament-type'
          },
          {
            id: 'match-play',
            name: 'Match Play',
            description: 'Head-to-head competition by holes won',
            category: 'tournament-type'
          }
        ]
      }
    ]
  },
  // Golf - Professional - Short Game Specialist
  {
    sportId: 'golf',
    positionId: 'professional-golfer',
    subcategoryId: 'short-game-specialist',
    categories: [
      {
        id: 'tournament-type',
        name: 'Tournament Type',
        description: 'Select your preferred tournament type',
        required: true,
        options: [
          {
            id: 'stroke-play',
            name: 'Stroke Play',
            description: 'Total strokes counted throughout the round',
            category: 'tournament-type'
          },
          {
            id: 'match-play',
            name: 'Match Play',
            description: 'Head-to-head competition by holes won',
            category: 'tournament-type'
          }
        ]
      }
    ]
  },
  // Golf - Professional - All-Rounder
  {
    sportId: 'golf',
    positionId: 'professional-golfer',
    subcategoryId: 'all-rounder',
    categories: [
      {
        id: 'tournament-type',
        name: 'Tournament Type',
        description: 'Select your preferred tournament type',
        required: true,
        options: [
          {
            id: 'stroke-play',
            name: 'Stroke Play',
            description: 'Total strokes counted throughout the round',
            category: 'tournament-type'
          },
          {
            id: 'match-play',
            name: 'Match Play',
            description: 'Head-to-head competition by holes won',
            category: 'tournament-type'
          }
        ]
      }
    ]
  },
  // Golf - Amateur - Long Drive Specialist
  {
    sportId: 'golf',
    positionId: 'amateur-golfer',
    subcategoryId: 'long-drive-specialist',
    categories: [
      {
        id: 'tournament-type',
        name: 'Tournament Type',
        description: 'Select your preferred tournament type',
        required: true,
        options: [
          {
            id: 'stroke-play',
            name: 'Stroke Play',
            description: 'Total strokes counted throughout the round',
            category: 'tournament-type'
          },
          {
            id: 'match-play',
            name: 'Match Play',
            description: 'Head-to-head competition by holes won',
            category: 'tournament-type'
          }
        ]
      }
    ]
  },
  // Golf - Amateur - Short Game Specialist
  {
    sportId: 'golf',
    positionId: 'amateur-golfer',
    subcategoryId: 'short-game-specialist',
    categories: [
      {
        id: 'tournament-type',
        name: 'Tournament Type',
        description: 'Select your preferred tournament type',
        required: true,
        options: [
          {
            id: 'stroke-play',
            name: 'Stroke Play',
            description: 'Total strokes counted throughout the round',
            category: 'tournament-type'
          },
          {
            id: 'match-play',
            name: 'Match Play',
            description: 'Head-to-head competition by holes won',
            category: 'tournament-type'
          }
        ]
      }
    ]
  },
  // Golf - Amateur - All-Rounder
  {
    sportId: 'golf',
    positionId: 'amateur-golfer',
    subcategoryId: 'all-rounder',
    categories: [
      {
        id: 'tournament-type',
        name: 'Tournament Type',
        description: 'Select your preferred tournament type',
        required: true,
        options: [
          {
            id: 'stroke-play',
            name: 'Stroke Play',
            description: 'Total strokes counted throughout the round',
            category: 'tournament-type'
          },
          {
            id: 'match-play',
            name: 'Match Play',
            description: 'Head-to-head competition by holes won',
            category: 'tournament-type'
          }
        ]
      }
    ]
  }
];

export const getSpecializationsBySportAndPosition = (
  sportId: string,
  positionId: string,
  subcategoryId?: string | null
): SpecializationCategory[] => {
  // First, try to find a config that matches sport, position, and subcategory
  let config = SPECIALIZATIONS_CONFIG.find(
    (sp) =>
      sp.sportId === sportId &&
      sp.positionId === positionId &&
      sp.subcategoryId === subcategoryId
  );

  // If no specific subcategory config is found, fall back to a config that only matches sport and position
  if (!config) {
    config = SPECIALIZATIONS_CONFIG.find(
      (sp) =>
        sp.sportId === sportId &&
        sp.positionId === positionId &&
        !sp.subcategoryId
    );
  }

  return config ? config.categories : [];
};

export const hasSpecializations = (sportId: string, positionId: string, subcategoryId?: string | null): boolean => {
  const specializations = getSpecializationsBySportAndPosition(sportId, positionId, subcategoryId);
  return specializations.length > 0;
};

export const getRequiredSpecializations = (
  sportId: string, 
  positionId: string,
  subcategoryId?: string | null
): SpecializationCategory[] => {
  const specializations = getSpecializationsBySportAndPosition(sportId, positionId, subcategoryId);
  return specializations.filter(category => category.required);
};

export const getOptionalSpecializations = (
  sportId: string, 
  positionId: string,
  subcategoryId?: string | null
): SpecializationCategory[] => {
  const specializations = getSpecializationsBySportAndPosition(sportId, positionId, subcategoryId);
  return specializations.filter(category => !category.required);
};