// Story Progress - Progress bars component for story viewer
import React, { memo } from 'react';
import { Story } from '../../types/models/story';

interface StoryProgressProps {
  stories: Story[];
  currentIndex: number;
  currentDuration: number;
  totalDuration: number;
}

const StoryProgress = memo(function StoryProgress({ 
  stories, 
  currentIndex, 
  currentDuration, 
  totalDuration 
}: StoryProgressProps) {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="story-progress-container">
      {stories.map((story, index) => {
        let progress = 0;
        
        if (index < currentIndex) {
          // Completed stories
          progress = 100;
        } else if (index === currentIndex) {
          // Current story
          progress = Math.min((currentDuration / totalDuration) * 100, 100);
        }
        // Future stories remain at 0%

        return (
          <div key={story.id || index} className="story-progress-bar">
            <div 
              className="story-progress-fill"
              style={{ 
                width: `${progress}%`,
                transition: index === currentIndex ? 'width 0.1s linear' : 'none'
              }}
            />
          </div>
        );
      })}
    </div>
  );
});

export default StoryProgress;
