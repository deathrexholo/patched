/**
 * Sport-Specific Video Skills Configuration
 *
 * This file defines the hierarchical structure of video skill categories for each sport.
 * Structure: Sport → Main Category → Specific Skills
 *
 * Used by talent video upload to provide sport-specific skill categorization.
 */

export interface VideoSkillCategory {
  id: string;
  name: string;
  skills: string[];
}

export interface SportVideoSkills {
  [sportId: string]: {
    categories: VideoSkillCategory[];
  };
}

export const videoSkillsConfig: SportVideoSkills = {
  // CRICKET
  cricket: {
    categories: [
      {
        id: 'batting',
        name: 'Batting',
        skills: [
          'Cover Drive',
          'Straight Drive',
          'Pull Shot',
          'Cut Shot',
          'Hook Shot',
          'Sweep Shot',
          'Reverse Sweep',
          'Upper Cut',
          'Flick Shot',
          'Lofted Shot',
          'Square Drive',
          'Late Cut',
          'Switch Hit',
          'Scoop Shot',
          'Ramp Shot',
        ],
      },
      {
        id: 'bowling',
        name: 'Bowling',
        skills: [
          'Yorker',
          'Bouncer',
          'In-swinger',
          'Out-swinger',
          'Googly',
          'Doosra',
          'Leg Spin',
          'Off Spin',
          'Slower Ball',
          'Knuckleball',
          'Reverse Swing',
          'Carrom Ball',
          'Arm Ball',
          'Top Spin',
          'Flipper',
        ],
      },
      {
        id: 'fielding',
        name: 'Fielding',
        skills: [
          'Diving Catch',
          'One-handed Catch',
          'Direct Hit',
          'Diving Stop',
          'Relay Throw',
          'Close-in Catch',
          'Boundary Save',
          'Quick Release',
          'Running Catch',
          'Sliding Stop',
        ],
      },
      {
        id: 'wicketkeeping',
        name: 'Wicket-keeping',
        skills: [
          'Stumping',
          'Diving Catch',
          'One-handed Catch',
          'Lightning Reflexes',
          'Leg-side Take',
          'Standing Up to Stumps',
        ],
      },
    ],
  },

  // FOOTBALL (SOCCER)
  football: {
    categories: [
      {
        id: 'shooting',
        name: 'Shooting',
        skills: [
          'Volley',
          'Bicycle Kick',
          'Free Kick',
          'Penalty',
          'Long Range Shot',
          'Chip Shot',
          'Header',
          'Curling Shot',
          'Knuckleball',
          'Finesse Shot',
        ],
      },
      {
        id: 'dribbling',
        name: 'Dribbling',
        skills: [
          'Step Over',
          'Elastico',
          'Roulette',
          'Nutmeg',
          'La Croqueta',
          'Rainbow Flick',
          'Heel Flick',
          'Fake Shot',
          'Speed Dribbling',
          'Close Control',
        ],
      },
      {
        id: 'passing',
        name: 'Passing',
        skills: [
          'Through Ball',
          'Long Pass',
          'Cross',
          'Corner Kick',
          'One-Two Pass',
          'Backheel Pass',
          'Rabona',
          'Trivela',
          'Switch Play',
          'Short Pass',
        ],
      },
      {
        id: 'defending',
        name: 'Defending',
        skills: [
          'Sliding Tackle',
          'Standing Tackle',
          'Block',
          'Interception',
          'Clearance',
          'Jockeying',
          'Marking',
          'Recovery Run',
        ],
      },
      {
        id: 'goalkeeping',
        name: 'Goalkeeping',
        skills: [
          'Diving Save',
          'Reflex Save',
          'One-on-One Save',
          'Punch Clear',
          'Distribution',
          'Sweeping',
          'Command of Area',
          'Penalty Save',
        ],
      },
    ],
  },

  // BASKETBALL
  basketball: {
    categories: [
      {
        id: 'shooting',
        name: 'Shooting',
        skills: [
          'Jump Shot',
          'Three-Pointer',
          'Fadeaway',
          'Hook Shot',
          'Free Throw',
          'Floater',
          'Bank Shot',
          'Mid-Range',
          'Catch and Shoot',
          'Step-back Shot',
        ],
      },
      {
        id: 'dribbling',
        name: 'Dribbling',
        skills: [
          'Crossover',
          'Between the Legs',
          'Behind the Back',
          'Spin Move',
          'Hesitation',
          'In and Out',
          'Euro Step',
          'Double Crossover',
          'Ankle Breaker',
        ],
      },
      {
        id: 'dunking',
        name: 'Dunking',
        skills: [
          'Two-handed Dunk',
          'One-handed Dunk',
          'Tomahawk Dunk',
          'Windmill Dunk',
          '360 Dunk',
          'Alley-oop',
          'Reverse Dunk',
          'Between the Legs Dunk',
        ],
      },
      {
        id: 'passing',
        name: 'Passing',
        skills: [
          'Chest Pass',
          'Bounce Pass',
          'Overhead Pass',
          'No-look Pass',
          'Behind the Back Pass',
          'Alley-oop Pass',
          'Outlet Pass',
          'Skip Pass',
        ],
      },
      {
        id: 'defense',
        name: 'Defense',
        skills: [
          'Block',
          'Steal',
          'Chase Down Block',
          'Perimeter Defense',
          'Post Defense',
          'Help Defense',
          'Closeout',
        ],
      },
      {
        id: 'rebounding',
        name: 'Rebounding',
        skills: [
          'Offensive Rebound',
          'Defensive Rebound',
          'Tip-in',
          'Box Out',
        ],
      },
    ],
  },

  // ATHLETICS (TRACK & FIELD)
  athletics: {
    categories: [
      {
        id: 'sprints',
        name: 'Sprints',
        skills: [
          '100m Sprint',
          '200m Sprint',
          '400m Sprint',
          'Starting Block Technique',
          'Acceleration Phase',
          'Top Speed Mechanics',
          'Finish Technique',
        ],
      },
      {
        id: 'middle_distance',
        name: 'Middle Distance',
        skills: [
          '800m Run',
          '1500m Run',
          'Mile Run',
          'Pacing Strategy',
          'Kick Finish',
        ],
      },
      {
        id: 'long_distance',
        name: 'Long Distance',
        skills: [
          '5000m Run',
          '10000m Run',
          'Marathon',
          'Endurance Running',
          'Hill Training',
        ],
      },
      {
        id: 'hurdles',
        name: 'Hurdles',
        skills: [
          '110m Hurdles',
          '400m Hurdles',
          'Hurdle Technique',
          'Three-Step Rhythm',
          'Trail Leg Technique',
        ],
      },
      {
        id: 'jumps',
        name: 'Jumps',
        skills: [
          'Long Jump',
          'Triple Jump',
          'High Jump',
          'Pole Vault',
          'Approach Run',
          'Takeoff',
          'Flight Technique',
          'Landing',
        ],
      },
      {
        id: 'throws',
        name: 'Throws',
        skills: [
          'Shot Put',
          'Discus Throw',
          'Javelin Throw',
          'Hammer Throw',
          'Spin Technique',
          'Release',
        ],
      },
      {
        id: 'relays',
        name: 'Relays',
        skills: [
          '4x100m Relay',
          '4x400m Relay',
          'Baton Exchange',
          'Handoff Technique',
        ],
      },
    ],
  },

  // HOCKEY
  hockey: {
    categories: [
      {
        id: 'shooting',
        name: 'Shooting',
        skills: [
          'Slap Shot',
          'Wrist Shot',
          'Snap Shot',
          'Backhand Shot',
          'One-timer',
          'Penalty Shot',
          'Deflection',
        ],
      },
      {
        id: 'stickhandling',
        name: 'Stickhandling',
        skills: [
          'Toe Drag',
          'Deke',
          'Between the Legs',
          'Spin-o-rama',
          'Backhand to Forehand',
          'Close Control',
        ],
      },
      {
        id: 'passing',
        name: 'Passing',
        skills: [
          'Saucer Pass',
          'Tape-to-tape Pass',
          'One-touch Pass',
          'Drop Pass',
          'Cross-ice Pass',
        ],
      },
      {
        id: 'skating',
        name: 'Skating',
        skills: [
          'Forward Skating',
          'Backward Skating',
          'Crossovers',
          'Tight Turns',
          'Edge Work',
          'Acceleration',
        ],
      },
      {
        id: 'defense',
        name: 'Defense',
        skills: [
          'Body Check',
          'Poke Check',
          'Stick Lift',
          'Shot Blocking',
          'Gap Control',
        ],
      },
      {
        id: 'goaltending',
        name: 'Goaltending',
        skills: [
          'Butterfly Save',
          'Glove Save',
          'Pad Save',
          'Stick Save',
          'Breakaway Save',
          'Rebound Control',
        ],
      },
    ],
  },

  // SWIMMING
  swimming: {
    categories: [
      {
        id: 'freestyle',
        name: 'Freestyle',
        skills: [
          'Sprint Freestyle',
          'Distance Freestyle',
          'Breathing Technique',
          'Flip Turn',
          'Dive Start',
          'Finish Touch',
        ],
      },
      {
        id: 'backstroke',
        name: 'Backstroke',
        skills: [
          'Backstroke Technique',
          'Backstroke Turn',
          'Backstroke Start',
          'Underwater Dolphin Kick',
        ],
      },
      {
        id: 'breaststroke',
        name: 'Breaststroke',
        skills: [
          'Breaststroke Pull',
          'Breaststroke Kick',
          'Breaststroke Turn',
          'Pullout Technique',
        ],
      },
      {
        id: 'butterfly',
        name: 'Butterfly',
        skills: [
          'Butterfly Stroke',
          'Dolphin Kick',
          'Butterfly Turn',
          'Two-hand Touch',
        ],
      },
      {
        id: 'individual_medley',
        name: 'Individual Medley',
        skills: [
          'IM Transitions',
          '200m IM',
          '400m IM',
        ],
      },
    ],
  },

  // VOLLEYBALL
  volleyball: {
    categories: [
      {
        id: 'attacking',
        name: 'Attacking',
        skills: [
          'Spike',
          'Kill Shot',
          'Tip',
          'Roll Shot',
          'Quick Attack',
          'Back Row Attack',
          'Slide Attack',
        ],
      },
      {
        id: 'serving',
        name: 'Serving',
        skills: [
          'Jump Serve',
          'Float Serve',
          'Topspin Serve',
          'Underhand Serve',
          'Jump Float Serve',
        ],
      },
      {
        id: 'setting',
        name: 'Setting',
        skills: [
          'Overhead Set',
          'Back Set',
          'Jump Set',
          'One-handed Set',
          'Quick Set',
        ],
      },
      {
        id: 'blocking',
        name: 'Blocking',
        skills: [
          'Solo Block',
          'Double Block',
          'Triple Block',
          'Swing Block',
          'Stuff Block',
        ],
      },
      {
        id: 'digging',
        name: 'Digging',
        skills: [
          'Pancake',
          'Dive',
          'Roll',
          'One-handed Dig',
          'Overhead Dig',
        ],
      },
      {
        id: 'passing',
        name: 'Passing',
        skills: [
          'Bump Pass',
          'Forearm Pass',
          'Overhead Pass',
          'Platform Pass',
        ],
      },
    ],
  },

  // BADMINTON
  badminton: {
    categories: [
      {
        id: 'smashes',
        name: 'Smashes',
        skills: [
          'Forehand Smash',
          'Backhand Smash',
          'Jump Smash',
          'Stick Smash',
        ],
      },
      {
        id: 'clears',
        name: 'Clears',
        skills: [
          'Forehand Clear',
          'Backhand Clear',
          'Defensive Clear',
          'Attacking Clear',
        ],
      },
      {
        id: 'drops',
        name: 'Drops',
        skills: [
          'Forehand Drop',
          'Backhand Drop',
          'Slow Drop',
          'Fast Drop',
          'Slice Drop',
        ],
      },
      {
        id: 'net_shots',
        name: 'Net Shots',
        skills: [
          'Net Kill',
          'Tumbling Net',
          'Spinning Net',
          'Cross Net',
          'Lift',
        ],
      },
      {
        id: 'drives',
        name: 'Drives',
        skills: [
          'Forehand Drive',
          'Backhand Drive',
          'Flat Drive',
        ],
      },
      {
        id: 'serves',
        name: 'Serves',
        skills: [
          'Low Serve',
          'High Serve',
          'Flick Serve',
          'Drive Serve',
        ],
      },
      {
        id: 'footwork',
        name: 'Footwork',
        skills: [
          'Split Step',
          'Lunge',
          'Chasse Step',
          'Shadow Badminton',
        ],
      },
    ],
  },

  // TABLE TENNIS
  table_tennis: {
    categories: [
      {
        id: 'serves',
        name: 'Serves',
        skills: [
          'Forehand Pendulum Serve',
          'Backhand Serve',
          'Tomahawk Serve',
          'High Toss Serve',
          'Sidespin Serve',
          'Backspin Serve',
          'Topspin Serve',
        ],
      },
      {
        id: 'forehand',
        name: 'Forehand',
        skills: [
          'Forehand Topspin',
          'Forehand Drive',
          'Forehand Loop',
          'Forehand Flick',
          'Forehand Smash',
        ],
      },
      {
        id: 'backhand',
        name: 'Backhand',
        skills: [
          'Backhand Topspin',
          'Backhand Drive',
          'Backhand Loop',
          'Backhand Flick',
          'Backhand Block',
        ],
      },
      {
        id: 'defense',
        name: 'Defense',
        skills: [
          'Backspin Chop',
          'Block',
          'Counter Loop',
          'Push',
        ],
      },
    ],
  },

  // TENNIS
  tennis: {
    categories: [
      {
        id: 'groundstrokes',
        name: 'Groundstrokes',
        skills: [
          'Forehand',
          'Backhand',
          'Topspin Forehand',
          'Slice Backhand',
          'Two-handed Backhand',
          'Inside-out Forehand',
          'Inside-in Forehand',
        ],
      },
      {
        id: 'serves',
        name: 'Serves',
        skills: [
          'Flat Serve',
          'Kick Serve',
          'Slice Serve',
          'Topspin Serve',
          'Second Serve',
          'Ace',
        ],
      },
      {
        id: 'volleys',
        name: 'Volleys',
        skills: [
          'Forehand Volley',
          'Backhand Volley',
          'Drop Volley',
          'Half Volley',
          'Swinging Volley',
        ],
      },
      {
        id: 'special_shots',
        name: 'Special Shots',
        skills: [
          'Overhead Smash',
          'Drop Shot',
          'Lob',
          'Passing Shot',
          'Tweener',
          'Between-the-legs Shot',
        ],
      },
      {
        id: 'return',
        name: 'Return of Serve',
        skills: [
          'Forehand Return',
          'Backhand Return',
          'Chip Return',
          'Block Return',
        ],
      },
    ],
  },

  // WRESTLING
  wrestling: {
    categories: [
      {
        id: 'takedowns',
        name: 'Takedowns',
        skills: [
          'Single Leg',
          'Double Leg',
          'High Crotch',
          'Fireman\'s Carry',
          'Duck Under',
          'Ankle Pick',
          'Lateral Drop',
        ],
      },
      {
        id: 'throws',
        name: 'Throws',
        skills: [
          'Suplex',
          'Hip Toss',
          'Headlock',
          'Arm Drag',
          'Gut Wrench',
        ],
      },
      {
        id: 'pins',
        name: 'Pins',
        skills: [
          'Half Nelson',
          'Full Nelson',
          'Cradle',
          'Turk',
          'Stack',
        ],
      },
      {
        id: 'escapes',
        name: 'Escapes',
        skills: [
          'Stand Up',
          'Switch',
          'Roll',
          'Sit Out',
          'Granby Roll',
        ],
      },
      {
        id: 'counters',
        name: 'Counters',
        skills: [
          'Sprawl',
          'Whizzer',
          'Re-shot',
          'Counter Throw',
        ],
      },
    ],
  },

  // BOXING
  boxing: {
    categories: [
      {
        id: 'punches',
        name: 'Punches',
        skills: [
          'Jab',
          'Cross',
          'Hook',
          'Uppercut',
          'Overhand',
          'Body Shot',
          'Liver Shot',
        ],
      },
      {
        id: 'combinations',
        name: 'Combinations',
        skills: [
          'One-Two',
          'Jab-Cross-Hook',
          'Three-Punch Combo',
          'Four-Punch Combo',
          'Five-Punch Combo',
        ],
      },
      {
        id: 'defense',
        name: 'Defense',
        skills: [
          'Slip',
          'Bob and Weave',
          'Parry',
          'Block',
          'Roll',
          'Pull Counter',
          'Shoulder Roll',
        ],
      },
      {
        id: 'footwork',
        name: 'Footwork',
        skills: [
          'Pivot',
          'Circle',
          'Lateral Movement',
          'In and Out',
          'Angle Work',
        ],
      },
      {
        id: 'counterattacking',
        name: 'Counter-attacking',
        skills: [
          'Counter Jab',
          'Counter Hook',
          'Counter Right',
          'Check Hook',
        ],
      },
    ],
  },

  // KABADDI
  kabaddi: {
    categories: [
      {
        id: 'raiding',
        name: 'Raiding',
        skills: [
          'Hand Touch',
          'Toe Touch',
          'Bonus Point',
          'Running Hand Touch',
          'Dubki',
          'Lion Jump',
          'Escape',
        ],
      },
      {
        id: 'defense',
        name: 'Defense',
        skills: [
          'Ankle Hold',
          'Thigh Hold',
          'Chain Tackle',
          'Block',
          'Dash',
          'Double Hold',
        ],
      },
      {
        id: 'skills',
        name: 'Skills',
        skills: [
          'Super Raid',
          'Super Tackle',
          'All Out',
          'Do-or-Die Raid',
        ],
      },
    ],
  },

  // KHO-KHO
  'kho-kho': {
    categories: [
      {
        id: 'chasing',
        name: 'Chasing',
        skills: [
          'Speed Run',
          'Direction Change',
          'Quick Turn',
          'Tag',
        ],
      },
      {
        id: 'defense',
        name: 'Defense',
        skills: [
          'Dodge',
          'Pole Dive',
          'Late Kho',
          'Chain',
        ],
      },
      {
        id: 'strategy',
        name: 'Strategy',
        skills: [
          'Sky Dive',
          'Ring Play',
          'Pole Dive',
        ],
      },
    ],
  },

  // WEIGHTLIFTING
  weightlifting: {
    categories: [
      {
        id: 'olympic_lifts',
        name: 'Olympic Lifts',
        skills: [
          'Snatch',
          'Clean and Jerk',
          'Clean',
          'Jerk',
          'Power Snatch',
          'Power Clean',
        ],
      },
      {
        id: 'squats',
        name: 'Squats',
        skills: [
          'Front Squat',
          'Back Squat',
          'Overhead Squat',
          'Clean Squat',
        ],
      },
      {
        id: 'pulls',
        name: 'Pulls',
        skills: [
          'Snatch Pull',
          'Clean Pull',
          'Deadlift',
          'Romanian Deadlift',
        ],
      },
      {
        id: 'technique',
        name: 'Technique',
        skills: [
          'Hookgrip',
          'Catch Position',
          'Start Position',
          'Turnover',
          'Dip and Drive',
        ],
      },
    ],
  },

  // CYCLING
  cycling: {
    categories: [
      {
        id: 'sprinting',
        name: 'Sprinting',
        skills: [
          'Track Sprint',
          'Road Sprint',
          'Lead-out',
          'Final Kick',
        ],
      },
      {
        id: 'climbing',
        name: 'Climbing',
        skills: [
          'Seated Climbing',
          'Standing Climbing',
          'Switchback Technique',
          'Pacing',
        ],
      },
      {
        id: 'time_trial',
        name: 'Time Trial',
        skills: [
          'Aerodynamic Position',
          'Power Pacing',
          'Cornering',
        ],
      },
      {
        id: 'skills',
        name: 'Skills',
        skills: [
          'Descending',
          'Cornering',
          'Drafting',
          'Breakaway',
          'Bunch Sprint',
        ],
      },
      {
        id: 'mountain_biking',
        name: 'Mountain Biking',
        skills: [
          'Downhill',
          'Cross Country',
          'Technical Descent',
          'Jump',
          'Drop',
        ],
      },
    ],
  },

  // ARCHERY
  archery: {
    categories: [
      {
        id: 'shooting',
        name: 'Shooting',
        skills: [
          'Recurve Technique',
          'Compound Technique',
          'Longbow Technique',
          'Release',
          'Anchor Point',
        ],
      },
      {
        id: 'accuracy',
        name: 'Accuracy',
        skills: [
          '10-Point Shot',
          'Bullseye',
          'Grouping',
          'Distance Shooting',
        ],
      },
      {
        id: 'disciplines',
        name: 'Disciplines',
        skills: [
          'Target Archery',
          'Field Archery',
          '3D Archery',
          'Indoor Archery',
        ],
      },
    ],
  },

  // SHOOTING
  shooting: {
    categories: [
      {
        id: 'rifle',
        name: 'Rifle',
        skills: [
          'Air Rifle',
          '50m Rifle',
          '10m Air Rifle',
          'Prone Position',
          'Standing Position',
          'Kneeling Position',
        ],
      },
      {
        id: 'pistol',
        name: 'Pistol',
        skills: [
          'Air Pistol',
          '25m Pistol',
          '10m Air Pistol',
          'Rapid Fire',
          'Precision Shooting',
        ],
      },
      {
        id: 'shotgun',
        name: 'Shotgun',
        skills: [
          'Trap',
          'Skeet',
          'Double Trap',
          'Clay Pigeon',
        ],
      },
    ],
  },

  // GOLF
  golf: {
    categories: [
      {
        id: 'drives',
        name: 'Drives',
        skills: [
          'Driver',
          'Long Drive',
          'Fade',
          'Draw',
          'Straight Drive',
        ],
      },
      {
        id: 'irons',
        name: 'Irons',
        skills: [
          'Long Iron',
          'Mid Iron',
          'Short Iron',
          'Punch Shot',
          'Knockdown',
        ],
      },
      {
        id: 'short_game',
        name: 'Short Game',
        skills: [
          'Chip Shot',
          'Pitch Shot',
          'Flop Shot',
          'Bunker Shot',
          'Lob Shot',
        ],
      },
      {
        id: 'putting',
        name: 'Putting',
        skills: [
          'Long Putt',
          'Short Putt',
          'Breaking Putt',
          'Lag Putt',
        ],
      },
      {
        id: 'specialty',
        name: 'Specialty',
        skills: [
          'Recovery Shot',
          'Trouble Shot',
          'Stinger',
          'Hook',
          'Slice Correction',
        ],
      },
    ],
  },

  // FIELD EVENTS (overlaps with Athletics throws/jumps, but kept separate)
  field_events: {
    categories: [
      {
        id: 'jumps',
        name: 'Jumps',
        skills: [
          'Long Jump',
          'Triple Jump',
          'High Jump',
          'Pole Vault',
          'Approach',
          'Takeoff',
          'Flight',
          'Landing',
        ],
      },
      {
        id: 'throws',
        name: 'Throws',
        skills: [
          'Shot Put',
          'Discus',
          'Javelin',
          'Hammer Throw',
          'Spin Technique',
          'Glide Technique',
          'Release',
        ],
      },
    ],
  },

  // BASEBALL (commonly requested)
  baseball: {
    categories: [
      {
        id: 'pitching',
        name: 'Pitching',
        skills: [
          'Fastball',
          'Curveball',
          'Slider',
          'Changeup',
          'Knuckleball',
          'Cutter',
          'Sinker',
          'Splitter',
        ],
      },
      {
        id: 'hitting',
        name: 'Hitting',
        skills: [
          'Home Run',
          'Line Drive',
          'Bunt',
          'Drag Bunt',
          'Opposite Field',
          'Pull Hitting',
        ],
      },
      {
        id: 'fielding',
        name: 'Fielding',
        skills: [
          'Diving Catch',
          'Double Play',
          'Throw to Base',
          'Pop Fly',
          'Grounder',
        ],
      },
      {
        id: 'baserunning',
        name: 'Baserunning',
        skills: [
          'Stealing Base',
          'Sliding',
          'Rounding Bases',
        ],
      },
    ],
  },
};

/**
 * Generic skill categories for sports without specific configurations
 * or as fallback options
 */
export const genericSkillCategories: VideoSkillCategory[] = [
  {
    id: 'highlights',
    name: 'Highlights',
    skills: ['Best Moments', 'Match Highlights', 'Season Highlights'],
  },
  {
    id: 'training',
    name: 'Training',
    skills: ['Drill', 'Practice Session', 'Conditioning', 'Skill Development'],
  },
  {
    id: 'competition',
    name: 'Competition',
    skills: ['Match Performance', 'Tournament', 'Championship'],
  },
  {
    id: 'technique',
    name: 'Technique',
    skills: ['Form Analysis', 'Skill Demonstration', 'Technical Drill'],
  },
];

/**
 * Get video skill categories for a specific sport
 */
export const getVideoSkillsForSport = (sportId: string): VideoSkillCategory[] => {
  const sportConfig = videoSkillsConfig[sportId.toLowerCase()];
  return sportConfig ? sportConfig.categories : genericSkillCategories;
};

/**
 * Get skills for a specific category within a sport
 */
export const getSkillsForCategory = (
  sportId: string,
  categoryId: string
): string[] => {
  const categories = getVideoSkillsForSport(sportId);
  const category = categories.find((cat) => cat.id === categoryId);
  return category ? category.skills : [];
};

/**
 * Check if a sport has specific skill categories defined
 */
export const hasSportSpecificSkills = (sportId: string): boolean => {
  return Object.prototype.hasOwnProperty.call(videoSkillsConfig, sportId.toLowerCase());
};
