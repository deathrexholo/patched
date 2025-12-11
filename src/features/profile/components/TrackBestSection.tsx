import React from 'react';
import { Edit3, Target, Trophy, Calendar, MapPin, Users } from 'lucide-react';
import { TrackBest } from '../types/ProfileTypes';
import '../styles/TrackBestSection.css';

interface TrackBestSectionProps {
  trackBest: TrackBest;
  sport?: string;
  isOwner: boolean;
  onEditSection?: () => void;
}

const TrackBestSection: React.FC<TrackBestSectionProps> = ({
  trackBest,
  sport = 'cricket',
  isOwner,
  onEditSection
}) => {
  // Get sport-specific field configurations
  const getSportFields = (sportName: string) => {
    const sportLower = sportName.toLowerCase();
    
    switch (sportLower) {
      case 'cricket':
        return {
          field1: { label: 'Runs', value: trackBest.runs, unit: 'runs' },
          field2: { label: 'Overs', value: trackBest.overs, unit: 'overs' },
          field3: { label: 'Strike Rate', value: trackBest.strikeRate, unit: 'SR' }
        };
      case 'football':
      case 'soccer':
        return {
          field1: { label: 'Goals', value: trackBest.goals, unit: 'goals' },
          field2: { label: 'Minutes', value: trackBest.minutes, unit: 'min' },
          field3: { label: 'Assists', value: trackBest.assists, unit: 'assists' }
        };
      case 'basketball':
        return {
          field1: { label: 'Points', value: trackBest.points, unit: 'pts' },
          field2: { label: 'Rebounds', value: trackBest.rebounds, unit: 'reb' },
          field3: { label: 'Game Time', value: trackBest.gameTime, unit: 'min' }
        };
      case 'tennis':
        return {
          field1: { label: 'Aces', value: trackBest.aces, unit: 'aces' },
          field2: { label: 'Winners', value: trackBest.winners, unit: 'winners' },
          field3: { label: 'Match Duration', value: trackBest.matchDuration, unit: 'min' }
        };
      case 'badminton':
        return {
          field1: { label: 'Smashes', value: trackBest.field1, unit: 'smashes' },
          field2: { label: 'Game Duration', value: trackBest.field2, unit: 'min' },
          field3: { label: 'Points Won', value: trackBest.field3, unit: 'points' }
        };
      case 'volleyball':
        return {
          field1: { label: 'Spikes', value: trackBest.field1, unit: 'spikes' },
          field2: { label: 'Blocks', value: trackBest.field2, unit: 'blocks' },
          field3: { label: 'Serves', value: trackBest.field3, unit: 'serves' }
        };
      default:
        return {
          field1: { label: 'Performance 1', value: trackBest.field1, unit: '' },
          field2: { label: 'Performance 2', value: trackBest.field2, unit: '' },
          field3: { label: 'Performance 3', value: trackBest.field3, unit: '' }
        };
    }
  };

  const sportFields = getSportFields(sport);
  const hasTrackBestData = Object.values(sportFields).some(field => field.value);
  const hasMatchInfo = trackBest.matchDate || trackBest.opponent || trackBest.venue;

  return (
    <section className="track-best-section" aria-labelledby="track-best-heading">
      <div className="section-header">
        <div className="section-header-left">
          <Target size={24} className="section-icon" />
          <h2 id="track-best-heading" className="section-title">
            Track Best
          </h2>
        </div>
        {isOwner && (
          <button
            className="section-edit-button"
            onClick={onEditSection}
            aria-label="Edit track best"
            type="button"
          >
            <Edit3 size={16} />
            <span>Edit</span>
          </button>
        )}
      </div>

      {!hasTrackBestData && isOwner ? (
        <div className="empty-section-state">
          <Target size={48} className="empty-icon" />
          <p className="empty-message">Add your best performance</p>
          <p className="empty-description">
            Track your best {sport} performance in a single match or game
          </p>
          <button
            className="empty-state-button"
            onClick={onEditSection}
            type="button"
          >
            <Edit3 size={16} />
            Add Track Best
          </button>
        </div>
      ) : !hasTrackBestData ? (
        <div className="empty-section-state">
          <p className="empty-message">No track best recorded</p>
        </div>
      ) : (
        <div className="track-best-content">
          {/* Performance Metrics */}
          <div className="performance-metrics">
            <div className="metrics-grid">
              {Object.entries(sportFields).map(([key, field]) => (
                field.value && (
                  <div key={key} className="metric-card track-best-metric-card">
                    <div className="metric-icon">
                      <Trophy size={20} />
                    </div>
                    <div className="metric-content">
                      <span 
                        className="metric-label"
                        style={{ color: '#374151', fontWeight: '600' }}
                      >
                        {field.label}
                      </span>
                      <span 
                        className="metric-value"
                        style={{ color: '#111827', fontWeight: '700', fontSize: '20px' }}
                      >
                        {field.value} {field.unit}
                      </span>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Match Information */}
          {hasMatchInfo && (
            <div className="match-info">
              <h3 className="match-info-title">Match Details</h3>
              <div className="match-details">
                {trackBest.matchDate && (
                  <div className="match-detail-row">
                    <Calendar size={16} className="detail-icon" />
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">
                      {new Date(trackBest.matchDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {trackBest.opponent && (
                  <div className="match-detail-row">
                    <Users size={16} className="detail-icon" />
                    <span className="detail-label">Opponent:</span>
                    <span className="detail-value">{trackBest.opponent}</span>
                  </div>
                )}
                {trackBest.venue && (
                  <div className="match-detail-row">
                    <MapPin size={16} className="detail-icon" />
                    <span className="detail-label">Venue:</span>
                    <span className="detail-value">{trackBest.venue}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default TrackBestSection;