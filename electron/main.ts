import { app, BrowserWindow, Menu } from 'electron'
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

let win: BrowserWindow | null

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Файл',
      submenu: [
        { role: 'quit', label: 'Вихід' }
      ]
    },
    {
      label: 'Редагування',
      submenu: [
        { role: 'undo', label: 'Скасувати' },
        { role: 'redo', label: 'Повторити' },
        { type: 'separator' },
        { role: 'cut', label: 'Вирізати' },
        { role: 'copy', label: 'Копіювати' },
        { role: 'paste', label: 'Вставити' },
        { role: 'selectAll', label: 'Виділити все' }
      ]
    },
    {
      label: 'Вигляд',
      submenu: [
        { role: 'reload', label: 'Перезавантажити' },
        { role: 'forceReload', label: 'Примусове перезавантаження' },
        { role: 'toggleDevTools', label: 'Інструменти розробника' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Скинути масштаб' },
        { role: 'zoomIn', label: 'Збільшити' },
        { role: 'zoomOut', label: 'Зменшити' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'На весь екран' }
      ]
    },
    {
      label: 'Вікно',
      submenu: [
        { role: 'minimize', label: 'Згорнути' },
        { role: 'close', label: 'Закрити' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    show: false // Don't show until maximized
  })

  win.maximize();
  win.show();

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
  createMenu()
  createWindow()
})
