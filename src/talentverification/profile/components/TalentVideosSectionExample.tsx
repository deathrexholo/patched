// Example usage of TalentVideosSection component
import React, { useState } from 'react';
import TalentVideosSection from './TalentVideosSection';
import { TalentVideo } from '../types/TalentVideoTypes';

// Example data
const mockVideos: TalentVideo[] = [
  {
    id: '1',
    title: 'Basketball Highlights 2024',
    description: 'My best plays from the season including dunks, three-pointers, and defensive plays.',
    videoUrl: '/videos/basketball-highlights.mp4',
    thumbnailUrl: '/thumbnails/basketball-thumb.jpg',
    sport: 'Basketball',
    skillCategory: 'Highlights',
    uploadDate: new Date('2024-01-15'),
    duration: 180,
    viewCount: 1250
  },
  {
    id: '2',
    title: 'Shooting Drill Practice',
    description: 'Training session focusing on three-point shooting technique and consistency.',
    videoUrl: '/videos/shooting-drill.mp4',
    thumbnailUrl: '/thumbnails/shooting-thumb.jpg',
    sport: 'Basketball',
    skillCategory: 'Training',
    uploadDate: new Date('2024-01-10'),
    duration: 120,
    viewCount: 890
  },
  {
    id: '3',
    title: 'Soccer Skills Showcase',
    description: 'Demonstrating ball control, dribbling, and shooting techniques.',
    videoUrl: '/videos/soccer-skills.mp4',
    thumbnailUrl: '/thumbnails/soccer-thumb.jpg',
    sport: 'Soccer',
    skillCategory: 'Skills Demo',
    uploadDate: new Date('2024-01-05'),
    duration: 95,
    viewCount: 2100
  }
];

const TalentVideosSectionExample: React.FC = () => {
  const [videos, setVideos] = useState<TalentVideo[]>(mockVideos);
  const isOwner = true; // This would come from authentication context

  const handleAddVideo = () => {// This would typically open the video management modal
  };

  const handleEditVideo = (video: TalentVideo) => {// This would typically open the video management modal with the video data
  };

  const handleDeleteVideo = (videoId: string) => {setVideos(prev => prev.filter(video => video.id !== videoId));
  };

  const handleVideoClick = (video: TalentVideo) => {// This would typically open the video player modal
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Profile Enhancement - Talent Videos Section</h1>
      
      <TalentVideosSection
        videos={videos}
        isOwner={isOwner}
        onAddVideo={handleAddVideo}
        onEditVideo={handleEditVideo}
        onDeleteVideo={handleDeleteVideo}
        onVideoClick={handleVideoClick}
      />
    </div>
  );
};

export default TalentVideosSectionExample;