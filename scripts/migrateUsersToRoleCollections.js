/**
 * Migration script to move users from legacy users/ collection
 * to role-specific collections (parents/, coaches/, organizations/, athletes/)
 *
 * Prerequisites:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Download Firebase service account key from Firebase Console
 * 3. Place service account key at scripts/serviceAccountKey.json
 *
 * Run: node scripts/migrateUsersToRoleCollections.js
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

  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  console.error('\nMake sure you have:');
  console.error('1. Downloaded your Firebase service account key');
  console.error('2. Placed it at: scripts/serviceAccountKey.json');
  console.error('3. Installed firebase-admin: npm install firebase-admin');
  process.exit(1);
}

const db = admin.firestore();

// Collection names
const COLLECTIONS = {
  USERS: 'users',           // Legacy collection
  PARENTS: 'parents',       // Role-specific collection
  COACHES: 'coaches',       // Role-specific collection
  ORGANIZATIONS: 'organizations', // Role-specific collection
  ATHLETES: 'athletes'      // Role-specific collection
};

/**
 * Main migration function
 */
async function migrateUsers() {
  console.log('\n🚀 Starting user migration from users/ to role-specific collections...\n');

  const usersRef = db.collection(COLLECTIONS.USERS);
  const usersSnapshot = await usersRef.get();

  if (usersSnapshot.empty) {
    console.log('⚠️  No users found in users/ collection. Nothing to migrate.');
    return;
  }

  console.log(`📊 Found ${usersSnapshot.size} users in users/ collection\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails = [];

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const uid = userDoc.id;
    const role = userData.role || 'athlete'; // Default to athlete if no role specified

    try {
      // Determine target collection based on role
      let targetCollection;
      switch (role) {
        case 'parent':
          targetCollection = COLLECTIONS.PARENTS;
          break;
        case 'coach':
          targetCollection = COLLECTIONS.COACHES;
          break;
        case 'organization':
          targetCollection = COLLECTIONS.ORGANIZATIONS;
          break;
        case 'athlete':
        default:
          targetCollection = COLLECTIONS.ATHLETES;
          break;
      }

      // Check if user already exists in target collection
      const targetRef = db.collection(targetCollection).doc(uid);
      const targetDoc = await targetRef.get();

      if (targetDoc.exists) {
        console.log(`⏭️  Skipping ${uid} (${role}) - already exists in ${targetCollection}/`);
        skipped++;
        continue;
      }

      // Prepare user data for migration
      const migratedUserData = {
        ...userData,
        role: role, // Ensure role field is set
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        migratedFrom: COLLECTIONS.USERS,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Remove any undefined values
      Object.keys(migratedUserData).forEach(key => {
        if (migratedUserData[key] === undefined) {
          delete migratedUserData[key];
        }
      });

      // Copy user data to role-specific collection
      await targetRef.set(migratedUserData);

      console.log(`✅ Migrated ${uid} (${role}) to ${targetCollection}/`);
      migrated++;

    } catch (error) {
      console.error(`❌ Error migrating ${uid} (${role}):`, error.message);
      errorDetails.push({
        uid,
        role,
        error: error.message
      });
      errors++;
    }
  }

  // Print migration summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total users in users/ collection: ${usersSnapshot.size}`);
  console.log(`Successfully migrated: ${migrated} users`);
  console.log(`Skipped (already exist): ${skipped} users`);
  console.log(`Errors: ${errors} users`);
  console.log('='.repeat(60));

  if (errors > 0) {
    console.log('\n⚠️  ERRORS ENCOUNTERED:');
    errorDetails.forEach(({ uid, role, error }) => {
      console.log(`  - ${uid} (${role}): ${error}`);
    });
  }

  // Print next steps
  console.log('\n📝 NEXT STEPS:');
  console.log('1. Verify migrated users can log in and view their profiles');
  console.log('2. Test profile updates for migrated users');
  console.log('3. After verification (2-4 weeks), consider marking users/ collection as read-only');
  console.log('4. Eventually, delete the legacy users/ collection');

  return {
    total: usersSnapshot.size,
    migrated,
    skipped,
    errors,
    errorDetails
  };
}

/**
 * Verify migration by checking a sample of users
 */
async function verifyMigration(sampleSize = 5) {
  console.log(`\n🔍 Verifying migration (checking ${sampleSize} random users)...\n`);

  const usersRef = db.collection(COLLECTIONS.USERS);
  const usersSnapshot = await usersRef.limit(sampleSize).get();

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const uid = userDoc.id;
    const role = userData.role || 'athlete';

    // Determine expected collection
    let expectedCollection;
    switch (role) {
      case 'parent':
        expectedCollection = COLLECTIONS.PARENTS;
        break;
      case 'coach':
        expectedCollection = COLLECTIONS.COACHES;
        break;
      case 'organization':
        expectedCollection = COLLECTIONS.ORGANIZATIONS;
        break;
      case 'athlete':
      default:
        expectedCollection = COLLECTIONS.ATHLETES;
        break;
    }

    // Check if user exists in role-specific collection
    const targetRef = db.collection(expectedCollection).doc(uid);
    const targetDoc = await targetRef.get();

    if (targetDoc.exists) {
      console.log(`✅ ${uid} (${role}) verified in ${expectedCollection}/`);
    } else {
      console.log(`❌ ${uid} (${role}) NOT FOUND in ${expectedCollection}/`);
    }
  }
}

// Run migration
console.log('🔄 Starting migration process...');
console.log('This script will:');
console.log('1. Read all users from users/ collection');
console.log('2. Copy each user to their role-specific collection');
console.log('3. Add migration metadata (migratedAt, migratedFrom)');
console.log('4. Skip users that already exist in target collections');
console.log('5. Preserve all original user data');
console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');

// Wait 5 seconds before starting migration
setTimeout(() => {
  migrateUsers()
    .then((result) => {
      console.log('\n✨ Migration completed!');

      // Run verification if migration was successful
      if (result && result.migrated > 0) {
        return verifyMigration(5);
      }
    })
    .then(() => {
      console.log('\n👋 Done! Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}, 5000);
