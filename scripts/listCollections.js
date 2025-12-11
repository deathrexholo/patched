/**
 * Script to list all collections in the default Firestore database
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
 * List all collections in the default database
 */
async function listCollections() {
  console.log('📊 Fetching all collections from (default) database...\n');
  console.log('='.repeat(60));

  try {
    // Get all root-level collections
    const collections = await db.listCollections();

    console.log(`\n✅ Found ${collections.length} collections in (default) database:\n`);

    // Create a formatted table
    const collectionsData = [];

    for (const collection of collections) {
      const collectionId = collection.id;

      // Get document count (first 10 to avoid timeout)
      try {
        const snapshot = await collection.limit(1).get();
        const hasDocuments = !snapshot.empty;

        // Get total count (this might be slow for large collections)
        const countSnapshot = await collection.count().get();
        const documentCount = countSnapshot.data().count;

        collectionsData.push({
          name: collectionId,
          count: documentCount,
          status: hasDocuments ? '✅ Has data' : '⚠️ Empty'
        });
      } catch (error) {
        collectionsData.push({
          name: collectionId,
          count: 'Error',
          status: '❌ Error reading'
        });
      }
    }

    // Sort by name
    collectionsData.sort((a, b) => a.name.localeCompare(b.name));

    // Print collections
    console.log('┌─────────────────────────────────────┬─────────────┬──────────────┐');
    console.log('│ Collection Name                     │ Doc Count   │ Status       │');
    console.log('├─────────────────────────────────────┼─────────────┼──────────────┤');

    collectionsData.forEach(({ name, count, status }) => {
      const namePadded = name.padEnd(35);
      const countPadded = String(count).padEnd(11);
      const statusPadded = status.padEnd(12);
      console.log(`│ ${namePadded} │ ${countPadded} │ ${statusPadded} │`);
    });

    console.log('└─────────────────────────────────────┴─────────────┴──────────────┘');

    // Highlight role-specific collections
    console.log('\n📌 Role-Specific Collections (NEW):');
    const roleCollections = ['parents', 'coaches', 'organizations', 'athletes'];
    roleCollections.forEach(name => {
      const collection = collectionsData.find(c => c.name === name);
      if (collection) {
        console.log(`   ${collection.status === '✅ Has data' ? '✅' : '⚠️'} ${name}/ - ${collection.count} documents`);
      } else {
        console.log(`   ❌ ${name}/ - Not found`);
      }
    });

    // Highlight legacy collection
    console.log('\n📌 Legacy Collection:');
    const usersCollection = collectionsData.find(c => c.name === 'users');
    if (usersCollection) {
      console.log(`   ${usersCollection.status === '✅ Has data' ? '✅' : '⚠️'} users/ - ${usersCollection.count} documents`);
    } else {
      console.log(`   ❌ users/ - Not found`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Collection listing complete!\n');

  } catch (error) {
    console.error('\n❌ Error listing collections:', error);
    process.exit(1);
  }
}

// Run the script
listCollections()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
