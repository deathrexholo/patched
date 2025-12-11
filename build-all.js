const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

console.log('🚀 Starting combined build process...\n');

// Step 1: Build main app
console.log('📦 Building main app...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Main app built successfully\n');
} catch (error) {
  console.error('❌ Main app build failed');
  process.exit(1);
}

// Step 2: Build admin dashboard
console.log('📦 Building admin dashboard...');
try {
  execSync('npm run build', {
    cwd: path.join(__dirname, 'admin', 'amaplayer-admin-dashboard'),
    stdio: 'inherit'
  });
  console.log('✅ Admin dashboard built successfully\n');
} catch (error) {
  console.error('❌ Admin dashboard build failed');
  process.exit(1);
}

// Step 3: Copy admin build to main build folder
console.log('📋 Copying admin dashboard to main build...');
try {
  const adminBuildPath = path.join(__dirname, 'admin', 'amaplayer-admin-dashboard', 'build');
  const targetPath = path.join(__dirname, 'build', 'admindashboard');

  // Remove existing admin dashboard folder if it exists
  if (fs.existsSync(targetPath)) {
    fs.removeSync(targetPath);
  }

  // Copy admin build to main build
  fs.copySync(adminBuildPath, targetPath);

  console.log('✅ Admin dashboard copied successfully\n');
} catch (error) {
  console.error('❌ Failed to copy admin dashboard:', error);
  process.exit(1);
}

console.log('🎉 Combined build completed successfully!');
console.log('📁 Main app: build/');
console.log('📁 Admin dashboard: build/admindashboard/');
console.log('\n✨ Ready to deploy with: firebase deploy --only hosting');
