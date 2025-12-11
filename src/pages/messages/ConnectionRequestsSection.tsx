import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { organizationConnectionService } from '../../services/api';
import { OrganizationConnection } from '../../types/models/organizationConnection';
import { useAuth } from '../../contexts/AuthContext';
import './ConnectionRequestsSection.css';

interface ConnectionRequestsSectionProps {
  userId: string;
}

export const ConnectionRequestsSection: React.FC<ConnectionRequestsSectionProps> = ({
  userId
}) => {
  const { currentUser } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<OrganizationConnection[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<OrganizationConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadConnectionRequests();
  }, [userId]);

  const loadConnectionRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load pending requests where current user is the recipient
      const pending = await organizationConnectionService.getIncomingPendingRequests(userId);

      // Load accepted connections where current user is the recipient
      const accepted = await organizationConnectionService.getAcceptedConnections(userId);

      setPendingRequests(pending);
      setAcceptedConnections(accepted);
    } catch (err: any) {
      console.error('❌ Error loading connection requests:', err);
      setError(err.message || 'Failed to load connection requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (connectionId: string, connection: OrganizationConnection) => {
    if (!currentUser) return;

    try {
      setProcessingId(connectionId);
      setError(null);

      await organizationConnectionService.acceptConnectionRequest({
        connectionId,
        acceptedByUserId: currentUser.uid,
        acceptedByName: currentUser.displayName || 'User'
      });

      // Remove from pending and add to accepted
      setPendingRequests(prev => prev.filter(req => req.id !== connectionId));
      setAcceptedConnections(prev => [...prev, { ...connection, status: 'accepted' }]);
    } catch (err: any) {
      console.error('❌ Error accepting request:', err);
      setError(err.message || 'Failed to accept connection request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (connectionId: string) => {
    if (!currentUser) return;

    try {
      setProcessingId(connectionId);
      setError(null);

      await organizationConnectionService.rejectConnectionRequest({
        connectionId,
        rejectedByUserId: currentUser.uid,
        rejectedByName: currentUser.displayName || 'User'
      });

      // Remove from pending
      setPendingRequests(prev => prev.filter(req => req.id !== connectionId));
    } catch (err: any) {
      console.error('❌ Error rejecting request:', err);
      setError(err.message || 'Failed to reject connection request');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const getSenderInfo = (connection: OrganizationConnection) => {
    return {
      name: connection.senderName,
      role: connection.senderRole,
      photoURL: connection.senderPhotoURL
    };
  };

  if (loading) {
    return <div className="connection-section loading">Loading connection requests...</div>;
  }

  const hasRequests = pendingRequests.length > 0 || acceptedConnections.length > 0;
  const sender = pendingRequests.length > 0 ? getSenderInfo(pendingRequests[0]) : null;

  return (
    <div className="connection-section">
      <div className="connection-section-header">
        <h3>🔗 Connection Requests</h3>
        <p className="subtitle">Manage pending connection requests from organizations and coaches</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!hasRequests ? (
        <div className="no-connections">
          <p>No pending connection requests or accepted connections yet.</p>
        </div>
      ) : (
        <>
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="connection-subsection">
              <div className="subsection-header" onClick={() => setShowPending(!showPending)}>
                <h4>
                  <span className="icon">📬</span>
                  Pending Requests ({pendingRequests.length})
                </h4>
                <span className={`toggle ${showPending ? 'open' : ''}`}>▼</span>
              </div>

              {showPending && (
                <div className="connection-list">
                  {pendingRequests.map(request => (
                    <div key={request.id} className="connection-card pending">
                      <div className="card-header">
                        <div className="org-info">
                          <h5>{request.senderName}</h5>
                          <p className="sender-role">
                            {request.senderRole === 'organization' ? '🏢 Organization' : '👨‍🏫 Coach'}
                          </p>
                          <p className="request-date">
                            Requested on {formatDate(request.createdAt)}
                          </p>
                        </div>
                        <div className="status-badge pending">
                          <span>⏳</span> Pending
                        </div>
                      </div>
                      <div className="card-body">
                        <p className="info-text">
                          {request.senderRole === 'organization'
                            ? `${request.senderName} wants to connect with you to collaborate and message.`
                            : `${request.senderName} wants to connect with you for coaching and collaboration.`}
                        </p>
                        <div className="connection-actions">
                          <button
                            className="btn btn-accept"
                            onClick={() => handleAcceptRequest(request.id, request)}
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? '✓ Accepting...' : '✓ Accept'}
                          </button>
                          <button
                            className="btn btn-reject"
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? '✕ Rejecting...' : '✕ Reject'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Accepted Connections */}
          {acceptedConnections.length > 0 && (
            <div className="connection-subsection">
              <div className="subsection-header">
                <h4>
                  <span className="icon">✅</span>
                  Connected ({acceptedConnections.length})
                </h4>
              </div>

              <div className="connection-list">
                {acceptedConnections.map(connection => (
                  <div key={connection.id} className="connection-card accepted">
                    <div className="card-header">
                      <div className="org-info">
                        <h5>{connection.senderName}</h5>
                        <p className="sender-role">
                          {connection.senderRole === 'organization' ? '🏢 Organization' : '👨‍🏫 Coach'}
                        </p>
                        <p className="accepted-date">
                          Connected on {formatDate(connection.acceptedAt)}
                        </p>
                      </div>
                      <div className="status-badge accepted">
                        <span>✓</span> Connected
                      </div>
                    </div>
                    <div className="card-body">
                      <p className="info-text">
                        You are now connected with {connection.senderName}. You can message and
                        communicate directly.
                      </p>
                      <button className="btn btn-message">
                        💬 Open Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConnectionRequestsSection;
