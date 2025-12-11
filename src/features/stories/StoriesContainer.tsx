// Stories Container - Main component for displaying stories on Home page
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StoriesService } from '../../services/api/storiesService';
import { Plus, Play } from 'lucide-react';
import StoryViewer from './StoryViewer';
import StoryUpload from './StoryUpload';
import SafeImage from '../../components/common/SafeImage';
import { Story } from '../../types/models/story';
import './Stories.css';

interface UserStoriesGroup {
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  stories: Story[];
  hasUnviewedStories: boolean;
}

type NavigationDirection = 'next' | 'prev';

export default function StoriesContainer() {
  const { currentUser, isGuest } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [groupedStories, setGroupedStories] = useState<UserStoriesGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showUpload, setShowUpload] = useState<boolean>(false);
  const [selectedUserStories, setSelectedUserStories] = useState<UserStoriesGroup | null>(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number>(0);

  useEffect(() => {
    // Set up real-time listener for active stories
    const unsubscribe = StoriesService.onActiveStoriesUpdate((activeStories) => {
      setStories(activeStories);
      
      // Group stories by user
      const grouped = groupStoriesByUser(activeStories);
      setGroupedStories(grouped);
      setLoading(false);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupStoriesByUser = useCallback((storiesArray: Story[]): UserStoriesGroup[] => {
    const grouped: Record<string, UserStoriesGroup> = {};
    
    storiesArray.forEach(story => {
      if (!grouped[story.userId]) {
        grouped[story.userId] = {
          userId: story.userId,
          userDisplayName: story.userDisplayName,
          userPhotoURL: story.userPhotoURL,
          stories: [],
          hasUnviewedStories: false
        };
      }
      
      grouped[story.userId].stories.push(story);
      
      // Check if user has unviewed stories
      const viewers = story.viewers || [];
      if (currentUser && !viewers.includes(currentUser.uid)) {
        grouped[story.userId].hasUnviewedStories = true;
      }
    });
    
    // Convert to array and sort (current user first, then by most recent story)
    const groupedArray = Object.values(grouped).sort((a, b) => {
      // Current user first
      if (currentUser) {
        if (a.userId === currentUser.uid) return -1;
        if (b.userId === currentUser.uid) return 1;
      }
      
      // Then by most recent story
      const aLatest = Math.max(...a.stories.map(s => {
        const timestamp = s.timestamp;
        if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
          return timestamp.toDate().getTime();
        }
        return 0;
      }));
      const bLatest = Math.max(...b.stories.map(s => {
        const timestamp = s.timestamp;
        if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
          return timestamp.toDate().getTime();
        }
        return 0;
      }));
      return bLatest - aLatest;
    });
    
    return groupedArray;
  }, [currentUser]);

  const handleStoryUploaded = useCallback((newStory: Story): void => {setShowUpload(false);
    // Stories will be updated via real-time listener
  }, []);

  const handleUserStoriesClick = useCallback((userStories: UserStoriesGroup, startIndex: number = 0): void => {setSelectedUserStories(userStories);
    setSelectedStoryIndex(startIndex);
  }, []);

  const closeStoryViewer = useCallback((): void => {
    setSelectedUserStories(null);
    setSelectedStoryIndex(0);
  }, []);

  const handleStoryNavigation = useCallback((direction: NavigationDirection): void => {
    if (!selectedUserStories) return;
    
    if (direction === 'next') {
      if (selectedStoryIndex < selectedUserStories.stories.length - 1) {
        setSelectedStoryIndex(selectedStoryIndex + 1);
      } else {
        // Move to next user's stories
        const currentUserIndex = groupedStories.findIndex(
          group => group.userId === selectedUserStories.userId
        );
        if (currentUserIndex < groupedStories.length - 1) {
          const nextUserStories = groupedStories[currentUserIndex + 1];
          setSelectedUserStories(nextUserStories);
          setSelectedStoryIndex(0);
        } else {
          closeStoryViewer();
        }
      }
    } else if (direction === 'prev') {
      if (selectedStoryIndex > 0) {
        setSelectedStoryIndex(selectedStoryIndex - 1);
      } else {
        // Move to previous user's stories
        const currentUserIndex = groupedStories.findIndex(
          group => group.userId === selectedUserStories.userId
        );
        if (currentUserIndex > 0) {
          const prevUserStories = groupedStories[currentUserIndex - 1];
          setSelectedUserStories(prevUserStories);
          setSelectedStoryIndex(prevUserStories.stories.length - 1);
        }
      }
    }
  }, [selectedUserStories, selectedStoryIndex, groupedStories, closeStoryViewer]);

  if (loading) {
    return (
      <div className="stories-container">
        <div className="stories-loading">
          <div className="loading-spinner"></div>
          <span>Loading stories...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="stories-container">
      <div className="stories-header">
        <h3>Stories</h3>
        <span className="stories-count">{stories.length} active</span>
      </div>
      
      <div className="stories-scroll">
        {/* Add Story Button - Only for authenticated users */}
        {!isGuest() && (
          <div 
            className="story-item add-story-item"
            onClick={() => setShowUpload(true)}
          >
            <div className="story-avatar add-story-avatar">
              <SafeImage 
                src={currentUser?.photoURL || ''} 
                alt="Your avatar"
                placeholder="avatar"
                className="story-avatar-image"
              />
              <div className="add-story-icon">
                <Plus size={20} />
              </div>
            </div>
            <span className="story-username">Add Story</span>
          </div>
        )}
        
        {/* User Stories */}
        {groupedStories.map((userGroup) => (
          <div 
            key={userGroup.userId}
            className="story-item"
            onClick={() => handleUserStoriesClick(userGroup)}
          >
            <div className={`story-avatar ${userGroup.hasUnviewedStories ? 'unviewed' : 'viewed'}`}>
              <SafeImage 
                src={
                  userGroup.userId === currentUser?.uid 
                    ? (currentUser?.photoURL || '')
                    : (userGroup.userPhotoURL || '')
                } 
                alt={userGroup.userDisplayName}
                placeholder="avatar"
                className="story-avatar-image"
              />
              {userGroup.stories.some(s => s.mediaType === 'video') && (
                <div className="story-media-indicator">
                  <Play size={12} />
                </div>
              )}
              <div className="stories-count-badge">
                {userGroup.stories.length}
              </div>
            </div>
            <span className="story-username">
              {userGroup.userId === currentUser?.uid ? 'You' : userGroup.userDisplayName}
            </span>
          </div>
        ))}
      </div>
      
      {/* Story Upload Modal */}
      {showUpload && (
        <StoryUpload 
          onStoryUploaded={handleStoryUploaded}
          onClose={() => setShowUpload(false)}
        />
      )}
      
      {/* Story Viewer Modal */}
      {selectedUserStories && (
        <StoryViewer
          userStories={selectedUserStories}
          currentStoryIndex={selectedStoryIndex}
          onClose={closeStoryViewer}
          onNavigate={handleStoryNavigation}
        />
      )}
    </div>
  );
}
