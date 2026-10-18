const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const apiValue = process.env.FLASK_API_URL;

if (!apiValue) {
  throw new Error('Set FLASK_API_URL to the public Render API URL before building.');
}

const apiUrl = new URL(apiValue);
if (apiUrl.protocol !== 'https:' || apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash) {
  throw new Error('FLASK_API_URL must be an HTTPS origin, such as https://your-api.onrender.com.');
}

fs.mkdirSync(output, { recursive: true });

for (const file of ['index.html', 'login.html', 'manifest.json', 'sw.js', 'goleadores.css', 'goleadores.js']) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}

fs.cpSync(path.join(root, 'imagenes'), path.join(output, 'imagenes'), { recursive: true });

const playerImages = path.join(root, 'imagenes', 'jugadores');
const playerCardFiles = fs.readdirSync(playerImages)
  .filter(file => /\.(?:png|jpe?g|webp)$/i.test(file))
  .sort();
fs.writeFileSync(
  path.join(output, 'imagenes', 'jugadores', 'cards.json'),
  JSON.stringify(playerCardFiles),
  'utf8'
);

const origin = apiUrl.origin;
fs.writeFileSync(
  path.join(output, '_redirects'),
  [
    `/api/* ${origin}/api/:splat 200`,
    `/imagenes/* ${origin}/imagenes/:splat 200`,
    '/login /login.html 200',
    ''
  ].join('\n'),
  'utf8'
);

console.log(`Built Netlify site with API proxy to ${origin}.`);
