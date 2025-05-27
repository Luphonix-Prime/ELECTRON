const { BrowserView, BrowserWindow, session } = require('electron');

class TabManager {
  constructor(mainWindow, sessionInstance = null) {
    this.mainWindow = mainWindow;
    this.tabs = [];
    this.activeTabId = null;
    this.sessionInstance = sessionInstance; // Session instance for this tab manager
  }

  // Create a new tab with a browser view
  createTab(url = 'https://www.google.com') {
    const tabId = Date.now().toString();
    
    // Create browser view preferences
    const webPreferences = {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    };
    
    // If a session instance was provided, use it
    if (this.sessionInstance) {
      webPreferences.session = this.sessionInstance;
    }
    
    // Create a browser view for this tab
    const view = new BrowserView({
      webPreferences
    });
    
    // Set the bounds to fill the window (except for the navbar space)
    const bounds = this.mainWindow.getBounds();
    // Update the y-position and height calculation in createTab method
    view.setBounds({ 
      x: 0, 
      y: 120, // Updated: Tab group bar (35px) + Tab bar (35px) + Navbar (50px)
      width: bounds.width, 
      height: bounds.height - 120 // Updated to match new y-position
    });
    
    // Load the URL
    view.webContents.loadURL(url);
    
    // Add to tabs array
    this.tabs.push({ id: tabId, view, url });
    
    // Set as active tab
    this.setActiveTab(tabId);
    
    return tabId;
  }

  // Set active tab
  setActiveTab(tabId) {
    // Remove previous active tab
    if (this.activeTabId) {
      const prevTab = this.tabs.find(tab => tab.id === this.activeTabId);
      if (prevTab) {
        this.mainWindow.removeBrowserView(prevTab.view);
      }
    }
    
    // Set new active tab
    const tab = this.tabs.find(tab => tab.id === tabId);
    if (tab) {
      this.mainWindow.addBrowserView(tab.view);
      this.activeTabId = tabId;
      
      // Ensure the view is properly sized and positioned
      const bounds = this.mainWindow.getBounds();
      tab.view.setBounds({ 
        x: 0, 
        y: 120,
        width: bounds.width, 
        height: bounds.height - 120
      });
      
      // Send event to renderer to update UI
      this.mainWindow.webContents.send('tab-activated', {
        id: tabId,
        url: tab.view.webContents.getURL(),
        title: tab.view.webContents.getTitle(),
        canGoBack: tab.view.webContents.navigationHistory?.currentIndex > 0 ?? false,
        canGoForward: tab.view.webContents.navigationHistory?.currentIndex < (tab.view.webContents.navigationHistory?.entries?.length - 1) ?? false
      });
    }
  }

  // Close a tab
  closeTab(tabId) {
    const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);
    
    if (tabIndex !== -1) {
      const tab = this.tabs[tabIndex];
      
      // Remove the browser view
      this.mainWindow.removeBrowserView(tab.view);
      
      // Remove from tabs array
      this.tabs.splice(tabIndex, 1);
      
      // If this was the active tab, activate another tab
      if (tabId === this.activeTabId) {
        if (this.tabs.length > 0) {
          // Activate the next tab, or the last tab if this was the last one
          const nextTabIndex = Math.min(tabIndex, this.tabs.length - 1);
          this.setActiveTab(this.tabs[nextTabIndex].id);
        } else {
          // No tabs left, create a new one
          this.createTab();
        }
      }
      
      // Send event to renderer to update UI
      this.mainWindow.webContents.send('tab-closed', { id: tabId });
    }
  }

  // Handle window resize
  handleResize() {
    const bounds = this.mainWindow.getBounds();
    
    // Update the bounds of all tabs
    this.tabs.forEach(tab => {
      tab.view.setBounds({ 
        x: 0, 
        y: 120, // Updated to match createTab
        width: bounds.width, 
        height: bounds.height - 120 // Updated to match createTab
      });
    });
  }

  // Navigate the active tab to a URL
  navigateTo(url) {
    if (!this.activeTabId) return;
    
    const tab = this.tabs.find(tab => tab.id === this.activeTabId);
    if (tab) {
      tab.view.webContents.loadURL(url);
    }
  }

  // Navigate back in the active tab
  goBack(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab?.view?.webContents.canGoBack()) {
      tab.view.webContents.goBack();
    }
  }

  // Navigate forward in the active tab
  goForward(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab?.view?.webContents.canGoForward()) {
      tab.view.webContents.goForward();
    }
  }

  // Refresh the active tab
  refresh() {
    if (!this.activeTabId) return;
    
    const tab = this.tabs.find(tab => tab.id === this.activeTabId);
    if (tab) {
      tab.view.webContents.reload();
    }
  }
  
  // Get active tab ID
  getActiveTabId() {
    return this.activeTabId;
  }
  
  // Hide all tabs (when switching tab groups)
  hideAllTabs() {
    for (const tab of this.tabs) {
      this.mainWindow.removeBrowserView(tab.view);
    }
  }
  
  // Close all tabs (when closing a tab group)
  closeAllTabs() {
    // Create a copy of the tabs array to avoid modification during iteration
    const tabsToClose = [...this.tabs];
    for (const tab of tabsToClose) {
      this.closeTab(tab.id);
    }
  }
  
  // Get tabs for renderer
  getTabsForRenderer() {
    return this.tabs.map(tab => ({
      id: tab.id,
      url: tab.view.webContents.getURL(),
      title: tab.view.webContents.getTitle(),
      isActive: tab.id === this.activeTabId
    }));
  }
}

module.exports = TabManager;
