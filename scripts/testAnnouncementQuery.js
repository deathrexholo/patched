/**
 * Test announcement query to verify it works for authenticated users
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
  process.exit(1);
}

const db = admin.firestore();

/**
 * Test fetching announcements as they would appear to users
 */
async function testAnnouncementQuery() {
  console.log('🧪 Testing announcement query...\n');
  console.log('='.repeat(60));

  try {
    // Simulate the client-side query
    const announcementsRef = db.collection('announcements');
    const query = announcementsRef.where('isActive', '==', true);

    const snapshot = await query.get();
    const now = admin.firestore.Timestamp.now();

    console.log(`\n📊 Query returned ${snapshot.size} announcement(s)\n`);

    if (snapshot.empty) {
      console.log('⚠️  No active announcements found!');
      console.log('This could mean:');
      console.log('  1. No announcements exist in the collection');
      console.log('  2. All announcements are marked as inactive');
      console.log('  3. There\'s a permission issue\n');
      return;
    }

    // Filter and display
    let visibleCount = 0;
    let expiredCount = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const isExpired = data.expiresAt.toMillis() <= now.toMillis();

      if (!isExpired) {
        visibleCount++;
        console.log(`✅ VISIBLE: "${data.title}"`);
        console.log(`   Status: Active`);
        console.log(`   Expires: ${data.expiresAt.toDate().toLocaleString()}`);
        console.log(`   Priority: ${data.priority || 'normal'}`);
        console.log('');
      } else {
        expiredCount++;
        console.log(`⏰ EXPIRED: "${data.title}"`);
        console.log(`   Expired: ${data.expiresAt.toDate().toLocaleString()}`);
        console.log('');
      }
    });

    console.log('='.repeat(60));
    console.log(`\n📈 Summary:`);
    console.log(`   Total active announcements: ${snapshot.size}`);
    console.log(`   Visible (not expired): ${visibleCount}`);
    console.log(`   Expired (filtered out): ${expiredCount}`);
    console.log('');

    if (visibleCount === 0) {
      console.log('⚠️  WARNING: No visible announcements!');
      console.log('All announcements are expired. Users won\'t see any announcements.\n');
    } else {
      console.log(`✅ SUCCESS: ${visibleCount} announcement(s) should be visible to users\n`);
    }

  } catch (error) {
    console.error('\n❌ Error testing query:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

testAnnouncementQuery()
  .then(() => {
    console.log('✨ Test complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
