import { Position } from '../store/onboardingStore';

export interface SportPositions {
  sportId: string;
  positions: Position[];
}

const ATHLETICS_POSITIONS = [
  {
    id: 'sprint-races',
    name: 'Sprint Races(short distance)',
    description: 'Short distance running events',
    icon: '🏃'
  },
  {
    id: 'middle-distance-races',
    name: 'Middle-Distance Races',
    description: 'Races over middle distances',
    icon: '🏃'
  },
  {
    id: 'long-distance-races',
    name: 'Long-Distance Races',
    description: 'Races over long distances',
    icon: '🏃‍♀️'
  },
  {
    id: 'hurdle-races',
    name: 'Hurdle Races',
    description: 'Races with hurdles',
    icon: '🏃‍♂️'
  },
  {
    id: 'steeplechase',
    name: 'Steeplechase',
    description: 'Distance race with obstacles',
    icon: '🚧'
  },
  {
    id: 'relay-races',
    name: 'Relay Races',
    description: '4 Runner Team',
    icon: '👨‍👨‍👧‍👦'
  },
  {
    id: 'mixed-relays',
    name: 'Mixed Relays(newer format)',
    description: 'Relay races with mixed-gender teams',
    icon: '👨‍👩‍👧‍👦'
  }
];

const CRICKET_POSITIONS = [
  {
    id: 'bowling',
    name: 'Bowling',
    description: 'Specialist in bowling deliveries',
    icon: '🏏'
  },
  {
    id: 'batting',
    name: 'Batting',
    description: 'Specialist in batting and scoring runs',
    icon: '🏏'
  },
  {
    id: 'wicket-keeping',
    name: 'All rounder/Wicket keeping',
    description: 'All-rounder player or wicket keeper behind the stumps',
    icon: '🧤'
  }
];

const FOOTBALL_POSITIONS = [
  {
    id: 'goalkeeper',
    name: 'Goalkeeper',
    description: 'Defends the goal',
    icon: '🥅'
  },
  {
    id: 'defender',
    name: 'Defender',
    description: 'Defensive player',
    icon: '🛡️'
  },
  {
    id: 'midfielder',
    name: 'Midfielder',
    description: 'Plays in the middle of the field',
    icon: '⚽'
  },
  {
    id: 'forward',
    name: 'Forward',
    description: 'Attacking player',
    icon: '⚽'
  }
];

const BASKETBALL_POSITIONS = [
  {
    id: 'guard',
    name: 'Guard',
    description: 'Ball handler and perimeter player',
    icon: '🏀'
  },
  {
    id: 'centre',
    name: 'Center',
    description: 'Plays near the basket, tallest player',
    icon: '🏀'
  },
  {
    id: 'forward',
    name: 'Forward',
    description: 'Versatile wing and frontcourt player',
    icon: '🏀'
  }
];

const HOCKEY_POSITIONS = [
  {
    id: 'goalkeeper',
    name: 'Goalkeeper',
    description: 'Defends the goal',
    icon: '🥅'
  },
  {
    id: 'defender',
    name: 'Defender',
    description: 'Defensive player',
    icon: '🏑'
  },
  {
    id: 'midfielder',
    name: 'Midfielder',
    description: 'Plays in the middle of the field',
    icon: '🏑'
  },
  {
    id: 'forward',
    name: 'Forward',
    description: 'Attacking player',
    icon: '🏑'
  }
];

const SWIMMING_POSITIONS = [
  {
    id: 'freestyle',
    name: 'Freestyle',
    description: 'Freestyle swimming specialist',
    icon: '🏊'
  },
  {
    id: 'backstroke',
    name: 'Backstroke',
    description: 'Backstroke swimming specialist',
    icon: '🏊‍♂️'
  },
  {
    id: 'breaststroke',
    name: 'Breaststroke',
    description: 'Breaststroke swimming specialist',
    icon: '🏊‍♀️'
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    description: 'Butterfly stroke specialist',
    icon: '🏊'
  },
  {
    id: 'individual-medley',
    name: 'Individual Medley',
    description: 'All-stroke specialist',
    icon: '🏊‍♂️'
  }
];

const VOLLEYBALL_POSITIONS = [
  {
    id: 'setters',
    name: 'Setters',
    description: 'Sets the ball for attackers',
    icon: '🏐'
  },
  {
    id: 'hitters',
    name: 'Hitters',
    description: 'Offensive attackers who spike the ball',
    icon: '🏐'
  },
  {
    id: 'defensive-specialist',
    name: 'Defensive specialist',
    description: 'Specialist in defense and receiving',
    icon: '🏐'
  }
];

const FIELD_EVENTS_POSITIONS = [
  {
    id: 'jumping-event',
    name: 'Jumping event',
    description: 'Jumping events in athletics',
    icon: '🤸'
  },
  {
    id: 'throwing-event',
    name: 'Throwing event',
    description: 'Throwing events in athletics',
    icon: ' discus'
  },
  {
    id: 'combined-events',
    name: 'Combined events',
    description: 'Events combining multiple disciplines',
    icon: '🏅'
  }
];

const KABADDI_POSITIONS = [
  {
    id: 'raider',
    name: 'Raider',
    description: 'Specialist in raiding and scoring points',
    icon: '🏃'
  },
  {
    id: 'defender',
    name: 'Defender',
    description: 'Specialist in defending and tackling raiders',
    icon: '🛡️'
  },
  {
    id: 'all-rounder',
    name: 'All rounder',
    description: 'Skilled in both raiding and defending',
    icon: '⚡'
  }
];

const KHO_KHO_POSITIONS = [
  {
    id: 'chaser',
    name: 'Chaser',
    description: 'Player who chases and tags opponents',
    icon: '🏃‍♂️'
  },
  {
    id: 'runner',
    name: 'Runner',
    description: 'Player who runs and dodges chasers',
    icon: '🏃‍♀️'
  }
];

const WRESTLING_POSITIONS = [
  {
    id: 'freestyle-wrestling',
    name: 'Freestyle Wrestling',
    description: 'Freestyle wrestling with techniques and holds',
    icon: '🤼'
  },
  {
    id: 'greco-roman-wrestling',
    name: 'Greco-Roman Wrestling',
    description: 'Greco-Roman wrestling style with upper body focus',
    icon: '🤼‍♂️'
  }
];

const WEIGHTLIFTING_POSITIONS = [
  {
    id: 'male',
    name: 'Male',
    description: 'Male weightlifting category',
    icon: '🏋️‍♂️'
  },
  {
    id: 'female',
    name: 'Female',
    description: 'Female weightlifting category',
    icon: '🏋️‍♀️'
  }
];

const CYCLING_POSITIONS = [
  {
    id: 'track-cyclist',
    name: 'Track Cyclist',
    description: 'Velodrome track cycling specialist',
    icon: '🚴'
  },
  {
    id: 'road-cyclist',
    name: 'Road Cyclist',
    description: 'Road cycling specialist',
    icon: '🚴‍♂️'
  },
  {
    id: 'mountain-biker',
    name: 'Mountain Biker',
    description: 'Mountain biking specialist',
    icon: '🚵'
  },
  {
    id: 'bmx-rider',
    name: 'BMX Rider',
    description: 'BMX cycling specialist',
    icon: '🚴‍♀️'
  }
];

const BADMINTON_POSITIONS = [
  {
    id: 'singles-player',
    name: 'Singles Player',
    description: 'Specialist in singles matches',
    icon: '🏸'
  },
  {
    id: 'doubles-player',
    name: 'Doubles Player',
    description: 'Specialist in doubles matches',
    icon: '🏸'
  },
  {
    id: 'mixed-doubles-player',
    name: 'Mixed Doubles Player',
    description: 'Specialist in mixed doubles matches',
    icon: '🏸'
  }
];

const TABLE_TENNIS_POSITIONS = [
  {
    id: 'table-tennis-singles',
    name: 'Singles Player',
    description: 'Specialist in singles table tennis',
    icon: '🏓'
  },
  {
    id: 'table-tennis-doubles',
    name: 'Doubles Player',
    description: 'Specialist in doubles table tennis',
    icon: '🏓'
  }
];

const ARCHERY_POSITIONS = [
  {
    id: 'recurve-archer',
    name: 'Recurve Archer',
    description: 'Specialist in recurve bow archery',
    icon: '🏹'
  },
  {
    id: 'compound-archer',
    name: 'Compound Archer',
    description: 'Specialist in compound bow archery',
    icon: '🏹'
  }
];

const SHOOTING_POSITIONS = [
  {
    id: 'pistol-shooter',
    name: 'Pistol Shooter',
    description: 'Specialist in pistol shooting',
    icon: '🔫'
  },
  {
    id: 'rifle-shooter',
    name: 'Rifle Shooter',
    description: 'Specialist in rifle shooting',
    icon: '🔫'
  },
  {
    id: 'shotgun-shooter',
    name: 'Shotgun Shooter',
    description: 'Specialist in shotgun shooting',
    icon: '🔫'
  }
];

const BOXING_POSITIONS = [
  {
    id: 'boxer',
    name: 'Boxer',
    description: 'Professional boxer',
    icon: '🥊'
  }
];

const GOLF_POSITIONS = [
  {
    id: 'professional-golfer',
    name: 'Professional Golfer',
    description: 'Professional competitive golfer',
    icon: '⛳'
  },
  {
    id: 'amateur-golfer',
    name: 'Amateur Golfer',
    description: 'Amateur competitive golfer',
    icon: '⛳'
  }
];

export const POSITIONS_CONFIG: SportPositions[] = [
  {
    sportId: 'athletics',
    positions: ATHLETICS_POSITIONS
  },
  {
    sportId: 'cricket',
    positions: CRICKET_POSITIONS
  },
  {
    sportId: 'football',
    positions: FOOTBALL_POSITIONS
  },
  {
    sportId: 'basketball',
    positions: BASKETBALL_POSITIONS
  },
  {
    sportId: 'hockey',
    positions: HOCKEY_POSITIONS
  },
  {
    sportId: 'swimming',
    positions: SWIMMING_POSITIONS
  },
  {
    sportId: 'volleyball',
    positions: VOLLEYBALL_POSITIONS
  },
  {
    sportId: 'field-events',
    positions: FIELD_EVENTS_POSITIONS
  },
  {
    sportId: 'kabaddi',
    positions: KABADDI_POSITIONS
  },
  {
    sportId: 'kho-kho',
    positions: KHO_KHO_POSITIONS
  },
  {
    sportId: 'wrestling',
    positions: WRESTLING_POSITIONS
  },
  {
    sportId: 'weightlifting',
    positions: WEIGHTLIFTING_POSITIONS
  },
  {
    sportId: 'cycling',
    positions: CYCLING_POSITIONS
  },
  {
    sportId: 'badminton',
    positions: BADMINTON_POSITIONS
  },
  {
    sportId: 'table-tennis',
    positions: TABLE_TENNIS_POSITIONS
  },
  {
    sportId: 'archery',
    positions: ARCHERY_POSITIONS
  },
  {
    sportId: 'shooting',
    positions: SHOOTING_POSITIONS
  },
  {
    sportId: 'boxing',
    positions: BOXING_POSITIONS
  },
  {
    sportId: 'golf',
    positions: GOLF_POSITIONS
  }
];

export const getPositionsBySportId = (sportId: string): Position[] => {
  const sportPositions = POSITIONS_CONFIG.find(sp => sp.sportId === sportId);
  return sportPositions ? sportPositions.positions : [];
};

export const getPositionById = (sportId: string, positionId: string): Position | undefined => {
  const positions = getPositionsBySportId(sportId);
  return positions.find(position => position.id === positionId);
};