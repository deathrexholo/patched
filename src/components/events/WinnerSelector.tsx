/**
 * Winner Selector Component
 * Drag-and-drop interface for declaring event winners
 */

import React, { useState, useCallback } from 'react';
import { X, Trophy } from 'lucide-react';
import { EventSubmission } from '../../types/models/submission';
import { WinnerEntry } from '../../types/models/event';
import './WinnerSelector.css';

interface WinnerSelectorProps {
  submissions: EventSubmission[];
  winnerCount?: number;
  onDeclareWinners: (winners: WinnerEntry[]) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface SelectedWinner {
  position: number;
  submission: EventSubmission;
}

export function WinnerSelector({
  submissions,
  winnerCount = 3,
  onDeclareWinners,
  onCancel,
  loading = false
}: WinnerSelectorProps) {
  const [selectedWinners, setSelectedWinners] = useState<SelectedWinner[]>([]);
  const [draggedSubmission, setDraggedSubmission] = useState<EventSubmission | null>(null);
  const [error, setError] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

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

  // Handle declare winners with timeout and error extraction
  const handleDeclareWinners = async () => {
    if (selectedWinners.length === 0) {
      setError('Please select at least one winner');
      return;
    }

    try {
      setError('');

      const winners: WinnerEntry[] = selectedWinners.map((w, index) => ({
        submissionId: w.submission.id,
        userId: w.submission.userId,
        rank: w.position
      }));

      // Create a promise that resolves with the onDeclareWinners call
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<void>((_, reject) => {
        timeoutId = setTimeout(
          () =>
            reject(
              new Error('Declaration took too long. Please check your connection and try again.')
            ),
          45000 // 45 second timeout
        );
      });

      const declarePromise = onDeclareWinners(winners).finally(() => {
        clearTimeout(timeoutId);
      });

      // Race between the declaration and timeout
      await Promise.race([declarePromise, timeoutPromise]);

      setShowConfirmation(false);
      setSelectedWinners([]);
    } catch (err) {
      // Extract meaningful error message
      let errorMessage = 'Failed to declare winners. Please try again.';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      // Check for specific error patterns
      if (
        errorMessage.includes('permission') ||
        errorMessage.includes('unauthorized')
      ) {
        errorMessage =
          'You do not have permission to declare winners. Please contact an administrator.';
      } else if (
        errorMessage.includes('timed out') ||
        errorMessage.includes('timeout')
      ) {
        errorMessage =
          'The operation took too long. Please check your connection and try again.';
      } else if (
        errorMessage.includes('network') ||
        errorMessage.includes('offline')
      ) {
        errorMessage =
          'Network error. Please check your internet connection and try again.';
      } else if (errorMessage.includes('not found')) {
        errorMessage =
          'One or more submissions were not found. They may have been deleted. Please refresh and try again.';
      }

      setError(errorMessage);
      console.error('❌ Error declaring winners:', err);
    }
  };

  const medals = ['🥇', '🥈', '🥉', '⭐', '⭐'];
  const placeLabels = ['1st', '2nd', '3rd', '4th', '5th'];
  const availableSubmissions = getAvailableSubmissions();

  // Helper function to get medal safely
  const getMedal = (index: number) => {
    return medals[index] || '⭐';
  };

  // Helper function to get place label safely
  const getPlaceLabel = (index: number) => {
    if (placeLabels[index]) return placeLabels[index];
    return `${index + 1}${['st', 'nd', 'rd'][index % 3] || 'th'}`;
  };

  // Validate winnerCount
  const validWinnerCount = Math.max(1, Math.min(Number(winnerCount) || 3, 10));

  return (
    <>
      <div className="winner-selector">
        <div className="selector-header">
          <h3>
            <Trophy className="header-icon" />
            Select Winners
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
            <h4>📹 Available Submissions</h4>
            <div className="submissions-list">
              {availableSubmissions.length === 0 ? (
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
                      <img
                        src={submission.thumbnail || submission.videoUrl}
                        alt={submission.title}
                      />
                    </div>
                    <div className="submission-details">
                      <p className="submission-title">{submission.title}</p>
                      <p className="submission-user">{submission.userName}</p>
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
              {Array.from({ length: validWinnerCount }).map((_, index) => {
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
                          <img
                            src={winner.submission.thumbnail || winner.submission.videoUrl}
                            alt={winner.submission.title}
                          />
                        </div>
                        <div className="winner-info">
                          <p className="winner-title">{winner.submission.title}</p>
                          <p className="winner-user">{winner.submission.userName}</p>
                        </div>
                        <button
                          className="remove-winner"
                          onClick={() => clearWinner(position)}
                          title="Remove from this position"
                          aria-label={`Remove ${winner.submission.userName} from ${getPlaceLabel(position - 1)} place`}
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
            disabled={selectedWinners.length === 0 || loading}
          >
            Clear All
          </button>
          <button
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowConfirmation(true)}
            disabled={selectedWinners.length === 0 || loading}
          >
            {loading ? 'Declaring...' : 'Declare Winners'}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <h3>Confirm Winner Declaration</h3>
            <p>
              Are you sure you want to declare these winners? This action cannot be easily undone.
            </p>

            <div className="confirmation-winners">
              {selectedWinners.map((winner, index) => (
                <div key={index} className="confirmation-winner">
                  <span className="confirmation-medal">{getMedal(index)}</span>
                  <div className="confirmation-details">
                    <p className="confirmation-title">{winner.submission.title}</p>
                    <p className="confirmation-user">{winner.submission.userName}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="confirmation-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleDeclareWinners}
                disabled={loading}
              >
                {loading ? 'Declaring Winners...' : 'Yes, Declare Winners'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default WinnerSelector;
