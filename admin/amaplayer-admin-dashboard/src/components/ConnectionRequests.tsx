import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import './ConnectionRequests.css';

interface OrganizationConnection {
  id: string;
  organizationId?: string;
  organizationName?: string;
  athleteId?: string;
  athleteName?: string;
  senderId?: string;
  senderName?: string;
  senderPhotoURL?: string;
  senderRole?: 'organization' | 'coach' | 'athlete';
  recipientId?: string;
  recipientName?: string;
  recipientPhotoURL?: string;
  recipientRole?: 'athlete' | 'organization' | 'coach';
  connectionType?: 'org_to_athlete' | 'athlete_to_org' | 'org_to_coach' | 'coach_to_org';
  status: 'pending' | 'approved' | 'rejected' | 'accepted';
  createdAt: Timestamp | Date | string;
  acceptedAt?: Timestamp | Date | string;
  rejectedAt?: Timestamp | Date | string;
  requestDate?: Timestamp | Date | string;
  friendshipId?: string;
  createdViaConnection?: boolean;
  source?: 'current' | 'migrated'; // Track which collection it came from
}

interface ConnectionStats {
  totalPending: number;
  totalAccepted: number;
  totalRejected: number;
  acceptanceRate: number;
  averageDaysToAccept: number;
  totalConnections: number;
}

interface TabType {
  all: 'all';
  pending: 'pending';
  accepted: 'accepted';
  rejected: 'rejected';
  org_to_athlete: 'org_to_athlete';
  athlete_to_org: 'athlete_to_org';
  org_to_coach: 'org_to_coach';
  coach_to_org: 'coach_to_org';
}

export const ConnectionRequests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<keyof TabType>('all');
  const [connections, setConnections] = useState<OrganizationConnection[]>([]);
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  // Refs to store unsubscribe functions for cleanup
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const statsUnsubscribersRef = useRef<Array<() => void>>([]);

  // Load data on component mount and tab change
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    loadData();
    loadStats();

    // Cleanup function to unsubscribe from all listeners
    return () => {
      // Cleanup data listeners
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];

      // Cleanup stats listeners
      statsUnsubscribersRef.current.forEach(unsub => unsub());
      statsUnsubscribersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadData = () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📍 Setting up real-time listener for tab:', activeTab);

      // Clear previous listeners
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];

      // Set up listener for organizationConnections (peer-to-peer model)
      console.log('📍 Setting up real-time listener for organizationConnections...');
      const constraints: QueryConstraint[] = [];

      if (activeTab === 'pending') {
        constraints.push(where('status', '==', 'pending'));
      } else if (activeTab === 'accepted') {
        constraints.push(where('status', '==', 'accepted'));
      } else if (activeTab === 'rejected') {
        constraints.push(where('status', '==', 'rejected'));
      } else if (activeTab === 'org_to_athlete') {
        constraints.push(where('connectionType', '==', 'org_to_athlete'));
      } else if (activeTab === 'athlete_to_org') {
        constraints.push(where('connectionType', '==', 'athlete_to_org'));
      } else if (activeTab === 'org_to_coach') {
        constraints.push(where('connectionType', '==', 'org_to_coach'));
      } else if (activeTab === 'coach_to_org') {
        constraints.push(where('connectionType', '==', 'coach_to_org'));
      }

      constraints.push(orderBy('createdAt', 'desc'));
      constraints.push(limit(1000));

      const connectionsQuery = query(collection(db, 'organizationConnections'), ...constraints);
      const unsubscribe = onSnapshot(
        connectionsQuery,
        (snapshot) => {
          console.log('✅ Real-time update from organizationConnections, found', snapshot.size, 'documents');
          const connectionsData = snapshot.docs.map(doc => {
            const docData = doc.data();
            return {
              id: doc.id,
              ...docData,
              createdAt: docData.createdAt,
              source: 'current' as const,
            } as OrganizationConnection;
          });

          // Apply pagination
          const startIdx = (currentPage - 1) * pageSize;
          const endIdx = startIdx + pageSize;
          const paginatedData = connectionsData.slice(startIdx, endIdx);

          console.log('📊 Real-time update - Total connections:', connectionsData.length, 'Current page:', currentPage, 'Showing:', paginatedData.length);
          setConnections(paginatedData);
          setLoading(false);
        },
        (error) => {
          console.error('❌ Error setting up listener:', error);
          setError('Failed to load connections');
          setLoading(false);
        }
      );

      unsubscribersRef.current.push(unsubscribe);
    } catch (err: any) {
      console.error('❌ Error setting up listeners:', err);
      setError(err.message || 'Failed to set up real-time listeners');
      setLoading(false);
    }
  };

  const loadStats = () => {
    try {
      console.log('📊 Setting up real-time listeners for connection statistics...');

      // Clear previous stats listeners
      statsUnsubscribersRef.current.forEach(unsub => unsub());
      statsUnsubscribersRef.current = [];

      // Store counts
      let pendingSize = 0;
      let acceptedSize = 0;
      let rejectedSize = 0;
      let totalSize = 0;

      // Store documents for average days calculation
      let acceptedDocs: any[] = [];

      // Function to update stats display
      const updateStats = () => {
        const total = pendingSize + acceptedSize + rejectedSize;
        const acceptanceRate = total > 0 ? (acceptedSize / total) * 100 : 0;

        // Calculate average days to accept
        let totalDays = 0;
        let acceptedCount = 0;

        acceptedDocs.forEach(doc => {
          const data = doc.data();
          if (data.createdAt && data.acceptedAt) {
            const createdTime = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : new Date(data.createdAt).getTime();
            const acceptedTime = data.acceptedAt instanceof Timestamp ? data.acceptedAt.toMillis() : new Date(data.acceptedAt).getTime();
            const days = (acceptedTime - createdTime) / (1000 * 60 * 60 * 24);
            totalDays += days;
            acceptedCount++;
          }
        });

        const averageDaysToAccept = acceptedCount > 0 ? Math.round(totalDays / acceptedCount * 10) / 10 : 0;

        console.log('✅ Real-time stats updated:', { totalPending: pendingSize, totalAccepted: acceptedSize, totalRejected: rejectedSize, totalConnections: totalSize });
        setStats({
          totalPending: pendingSize,
          totalAccepted: acceptedSize,
          totalRejected: rejectedSize,
          acceptanceRate: Math.round(acceptanceRate * 100) / 100,
          averageDaysToAccept,
          totalConnections: totalSize
        });
      };

      // Set up listeners for organizationConnections
      const pendingUnsub = onSnapshot(
        query(collection(db, 'organizationConnections'), where('status', '==', 'pending')),
        (snapshot) => {
          pendingSize = snapshot.size;
          console.log('📊 Real-time update - pending:', pendingSize);
          updateStats();
        },
        (error) => console.error('❌ Error in pending listener:', error)
      );
      statsUnsubscribersRef.current.push(pendingUnsub);

      const acceptedUnsub = onSnapshot(
        query(collection(db, 'organizationConnections'), where('status', '==', 'accepted')),
        (snapshot) => {
          acceptedSize = snapshot.size;
          acceptedDocs = snapshot.docs;
          console.log('📊 Real-time update - accepted:', acceptedSize);
          updateStats();
        },
        (error) => console.error('❌ Error in accepted listener:', error)
      );
      statsUnsubscribersRef.current.push(acceptedUnsub);

      const rejectedUnsub = onSnapshot(
        query(collection(db, 'organizationConnections'), where('status', '==', 'rejected')),
        (snapshot) => {
          rejectedSize = snapshot.size;
          console.log('📊 Real-time update - rejected:', rejectedSize);
          updateStats();
        },
        (error) => console.error('❌ Error in rejected listener:', error)
      );
      statsUnsubscribersRef.current.push(rejectedUnsub);

      const allUnsub = onSnapshot(
        collection(db, 'organizationConnections'),
        (snapshot) => {
          totalSize = snapshot.size;
          console.log('📊 Real-time update - total:', totalSize);
          updateStats();
        },
        (error) => console.error('❌ Error in all docs listener:', error)
      );
      statsUnsubscribersRef.current.push(allUnsub);
    } catch (err: any) {
      console.error('❌ Error setting up stats listeners:', err);
      setStats({
        totalPending: 0,
        totalAccepted: 0,
        totalRejected: 0,
        acceptanceRate: 0,
        averageDaysToAccept: 0,
        totalConnections: 0
      });
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

  const getConnectionTypeLabel = (type: 'org_to_athlete' | 'athlete_to_org' | 'org_to_coach' | 'coach_to_org'): string => {
    switch (type) {
      case 'org_to_athlete':
        return 'Organization → Athlete';
      case 'athlete_to_org':
        return 'Athlete → Organization';
      case 'org_to_coach':
        return 'Organization → Coach';
      case 'coach_to_org':
        return 'Coach → Organization';
      default:
        return 'Unknown';
    }
  };

  const getSenderRoleIcon = (role?: 'organization' | 'coach' | 'athlete'): string => {
    if (role === 'coach') return '👨‍🏫';
    if (role === 'athlete') return '🏃';
    return '🏢'; // Default to organization
  };

  const getRecipientRoleIcon = (role?: 'athlete' | 'organization' | 'coach'): string => {
    if (role === 'athlete') return '🏃';
    if (role === 'coach') return '👨‍🏫';
    return '🏢'; // Default to organization
  };

  const getSourceBadge = (source?: 'current' | 'migrated'): string => {
    return source === 'migrated' ? '📦 Migrated' : '⭐ Current';
  };

  const getDisplayName = (conn: OrganizationConnection, type: 'sender' | 'recipient'): string => {
    if (type === 'sender') {
      return conn.senderName || conn.organizationName || 'Unknown';
    } else {
      return conn.recipientName || conn.athleteName || 'Unknown';
    }
  };

  const getStatusLabel = (status: string): string => {
    if (status === 'approved') return 'accepted';
    return status;
  };

  return (
    <div className="connection-requests-container">
      <h2>🔗 Connection Analytics Dashboard</h2>
      <p className="subtitle">Peer-to-peer connection requests - Recipients accept/reject directly, no admin approval required</p>

      {/* Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalConnections}</div>
            <div className="stat-label">Total Connections</div>
          </div>
          <div className="stat-card pending">
            <div className="stat-number">{stats.totalPending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card accepted">
            <div className="stat-number">{stats.totalAccepted}</div>
            <div className="stat-label">Accepted</div>
          </div>
          <div className="stat-card rejected">
            <div className="stat-number">{stats.totalRejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.acceptanceRate}%</div>
            <div className="stat-label">Acceptance Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.averageDaysToAccept}</div>
            <div className="stat-label">Avg Days to Accept</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📊 All Connections ({stats?.totalConnections || 0})
        </button>
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          📬 Pending ({stats?.totalPending || 0})
        </button>
        <button
          className={`tab ${activeTab === 'accepted' ? 'active' : ''}`}
          onClick={() => setActiveTab('accepted')}
        >
          ✅ Accepted ({stats?.totalAccepted || 0})
        </button>
        <button
          className={`tab ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          ❌ Rejected ({stats?.totalRejected || 0})
        </button>
        <button
          className={`tab ${activeTab === 'org_to_athlete' ? 'active' : ''}`}
          onClick={() => setActiveTab('org_to_athlete')}
        >
          🏢→🏃 Org → Athlete
        </button>
        <button
          className={`tab ${activeTab === 'athlete_to_org' ? 'active' : ''}`}
          onClick={() => setActiveTab('athlete_to_org')}
        >
          🏃→🏢 Athlete → Org
        </button>
        <button
          className={`tab ${activeTab === 'org_to_coach' ? 'active' : ''}`}
          onClick={() => setActiveTab('org_to_coach')}
        >
          🏢→👨‍🏫 Org → Coach
        </button>
        <button
          className={`tab ${activeTab === 'coach_to_org' ? 'active' : ''}`}
          onClick={() => setActiveTab('coach_to_org')}
        >
          👨‍🏫→🏢 Coach → Org
        </button>
      </div>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading State */}
      {loading && <div className="loading">Loading connections...</div>}

      {/* Connections Table */}
      {!loading && (
        <div className="table-container">
          {connections.length === 0 ? (
            <div className="empty-state">
              No connections found for this filter
            </div>
          ) : (
            <>
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>Recipient</th>
                    <th>Connection Type</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Response Date</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map(conn => {
                    const displayStatus = getStatusLabel(conn.status);
                    const displaySender = getDisplayName(conn, 'sender');
                    const displayRecipient = getDisplayName(conn, 'recipient');

                    return (
                      <tr key={conn.id} className={`status-${displayStatus}`}>
                        <td className="sender-cell">
                          <span className="sender-role">
                            {getSenderRoleIcon(conn.senderRole)}
                          </span>
                          {displaySender}
                        </td>
                        <td className="recipient-cell">
                          <span className="recipient-role">
                            {getRecipientRoleIcon(conn.recipientRole)}
                          </span>
                          {displayRecipient}
                        </td>
                        <td className="connection-type-cell">
                          {conn.connectionType ? getConnectionTypeLabel(conn.connectionType) : 'Organization → Athlete'}
                        </td>
                        <td className="status-cell">
                          <span className={`status-badge ${displayStatus}`}>
                            {displayStatus === 'pending' && '📬 Pending'}
                            {displayStatus === 'accepted' && '✅ Accepted'}
                            {displayStatus === 'rejected' && '❌ Rejected'}
                          </span>
                        </td>
                        <td className="date-cell">{formatDate(conn.createdAt)}</td>
                        <td className="date-cell">
                          {displayStatus === 'pending'
                            ? '-'
                            : formatDate(displayStatus === 'accepted' ? conn.acceptedAt : conn.rejectedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="pagination-container">
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} | Showing {connections.length} connections
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={connections.length < pageSize}
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionRequests;
