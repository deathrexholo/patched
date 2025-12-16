/**
 * Script to initialize the announcements collection with sample data
 * Run this script to create the announcements collection and add initial announcements
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
 * Sample announcements to initialize the collection
 */
const sampleAnnouncements = [
  {
    title: 'Welcome to AmaPlayer!',
    message: 'Thank you for joining our community! We are excited to have you here. Explore our features and connect with athletes, coaches, and organizations.',
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
    createdBy: 'admin',
    createdByName: 'System Admin',
    isActive: true,
    priority: 'high'
  },
  {
    title: 'New Features Available',
    message: 'Check out our latest updates including improved video player, enhanced notifications, and better profile management. Visit your settings to explore!',
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)), // 5 days from now
    createdBy: 'admin',
    createdByName: 'System Admin',
    isActive: true,
    priority: 'normal'
  },
  {
    title: 'Community Guidelines Updated',
    message: 'We have updated our community guidelines to ensure a safe and positive environment for all users. Please review them in your account settings.',
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)), // 14 days from now
    createdBy: 'admin',
    createdByName: 'System Admin',
    isActive: true,
    priority: 'normal'
  }
];

/**
 * Initialize announcements collection
 */
async function initializeAnnouncements() {
  console.log('📢 Initializing announcements collection...\n');
  console.log('='.repeat(60));

  try {
    // Check if announcements collection already has data
    const announcementsRef = db.collection('announcements');
    const existingSnapshot = await announcementsRef.limit(1).get();

    if (!existingSnapshot.empty) {
      console.log('\n⚠️  Announcements collection already has data!');
      console.log('Do you want to add more announcements anyway? (This will NOT delete existing ones)\n');

      // For script automation, we'll proceed
      console.log('Proceeding to add sample announcements...\n');
    }

    // Add each announcement
    console.log(`📝 Adding ${sampleAnnouncements.length} sample announcements...\n`);

    for (let i = 0; i < sampleAnnouncements.length; i++) {
      const announcement = sampleAnnouncements[i];

      // Add createdAt timestamp
      const announcementData = {
        ...announcement,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Add to Firestore
      const docRef = await announcementsRef.add(announcementData);

      console.log(`✅ [${i + 1}/${sampleAnnouncements.length}] Created announcement: "${announcement.title}"`);
      console.log(`   ID: ${docRef.id}`);
      console.log(`   Expires: ${announcement.expiresAt.toDate().toLocaleString()}`);
      console.log(`   Status: ${announcement.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   Priority: ${announcement.priority}\n`);
    }

    // Verify collection was created
    console.log('='.repeat(60));
    console.log('\n🔍 Verifying announcements collection...\n');

    const verifySnapshot = await announcementsRef.get();
    console.log(`✅ Collection created successfully!`);
    console.log(`📊 Total announcements in collection: ${verifySnapshot.size}`);

    // Show all announcements
    console.log('\n📋 All announcements in collection:\n');
    console.log('┌──────────────────────────────────┬──────────┬────────────┬──────────┐');
    console.log('│ Title                            │ Priority │ Status     │ Expires  │');
    console.log('├──────────────────────────────────┼──────────┼────────────┼──────────┤');

    verifySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const title = data.title.substring(0, 32).padEnd(32);
      const priority = data.priority.padEnd(8);
      const status = (data.isActive ? 'Active' : 'Inactive').padEnd(10);
      const expires = data.expiresAt.toDate().toLocaleDateString().padEnd(8);
      console.log(`│ ${title} │ ${priority} │ ${status} │ ${expires} │`);
    });

    console.log('└──────────────────────────────────┴──────────┴────────────┴──────────┘');

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Announcements collection initialized successfully!\n');
    console.log('📌 Next steps:');
    console.log('   1. Open your admin dashboard at /admindashboard/announcements');
    console.log('   2. Create, edit, or delete announcements as needed');
    console.log('   3. Users will see active announcements in their notification dropdown\n');

  } catch (error) {
    console.error('\n❌ Error initializing announcements:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the script
console.log('🚀 Starting announcements collection initialization...\n');

initializeAnnouncements()
  .then(() => {
    console.log('✅ Script completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
