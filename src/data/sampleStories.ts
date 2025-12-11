import { Timestamp } from 'firebase/firestore';
import type { Story, Highlight } from '../types/models/story';

/**
 * Sample stories data for development and testing
 */
export const sampleStories: Story[] = [
  {
    id: 'story1',
    userId: 'user1',
    userDisplayName: 'Alice Johnson',
    userPhotoURL: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=150&h=150&fit=crop',
    caption: 'Beautiful sunset at the beach! 🌅',
    timestamp: Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)), // 2 hours ago
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 22 * 60 * 60 * 1000)), // 22 hours from now
    viewCount: 15,
    viewers: ['user2', 'user3', 'user4'],
    isHighlight: false,
    highlightId: null,
    sharingEnabled: true,
    publicLink: 'https://amaplay007.web.app/story/story1'
  },
  {
    id: 'story2',
    userId: 'user2',
    userDisplayName: 'Bob Smith',
    userPhotoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    mediaType: 'video',
    mediaUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=150&h=150&fit=crop',
    caption: 'Morning workout session 💪',
    timestamp: Timestamp.fromDate(new Date(Date.now() - 4 * 60 * 60 * 1000)), // 4 hours ago
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 20 * 60 * 60 * 1000)), // 20 hours from now
    viewCount: 8,
    viewers: ['user1', 'user3'],
    isHighlight: true,
    highlightId: 'highlight1',
    sharingEnabled: true,
    publicLink: 'https://amaplay007.web.app/story/story2'
  },
  {
    id: 'story3',
    userId: 'user3',
    userDisplayName: 'Carol Davis',
    userPhotoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=400&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=150&h=150&fit=crop',
    caption: 'Delicious breakfast to start the day! 🥞',
    timestamp: Timestamp.fromDate(new Date(Date.now() - 6 * 60 * 60 * 1000)), // 6 hours ago
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 18 * 60 * 60 * 1000)), // 18 hours from now
    viewCount: 23,
    viewers: ['user1', 'user2', 'user4', 'user5'],
    isHighlight: false,
    highlightId: null,
    sharingEnabled: true,
    publicLink: 'https://amaplay007.web.app/story/story3'
  },
  {
    id: 'story4',
    userId: 'user1',
    userDisplayName: 'Alice Johnson',
    userPhotoURL: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=150&h=150&fit=crop',
    caption: 'Cute puppy at the park 🐕',
    timestamp: Timestamp.fromDate(new Date(Date.now() - 8 * 60 * 60 * 1000)), // 8 hours ago
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 16 * 60 * 60 * 1000)), // 16 hours from now
    viewCount: 31,
    viewers: ['user2', 'user3', 'user4', 'user5', 'user6'],
    isHighlight: true,
    highlightId: 'highlight2',
    sharingEnabled: true,
    publicLink: 'https://amaplay007.web.app/story/story4'
  },
  {
    id: 'story5',
    userId: 'user4',
    userDisplayName: 'David Wilson',
    userPhotoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    mediaType: 'video',
    mediaUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=150&h=150&fit=crop',
    caption: 'Guitar practice session 🎸',
    timestamp: Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 60 * 1000)), // 10 hours ago
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 14 * 60 * 60 * 1000)), // 14 hours from now
    viewCount: 12,
    viewers: ['user1', 'user2', 'user3'],
    isHighlight: false,
    highlightId: null,
    sharingEnabled: true,
    publicLink: 'https://amaplay007.web.app/story/story5'
  }
];

/**
 * Sample highlights data for development and testing
 */
export const sampleHighlights: Highlight[] = [
  {
    id: 'highlight1',
    userId: 'user2',
    title: 'Fitness Journey',
    coverImage: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=150&h=150&fit=crop',
    storyIds: ['story2'],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // 7 days ago
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 4 * 60 * 60 * 1000)), // 4 hours ago
    isPublic: true
  },
  {
    id: 'highlight2',
    userId: 'user1',
    title: 'Pet Adventures',
    coverImage: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=150&h=150&fit=crop',
    storyIds: ['story4'],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)), // 14 days ago
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 8 * 60 * 60 * 1000)), // 8 hours ago
    isPublic: true
  },
  {
    id: 'highlight3',
    userId: 'user3',
    title: 'Food Adventures',
    coverImage: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=150&h=150&fit=crop',
    storyIds: [],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)), // 21 days ago
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)), // 21 days ago
    isPublic: false
  }
];