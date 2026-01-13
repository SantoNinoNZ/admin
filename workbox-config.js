module.exports = {
  globDirectory: 'out/',
  globPatterns: [
    '**/*.{html,js,css,png,jpg,svg,json,woff2}'
  ],
  swDest: 'out/sw.js',
  swSrc: 'public/sw-template.js',
  globIgnores: [
    '**/node_modules/**/*',
    'sw.js'
  ]
};
