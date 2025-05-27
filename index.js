const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const menu = require('./src/menu');
const database = require('./src/database');
const { download } = require('electron-dl');
const TabGroupManager = require('./src/tabGroups');

// Global reference to the mainWindow object
let mainWindow;
// Global reference to the tab group manager
let tabGroupManager;

// Initialize the database
database.init();

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Security: disable Node.js integration in renderer process
      contextIsolation: true, // Security: enable context isolation
      preload: path.join(__dirname, 'preload.js'), // Use preload script
      webviewTag: true, // Enable webview tag
      webSecurity: true, // Security: enable web security
      allowRunningInsecureContent: false // Security: don't allow running insecure content
    },
    icon: path.join(__dirname, 'assets/icon.svg')
  });

  // Load the index.html of the app
  mainWindow.loadFile('index.html');

  // Initialize the tab group manager
  tabGroupManager = new TabGroupManager(mainWindow);
  
  // Create initial tab group when window finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    // Create the first tab group
    tabGroupManager.createTabGroup();
  });

  // Set up application menu
  menu.createMenu(mainWindow);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open URLs in external browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    // Dereference the window object for GC
    mainWindow = null;
    tabGroupManager = null;
  });
}

// Create window when Electron has finished initializing
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS re-create a window when dock icon is clicked with no windows open
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle file downloads
ipcMain.on('download', async (event, info) => {
  const win = BrowserWindow.getFocusedWindow();
  const options = {
    saveAs: true,
    openFolderWhenDone: true
  };
  
  try {
    await download(win, info.url, options);
    event.reply('download-success', {
      success: true,
      filename: path.basename(info.url)
    });
  } catch (error) {
    event.reply('download-error', {
      success: false,
      error: error.message
    });
  }
});

// Handle bookmark creation
ipcMain.on('add-bookmark', (event, bookmark) => {
  database.addBookmark(bookmark, (error, newBookmark) => {
    if (error) {
      event.reply('bookmark-error', { error: error.message });
    } else {
      event.reply('bookmark-added', newBookmark);
    }
  });
});

// Handle history entry addition
ipcMain.on('add-history', (event, historyItem) => {
  database.addHistory(historyItem, (error, newHistoryItem) => {
    if (error) {
      event.reply('history-error', { error: error.message });
    } else {
      event.reply('history-added', newHistoryItem);
    }
  });
});

// Get all bookmarks
ipcMain.handle('get-bookmarks', async () => {
  return await database.getBookmarks();
});

// Get browsing history
ipcMain.handle('get-history', async () => {
  return await database.getHistory();
});

// Delete bookmark
ipcMain.on('delete-bookmark', (event, id) => {
  database.deleteBookmark(id, error => {
    if (error) {
      event.reply('bookmark-delete-error', { error: error.message });
    } else {
      event.reply('bookmark-deleted', { id });
    }
  });
});

// Clear history
ipcMain.on('clear-history', event => {
  database.clearHistory(error => {
    if (error) {
      event.reply('history-clear-error', { error: error.message });
    } else {
      event.reply('history-cleared');
    }
  });
});

// ===== Tab Group IPC Handlers =====

// Create a new tab group
ipcMain.on('create-tab-group', (event, name = null) => {
  if (!tabGroupManager) return;
  const tabGroupId = tabGroupManager.createTabGroup(name);
  event.reply('tab-group-created', { 
    id: tabGroupId,
    name: name || `Group ${tabGroupManager.tabGroups.length}` 
  });
});

// Get all tab groups
ipcMain.handle('get-tab-groups', async () => {
  if (!tabGroupManager) return [];
  return tabGroupManager.getTabGroupsForRenderer();
});

// Set active tab group
ipcMain.on('set-active-tab-group', (event, tabGroupId) => {
  if (!tabGroupManager) return;
  tabGroupManager.setActiveTabGroup(tabGroupId);
});

// Close a tab group
ipcMain.on('close-tab-group', (event, tabGroupId) => {
  if (!tabGroupManager) return;
  tabGroupManager.closeTabGroup(tabGroupId);
});

// Create a new tab in the active tab group
ipcMain.on('create-tab', (event, url = null) => {
  if (!tabGroupManager) return;
  const tabId = tabGroupManager.createTab(url);
  if (tabId) {
    event.reply('tab-created', { id: tabId, url });
  }
});

// Close a tab
ipcMain.on('close-tab', (event, { tabGroupId, tabId }) => {
  if (!tabGroupManager) return;
  tabGroupManager.closeTab(tabGroupId, tabId);
});

// Get tabs for a tab group
ipcMain.handle('get-tabs', async (event, tabGroupId) => {
  if (!tabGroupManager) return [];
  return tabGroupManager.getTabsForTabGroup(tabGroupId);
});

// Navigate to URL
ipcMain.on('navigate-to', (event, url) => {
  if (!tabGroupManager) return;
  tabGroupManager.navigateTo(url);
});

// Go back in browser history
ipcMain.on('navigate-back', (event, { tabGroupId, tabId }) => {
  const tabGroup = tabGroupManager.tabGroups.find(g => g.id === tabGroupId);
  if (tabGroup) {
    tabGroup.tabManager.goBack(tabId);
  }
});

ipcMain.on('navigate-forward', (event, { tabGroupId, tabId }) => {
  const tabGroup = tabGroupManager.tabGroups.find(g => g.id === tabGroupId);
  if (tabGroup) {
    tabGroup.tabManager.goForward(tabId);
  }
});

// Refresh the current page
ipcMain.on('refresh', () => {
  if (!tabGroupManager) return;
  const tabGroup = tabGroupManager.getTabGroupById(tabGroupManager.activeTabGroupId);
  if (tabGroup) {
    tabGroup.tabManager.refresh();
  }
});