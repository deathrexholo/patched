/**
 * Prepare deployment by copying admin dashboard build to main build folder
 */

const fs = require('fs-extra');
const path = require('path');

async function prepareDeployment() {
  console.log('📦 Preparing deployment...\n');
  console.log('='.repeat(60));

  try {
    const adminBuildPath = path.join(__dirname, '..', 'admin', 'amaplayer-admin-dashboard', 'build');
    const targetPath = path.join(__dirname, '..', 'build', 'admindashboard');

    // Check if admin build exists
    if (!fs.existsSync(adminBuildPath)) {
      console.error('❌ Admin dashboard build not found!');
      console.error('Please run: cd admin/amaplayer-admin-dashboard && npm run build');
      process.exit(1);
    }

    console.log('📁 Source:', adminBuildPath);
    console.log('📁 Target:', targetPath);
    console.log('');

    // Remove old admin dashboard build if exists
    if (fs.existsSync(targetPath)) {
      console.log('🗑️  Removing old admin dashboard build...');
      await fs.remove(targetPath);
      console.log('✅ Old build removed\n');
    }

    // Copy admin build to main build folder
    console.log('📋 Copying admin dashboard build...');
    await fs.copy(adminBuildPath, targetPath);
    console.log('✅ Admin dashboard copied successfully\n');

    // Verify files were copied
    const files = await fs.readdir(targetPath);
    console.log(`📊 Copied ${files.length} files/folders to admindashboard/`);
    console.log('');

    console.log('='.repeat(60));
    console.log('✨ Deployment preparation complete!\n');
    console.log('📌 Next step: Run "firebase deploy --only hosting"\n');

  } catch (error) {
    console.error('❌ Error preparing deployment:', error);
    process.exit(1);
  }
}

prepareDeployment()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
