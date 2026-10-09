const fs = require('fs');

const isLocal = process.argv.includes('--local');

if (isLocal) {
  fs.copyFileSync('next.local.config.js', 'next.config.js');
  console.log('🔧 Using LOCAL Next.js config');
} else {
  fs.copyFileSync('next.studio.config.js', 'next.config.js');
  console.log('🟦 Using FIREBASE STUDIO Next.js config');
}
