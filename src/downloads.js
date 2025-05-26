const { ipcMain, dialog, BrowserWindow } = require('electron');
const { download } = require('electron-dl');
const path = require('path');
const fs = require('fs');

class DownloadManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.downloads = [];
    
    // Initialize IPC handlers
    this.initIPCHandlers();
  }
  
  // Initialize IPC handlers for download operations
  initIPCHandlers() {
    // Handle file downloads
    ipcMain.on('download', async (event, info) => {
      const win = BrowserWindow.getFocusedWindow();
      const options = {
        saveAs: true,
        openFolderWhenDone: true,
        onProgress: progress => {
          // Update download progress
          event.reply('download-progress', {
            url: info.url,
            progress: progress.percent * 100
          });
        }
      };
      
      try {
        const dl = await download(win, info.url, options);
        const downloadItem = {
          id: Date.now().toString(),
          url: info.url,
          filename: path.basename(dl.getSavePath()),
          path: dl.getSavePath(),
          status: 'completed',
          size: dl.getTotalBytes(),
          timestamp: Date.now()
        };
        
        // Add to downloads array
        this.downloads.push(downloadItem);
        
        // Notify renderer process
        event.reply('download-success', downloadItem);
      } catch (error) {
        event.reply('download-error', {
          success: false,
          error: error.message
        });
      }
    });
    
    // Get all downloads
    ipcMain.handle('get-downloads', () => {
      return this.downloads;
    });
    
    // Open download location
    ipcMain.on('open-download-location', (event, downloadPath) => {
      shell.showItemInFolder(downloadPath);
    });
  }
  
  // Start a download programmatically
  startDownload(url, options = {}) {
    const win = this.mainWindow;
    const downloadOptions = {
      saveAs: options.saveAs || false,
      directory: options.directory || app.getPath('downloads'),
      onProgress: options.onProgress || (() => {}),
      ...options
    };
    
    return download(win, url, downloadOptions)
      .then(dl => {
        const downloadItem = {
          id: Date.now().toString(),
          url: url,
          filename: path.basename(dl.getSavePath()),
          path: dl.getSavePath(),
          status: 'completed',
          size: dl.getTotalBytes(),
          timestamp: Date.now()
        };
        
        // Add to downloads array
        this.downloads.push(downloadItem);
        
        // Notify renderer process
        this.mainWindow.webContents.send('download-success', downloadItem);
        
        return downloadItem;
      })
      .catch(error => {
        this.mainWindow.webContents.send('download-error', {
          success: false,
          error: error.message
        });
        throw error;
      });
  }
  
  // Get all downloads
  getDownloads() {
    return this.downloads;
  }
  
  // Clear download history
  clearDownloads() {
    this.downloads = [];
    return this.downloads;
  }
}

module.exports = DownloadManager;
