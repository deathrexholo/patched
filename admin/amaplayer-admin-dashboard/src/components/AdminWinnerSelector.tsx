/**
 * Admin Winner Selector Component
 * Allows admins to select and declare winners for events using drag-and-drop
 */

import React, { useState, useCallback } from 'react';
import { X, Trophy } from 'lucide-react';
import { Event, WinnerEntry } from '../types/models/event';
import { EventSubmission, eventsService } from '../services/eventsService';
import './AdminWinnerSelector.css';

interface AdminWinnerSelectorProps {
  event: Event;
  submissions: EventSubmission[];
  onSuccess: (updatedEvent: Event) => Promise<void>;
  onCancel: () => void;
  adminId: string;
  loading?: boolean;
}

interface SelectedWinner {
  position: number;
  submission: EventSubmission;
}

export function AdminWinnerSelector({
  event,
  submissions,
  onSuccess,
  onCancel,
  adminId,
  loading = false
}: AdminWinnerSelectorProps) {
  const [selectedWinners, setSelectedWinners] = useState<SelectedWinner[]>([]);
  const [draggedSubmission, setDraggedSubmission] = useState<EventSubmission | null>(null);
  const [error, setError] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [declaring, setDeclaring] = useState(false);

  // Get available submissions (not already selected)
  const getAvailableSubmissions = useCallback(() => {
    const selectedIds = selectedWinners.map(w => w.submission.id);
    return submissions.filter(s => !selectedIds.includes(s.id));
  }, [submissions, selectedWinners]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, submission: EventSubmission) => {
    setDraggedSubmission(submission);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop on winner slot
  const handleDropOnWinner = (e: React.DragEvent, position: number) => {
    e.preventDefault();

    if (!draggedSubmission) return;

    // Remove if already in a different position
    const existingIndex = selectedWinners.findIndex(
      w => w.submission.id === draggedSubmission.id
    );
    let newWinners = [...selectedWinners];

    if (existingIndex !== -1) {
      newWinners.splice(existingIndex, 1);
    }

    // Add to new position
    const positionIndex = newWinners.findIndex(w => w.position === position);

    if (positionIndex !== -1) {
      // Replace existing winner at this position
      newWinners[positionIndex] = {
        position,
        submission: draggedSubmission
      };
    } else {
      // Add new winner
      newWinners.push({
        position,
        submission: draggedSubmission
      });
    }

    // Sort by position
    newWinners.sort((a, b) => a.position - b.position);
    setSelectedWinners(newWinners);
    setDraggedSubmission(null);
    setError('');
  };

  // Clear winner from position
  const clearWinner = (position: number) => {
    setSelectedWinners(prev => prev.filter(w => w.position !== position));
  };

  // Clear all winners
  const clearAllWinners = () => {
    setSelectedWinners([]);
  };

  // Handle declare winners
  const handleDeclareWinners = async () => {
    if (selectedWinners.length === 0) {
      setError('Please select at least one winner');
      return;
    }

    try {
      setDeclaring(true);
      setError('');

      const winners: WinnerEntry[] = selectedWinners.map((w) => ({
        submissionId: w.submission.id,
        userId: w.submission.userId,
        rank: w.position
      }));

      const updatedEvent = await eventsService.declareWinners(event.id, winners, adminId);

      if (updatedEvent) {
        setShowConfirmation(false);
        setSelectedWinners([]);
        onSuccess(updatedEvent);
      } else {
        setError('Failed to declare winners. Please try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to declare winners';
      setError(message);
      console.error('Error declaring winners:', err);
    } finally {
      setDeclaring(false);
    }
  };

  const medals = ['🥇', '🥈', '🥉', '⭐', '⭐'];
  const placeLabels = ['1st', '2nd', '3rd', '4th', '5th'];

  const getMedal = (index: number) => {
    return medals[index] || '⭐';
  };

  const getPlaceLabel = (index: number) => {
    if (placeLabels[index]) return placeLabels[index];
    return `${index + 1}${['st', 'nd', 'rd'][index % 3] || 'th'}`;
  };

  const winnerCount = event.winnerCount || 3;
  const availableSubmissions = getAvailableSubmissions();

  const handleViewProfile = (userId: string, userName: string) => {
    // Open profile in new tab on main app (port 3000)
    window.open(`http://localhost:3000/profile/${userId}`, `profile-${userId}`);
  };

  return (
    <>
      <div className="admin-winner-selector">
        <div className="selector-header">
          <h3>
            <Trophy className="header-icon" />
            Declare Winners - {event.title}
          </h3>
          <p className="selector-subtitle">Drag submissions to positions below</p>
        </div>

        {error && (
          <div className="selector-error">
            <span>{error}</span>
          </div>
        )}

        <div className="selector-content">
          {/* Available Submissions */}
          <div className="available-submissions">
            <h4>📹 Available Submissions ({availableSubmissions.length})</h4>
            <div className="submissions-list">
              {submissions.length === 0 ? (
                <p className="empty-message">No submissions for this event</p>
              ) : availableSubmissions.length === 0 ? (
                <p className="empty-message">All submissions selected</p>
              ) : (
                availableSubmissions.map(submission => (
                  <div
                    key={submission.id}
                    className="draggable-submission"
                    draggable
                    onDragStart={(e) => handleDragStart(e, submission)}
                  >
                    <div className="submission-thumbnail">
                      {submission.videoUrl && (
                        <video
                          src={submission.videoUrl}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    <div className="submission-details">
                      <p className="submission-title">{submission.title}</p>
                      <p className="submission-user" style={{ cursor: 'pointer' }} onClick={() => handleViewProfile(submission.userId, submission.userName)}>{submission.userName}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Winner Positions */}
          <div className="winner-positions">
            <h4>🏆 Winner Positions</h4>
            <div className="positions-list">
              {Array.from({ length: winnerCount }).map((_, index) => {
                const position = index + 1;
                const winner = selectedWinners.find(w => w.position === position);
                const medal = getMedal(index);
                const placeLabel = getPlaceLabel(index);

                return (
                  <div
                    key={position}
                    className={`winner-position ${winner ? 'filled' : 'empty'}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnWinner(e, position)}
                  >
                    <div className="position-header">
                      <span className="position-medal">{medal}</span>
                      <span className="position-label">{placeLabel} Place</span>
                    </div>

                    {winner ? (
                      <div className="winner-content">
                        <div className="winner-thumbnail">
                          {winner.submission.videoUrl && (
                            <video
                              src={winner.submission.videoUrl}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          )}
                        </div>
                        <div className="winner-info">
                          <p className="winner-title">{winner.submission.title}</p>
                          <p className="winner-user" style={{ cursor: 'pointer' }} onClick={() => handleViewProfile(winner.submission.userId, winner.submission.userName)}>{winner.submission.userName}</p>
                        </div>
                        <button
                          className="remove-winner"
                          onClick={() => clearWinner(position)}
                          title="Remove from this position"
                          aria-label={`Remove ${winner.submission.userName} from ${placeLabel} place`}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="drop-zone">Drop here</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="selector-actions">
          <button
            className="btn-secondary"
            onClick={clearAllWinners}
            disabled={selectedWinners.length === 0 || declaring || loading}
          >
            Clear All
          </button>
          <button
            className="btn-secondary"
            onClick={onCancel}
            disabled={declaring || loading}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowConfirmation(true)}
            disabled={selectedWinners.length === 0 || declaring || loading}
          >
            {declaring ? 'Declaring...' : 'Declare Winners'}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <h3>Confirm Winner Declaration</h3>
            <p>
              Are you sure you want to declare these {selectedWinners.length} winner{selectedWinners.length !== 1 ? 's' : ''} for "{event.title}"?
            </p>
            <p className="confirmation-note">This action cannot be easily undone.</p>

            <div className="confirmation-winners">
              {selectedWinners.map((winner, index) => (
                <div key={index} className="confirmation-winner">
                  <span className="confirmation-medal">{getMedal(index)}</span>
                  <div className="confirmation-details">
                    <p className="confirmation-title">{winner.submission.title}</p>
                    <p className="confirmation-user" style={{ cursor: 'pointer' }} onClick={() => handleViewProfile(winner.submission.userId, winner.submission.userName)}>{winner.submission.userName}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="confirmation-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowConfirmation(false)}
                disabled={declaring}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleDeclareWinners}
                disabled={declaring}
              >
                {declaring ? 'Declaring Winners...' : 'Yes, Declare Winners'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminWinnerSelector;
