import React, { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { organizationConnectionService } from '../../services/api';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import './ConnectionRequestForm.css';

interface ConnectionRequestFormProps {
  organizationId: string;
  organizationName: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

interface Athlete {
  id: string;
  displayName: string;
  photoURL: string;
  sport?: string;
}

export const ConnectionRequestForm: React.FC<ConnectionRequestFormProps> = ({
  organizationId,
  organizationName,
  onSuccess,
  onClose
}) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingRequest, setExistingRequest] = useState(false);

  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'users'), where('userRole', '==', 'athlete'));
      const querySnapshot = await getDocs(q);

      const athletesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        displayName: doc.data().displayName || 'Unknown',
        photoURL: doc.data().photoURL || '',
        sport: doc.data().sports?.[0] || 'Unknown Sport'
      }));

      setAthletes(athletesList);
    } catch (err: any) {
      console.error('❌ Error loading athletes:', err);
      setError('Failed to load athletes');
    } finally {
      setLoading(false);
    }
  };

  const handleAthleteSelect = async (athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setError(null);
    setExistingRequest(false);

    // Check if request already exists
    try {
      const existing = await organizationConnectionService.checkConnectionExists(
        organizationId,
        athlete.id,
        'org_to_athlete'
      );
      if (existing) {
        setExistingRequest(true);
        setError(
          `You already have a ${existing.status} connection request with ${athlete.displayName}`
        );
      }
    } catch (err) {
      console.error('❌ Error checking existing request:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAthlete) {
      setError('Please select an athlete');
      return;
    }

    if (existingRequest) {
      setError('You already have a pending request with this athlete');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in');
      }

      await organizationConnectionService.sendConnectionRequest({
        senderId: currentUser.uid,
        senderName: organizationName,
        senderPhotoURL: currentUser.photoURL || '',
        senderRole: 'organization',
        recipientId: selectedAthlete.id,
        recipientName: selectedAthlete.displayName,
        recipientPhotoURL: selectedAthlete.photoURL,
        recipientRole: 'athlete',
        connectionType: 'org_to_athlete'
      });

      setSuccess(true);
      setSelectedAthlete(null);
      setSearchTerm('');

      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('❌ Error sending connection request:', err);
      setError(err.message || 'Failed to send connection request');
    } finally {
      setSending(false);
    }
  };

  const filteredAthletes = athletes.filter(
    athlete =>
      athlete.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.sport?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="connection-request-form">
      <div className="form-header">
        <h3>🔗 Request Connection with Athlete</h3>
        <p className="form-subtitle">Send a connection request to an athlete for collaboration</p>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="form">
        {/* Error Message */}
        {error && <div className={`message error ${existingRequest ? 'warning' : ''}`}>{error}</div>}

        {/* Success Message */}
        {success && (
          <div className="message success">
            ✓ Connection request sent successfully! The athlete will receive your request and can
            accept or reject it.
          </div>
        )}

        {/* Organization Info */}
        <div className="form-group">
          <label>Organization</label>
          <div className="readonly-field">{organizationName}</div>
        </div>

        {/* Search Field */}
        {!selectedAthlete && (
          <div className="form-group">
            <label htmlFor="search">Search Athletes</label>
            <input
              id="search"
              type="text"
              placeholder="Search by name or sport..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
              disabled={loading}
            />
          </div>
        )}

        {/* Athletes List or Selected Athlete */}
        <div className="form-group">
          {!selectedAthlete ? (
            <>
              <label>Select Athlete</label>
              <div className={`athletes-list ${loading ? 'loading' : ''}`}>
                {loading ? (
                  <div className="loading-text">Loading athletes...</div>
                ) : filteredAthletes.length === 0 ? (
                  <div className="empty-text">
                    {searchTerm ? 'No athletes found matching your search' : 'No athletes available'}
                  </div>
                ) : (
                  filteredAthletes.map(athlete => (
                    <div
                      key={athlete.id}
                      className="athlete-item"
                      onClick={() => handleAthleteSelect(athlete)}
                    >
                      <img
                        src={athlete.photoURL || '/default-avatar.png'}
                        alt={athlete.displayName}
                        className="athlete-photo"
                      />
                      <div className="athlete-details">
                        <div className="athlete-name">{athlete.displayName}</div>
                        <div className="athlete-sport">{athlete.sport || 'Sport not specified'}</div>
                      </div>
                      <div className="select-icon">→</div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="selected-athlete">
              <div className="selection-header">
                <label>Selected Athlete</label>
                <button
                  type="button"
                  className="change-btn"
                  onClick={() => {
                    setSelectedAthlete(null);
                    setSearchTerm('');
                  }}
                >
                  Change
                </button>
              </div>
              <div className="athlete-card selected">
                <img
                  src={selectedAthlete.photoURL || '/default-avatar.png'}
                  alt={selectedAthlete.displayName}
                  className="athlete-photo"
                />
                <div className="athlete-details">
                  <div className="athlete-name">{selectedAthlete.displayName}</div>
                  <div className="athlete-sport">
                    {selectedAthlete.sport || 'Sport not specified'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="info-box">
          <p>
            <strong>📌 How it works:</strong> Your connection request will be sent to the athlete
            with a notification. They can accept or reject your request. Once they accept, you both
            will be able to message each other.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          {onClose && (
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!selectedAthlete || sending || existingRequest}
          >
            {sending ? '⏳ Sending...' : '📤 Send Connection Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConnectionRequestForm;
