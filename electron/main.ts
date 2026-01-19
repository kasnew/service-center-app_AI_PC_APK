import { app, BrowserWindow, Menu, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initDatabase } from './database'
import { registerIpcHandlers } from './ipcHandlers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

export let win: BrowserWindow | null

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  dialog.showErrorBox(
    'Програма вже запущена',
    'Інший екземпляр програми вже працює. Будь ласка, використовуйте вже відкрите вікно.'
  )
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}



function createWindow() {
  win = new BrowserWindow({
    title: 'Service Center Chipzone',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    show: false
  })

  win.maximize();
  win.show();

  win.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()

  // Start sync server automatically
  import('./syncServer').then(({ startSyncServer }) => {
    startSyncServer(3000).catch(err => {
      console.error('Failed to start sync server automatically:', err);
    });
  });

  // Start executor web server automatically
  import('./executorWebServer').then(({ startExecutorWebServer }) => {
    startExecutorWebServer(3001).catch(err => {
      console.error('Failed to start executor web server:', err);
    });
  });

  // Remove application menu entirely as requested (including 'Вигляд')
  Menu.setApplicationMenu(null);
  createWindow()
})
