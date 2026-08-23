import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../public/icon.ico');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'BizManage ERP & POS Counter',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Launch directly at Login page instead of home page
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const targetUrl = `${baseUrl}/login`;
  mainWindow.loadURL(targetUrl);

  // Prevent desktop app from ever navigating back to marketing landing page
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.pathname === '/' || parsed.pathname === '') {
        event.preventDefault();
        mainWindow?.loadURL(`${parsed.origin}/login`);
      }
    } catch (err) {
      console.error('URL parse error:', err);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});