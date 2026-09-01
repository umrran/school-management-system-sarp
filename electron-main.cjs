const path = require('path');

try {
  console.log('Electron app starting...');
  console.log('app:', typeof app);
  console.log('BrowserWindow:', typeof BrowserWindow);
  console.log('process.versions.electron:', process.versions.electron);
} catch (e) {
  console.log('Error checking globals:', e.message);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: 'SARP Educational Complex',
    backgroundColor: '#f8fafc',
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'dev' });
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

if (typeof app !== 'undefined' && app.whenReady) {
  app.whenReady().then(createWindow);
} else {
  console.log('app is not available, trying require...');
  try {
    const electron = require('electron');
    console.log('require electron result:', typeof electron);
    if (electron.app) {
      electron.app.whenReady().then(createWindow);
    }
  } catch (e) {
    console.log('require electron error:', e.message);
  }
}
