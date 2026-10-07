/**
 * This script converts SVG icons to PNG format
 * To run: 
 * 1. Install dependencies: npm install sharp
 * 2. Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Define icon sizes
const sizes = [16, 32, 48, 128];
const svgPath = path.join(__dirname, '..', 'images', 'icon.svg');
const logoPath = path.join(__dirname, '..', 'images', 'logo.svg');
const outputDir = path.join(__dirname, '..', 'images');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read the SVG files
const svgBuffer = fs.readFileSync(svgPath);
const logoBuffer = fs.readFileSync(logoPath);

// Generate PNG icons for each size
async function generateIcons() {
  // Generate icon PNGs
  for (const size of sizes) {
    try {
      if (size === 16) {
        // For 16x16, first resize to a larger size then crop to maintain clarity
        await sharp(svgBuffer)
          .resize(22, 22)
          .extract({ left: 3, top: 3, width: 16, height: 16 })
          .composite([{
            input: Buffer.from(
              `<svg width="16" height="16" viewBox="0 0 16 16">
                <rect width="16" height="16" rx="3" fill="#C11C88"/>
              </svg>`
            ),
            blend: 'dest-in'
          }])
          .png()
          .toFile(path.join(outputDir, `icon${size}.png`));
      } else {
        await sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toFile(path.join(outputDir, `icon${size}.png`));
      }
      
      console.log(`Generated icon${size}.png`);
    } catch (error) {
      console.error(`Error generating icon${size}.png:`, error);
    }
  }

  // Generate logo PNG (maintaining original size)
  try {
    await sharp(logoBuffer)
      .png()
      .toFile(path.join(outputDir, 'logo.png'));
    
    console.log('Generated logo.png');
  } catch (error) {
    console.error('Error generating logo.png:', error);
  }
  
  // Also create a screenshot placeholder (you would replace this with an actual screenshot)
  await sharp({
    create: {
      width: 1280,
      height: 800,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    {
      input: svgBuffer,
      top: 350,
      left: 590
    }
  ])
  .png()
  .toFile(path.join(outputDir, 'screenshot.png'));
  
  console.log('Generated screenshot.png placeholder');
}

generateIcons().catch(console.error); 