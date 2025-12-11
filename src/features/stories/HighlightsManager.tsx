// Highlights Manager - Component for managing story highlights
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { HighlightsService } from '../../services/api/storiesService';
import { Plus, Edit, Trash2, Star, Image } from 'lucide-react';
import { Story, Highlight } from '../../types/models/story';
import './Stories.css';

interface HighlightsManagerProps {
  userStories?: Story[];
  onClose: () => void;
}

export default function HighlightsManager({ userStories = [], onClose }: HighlightsManagerProps) {
  const { currentUser } = useAuth();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newHighlightTitle, setNewHighlightTitle] = useState<string>('');
  const [selectedStories, setSelectedStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const fetchHighlights = async (): Promise<void> => {
    if (!currentUser) return;
    
    try {
      const userHighlights = await HighlightsService.getUserHighlights(currentUser.uid);
      setHighlights(userHighlights as any);
    } catch (error) {
      console.error('❌ Error fetching highlights:', error);
    }
    setLoading(false);
  };

  const handleCreateHighlight = async (): Promise<void> => {
    if (!newHighlightTitle.trim() || selectedStories.length === 0) {
      alert('Please enter a title and select at least one story');
      return;
    }

    try {
      const coverImage = selectedStories[0]?.mediaUrl || '';
      await HighlightsService.createHighlight(
        currentUser!.uid,
        newHighlightTitle.trim(),
        coverImage,
        selectedStories.map(s => s.id)
      );
      
      // Reset form
      setNewHighlightTitle('');
      setSelectedStories([]);
      setShowCreateForm(false);
      
      // Refresh highlights
      await fetchHighlights();
      
      alert('Highlight created successfully!');
      
    } catch (error) {
      console.error('❌ Error creating highlight:', error);
      alert('Failed to create highlight: ' + (error as Error).message);
    }
  };

  const handleStoryToggle = (story: Story): void => {
    setSelectedStories(prev => {
      const isSelected = prev.some(s => s.id === story.id);
      if (isSelected) {
        return prev.filter(s => s.id !== story.id);
      } else {
        return [...prev, story];
      }
    });
  };

  const isStorySelected = (storyId: string): boolean => {
    return selectedStories.some(s => s.id === storyId);
  };

  if (loading) {
    return (
      <div className="highlights-manager">
        <div className="highlights-loading">
          <div className="loading-spinner"></div>
          <p>Loading highlights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="highlights-manager">
      <div className="highlights-backdrop" onClick={onClose}></div>
      
      <div className="highlights-container">
        <div className="highlights-header">
          <h3>
            <Star size={20} />
            Story Highlights
          </h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="highlights-content">
          {/* Existing Highlights */}
          {highlights.length > 0 && (
            <div className="highlights-section">
              <h4>Your Highlights</h4>
              <div className="highlights-grid">
                {highlights.map((highlight) => (
                  <div key={highlight.id} className="highlight-item">
                    <div className="highlight-cover">
                      {highlight.coverImage ? (
                        <img src={highlight.coverImage} alt={highlight.title} />
                      ) : (
                        <div className="highlight-placeholder">
                          <Image size={24} />
                        </div>
                      )}
                      <div className="highlight-count">
                        {highlight.storyIds?.length || 0}
                      </div>
                    </div>
                    <div className="highlight-info">
                      <h5>{highlight.title}</h5>
                      <p>{highlight.storyIds?.length || 0} stories</p>
                    </div>
                    <div className="highlight-actions">
                      <button className="edit-highlight-btn">
                        <Edit size={14} />
                      </button>
                      <button className="delete-highlight-btn">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create New Highlight */}
          {!showCreateForm ? (
            <div className="create-highlight-section">
              <button 
                className="create-highlight-btn"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={20} />
                Create New Highlight
              </button>
            </div>
          ) : (
            <div className="create-highlight-form">
              <h4>Create New Highlight</h4>
              
              <div className="form-group">
                <label>Highlight Title</label>
                <input
                  type="text"
                  placeholder="Enter highlight title (e.g., Training Sessions)"
                  value={newHighlightTitle}
                  onChange={(e) => setNewHighlightTitle(e.target.value)}
                  maxLength={30}
                />
                <span className="char-count">{newHighlightTitle.length}/30</span>
              </div>

              <div className="form-group">
                <label>Select Stories ({selectedStories.length} selected)</label>
                <div className="stories-selection">
                  {userStories.length === 0 ? (
                    <div className="no-stories">
                      <p>No stories available to add to highlights</p>
                      <p>Create some stories first!</p>
                    </div>
                  ) : (
                    <div className="stories-grid">
                      {userStories.map((story) => (
                        <div 
                          key={story.id} 
                          className={`story-selection-item ${isStorySelected(story.id) ? 'selected' : ''}`}
                          onClick={() => handleStoryToggle(story)}
                        >
                          {story.mediaType === 'image' ? (
                            <img src={story.mediaUrl} alt="Story" />
                          ) : (
                            <video src={story.mediaUrl} />
                          )}
                          <div className="selection-overlay">
                            {isStorySelected(story.id) && (
                              <div className="selection-check">✓</div>
                            )}
                          </div>
                          {story.caption && (
                            <div className="story-mini-caption">
                              {story.caption.substring(0, 30)}...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewHighlightTitle('');
                    setSelectedStories([]);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="create-btn"
                  onClick={handleCreateHighlight}
                  disabled={!newHighlightTitle.trim() || selectedStories.length === 0}
                >
                  Create Highlight
                </button>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="highlights-tips">
            <h4>💡 Highlight Tips</h4>
            <ul>
              <li>Save your best sports moments forever</li>
              <li>Group related stories by theme or event</li>
              <li>Highlights don't expire like regular stories</li>
              <li>Perfect for showcasing training progress</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
