const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.join(__dirname, '../website');
const targetDir = path.join(__dirname, '../public/landing');

async function syncWebsite() {
    try {
        // Check if source directory exists
        const sourceExists = await fs.pathExists(sourceDir);

        if (!sourceExists) {
            console.log(`⚠️ Source directory ${sourceDir} does not exist. Skipping sync.`);
            console.log('✅ Using existing files in /public/landing');
            return; // Exit gracefully without error
        }

        console.log(`Syncing website from ${sourceDir} to ${targetDir}...`);

        // Ensure target directory exists
        await fs.ensureDir(targetDir);

        // Empty target directory to remove stale files
        await fs.emptyDir(targetDir);

        // Copy files
        await fs.copy(sourceDir, targetDir);

        console.log('✅ Website synced successfully!');
    } catch (err) {
        console.error('❌ Error syncing website:', err);
        process.exit(1);
    }
}

syncWebsite();
