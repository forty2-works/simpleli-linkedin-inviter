/**
 * This script packages the built extension (dist/) into a ZIP file
 * To run: npm run zip
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Get package version
const packageJson = require('../package.json');
const { version } = packageJson;

// Define paths
const rootDir = path.join(__dirname, '..');
const outputDir = path.join(rootDir, 'dist');
const outputFile = path.join(outputDir, `linkedin-page-inviter-v${version}.zip`);
const distDir = path.join(rootDir, 'dist');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create a file to stream archive data to
const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', {
  zlib: { level: 9 } // Highest compression level
});

// Listen for errors
archive.on('error', (err) => {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Track when the zip is finalized
output.on('close', () => {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`Extension packaged: ${outputFile}`);
  console.log(`Total size: ${sizeInMB} MB`);
});

// Make sure the dist directory exists and contains the built extension
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Please run "npm run build" first.');
  process.exit(1);
}

// Add all files from the dist directory (except the zip file itself)
fs.readdirSync(distDir).forEach(item => {
  const itemPath = path.join(distDir, item);
  const stats = fs.statSync(itemPath);
  
  // Skip the zip file if it already exists
  if (stats.isFile() && itemPath === outputFile) {
    return;
  }
  
  if (stats.isDirectory()) {
    // Add directory
    archive.directory(itemPath, item);
  } else {
    // Add file
    archive.file(itemPath, { name: item });
  }
});

// Finalize the archive
archive.finalize(); 