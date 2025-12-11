import { Position } from '../store/onboardingStore';

export interface Subcategory {
  id: string;
  name: string;
  description?: string;
}

export interface PositionSubcategories {
  positionId: string;
  subcategories: Subcategory[];
}

export const SUBCATEGORIES_CONFIG: PositionSubcategories[] = [
  {
    positionId: 'bowling',
    subcategories: [
      { id: 'pace', name: 'Pace' },
      { id: 'spin', name: 'Spin' }
    ]
  },
  {
    positionId: 'batting',
    subcategories: [
      { id: 'top-order', name: 'Top Order' },
      { id: 'middle-order', name: 'Middle Order' },
      { id: 'lower-order', name: 'Lower Order' }
    ]
  },
  {
    positionId: 'guard',
    subcategories: [
      { id: 'point-guard', name: 'Point guard' },
      { id: 'shooting-guard', name: 'Shooting guard' },
      { id: 'combo-guard', name: 'Combo Guard' }
    ]
  },
  {
    positionId: 'centre',
    subcategories: [
      { id: 'traditional-center', name: 'Traditional Center' },
      { id: 'modern-center', name: 'Modern Center' },
      { id: 'defensive-center', name: 'Defensive Center' }
    ]
  },
  {
    positionId: 'forward',
    subcategories: [
      { id: 'small-forward', name: 'Small forward' },
      { id: 'power-forward', name: 'Power forward' },
      { id: 'stretch-forward', name: 'Stretch forward' }
    ]
  },
  {
    positionId: 'setters',
    subcategories: [
      { id: 'playmaker', name: 'Playmaker' }
    ]
  },
  {
    positionId: 'hitters',
    subcategories: [
      { id: 'outside-hitter', name: 'Outside hitter (Leftside)' },
      { id: 'opposite-hitter', name: 'Opposite hitter (Rightside)' },
      { id: 'middle-blocker', name: 'Middle blocker' }
    ]
  },
  {
    positionId: 'defensive-specialist',
        subcategories: [
          { id: 'libero', name: 'Libero' },
          { id: 'defensive-serving-specialist', name: 'Defensive/Serving specialist' }
        ]
      },
      {
        positionId: 'sprint-races',
        subcategories: [
          { id: '100m', name: '100 metres' },
          { id: '200m', name: '200 metres' },
          { id: '400m', name: '400 metres' }
        ]
      },
      {
        positionId: 'middle-distance-races',
        subcategories: [
          { id: '800m', name: '800 metres' },
          { id: '1500m', name: '1500 metres' }
        ]
      },
      {
        positionId: 'long-distance-races',
        subcategories: [
          { id: '3000m', name: '3000 metres' },
          { id: '5000m', name: '5000 metres' },
          { id: '10000m', name: '10000 metres' }
        ]
      },
      {
        positionId: 'hurdle-races',
        subcategories: [
          { id: '100m-hurdles-women', name: '100 metre hurdles(women)' },
          { id: '110m-hurdles-men', name: '110 metres hurdles(men)' },
          { id: '400m-hurdles-men-women', name: '400 metre(man and women)' }
        ]
      },
      {
        positionId: 'steeplechase',
        subcategories: [
          { id: '3000m-steeplechase', name: '3000 metre steeplechase' }
        ]
      },
      {
        positionId: 'relay-races',
        subcategories: [
          { id: '4x100m-relay', name: '4 x 100 meter relay' },
          { id: '4x400m-relay', name: '4x400 metres relay' }
        ]
      },
      {
        positionId: 'mixed-relays',
        subcategories: [
          { id: '4x400m-mixed-relay', name: '4x400 metres mixed relay (2 men + 2 women)' }
        ]
      },
      {
        positionId: 'jumping-event',
        subcategories: [
          { id: 'long-jump', name: 'Long-jump' },
          { id: 'triple-jump', name: 'Triple-jump' },
          { id: 'high-jump', name: 'High-jump' },
          { id: 'pole-vault', name: 'Pole vault' }
        ]
      },
      {
        positionId: 'throwing-event',
        subcategories: [
          { id: 'shot-put', name: 'Shot put' },
          { id: 'discus-throw', name: 'Discus throw' },
          { id: 'javelin-throw', name: 'Javelin throw' },
          { id: 'hammer-throw', name: 'Hammer throw' }
        ]
      },
      {
        positionId: 'combined-events',
        subcategories: [
          { id: 'men-decathlon', name: 'Men Decathlon(10 events)' },
          { id: 'women-heptathlon', name: 'Women Heptathlon(7 events)' }
        ]
      },
      {
        positionId: 'chaser',
        subcategories: [
          { id: 'pole-diver', name: 'Pole Diver', description: 'Specializes in diving near poles' },
          { id: 'tap-specialist', name: 'Tap Specialist', description: 'Expert in tapping technique' },
          { id: 'chain-chaser', name: 'Chain Chaser (Team Coordination)', description: 'Focuses on team coordination during chain chasing' },
          { id: 'quick-tagger', name: 'Quick Tagger', description: 'Specialist in quick tagging' }
        ]
      },
      {
        positionId: 'runner',
        subcategories: [
          { id: 'zig-zag-runner', name: 'Zig-Zag Runner', description: 'Specializes in zig-zag running patterns' },
          { id: 'pole-runner', name: 'Pole Runner', description: 'Expert in running near poles' },
          { id: 'dodger', name: 'Dodger', description: 'Specializes in dodging chasers' },
          { id: 'pole-turner', name: 'Pole Turner', description: 'Expert in turning around poles' },
          { id: 'long-runner', name: 'Long Runner', description: 'Specialist in long-distance running in Kho-Kho' }
        ]
      },
      {
        positionId: 'freestyle-wrestling',
        subcategories: [
          { id: 'ground-grappler', name: 'Ground Grappler', description: 'Specializes in ground grappling techniques' },
          { id: 'throw-specialist', name: 'Throw Specialist', description: 'Expert in throwing techniques' },
          { id: 'counter-attack-expert', name: 'Counter-Attack Expert', description: 'Specializes in counter-attacking moves' },
          { id: 'pinning-expert', name: 'Pinning Expert', description: 'Expert in pinning techniques' }
        ]
      },
      {
        positionId: 'greco-roman-wrestling',
        subcategories: [
          { id: 'ground-grappler', name: 'Ground Grappler', description: 'Specializes in ground grappling techniques' },
          { id: 'throw-specialist', name: 'Throw Specialist', description: 'Expert in throwing techniques' },
          { id: 'counter-attack-expert', name: 'Counter-Attack Expert', description: 'Specializes in counter-attacking moves' },
          { id: 'pinning-expert', name: 'Pinning Expert', description: 'Expert in pinning techniques' }
        ]
      },
      {
        positionId: 'male',
        subcategories: [
          { id: 'snatch-specialist', name: 'Snatch Specialist', description: 'Specializes in snatch lift' },
          { id: 'clean-jerk-specialist', name: 'Clean and Jerk Specialist', description: 'Specializes in clean and jerk lift' },
          { id: 'all-rounder', name: 'All Rounder (Both Lifts)', description: 'Expert in both snatch and clean & jerk' }
        ]
      },
      {
        positionId: 'female',
        subcategories: [
          { id: 'snatch-specialist', name: 'Snatch Specialist', description: 'Specializes in snatch lift' },
          { id: 'clean-jerk-specialist', name: 'Clean and Jerk Specialist', description: 'Specializes in clean and jerk lift' },
          { id: 'all-rounder', name: 'All Rounder (Both Lifts)', description: 'Expert in both snatch and clean & jerk' }
        ]
      },
      {
        positionId: 'track-cyclist',
        subcategories: [
          { id: 'sprinter', name: 'Sprinter', description: 'Specializes in short-distance track sprints' },
          { id: 'pursuiter', name: 'Pursuiter', description: 'Specializes in pursuit racing on track' },
          { id: 'keirin-specialist', name: 'Keirin Specialist', description: 'Specializes in Keirin racing' }
        ]
      },
      {
        positionId: 'road-cyclist',
        subcategories: [
          { id: 'sprinter', name: 'Sprinter', description: 'Specializes in finishing sprints' },
          { id: 'climber', name: 'Climber', description: 'Specializes in climbing mountains' },
          { id: 'time-trialist', name: 'Time Trialist', description: 'Specializes in time trials' },
          { id: 'domestique', name: 'Domestique', description: 'Team support rider' }
        ]
      },
      {
        positionId: 'mountain-biker',
        subcategories: [
          { id: 'cross-country', name: 'Cross-Country', description: 'Specializes in cross-country racing' },
          { id: 'downhill', name: 'Downhill', description: 'Specializes in downhill racing' },
          { id: 'enduro', name: 'Enduro', description: 'Specializes in enduro racing' }
        ]
      },
      {
        positionId: 'bmx-rider',
        subcategories: [
          { id: 'freestyle', name: 'Freestyle', description: 'Specializes in BMX freestyle tricks' },
          { id: 'racing', name: 'Racing', description: 'Specializes in BMX racing' }
        ]
      },
      {
        positionId: 'singles-player',
        subcategories: [
          { id: 'defensive', name: 'Defensive', description: 'Specializes in defensive play and rallies' },
          { id: 'offensive', name: 'Offensive', description: 'Specializes in aggressive attacking play' },
          { id: 'all-rounder', name: 'All-Rounder', description: 'Balanced approach to both defensive and offensive play' }
        ]
      },
      {
        positionId: 'doubles-player',
        subcategories: [
          { id: 'front-court', name: 'Front Court (Net Specialist)', description: 'Specializes in net play at the front of the court' },
          { id: 'back-court', name: 'Back Court (Power Hitter)', description: 'Specializes in powerful shots from the back court' }
        ]
      },
      {
        positionId: 'mixed-doubles-player',
        subcategories: [
          { id: 'male-rear-attack', name: 'Male (Rear Attack)', description: 'Male player focusing on rear court attack' },
          { id: 'female-net-play', name: 'Female (Net Play)', description: 'Female player focusing on net play' }
        ]
      },
      {
        positionId: 'table-tennis-singles',
        subcategories: [
          { id: 'offensive-attacker', name: 'Offensive Attacker (Topspin Player)', description: 'Aggressive attacking style with topspin shots' },
          { id: 'defensive-chopper', name: 'Defensive Chopper / Blocker', description: 'Defensive playing style with chopping and blocking' },
          { id: 'all-rounder', name: 'All-Rounder', description: 'Balanced playing style combining attack and defense' },
          { id: 'penhold-grip', name: 'Penhold Grip Specialist', description: 'Specializes in penhold grip technique' },
          { id: 'shakehand-grip', name: 'Shakehand Grip Specialist', description: 'Specializes in shakehand grip technique' }
        ]
      },
      {
        positionId: 'table-tennis-doubles',
        subcategories: [
          { id: 'offensive-attacker', name: 'Offensive Attacker (Topspin Player)', description: 'Aggressive attacking style with topspin shots' },
          { id: 'defensive-chopper', name: 'Defensive Chopper / Blocker', description: 'Defensive playing style with chopping and blocking' },
          { id: 'all-rounder', name: 'All-Rounder', description: 'Balanced playing style combining attack and defense' },
          { id: 'penhold-grip', name: 'Penhold Grip Specialist', description: 'Specializes in penhold grip technique' },
          { id: 'shakehand-grip', name: 'Shakehand Grip Specialist', description: 'Specializes in shakehand grip technique' }
        ]
      },
      {
        positionId: 'recurve-archer',
        subcategories: [
          { id: 'individual', name: 'Individual Event', description: 'Competes in individual archery competitions' },
          { id: 'team-event', name: 'Team Event', description: 'Competes in team archery competitions' }
        ]
      },
      {
        positionId: 'compound-archer',
        subcategories: [
          { id: 'individual', name: 'Individual Event', description: 'Competes in individual archery competitions' },
          { id: 'team-event', name: 'Team Event', description: 'Competes in team archery competitions' }
        ]
      },
      {
        positionId: 'pistol-shooter',
        subcategories: [
          { id: '10m-air', name: '10m Air Pistol', description: 'Specializes in 10 meter air pistol shooting' },
          { id: '25m-rapid', name: '25m Rapid Fire', description: 'Specializes in 25 meter rapid fire pistol' },
          { id: '50m-free', name: '50m Free Pistol', description: 'Specializes in 50 meter free pistol' }
        ]
      },
      {
        positionId: 'rifle-shooter',
        subcategories: [
          { id: '10m-air', name: '10m Air Rifle', description: 'Specializes in 10 meter air rifle shooting' },
          { id: '50m-3-positions', name: '50m 3 Positions', description: 'Specializes in 50 meter 3 positions rifle' },
          { id: 'prone-specialist', name: 'Prone Specialist', description: 'Specializes in prone position rifle shooting' }
        ]
      },
      {
        positionId: 'shotgun-shooter',
        subcategories: [
          { id: 'trap', name: 'Trap', description: 'Specializes in trap shooting' },
          { id: 'skeet', name: 'Skeet', description: 'Specializes in skeet shooting' },
          { id: 'double-trap', name: 'Double Trap', description: 'Specializes in double trap shooting' }
        ]
      },
      {
        positionId: 'boxer',
        subcategories: [
          { id: 'flyweight', name: 'Flyweight', description: 'Flyweight division (up to 112 lbs / 51 kg)' },
          { id: 'featherweight', name: 'Featherweight', description: 'Featherweight division (up to 126 lbs / 57 kg)' },
          { id: 'lightweight', name: 'Lightweight', description: 'Lightweight division (up to 135 lbs / 61 kg)' },
          { id: 'welterweight', name: 'Welterweight', description: 'Welterweight division (up to 147 lbs / 67 kg)' },
          { id: 'middleweight', name: 'Middleweight', description: 'Middleweight division (up to 160 lbs / 73 kg)' },
          { id: 'heavyweight', name: 'Heavyweight', description: 'Heavyweight division (over 200 lbs / 91 kg)' }
        ]
      },
      {
        positionId: 'professional-golfer',
        subcategories: [
          { id: 'long-drive-specialist', name: 'Long Drive Specialist', description: 'Specializes in long-distance drives' },
          { id: 'short-game-specialist', name: 'Short Game Specialist (Chipping, Putting)', description: 'Specializes in short game techniques' },
          { id: 'all-rounder', name: 'All-Rounder', description: 'Balanced golf skills across all aspects' }
        ]
      },
      {
        positionId: 'amateur-golfer',
        subcategories: [
          { id: 'long-drive-specialist', name: 'Long Drive Specialist', description: 'Specializes in long-distance drives' },
          { id: 'short-game-specialist', name: 'Short Game Specialist (Chipping, Putting)', description: 'Specializes in short game techniques' },
          { id: 'all-rounder', name: 'All-Rounder', description: 'Balanced golf skills across all aspects' }
        ]
      }
    ];

export const getSubcategoriesByPositionId = (positionId: string): Subcategory[] => {
  const positionSubcategories = SUBCATEGORIES_CONFIG.find(ps => ps.positionId === positionId);
  return positionSubcategories ? positionSubcategories.subcategories : [];
};

export const getSubcategoryById = (positionId: string, subcategoryId: string): Subcategory | undefined => {
  const subcategories = getSubcategoriesByPositionId(positionId);
  return subcategories.find(subcategory => subcategory.id === subcategoryId);
};