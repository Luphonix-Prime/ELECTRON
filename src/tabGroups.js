const { BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const TabManager = require('./tabs');

class TabGroupManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.tabGroups = [];
    this.activeTabGroupId = null;
    
    // Initialize event listeners
    this.setupEvents();
  }
  
  setupEvents() {
    // Handle window resize events
    this.mainWindow.on('resize', () => {
      this.handleResize();
    });
  }
  
  // Create a new tab group with its own session
  createTabGroup(name = null) {
    const tabGroupId = Date.now().toString();
    
    // Create a unique name for this group
    const groupName = name || `Group ${this.tabGroups.length + 1}`;
    
    // Create a separate session for this tab group
    const sessionId = `tabgroup-${tabGroupId}`;
    const tabGroupSession = session.fromPartition(`persist:${sessionId}`);
    
    // Create a tab manager for this group
    const tabManager = new TabManager(this.mainWindow, tabGroupSession);
    
    // Create the initial tab for this group
    const initialTabId = tabManager.createTab('https://www.bing.com');
    
    // Add to tab groups array
    this.tabGroups.push({
      id: tabGroupId,
      name: groupName,
      tabManager: tabManager,
      sessionId: sessionId,
      session: tabGroupSession,
      activeTabId: initialTabId
    });
    
    // Set as active tab group
    this.setActiveTabGroup(tabGroupId);
    
    // Notify renderer
    this.mainWindow.webContents.send('tab-group-created', {
      id: tabGroupId,
      name: groupName
    });
    
    return tabGroupId;
  }
  
  // Set active tab group
  setActiveTabGroup(tabGroupId) {
    // Hide the current active tab group
    if (this.activeTabGroupId) {
      const currentGroup = this.getTabGroupById(this.activeTabGroupId);
      if (currentGroup) {
        // Hide all tabs from this group
        currentGroup.tabManager.hideAllTabs();
      }
    }
    
    // Set the new active tab group
    const tabGroup = this.getTabGroupById(tabGroupId);
    if (tabGroup) {
      this.activeTabGroupId = tabGroupId;
      
      // Show the active tab for this group
      if (tabGroup.activeTabId) {
        tabGroup.tabManager.setActiveTab(tabGroup.activeTabId);
      }
      
      // Notify renderer about the active tab group change
      this.mainWindow.webContents.send('tab-group-activated', {
        id: tabGroupId,
        name: tabGroup.name,
        activeTabId: tabGroup.activeTabId
      });
    }
  }
  
  // Get tab group by ID
  getTabGroupById(tabGroupId) {
    return this.tabGroups.find(group => group.id === tabGroupId);
  }
  
  // Close a tab group
  closeTabGroup(tabGroupId) {
    const groupIndex = this.tabGroups.findIndex(group => group.id === tabGroupId);
    
    if (groupIndex !== -1) {
      const group = this.tabGroups[groupIndex];
      
      // Close all tabs in this group
      group.tabManager.closeAllTabs();
      
      // Remove from tab groups array
      this.tabGroups.splice(groupIndex, 1);
      
      // If this was the active tab group, activate another tab group
      if (tabGroupId === this.activeTabGroupId) {
        if (this.tabGroups.length > 0) {
          // Activate the next group, or the last group if this was the last one
          const nextGroupIndex = Math.min(groupIndex, this.tabGroups.length - 1);
          this.setActiveTabGroup(this.tabGroups[nextGroupIndex].id);
        } else {
          // No tab groups left, create a new one
          this.createTabGroup();
        }
      }
      
      // Notify renderer
      this.mainWindow.webContents.send('tab-group-closed', { id: tabGroupId });
    }
  }
  
  // Handle window resize
  handleResize() {
    // Update the active tab group's tab manager
    if (this.activeTabGroupId) {
      const tabGroup = this.getTabGroupById(this.activeTabGroupId);
      if (tabGroup) {
        tabGroup.tabManager.handleResize();
      }
    }
  }
  
  // Create a new tab in the active tab group
  createTab(url) {
    if (!this.activeTabGroupId) {
      // No active tab group, create one
      this.createTabGroup();
    }
    
    const tabGroup = this.getTabGroupById(this.activeTabGroupId);
    if (tabGroup) {
      const tabId = tabGroup.tabManager.createTab(url);
      tabGroup.activeTabId = tabId;
      return tabId;
    }
    
    return null;
  }
  
  // Close a tab in a specific tab group
  closeTab(tabGroupId, tabId) {
    const tabGroup = this.getTabGroupById(tabGroupId);
    if (tabGroup) {
      tabGroup.tabManager.closeTab(tabId);
      
      // Update the active tab ID for this group
      const activeTabId = tabGroup.tabManager.getActiveTabId();
      if (activeTabId) {
        tabGroup.activeTabId = activeTabId;
      }
    }
  }
  
  // Navigate the active tab in the active tab group
  navigateTo(url) {
    if (!this.activeTabGroupId) return;
    
    const tabGroup = this.getTabGroupById(this.activeTabGroupId);
    if (tabGroup) {
      tabGroup.tabManager.navigateTo(url);
    }
  }
  
  // Get all tab groups for the renderer
  getTabGroupsForRenderer() {
    return this.tabGroups.map(group => ({
      id: group.id,
      name: group.name,
      isActive: group.id === this.activeTabGroupId
    }));
  }
  
  // Get tabs for a specific tab group
  getTabsForTabGroup(tabGroupId) {
    const tabGroup = this.getTabGroupById(tabGroupId);
    if (tabGroup) {
      return tabGroup.tabManager.getTabsForRenderer();
    }
    return [];
  }
}

module.exports = TabGroupManager;