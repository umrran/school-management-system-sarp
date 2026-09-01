const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const DIST = path.join(__dirname, 'dist');
const PORT = 5173;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';

  const filePath = path.join(DIST, url);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Serving SARP School from ${DIST}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgePath2 = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';

  let browser = null;
  if (fs.existsSync(chromePath)) {
    browser = chromePath;
  } else if (fs.existsSync(edgePath)) {
    browser = edgePath;
  } else if (fs.existsSync(edgePath2)) {
    browser = edgePath2;
  } else {
    browser = 'start "" "http://localhost:' + PORT + '"';
  }

  if (browser.includes('.exe')) {
    exec(`"${browser}" --app=http://localhost:${PORT} --no-first-run --disable-infobars`, (err) => {
      if (err) console.error('Failed to launch browser:', err);
    });
  } else {
    exec(browser, (err) => {
      if (err) console.error('Failed to launch browser:', err);
    });
  }
});

process.on('SIGINT', () => {
  server.close();
  process.exit();
});
