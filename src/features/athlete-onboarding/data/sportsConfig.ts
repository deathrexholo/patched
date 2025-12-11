import { Sport } from '../store/onboardingStore';

export const SPORTS_CONFIG: Sport[] = [
  {
    id: 'athletics',
    name: 'Athletics',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'cricket',
    name: 'Cricket',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'football',
    name: 'Football',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'basketball',
    name: 'Basketball',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'hockey',
    name: 'Hockey',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'swimming',
    name: 'Swimming',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'field-events',
    name: 'Field events',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'kabaddi',
    name: 'Kabaddi',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'kho-kho',
    name: 'Kho-Kho',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'wrestling',
    name: 'Wrestling',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'weightlifting',
    name: 'Weight Lifting',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'cycling',
    name: 'Cycling',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'badminton',
    name: 'Badminton',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'table-tennis',
    name: 'Table Tennis',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'archery',
    name: 'Archery',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'shooting',
    name: 'Shooting',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'boxing',
    name: 'Boxing',
    icon: '',
    image: '',
    description: ''
  },
  {
    id: 'golf',
    name: 'Golf',
    icon: '',
    image: '',
    description: ''
  }
];

export const getSportById = (id: string): Sport | undefined => {
  return SPORTS_CONFIG.find(sport => sport.id === id);
};

export const getSportsByIds = (ids: string[]): Sport[] => {
  return SPORTS_CONFIG.filter(sport => ids.includes(sport.id));
};