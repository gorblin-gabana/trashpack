#!/usr/bin/env node

/**
 * Icon Generation Script
 *
 * This script explains how to generate PNG icons from the SVG source.
 * You'll need to install imagemagick or use an online converter.
 *
 * Using ImageMagick (install with: brew install imagemagick):
 *
 * convert icons/icon.svg -resize 16x16 icons/icon16.png
 * convert icons/icon.svg -resize 32x32 icons/icon32.png
 * convert icons/icon.svg -resize 48x48 icons/icon48.png
 * convert icons/icon.svg -resize 128x128 icons/icon128.png
 *
 * Or use online converters like:
 * - https://cloudconvert.com/svg-to-png
 * - https://convertio.co/svg-png/
 *
 * Alternative: Use Node.js with sharp:
 * npm install sharp
 *
 * Then run this script: node generate-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if sharp is available
async function generateIcons() {
  try {
    const { default: sharp } = await import('sharp');

    const iconSizes = [16, 32, 48, 128];
    const svgPath = path.join(__dirname, 'icons', 'icon.svg');

    if (fs.existsSync(svgPath)) {
      console.log('Generating PNG icons from SVG...');

      for (const size of iconSizes) {
        try {
          await sharp(svgPath)
            .resize(size, size)
            .png()
            .toFile(path.join(__dirname, 'icons', `icon${size}.png`));

          console.log(`✅ Generated icon${size}.png`);
        } catch (error) {
          console.error(`❌ Failed to generate icon${size}.png:`, error.message);
        }
      }
    } else {
      console.error('❌ SVG file not found at:', svgPath);
    }

  } catch (error) {
    console.log('📝 Sharp not installed. To generate icons automatically:');
    console.log('   npm install sharp');
    console.log('   node generate-icons.js');
    console.log('');
    console.log('Or manually convert icons/icon.svg to PNG files:');
    console.log('   - icon16.png (16x16)');
    console.log('   - icon32.png (32x32)');
    console.log('   - icon48.png (48x48)');
    console.log('   - icon128.png (128x128)');
  }
}

generateIcons();
