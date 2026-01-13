const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputSvg = path.join(__dirname, '../public/santonino.svg');
const outputDir = path.join(__dirname, '../public/icons');

const icons = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  // Maskable icons (with padding)
  { size: 192, name: 'maskable-192x192.png', padding: 0.1 },
  { size: 512, name: 'maskable-512x512.png', padding: 0.1 },
  // Apple touch icons
  { size: 180, name: 'apple-touch-icon.png' },
];

async function generateIcons() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating icons...');

  for (const icon of icons) {
    let pipeline = sharp(inputSvg).resize(icon.size, icon.size);

    if (icon.padding) {
      const innerSize = Math.floor(icon.size * (1 - icon.padding * 2));
      pipeline = sharp({
        create: {
          width: icon.size,
          height: icon.size,
          channels: 4,
          background: { r: 37, g: 99, b: 235, alpha: 1 } // #2563EB
        }
      })
      .composite([{
        input: await sharp(inputSvg).resize(innerSize, innerSize).toBuffer()
      }]);
    }

    await pipeline.png().toFile(path.join(outputDir, icon.name));
    console.log(`Generated ${icon.name}`);
  }

  // Also generate favicons
  await sharp(inputSvg).resize(32, 32).png().toFile(path.join(__dirname, '../public/favicon-32x32.png'));
  await sharp(inputSvg).resize(16, 16).png().toFile(path.join(__dirname, '../public/favicon-16x16.png'));
  
  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
