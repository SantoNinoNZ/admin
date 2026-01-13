const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../public/sw.js');
const dest = path.join(__dirname, '../out/sw.js');

if (fs.existsSync(src)) {
  // Ensure out directory exists
  if (!fs.existsSync(path.dirname(dest))) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log('Successfully copied sw.js to out folder.');
} else {
  console.warn('sw.js not found in public folder. Make sure to run build-sw.js first.');
}
