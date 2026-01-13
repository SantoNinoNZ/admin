const { injectManifest } = require('workbox-build');

async function buildSW() {
  console.log('Building Service Worker...');
  try {
    const { count, size } = await injectManifest({
      swSrc: 'public/sw-template.js',
      swDest: 'public/sw.js', // Output to public for development, build will copy it to out/
      globDirectory: 'out/',
      globPatterns: [
        '**/*.{html,js,css,png,jpg,svg,json,woff2}'
      ],
      modifyURLPrefix: {
        '': '/admin/'
      }
    });
    console.log(`Service worker generated. It will precache ${count} symbols, totaling ${size} bytes.`);
  } catch (error) {
    console.error('Service worker generation failed:', error);
  }
}

buildSW();
