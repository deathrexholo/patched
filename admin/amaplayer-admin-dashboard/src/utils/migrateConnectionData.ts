/**
 * Data Migration Script: Old Connection Model → New Peer-to-Peer Model
 *
 * Migrates data from:
 * - organizationConnectionRequests (old: admin approval model)
 *
 * To:
 * - organizationConnections (new: peer-to-peer model)
 * - connectionActivity (new: audit trail)
 *
 * Changes:
 * - organizationId → senderId
 * - athleteId → recipientId
 * - "approved" status → "accepted" status
 * - Admin approval → Recipient accepted
 */

import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  query,
  where,
  QueryConstraint,
  deleteDoc,
  doc,
} from 'firebase/firestore';

interface OldConnectionRequest {
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
  rejectionReason?: string;
  notes?: string;
}

interface NewConnectionRecord {
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
  senderRole: 'organization';
  recipientId: string;
  recipientName: string;
  recipientPhotoURL: string;
  recipientRole: 'athlete';
  connectionType: 'org_to_athlete';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  rejectedAt?: Timestamp;
  createdViaConnection: true;
}

interface ActivityRecord {
  connectionId: string;
  connectionType: 'org_to_athlete';
  action: 'request_sent' | 'request_accepted' | 'request_rejected';
  actionDate: Timestamp;
  performedByUserId: string;
  performedByName: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  metadata?: Record<string, any>;
}

export interface MigrationStats {
  totalOldRecords: number;
  migratedSuccessfully: number;
  migratedFailed: number;
  oldRecordsDeleted: number;
  errors: Array<{
    recordId: string;
    error: string;
  }>;
}

/**
 * Migrate all connection requests from old to new model
 */
export async function migrateAllConnectionData(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalOldRecords: 0,
    migratedSuccessfully: 0,
    migratedFailed: 0,
    oldRecordsDeleted: 0,
    errors: [],
  };

  try {
    // Fetch all old records
    console.log('📋 Fetching old connection requests...');
    const oldDocs = await getDocs(collection(db, 'organizationConnectionRequests'));

    stats.totalOldRecords = oldDocs.size;
    console.log(`✅ Found ${stats.totalOldRecords} old records`);

    // Migrate each record
    for (const oldDoc of oldDocs.docs) {
      try {
        const oldData = oldDoc.data() as OldConnectionRequest;
        await migrateConnection(oldData, oldDoc.id, stats);
      } catch (error: any) {
        console.error(`❌ Error migrating record ${oldDoc.id}:`, error);
        stats.errors.push({
          recordId: oldDoc.id,
          error: error.message,
        });
        stats.migratedFailed++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total Old Records: ${stats.totalOldRecords}`);
    console.log(`   ✅ Successfully Migrated: ${stats.migratedSuccessfully}`);
    console.log(`   ❌ Failed: ${stats.migratedFailed}`);
    console.log(`   🗑️  Deleted Old Records: ${stats.oldRecordsDeleted}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️ Errors:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.recordId}: ${err.error}`);
      });
    }

    return stats;
  } catch (error: any) {
    console.error('❌ Fatal error during migration:', error);
    throw error;
  }
}

/**
 * Migrate a single connection request
 */
async function migrateConnection(
  oldData: OldConnectionRequest,
  oldId: string,
  stats: MigrationStats
): Promise<void> {
  try {
    // Transform data to new model
    const newConnectionData: NewConnectionRecord = {
      senderId: oldData.organizationId,
      senderName: oldData.organizationName,
      senderPhotoURL: '', // Organizations might not have photoURL
      senderRole: 'organization',
      recipientId: oldData.athleteId,
      recipientName: oldData.athleteName,
      recipientPhotoURL: oldData.athletePhotoURL,
      recipientRole: 'athlete',
      connectionType: 'org_to_athlete',
      status: oldData.status === 'approved' ? 'accepted' : (oldData.status as any),
      createdAt: oldData.requestDate instanceof Timestamp ? oldData.requestDate : Timestamp.fromDate(new Date(oldData.requestDate as any)),
      createdViaConnection: true,
    };

    // Add acceptedAt or rejectedAt if applicable
    if (oldData.status === 'approved' && oldData.approvalDate) {
      newConnectionData.acceptedAt =
        oldData.approvalDate instanceof Timestamp
          ? oldData.approvalDate
          : Timestamp.fromDate(new Date(oldData.approvalDate as any));
    } else if (oldData.status === 'rejected' && oldData.rejectionDate) {
      newConnectionData.rejectedAt =
        oldData.rejectionDate instanceof Timestamp
          ? oldData.rejectionDate
          : Timestamp.fromDate(new Date(oldData.rejectionDate as any));
    }

    // Create new connection record
    console.log(`📝 Migrating: ${oldData.organizationName} → ${oldData.athleteName}`);
    const newDocRef = await addDoc(collection(db, 'organizationConnections'), newConnectionData);

    // Create activity logs
    const activityLogs: ActivityRecord[] = [];

    // Log: Request sent
    activityLogs.push({
      connectionId: newDocRef.id,
      connectionType: 'org_to_athlete',
      action: 'request_sent',
      actionDate: newConnectionData.createdAt,
      performedByUserId: oldData.organizationId,
      performedByName: oldData.organizationName,
      senderId: oldData.organizationId,
      senderName: oldData.organizationName,
      recipientId: oldData.athleteId,
      recipientName: oldData.athleteName,
      metadata: {
        migratedFromOldModel: true,
      },
    });

    // Log: Request accepted or rejected
    if (oldData.status === 'approved' && oldData.approvalDate && oldData.approvedByAdminId) {
      // For accepted connections, the "admin" approval is now considered the recipient accepting
      // We'll log it as if the recipient accepted
      activityLogs.push({
        connectionId: newDocRef.id,
        connectionType: 'org_to_athlete',
        action: 'request_accepted',
        actionDate:
          oldData.approvalDate instanceof Timestamp
            ? oldData.approvalDate
            : Timestamp.fromDate(new Date(oldData.approvalDate as any)),
        performedByUserId: oldData.athleteId, // Recipient is now the one accepting
        performedByName: oldData.athleteName,
        senderId: oldData.organizationId,
        senderName: oldData.organizationName,
        recipientId: oldData.athleteId,
        recipientName: oldData.athleteName,
        metadata: {
          migratedFromAdminApproval: true,
          originalAdminId: oldData.approvedByAdminId,
          originalAdminName: oldData.approvedByAdminName,
        },
      });
    } else if (oldData.status === 'rejected' && oldData.rejectionDate) {
      activityLogs.push({
        connectionId: newDocRef.id,
        connectionType: 'org_to_athlete',
        action: 'request_rejected',
        actionDate:
          oldData.rejectionDate instanceof Timestamp
            ? oldData.rejectionDate
            : Timestamp.fromDate(new Date(oldData.rejectionDate as any)),
        performedByUserId: oldData.athleteId, // Recipient is now the one rejecting
        performedByName: oldData.athleteName,
        senderId: oldData.organizationId,
        senderName: oldData.organizationName,
        recipientId: oldData.athleteId,
        recipientName: oldData.athleteName,
        metadata: {
          migratedFromAdminRejection: true,
          originalAdminId: oldData.rejectedByAdminId,
          originalAdminName: oldData.rejectedByAdminName,
          rejectionReason: oldData.rejectionReason,
        },
      });
    }

    // Save activity logs
    for (const activity of activityLogs) {
      await addDoc(collection(db, 'connectionActivity'), activity);
    }

    console.log(`   ✅ Migrated to: ${newDocRef.id}`);
    stats.migratedSuccessfully++;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete old connection request records after successful migration
 * WARNING: This is destructive and cannot be undone!
 */
export async function deleteOldConnectionRecords(confirmDelete: boolean = false): Promise<number> {
  if (!confirmDelete) {
    console.warn(
      '⚠️ deleteOldConnectionRecords requires explicit confirmation. Pass true to proceed.'
    );
    return 0;
  }

  console.log(
    '🗑️  Deleting old organizationConnectionRequests collection... (This cannot be undone!)'
  );

  try {
    const oldDocs = await getDocs(collection(db, 'organizationConnectionRequests'));
    let deleted = 0;

    for (const oldDoc of oldDocs.docs) {
      await deleteDoc(doc(db, 'organizationConnectionRequests', oldDoc.id));
      deleted++;

      if (deleted % 10 === 0) {
        console.log(`   🗑️  Deleted ${deleted} old records...`);
      }
    }

    console.log(`✅ Successfully deleted ${deleted} old records`);
    return deleted;
  } catch (error: any) {
    console.error('❌ Error deleting old records:', error);
    throw error;
  }
}

/**
 * Verify migration: Compare old and new collections
 */
export async function verifyMigration(): Promise<{
  oldCount: number;
  newCount: number;
  match: boolean;
}> {
  try {
    const oldDocs = await getDocs(collection(db, 'organizationConnectionRequests'));
    const newDocs = await getDocs(collection(db, 'organizationConnections'));

    const oldCount = oldDocs.size;
    const newCount = newDocs.size;
    const match = oldCount === newCount;

    console.log('\n✅ Migration Verification:');
    console.log(`   Old Collection Count: ${oldCount}`);
    console.log(`   New Collection Count: ${newCount}`);
    console.log(`   Status: ${match ? '✅ MATCH' : '⚠️ MISMATCH - Manual Review Needed'}`);

    return { oldCount, newCount, match };
  } catch (error: any) {
    console.error('❌ Error verifying migration:', error);
    throw error;
  }
}
