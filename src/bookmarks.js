const { ipcMain } = require('electron');
const database = require('./database');

class BookmarkManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    
    // Initialize IPC handlers
    this.initIPCHandlers();
  }
  
  // Initialize IPC handlers for bookmark operations
  initIPCHandlers() {
    // Add bookmark
    ipcMain.on('add-bookmark', (event, bookmark) => {
      database.addBookmark(bookmark, (error, newBookmark) => {
        if (error) {
          event.reply('bookmark-error', { error: error.message });
        } else {
          event.reply('bookmark-added', newBookmark);
        }
      });
    });
    
    // Get all bookmarks
    ipcMain.handle('get-bookmarks', async () => {
      return await database.getBookmarks();
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
  }
  
  // Add a bookmark programmatically
  addBookmark(bookmark) {
    return new Promise((resolve, reject) => {
      database.addBookmark(bookmark, (error, newBookmark) => {
        if (error) {
          reject(error);
        } else {
          // Notify renderer process
          this.mainWindow.webContents.send('bookmark-added', newBookmark);
          resolve(newBookmark);
        }
      });
    });
  }
  
  // Get all bookmarks
  getBookmarks() {
    return database.getBookmarks();
  }
  
  // Delete a bookmark
  deleteBookmark(id) {
    return new Promise((resolve, reject) => {
      database.deleteBookmark(id, error => {
        if (error) {
          reject(error);
        } else {
          // Notify renderer process
          this.mainWindow.webContents.send('bookmark-deleted', { id });
          resolve(id);
        }
      });
    });
  }
}

module.exports = BookmarkManager;
