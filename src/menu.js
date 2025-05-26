const { Menu, app, shell, dialog } = require('electron');

// Create application menu
function createMenu(mainWindow) {
  const template = [
    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('create-tab');
          }
        },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            const { spawn } = require('child_process');
            spawn(process.execPath, ['.'], { detached: true });
          }
        },
        { type: 'separator' },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.webContents.send('close-current-tab');
          }
        },
        { type: 'separator' },
        {
          label: 'Print...',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow.webContents.send('print-page');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    
    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find...',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('find-in-page');
          }
        }
      ]
    },
    
    // View Menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.send('reload-page');
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.send('force-reload-page');
          }
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    
    // History Menu
    {
      label: 'History',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => {
            mainWindow.webContents.send('go-back');
          }
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => {
            mainWindow.webContents.send('go-forward');
          }
        },
        { type: 'separator' },
        {
          label: 'Show History',
          accelerator: 'Ctrl+H',
          click: () => {
            mainWindow.webContents.send('show-history');
          }
        },
        { type: 'separator' },
        {
          label: 'Clear Browsing Data...',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'warning',
              buttons: ['Cancel', 'Clear'],
              defaultId: 0,
              title: 'Clear Browsing Data',
              message: 'Do you want to clear your browsing history?',
              detail: 'This action cannot be undone.'
            }).then(result => {
              if (result.response === 1) {
                mainWindow.webContents.send('clear-history');
              }
            });
          }
        }
      ]
    },
    
    // Bookmarks Menu
    {
      label: 'Bookmarks',
      submenu: [
        {
          label: 'Bookmark This Page',
          accelerator: 'Ctrl+D',
          click: () => {
            mainWindow.webContents.send('add-bookmark');
          }
        },
        {
          label: 'Show Bookmarks',
          accelerator: 'Ctrl+B',
          click: () => {
            mainWindow.webContents.send('show-bookmarks');
          }
        }
      ]
    },
    
    // Tools Menu
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Downloads',
          accelerator: 'Ctrl+J',
          click: () => {
            mainWindow.webContents.send('show-downloads');
          }
        },
        { type: 'separator' },
        {
          label: 'Web Developer Tools',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    
    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: 'About Electron Browser',
              message: 'Electron Browser',
              detail: 'Version 1.0.0\nBuilt with Electron ' + process.versions.electron,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://electronjs.org');
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  
  return menu;
}

module.exports = { createMenu };
