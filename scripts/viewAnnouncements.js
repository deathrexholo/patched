/**
 * Script to view all announcements in the collection
 * Displays detailed information about each announcement
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('✅ Firebase Admin SDK initialized successfully\n');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  console.error('\nMake sure you have:');
  console.error('1. Downloaded your Firebase service account key');
  console.error('2. Placed it at: scripts/serviceAccountKey.json');
  process.exit(1);
}

const db = admin.firestore();

/**
 * View all announcements
 */
async function viewAnnouncements() {
  console.log('📢 Fetching all announcements from Firestore...\n');
  console.log('='.repeat(80));

  try {
    const announcementsRef = db.collection('announcements');
    const snapshot = await announcementsRef.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      console.log('\n⚠️  No announcements found in the collection.');
      console.log('Run "node scripts/initializeAnnouncements.js" to add sample data.\n');
      return;
    }

    console.log(`\n✅ Found ${snapshot.size} announcement(s)\n`);

    // Get current time for expiration comparison
    const now = new Date();

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const expiresAt = data.expiresAt.toDate();
      const createdAt = data.createdAt ? data.createdAt.toDate() : new Date();
      const isExpired = expiresAt < now;
      const hoursUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60));
      const daysUntilExpiry = Math.floor(hoursUntilExpiry / 24);

      console.log(`${'─'.repeat(80)}`);
      console.log(`📢 Announcement #${index + 1}`);
      console.log(`${'─'.repeat(80)}`);
      console.log(`🆔 ID:           ${doc.id}`);
      console.log(`📝 Title:        ${data.title}`);
      console.log(`💬 Message:      ${data.message}`);
      console.log(`👤 Created By:   ${data.createdByName} (${data.createdBy})`);
      console.log(`📅 Created At:   ${createdAt.toLocaleString()}`);
      console.log(`⏰ Expires At:   ${expiresAt.toLocaleString()}`);

      if (isExpired) {
        console.log(`⚠️  Status:       EXPIRED (${Math.abs(daysUntilExpiry)} days ago)`);
      } else if (daysUntilExpiry < 1) {
        console.log(`⚠️  Status:       Expiring soon (${hoursUntilExpiry} hours remaining)`);
      } else {
        console.log(`✅ Status:       Active (${daysUntilExpiry} days remaining)`);
      }

      console.log(`🔄 Active:       ${data.isActive ? '✅ Yes' : '❌ No'}`);
      console.log(`⭐ Priority:     ${data.priority.toUpperCase()}`);

      if (data.actionUrl) {
        console.log(`🔗 Action URL:   ${data.actionUrl}`);
      }

      console.log('');
    });

    console.log(`${'='.repeat(80)}`);

    // Statistics
    const activeCount = snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.isActive && data.expiresAt.toDate() > now;
    }).length;

    const expiredCount = snapshot.docs.filter(doc => {
      return doc.data().expiresAt.toDate() < now;
    }).length;

    const inactiveCount = snapshot.docs.filter(doc => {
      return !doc.data().isActive;
    }).length;

    console.log('\n📊 Statistics:');
    console.log(`   Total:        ${snapshot.size}`);
    console.log(`   Active:       ${activeCount} ✅`);
    console.log(`   Expired:      ${expiredCount} ⏰`);
    console.log(`   Inactive:     ${inactiveCount} ❌`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error fetching announcements:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the script
viewAnnouncements()
  .then(() => {
    console.log('✨ View completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
