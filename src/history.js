const { ipcMain } = require('electron');
const database = require('./database');

class HistoryManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    
    // Initialize IPC handlers
    this.initIPCHandlers();
  }
  
  // Initialize IPC handlers for history operations
  initIPCHandlers() {
    // Add history entry
    ipcMain.on('add-history', (event, historyItem) => {
      database.addHistory(historyItem, (error, newHistoryItem) => {
        if (error) {
          event.reply('history-error', { error: error.message });
        } else {
          event.reply('history-added', newHistoryItem);
        }
      });
    });
    
    // Get browsing history
    ipcMain.handle('get-history', async () => {
      return await database.getHistory();
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
  }
  
  // Add a history entry programmatically
  addHistoryEntry(historyItem) {
    return new Promise((resolve, reject) => {
      database.addHistory(historyItem, (error, newHistoryItem) => {
        if (error) {
          reject(error);
        } else {
          // Notify renderer process
          this.mainWindow.webContents.send('history-added', newHistoryItem);
          resolve(newHistoryItem);
        }
      });
    });
  }
  
  // Get browsing history
  getHistory() {
    return database.getHistory();
  }
  
  // Clear browsing history
  clearHistory() {
    return new Promise((resolve, reject) => {
      database.clearHistory(error => {
        if (error) {
          reject(error);
        } else {
          // Notify renderer process
          this.mainWindow.webContents.send('history-cleared');
          resolve();
        }
      });
    });
  }
  
  // Get history for a specific date range
  getHistoryForDateRange(startDate, endDate) {
    return new Promise((resolve, reject) => {
      database.getHistoryForDateRange(startDate, endDate, (error, history) => {
        if (error) {
          reject(error);
        } else {
          resolve(history);
        }
      });
    });
  }
  
  // Search history
  searchHistory(query) {
    return new Promise((resolve, reject) => {
      database.searchHistory(query, (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
  }
}

module.exports = HistoryManager;
