import { Timestamp } from 'firebase/firestore';

/**
 * Connection type - supports bidirectional connections
 * - org_to_athlete: Organization requests Athlete
 * - athlete_to_org: Athlete requests Organization
 * - org_to_coach: Organization requests Coach
 * - coach_to_org: Coach requests Organization
 */
export type ConnectionType = 'org_to_athlete' | 'athlete_to_org' | 'org_to_coach' | 'coach_to_org';

/**
 * Connection status - peer-to-peer acceptance model
 */
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';

/**
 * Connection activity action type
 */
export type ConnectionAction = 'request_sent' | 'request_accepted' | 'request_rejected' | 'request_cancelled' | 'message_sent' | 'call_initiated';

/**
 * Organization connection - peer-to-peer model (no admin approval)
 * Supports both org→athlete and coach→organization connections
 */
export interface OrganizationConnection {
  id: string;
  connectionType: ConnectionType;

  // Sender info (organization, coach, or athlete)
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
  senderRole: 'organization' | 'coach' | 'athlete';

  // Recipient info (athlete, organization, or coach)
  recipientId: string;
  recipientName: string;
  recipientPhotoURL: string;
  recipientRole: 'athlete' | 'organization' | 'coach';

  // Status and timestamps
  status: ConnectionStatus;
  createdAt: Timestamp | Date | string;
  acceptedAt?: Timestamp | Date | string;
  rejectedAt?: Timestamp | Date | string;

  // Friendship link
  friendshipId?: string;  // Created when accepted
  createdViaConnection: true;  // Flag for tracking origin
}

/**
 * Connection activity - audit trail for admin dashboard
 */
export interface ConnectionActivity {
  id: string;
  connectionId: string;
  connectionType: ConnectionType;

  action: ConnectionAction;
  actionDate: Timestamp | Date | string;
  performedByUserId: string;
  performedByName: string;

  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;

  metadata?: Record<string, any>;
}

/**
 * Data for sending connection request
 */
export interface SendConnectionRequestData {
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
  senderRole: 'organization' | 'coach' | 'athlete';

  recipientId: string;
  recipientName: string;
  recipientPhotoURL: string;
  recipientRole: 'athlete' | 'organization' | 'coach';

  connectionType: ConnectionType;
}

/**
 * Data for accepting connection request (peer-to-peer)
 */
export interface AcceptConnectionRequestData {
  connectionId: string;
  acceptedByUserId: string;
  acceptedByName: string;
}

/**
 * Data for rejecting connection request
 */
export interface RejectConnectionRequestData {
  connectionId: string;
  rejectedByUserId: string;
  rejectedByName: string;
  reason?: string;
}

/**
 * Connection statistics for admin dashboard
 */
export interface ConnectionStats {
  // Overall counts
  totalPending: number;
  totalAccepted: number;
  totalRejected: number;
  acceptanceRate: number;
  averageDaysToAccept: number;

  // Top organizations
  topOrganizations?: Array<{
    organizationId: string;
    organizationName: string;
    totalRequests: number;
    accepted: number;
    pending: number;
    acceptanceRate: number;
  }>;

  // Top coaches
  topCoaches?: Array<{
    coachId: string;
    coachName: string;
    totalRequests: number;
    accepted: number;
    pending: number;
    acceptanceRate: number;
  }>;

  // Top athletes
  topAthletes?: Array<{
    athleteId: string;
    athleteName: string;
    totalRequests: number;
    accepted: number;
    pending: number;
    acceptanceRate: number;
  }>;
}

/**
 * Timeline data for connection analytics
 */
export interface ConnectionTimeline {
  date: string;
  newRequests: number;
  accepted: number;
  rejected: number;
}

/**
 * Filter options for querying connections
 */
export interface ConnectionFilter {
  connectionType?: ConnectionType;
  status?: ConnectionStatus;
  senderId?: string;
  recipientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * For backward compatibility during migration - tracks old connection format
 * This can be removed after migration is complete
 */
export interface OldOrganizationConnectionRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  athleteId: string;
  athleteName: string;
  athletePhotoURL: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: Timestamp | Date | string;
  approvalDate?: Timestamp | Date | string;
  rejectionDate?: Timestamp | Date | string;
  approvedByAdminId?: string;
  approvedByAdminName?: string;
  rejectedByAdminId?: string;
  rejectedByAdminName?: string;
  notes?: string;
}
