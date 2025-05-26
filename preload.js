const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Tab Group management
    createTabGroup: (name) => ipcRenderer.send('create-tab-group', name),
    getTabGroups: () => ipcRenderer.invoke('get-tab-groups'),
    setActiveTabGroup: (tabGroupId) => ipcRenderer.send('set-active-tab-group', tabGroupId),
    closeTabGroup: (tabGroupId) => ipcRenderer.send('close-tab-group', tabGroupId),
    onTabGroupCreated: (callback) => ipcRenderer.on('tab-group-created', (_, data) => callback(data)),
    onTabGroupActivated: (callback) => ipcRenderer.on('tab-group-activated', (_, data) => callback(data)),
    onTabGroupClosed: (callback) => ipcRenderer.on('tab-group-closed', (_, data) => callback(data)),
    
    // Tab management
    createTab: (url) => ipcRenderer.send('create-tab', url),
    closeTab: (tabGroupId, tabId) => ipcRenderer.send('close-tab', { tabGroupId, tabId }),
    getTabs: (tabGroupId) => ipcRenderer.invoke('get-tabs', tabGroupId),
    onTabCreated: (callback) => ipcRenderer.on('tab-created', (_, data) => callback(data)),
    onTabActivated: (callback) => ipcRenderer.on('tab-activated', (_, data) => callback(data)),
    onTabClosed: (callback) => ipcRenderer.on('tab-closed', (_, data) => callback(data)),
    
    // Navigation
    navigateTo: (url) => ipcRenderer.send('navigate-to', url),
    goBack: () => ipcRenderer.send('go-back'),
    goForward: () => ipcRenderer.send('go-forward'),
    refresh: () => ipcRenderer.send('refresh'),
    
    // Bookmarks
    addBookmark: (bookmark) => ipcRenderer.send('add-bookmark', bookmark),
    getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
    deleteBookmark: (id) => ipcRenderer.send('delete-bookmark', id),
    onBookmarkAdded: (callback) => ipcRenderer.on('bookmark-added', (_, bookmark) => callback(bookmark)),
    onBookmarkDeleted: (callback) => ipcRenderer.on('bookmark-deleted', (_, data) => callback(data)),
    
    // History
    addHistory: (historyItem) => ipcRenderer.send('add-history', historyItem),
    getHistory: () => ipcRenderer.invoke('get-history'),
    clearHistory: () => ipcRenderer.send('clear-history'),
    onHistoryAdded: (callback) => ipcRenderer.on('history-added', (_, historyItem) => callback(historyItem)),
    onHistoryCleared: (callback) => ipcRenderer.on('history-cleared', () => callback()),
    
    // Downloads
    download: (info) => ipcRenderer.send('download', info),
    onDownloadSuccess: (callback) => ipcRenderer.on('download-success', (_, data) => callback(data)),
    onDownloadError: (callback) => ipcRenderer.on('download-error', (_, data) => callback(data)),
    
    // Error handling
    onBookmarkError: (callback) => ipcRenderer.on('bookmark-error', (_, error) => callback(error)),
    onHistoryError: (callback) => ipcRenderer.on('history-error', (_, error) => callback(error))
  }
);
