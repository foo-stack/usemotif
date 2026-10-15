import { app, BrowserWindow } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Electron loads the static build produced by the desktop-web Vite app. That
// build is configured with `base: './'`, so its asset URLs are relative and
// resolve over `file://` with no dev server. Tauri (a later target) loads the
// exact same build.
const INDEX_HTML = join(here, '..', 'desktop-web', 'dist', 'index.html');

function createWindow() {
  const window = new BrowserWindow({
    width: 960,
    height: 720,
    // The demo draws its own title bar (motif's TitleBar). The OS keeps its window controls, and
    // the overlay tells the page where they are so the bar can pad clear of them.
    titleBarStyle: 'hidden',
    titleBarOverlay: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  void window.loadFile(INDEX_HTML);
}

app.whenReady().then(createWindow);

// Standard desktop lifecycle: quit when every window is closed (except on
// macOS, where apps conventionally stay resident), and re-open a window when
// the app is activated with none open.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
