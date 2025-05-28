// DOM Elements
const tabGroupsContainer = document.getElementById('tab-groups');
const tabsContainer = document.getElementById('tabs');
const browserViews = document.getElementById('browser-views');
const urlBar = document.getElementById('url-bar');
const backButton = document.getElementById('back-btn');
const forwardButton = document.getElementById('forward-btn');
const refreshButton = document.getElementById('refresh-btn');
const addBookmarkButton = document.getElementById('add-bookmark-btn');
const newTabButton = document.getElementById('new-tab-btn');
const newTabGroupButton = document.getElementById('new-tab-group-btn');
const bookmarksContainer = document.getElementById('bookmarks-container');
const historyContainer = document.getElementById('history-container');
const downloadContainer = document.getElementById('download-container');
const bookmarksPanel = document.getElementById('bookmarks-panel');
const historyPanel = document.getElementById('history-panel');
const downloadsPanel = document.getElementById('downloads-panel');
const toggleBookmarksBtn = document.getElementById('toggle-bookmarks-btn');
const toggleHistoryBtn = document.getElementById('toggle-history-btn');
const toggleDownloadsBtn = document.getElementById('toggle-downloads-btn');
const searchInput = document.getElementById('search-input');

// Tab and Tab Group management
let tabGroups = [];
let activeTabGroupId = null;
let activeTabId = null;

// Initialize browser
document.addEventListener('DOMContentLoaded', () => {
  // Set up event listeners
  setupEventListeners();
  
  // Register event handlers for tab groups
  window.api.onTabGroupCreated((tabGroup) => {
    console.log('Tab group created event received:', tabGroup);
    if (tabGroup && tabGroup.id) {
      // Check if this tab group already exists to prevent duplicates
      const existingTabGroup = document.querySelector(`.tab-group[data-tab-group-id="${tabGroup.id}"]`);
      if (!existingTabGroup) {
        addTabGroupToUI(tabGroup);
      } else {
        console.log('Tab group already exists, not adding duplicate:', tabGroup.id);
      }
    } else {
      console.error('Invalid tab group data received:', tabGroup);
    }
  });
  
  window.api.onTabGroupActivated((tabGroup) => {
    console.log('Tab group activated event received:', tabGroup);
    if (tabGroup && tabGroup.id) {
      setActiveTabGroup(tabGroup.id);
      loadTabsForTabGroup(tabGroup.id);
    } else {
      console.error('Invalid tab group activation data received:', tabGroup);
    }
  });
  
  window.api.onTabGroupClosed((data) => {
    console.log('Tab group closed event received:', data);
    if (data && data.id) {
      removeTabGroupFromUI(data.id);
    } else {
      console.error('Invalid tab group close data received:', data);
    }
  });
  
  // Register event handlers for tabs
  window.api.onTabCreated((tab) => {
    addTabToUI(tab);
  });
  
  // Add this to your event listeners setup
  window.api.onTabActivated((data) => {
    setActiveTab(data.id);
    // Ensure URL bar is updated with the correct URL
    const webview = document.querySelector(`webview[data-tab-id="${data.id}"]`);
    if (webview) {
      updateUrlBar(data.url || webview.getURL() || '');
    }
  });
  
  window.api.onTabClosed((data) => {
    removeTabFromUI(data.id);
  });
  
  // Load bookmarks
  loadBookmarks();
});

// Setup event listeners for browser UI
function setupEventListeners() {
  // Add webview navigation event listeners
  document.addEventListener('webview-created', (e) => {
    const webview = e.detail.webview;
    webview.addEventListener('did-navigate', (event) => {
      if (webview.dataset.tabId === activeTabId) {
        updateUrlBar(event.url);
      }
    });
    
    webview.addEventListener('did-navigate-in-page', (event) => {
      if (webview.dataset.tabId === activeTabId) {
        updateUrlBar(event.url);
      }
    });
  });

  // Navigation buttons
  backButton.addEventListener('click', () => {
    const activeTabGroup = getActiveTabGroup();
    if (activeTabGroup?.activeTabId) {
      ipcRenderer.send('navigate-back', {
        tabGroupId: activeTabGroup.id,
        tabId: activeTabGroup.activeTabId
      });
    }
  });
  
  forwardButton.addEventListener('click', () => {
    const activeTabGroup = getActiveTabGroup();
    if (activeTabGroup?.activeTabId) {
      ipcRenderer.send('navigate-forward', {
        tabGroupId: activeTabGroup.id,
        tabId: activeTabGroup.activeTabId
      });
    }
  });
  
  refreshButton.addEventListener('click', () => {
    if (activeTabId && activeTabGroupId) {
      window.api.refresh();
      
      // Update UI immediately for responsiveness
      const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
      if (webview) {
        webview.reload();
      }
    }
  });
  
  // URL bar
  urlBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      navigateToUrl(urlBar.value);
      // Remove focus from URL bar after navigation
      urlBar.blur();
    } else if (e.key === 'Escape') {
      // Reset to the current URL and lose focus when Escape is pressed
      const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
      if (webview) {
        updateUrlBar(webview.getURL());
      }
      urlBar.blur();
    }
  });
  
  // Select all text when URL bar is clicked
  urlBar.addEventListener('click', () => {
    urlBar.select();
  });
  
  // Handle URL bar focus
  urlBar.addEventListener('focus', () => {
    // Select all text when focused
    urlBar.select();
    
    // Remove styling classes temporarily while editing
    urlBar.classList.remove('secure', 'insecure');
  });
  
  // Handle URL bar blur
  urlBar.addEventListener('blur', () => {
    // If left empty, restore the current URL
    if (!urlBar.value.trim()) {
      const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
      if (webview) {
        updateUrlBar(webview.getURL());
      }
    }
  });
  
  // Handle paste events
  urlBar.addEventListener('paste', () => {
    // Give browser time to paste text before navigating
    setTimeout(() => {
      if (document.activeElement === urlBar) {
        // Don't auto-navigate on paste, just select the text
        urlBar.select();
      }
    }, 0);
  });
  
  // Add bookmark
  addBookmarkButton.addEventListener('click', () => {
    if (activeTabId) {
      const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
      if (webview) {
        const bookmark = {
          url: webview.getURL(),
          title: webview.getTitle() || webview.getURL(),
          favicon: webview.getFavicon() || ''
        };
        window.api.addBookmark(bookmark);
      }
    }
  });
  
  // New Tab Group button
  newTabGroupButton.addEventListener('click', () => {
    window.api.createTabGroup();
  });
  
  // New tab button
  newTabButton.addEventListener('click', () => {
    if (activeTabGroupId) {
      window.api.createTab('https://www.bing.com');
    } else {
      // If no tab group exists, first create one
      window.api.createTabGroup();
    }
  });
  
  // Toggle panels
  toggleBookmarksBtn.addEventListener('click', () => {
    bookmarksPanel.classList.toggle('show');
    historyPanel.classList.remove('show');
    downloadsPanel.classList.remove('show');
  });
  
  toggleHistoryBtn.addEventListener('click', () => {
    historyPanel.classList.toggle('show');
    bookmarksPanel.classList.remove('show');
    downloadsPanel.classList.remove('show');
    loadHistory();
  });
  
  toggleDownloadsBtn.addEventListener('click', () => {
    downloadsPanel.classList.toggle('show');
    bookmarksPanel.classList.remove('show');
    historyPanel.classList.remove('show');
  });
  
  // Search
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const searchTerm = searchInput.value.trim();
      if (searchTerm) {
        navigateToUrl(`https://www.bing.com/search?q=${encodeURIComponent(searchTerm)}`);
      }
    }
  });
  
  // Event listeners for download operations
  window.api.onDownloadSuccess((data) => {
    addDownloadItem(data.filename, 'Completed');
  });
  
  window.api.onDownloadError((data) => {
    addDownloadItem('Download failed', data.error);
  });
  
  // Event listeners for bookmark operations
  window.api.onBookmarkAdded((bookmark) => {
    addBookmarkToPanel(bookmark);
  });
  
  window.api.onBookmarkDeleted((data) => {
    const bookmarkElement = document.querySelector(`.bookmark-item[data-id="${data.id}"]`);
    if (bookmarkElement) {
      bookmarkElement.remove();
    }
  });
  
  // Event listeners for history operations
  window.api.onHistoryAdded((historyItem) => {
    addHistoryItemToPanel(historyItem);
  });
  
  window.api.onHistoryCleared(() => {
    historyContainer.innerHTML = '';
  });
}

// Create a new browser tab (delegated to main process)
function createTab(url = 'https://www.bing.com') {
  if (!activeTabGroupId) {
    // If no active tab group, create one first
    window.api.createTabGroup();
  } else {
    // Create a tab in the current tab group
    window.api.createTab(url);
  }
}

// Set up event listeners for a tab
function setupTabListeners(tabId, tabElement, webview) {
  // Tab click - activate tab
  tabElement.addEventListener('click', (e) => {
    if (!e.target.classList.contains('close-tab-btn')) {
      setActiveTab(tabId);
    }
  });
  
  // Close tab button
  const closeBtn = tabElement.querySelector('.close-tab-btn');
  closeBtn.addEventListener('click', () => {
    closeTab(tabId);
  });
  
  // Make sure webview has correct position and z-index
  webview.style.zIndex = '10'; // Lower than UI elements
  
  // Webview events
  webview.addEventListener('page-title-updated', (e) => {
    const title = e.title;
    tabElement.querySelector('.tab-title').textContent = title;
    
    // Update current URL if this is the active tab
    if (tabId === activeTabId) {
      updateUrlBar(webview.getURL());
    }
  });
  
  // Show loading state in URL bar
  webview.addEventListener('did-start-loading', () => {
    if (tabId === activeTabId) {
      // Add loading class to URL container
      document.querySelector('.url-container').classList.add('loading');
    }
  });
  
  webview.addEventListener('did-stop-loading', () => {
    if (tabId === activeTabId) {
      // Remove loading class from URL container
      document.querySelector('.url-container').classList.remove('loading');
    }
  });
  
  webview.addEventListener('did-navigate', () => {
    if (tabId === activeTabId) {
      updateUrlBar(webview.getURL());
      
      // Add to history
      addToHistory({
        url: webview.getURL(),
        title: webview.getTitle() || webview.getURL(),
        timestamp: new Date().getTime()
      });

      // Update navigation buttons using new API
      updateNavigationButtons();
    }
  });
  
  webview.addEventListener('did-navigate-in-page', () => {
    if (tabId === activeTabId) {
      updateUrlBar(webview.getURL());
    }
  });
  
  webview.addEventListener('page-favicon-updated', (e) => {
    // If we had a favicon UI element, we would update it here
  });
  
  // Handle new window creation
  webview.addEventListener('new-window', (e) => {
    createTab(e.url);
  });
  
  // Update button states
  webview.addEventListener('did-navigate', () => {
    updateNavigationButtons();
  });
  
  // Context menu for downloads
  webview.addEventListener('context-menu', (params) => {
    if (params.linkURL) {
      const contextMenu = document.createElement('div');
      contextMenu.className = 'context-menu';
      contextMenu.innerHTML = `
        <div class="context-menu-item" id="download-link">Download Link</div>
      `;
      document.body.appendChild(contextMenu);
      
      contextMenu.style.top = `${params.y}px`;
      contextMenu.style.left = `${params.x}px`;
      
      document.addEventListener('click', function removeMenu() {
        contextMenu.remove();
        document.removeEventListener('click', removeMenu);
      });
      
      document.getElementById('download-link').addEventListener('click', () => {
        window.api.download({ url: params.linkURL });
        contextMenu.remove();
      });
    }
  });
}

// Set active tab
function setActiveTab(tabId) {
  // Remove active class from all tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Hide all webviews
  document.querySelectorAll('.browser-view').forEach(view => {
    view.style.display = 'none';
  });
  
  // Set active tab
  const tabElement = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
  const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`);
  
  if (tabElement && webview) {
    tabElement.classList.add('active');
    webview.style.display = 'flex';
    activeTabId = tabId;
    
    // Update URL bar with the current URL from the webview
    const currentUrl = webview.getURL();
    updateUrlBar(currentUrl || '');
    
    // Check if the page is loading
    if (webview.isLoading()) {
      document.querySelector('.url-container').classList.add('loading');
    } else {
      document.querySelector('.url-container').classList.remove('loading');
    }
    
    // Update navigation buttons
    updateNavigationButtons();
    
    // Ensure the webview is visible and properly sized
    webview.style.width = '100%';
    webview.style.height = '100%';
  }
}

// Close tab
function closeTab(tabId) {
  if (!activeTabGroupId) return;
  
  const tabElement = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
  const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`);
  
  if (tabElement && webview) {
    // Call the main process to close the tab
    window.api.closeTab(activeTabGroupId, tabId);
    
    // The UI will be updated via the onTabClosed event
  }
}

// Navigate to URL
function navigateToUrl(url) {
  if (!activeTabId || !activeTabGroupId) return;
  
  // Trim whitespace
  url = url.trim();
  
  // Handle empty URL
  if (!url) return;
  
  // Process the URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // Check for localhost or IP address patterns
    if (/^(localhost|127\.0\.0\.1|\[::1\])/.test(url)) {
      url = 'http://' + url;
    }
    // Check if it's a valid domain-like input (contains at least one dot and no spaces)
    else if (url.includes('.') && !url.includes(' ')) {
      // Check for intranet addresses (like machine.local)
      if (/^[a-zA-Z0-9-]+\.(local|internal|test|dev)$/.test(url)) {
        url = 'http://' + url;
      } else {
        url = 'https://' + url;
      }
    } 
    // Check for file:// protocol without the prefix
    else if (url.startsWith('/') || /^[a-zA-Z]:\\/.test(url)) {
      url = 'file://' + url;
    }
    // Treat as a search query
    else {
      url = `https://www.bing.com/search?q=${encodeURIComponent(url)}`;
    }
  }
  
  // Update URL bar immediately with the processed URL
  updateUrlBar(url);
  
  // Show loading indicator immediately for better UX
  document.querySelector('.url-container').classList.add('loading');
  
  // Update the UI immediately for responsiveness
  const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
  if (webview) {
    webview.setAttribute('src', url);
  }
  
  // Let the main process handle the navigation (for session storage)
  window.api.navigateTo(url);
}

// Update navigation buttons state
function updateNavigationButtons() {
  const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
  if (webview) {
    backButton.disabled = !webview.canGoBack();
    forwardButton.disabled = !webview.canGoForward();
  } else {
    backButton.disabled = true;
    forwardButton.disabled = true;
  }
}

// Add to browsing history
function addToHistory(historyItem) {
  window.api.addHistory(historyItem);
}

// Load bookmarks from database
function loadBookmarks() {
  window.api.getBookmarks().then(bookmarks => {
    bookmarksContainer.innerHTML = '';
    bookmarks.forEach(bookmark => {
      addBookmarkToPanel(bookmark);
    });
  });
}

// Add bookmark to panel
function addBookmarkToPanel(bookmark) {
  const bookmarkElement = document.createElement('div');
  bookmarkElement.className = 'bookmark-item';
  bookmarkElement.setAttribute('data-id', bookmark.id);
  bookmarkElement.innerHTML = `
    <div class="bookmark-icon">
      <i class="feather icon-bookmark"></i>
    </div>
    <div class="bookmark-content">
      <span class="bookmark-title">${bookmark.title}</span>
      <span class="bookmark-url">${bookmark.url}</span>
    </div>
    <button class="bookmark-delete-btn">×</button>
  `;
  
  // Open bookmark on click
  bookmarkElement.addEventListener('click', (e) => {
    if (!e.target.classList.contains('bookmark-delete-btn')) {
      navigateToUrl(bookmark.url);
    }
  });
  
  // Delete bookmark
  bookmarkElement.querySelector('.bookmark-delete-btn').addEventListener('click', () => {
    window.api.deleteBookmark(bookmark.id);
  });
  
  bookmarksContainer.appendChild(bookmarkElement);
}

// Load history from database
function loadHistory() {
  window.api.getHistory().then(history => {
    historyContainer.innerHTML = '';
    // Sort by timestamp, most recent first
    history.sort((a, b) => b.timestamp - a.timestamp);
    history.forEach(historyItem => {
      addHistoryItemToPanel(historyItem);
    });
    
    // Add clear history button
    const clearButton = document.createElement('button');
    clearButton.className = 'clear-history-btn';
    clearButton.textContent = 'Clear History';
    clearButton.addEventListener('click', () => {
      window.api.clearHistory();
    });
    
    historyContainer.appendChild(clearButton);
  });
}

// Add history item to panel
function addHistoryItemToPanel(historyItem) {
  const historyElement = document.createElement('div');
  historyElement.className = 'history-item';
  historyElement.innerHTML = `
    <div class="history-icon">
      <i class="feather icon-clock"></i>
    </div>
    <div class="history-content">
      <span class="history-title">${historyItem.title}</span>
      <span class="history-url">${historyItem.url}</span>
      <span class="history-time">${new Date(historyItem.timestamp).toLocaleString()}</span>
    </div>
  `;
  
  // Open history item on click
  historyElement.addEventListener('click', () => {
    navigateToUrl(historyItem.url);
  });
  
  // Insert at the beginning of the container
  if (historyContainer.firstChild) {
    historyContainer.insertBefore(historyElement, historyContainer.firstChild);
  } else {
    historyContainer.appendChild(historyElement);
  }
}

// Add download item to downloads panel
function addDownloadItem(filename, status) {
  const downloadElement = document.createElement('div');
  downloadElement.className = 'download-item';
  downloadElement.innerHTML = `
    <div class="download-icon">
      <i class="feather icon-download"></i>
    </div>
    <div class="download-content">
      <span class="download-filename">${filename}</span>
      <span class="download-status">${status}</span>
    </div>
  `;
  
  downloadContainer.appendChild(downloadElement);
}

// === Tab Group Management Functions ===

// Add a tab group to the UI
function addTabGroupToUI(tabGroup) {
  if (!tabGroup || !tabGroup.id) {
    console.error('Invalid tab group data:', tabGroup);
    return;
  }
  
  // Check if this tab group already exists to prevent duplicates
  if (tabGroups.some(group => group.id === tabGroup.id)) {
    console.log('Tab group already exists:', tabGroup.id);
    return;
  }
  
  // Add to our local tab groups array
  tabGroups.push(tabGroup);
  
  // Create tab group element
  const tabGroupElement = document.createElement('div');
  tabGroupElement.className = 'tab-group';
  tabGroupElement.setAttribute('data-tab-group-id', tabGroup.id);
  tabGroupElement.innerHTML = `
    <span class="tab-group-title">${tabGroup.name || 'New Group'}</span>
    <button class="close-tab-group-btn">×</button>
  `;
  
  // Insert before the new tab group button (check if newTabGroupButton exists)
  if (newTabGroupButton && newTabGroupButton.parentNode === tabGroupsContainer) {
    tabGroupsContainer.insertBefore(tabGroupElement, newTabGroupButton);
  } else {
    tabGroupsContainer.appendChild(tabGroupElement);
  }
  
  // Set up click handler to activate this tab group
  tabGroupElement.addEventListener('click', (e) => {
    if (!e.target.classList.contains('close-tab-group-btn')) {
      window.api.setActiveTabGroup(tabGroup.id);
    }
  });
  
  // Set up close button handler
  const closeButton = tabGroupElement.querySelector('.close-tab-group-btn');
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent click from bubbling to parent
      window.api.closeTabGroup(tabGroup.id);
    });
  }
  
  // Set as active tab group
  setActiveTabGroup(tabGroup.id);
}

// Remove a tab group from the UI
function removeTabGroupFromUI(tabGroupId) {
  if (!tabGroupId) {
    console.error('No tab group ID provided for removal');
    return;
  }

  // Log for debugging
  console.log('Removing tab group:', tabGroupId);
  
  // Remove from DOM
  const tabGroupElement = document.querySelector(`.tab-group[data-tab-group-id="${tabGroupId}"]`);
  if (tabGroupElement) {
    tabGroupElement.remove();
  } else {
    console.warn('Tab group element not found in DOM:', tabGroupId);
  }
  
  // Remove from local array
  const initialLength = tabGroups.length;
  tabGroups = tabGroups.filter(group => group.id !== tabGroupId);
  
  if (tabGroups.length === initialLength) {
    console.warn('Tab group not found in local array:', tabGroupId);
  }
  
  // Clear the tabs if this was the active tab group
  if (tabGroupId === activeTabGroupId) {
    console.log('Removing active tab group, cleaning up tabs');
    
    // Clear the tabs container
    if (tabsContainer && newTabButton) {
      // Save the new tab button reference
      const newTabButtonRef = newTabButton;
      
      // Clear tabs but keep the new tab button
      while (tabsContainer.firstChild) {
        if (tabsContainer.firstChild !== newTabButtonRef) {
          tabsContainer.removeChild(tabsContainer.firstChild);
        } else {
          // If we found the new tab button, move it to the end to process other elements
          tabsContainer.appendChild(newTabButtonRef);
        }
      }
    } else {
      console.warn('tabsContainer or newTabButton is undefined');
      // Fallback method - just empty the container
      if (tabsContainer) {
        tabsContainer.innerHTML = '';
        if (newTabButton) {
          tabsContainer.appendChild(newTabButton);
        }
      }
    }
    
    // Clear the webviews
    const webviews = document.querySelectorAll('.browser-view');
    webviews.forEach(webview => webview.remove());
    
    // Reset active tab
    activeTabId = null;
    activeTabGroupId = null;
    
    // If there are other tab groups, activate the first one
    if (tabGroups.length > 0) {
      console.log('Activating next available tab group');
      window.api.setActiveTabGroup(tabGroups[0].id);
    } else {
      console.log('No more tab groups available');
      // Consider creating a new tab group automatically here
      // window.api.createTabGroup();
    }
  }
}

// Set active tab group
function setActiveTabGroup(tabGroupId) {
  // Update UI for all tab groups
  document.querySelectorAll('.tab-group').forEach(group => {
    group.classList.remove('active');
  });
  
  // Activate the new tab group
  const tabGroupElement = document.querySelector(`.tab-group[data-tab-group-id="${tabGroupId}"]`);
  if (tabGroupElement) {
    tabGroupElement.classList.add('active');
    activeTabGroupId = tabGroupId;
  }
}

// Load tabs for a specific tab group
function loadTabsForTabGroup(tabGroupId) {
  if (!tabGroupId) {
    console.error('No tab group ID provided for loading tabs');
    return;
  }

  console.log('Loading tabs for tab group:', tabGroupId);
  
  // Save a reference to the new tab button
  const newTabButtonRef = newTabButton;
  
  // Clear current tabs
  if (tabsContainer) {
    // Use a safer approach than innerHTML
    while (tabsContainer.firstChild) {
      tabsContainer.removeChild(tabsContainer.firstChild);
    }
    
    // Add back the new tab button
    if (newTabButtonRef) {
      tabsContainer.appendChild(newTabButtonRef);
    }
  } else {
    console.error('tabsContainer is not defined');
    return;
  }
  
  // Clear browser views
  const webviews = document.querySelectorAll('.browser-view');
  webviews.forEach(webview => webview.remove());
  
  // Load tabs for this tab group
  window.api.getTabs(tabGroupId)
    .then(tabs => {
      console.log('Received tabs:', tabs);
      if (Array.isArray(tabs) && tabs.length > 0) {
        tabs.forEach(tab => {
          addTabToUI(tab);
          if (tab.isActive) {
            setActiveTab(tab.id);
            updateUrlBar(tab.url);
          }
        });
      } else {
        console.log('No tabs found for this tab group, might create a default tab');
        // You might want to create a default tab here
        // window.api.createTab('https://www.google.com');
      }
    })
    .catch(err => {
      console.error('Error loading tabs:', err);
    });
}

// Add a tab to the UI
function addTabToUI(tab) {
  // Create tab button
  const tabElement = document.createElement('div');
  tabElement.className = 'tab';
  tabElement.setAttribute('data-tab-id', tab.id);
  tabElement.innerHTML = `
    <span class="tab-title">${tab.title || 'New Tab'}</span>
    <button class="close-tab-btn">×</button>
  `;
  
  // Create webview
  const webview = document.createElement('webview');
  webview.className = 'browser-view';
  webview.setAttribute('data-tab-id', tab.id);
  webview.setAttribute('src', tab.url || 'https://www.bing.com/');
  webview.setAttribute('allowpopups', 'true');
  webview.style.zIndex = '10'; // Ensure proper z-index to prevent overlapping with UI elements
  
  // Add tab to tabs container
  tabsContainer.insertBefore(tabElement, newTabButton);
  
  // Add webview to container
  browserViews.appendChild(webview);
  
  // Set up event listeners for this tab
  setupTabListeners(tab.id, tabElement, webview);
  
  // Set as active tab if specified
  if (tab.isActive) {
    setActiveTab(tab.id);
  }
}

// Remove a tab from the UI
function removeTabFromUI(tabId) {
  console.log('Removing tab from UI:', tabId);
  
  if (!tabId) {
    console.error('No tab ID provided for removal');
    return;
  }
  
  const tabElement = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
  const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`);
  
  if (tabElement) {
    console.log('Found tab element, removing');
    tabElement.remove();
  } else {
    console.warn('Tab element not found:', tabId);
  }
  
  if (webview) {
    console.log('Found webview, removing');
    webview.remove();
  } else {
    console.warn('Webview not found:', tabId);
  }
  
  // If this was the active tab, clear active tab reference
  if (tabId === activeTabId) {
    console.log('This was the active tab, resetting activeTabId');
    activeTabId = null;
    
    // Reset URL bar
    updateUrlBar('');
    
    // Remove loading state if present
    document.querySelector('.url-container').classList.remove('loading');
  }
}

// Update URL bar with given URL
function updateUrlBar(url) {
  console.log('Updating URL bar:', url);
  
  // Handle empty or null URL
  if (!url) {
    // Clear url bar and remove styling classes when no URL is provided
    urlBar.value = '';
    urlBar.classList.remove('secure', 'insecure');
    return;
  }
  
  // Only update if we're not currently editing the URL bar (has focus)
  if (document.activeElement !== urlBar) {
    // Decode URI components for better readability
    try {
      // First try to create a URL object to normalize the URL
      const urlObj = new URL(url);
      urlBar.value = urlObj.href;
      
      // Update URL bar styling based on protocol
      if (urlObj.protocol === 'https:') {
        urlBar.classList.add('secure');
        urlBar.classList.remove('insecure');
      } else if (urlObj.protocol === 'http:') {
        urlBar.classList.add('insecure');
        urlBar.classList.remove('secure');
      } else {
        urlBar.classList.remove('secure', 'insecure');
      }
    } catch (e) {
      // If URL parsing fails, just use the original URL
      console.warn('URL parsing failed:', e.message);
      urlBar.value = url;
      urlBar.classList.remove('secure', 'insecure');
    }
  } else {
    console.log('Not updating URL bar because it has focus');
  }
}

// Add these variables at the top with other DOM elements
const urlSuggestions = document.getElementById('url-suggestions');

// Add this function to handle suggestions
function showUrlSuggestions(input) {
  if (!input.trim()) {
    urlSuggestions.style.display = 'none';
    return;
  }

  // Get suggestions from different sources
  Promise.all([
    window.api.getHistory(),
    window.api.getBookmarks()
  ]).then(([history, bookmarks]) => {
    const suggestions = [];
    const query = input.toLowerCase();

    // Add history suggestions
    history.forEach(item => {
      if (item.url.toLowerCase().includes(query) || 
          item.title.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'history',
          icon: 'clock',
          text: item.title,
          url: item.url
        });
      }
    });

    // Add bookmark suggestions
    bookmarks.forEach(item => {
      if (item.url.toLowerCase().includes(query) || 
          item.title.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'bookmark',
          icon: 'bookmark',
          text: item.title,
          url: item.url
        });
      }
    });

    // Limit to 5 suggestions
    const limitedSuggestions = suggestions.slice(0, 5);

    // Show suggestions
    if (limitedSuggestions.length > 0) {
      urlSuggestions.innerHTML = limitedSuggestions.map(suggestion => `
        <div class="suggestion-item" data-url="${suggestion.url}">
          <span class="suggestion-icon">
            <i class="feather icon-${suggestion.icon}"></i>
          </span>
          <span class="suggestion-text">${suggestion.text}</span>
          <span class="suggestion-type">${suggestion.type}</span>
        </div>
      `).join('');
      urlSuggestions.style.display = 'block';
    } else {
      urlSuggestions.style.display = 'none';
    }
  });
}

// Update the URL bar event listeners
urlBar.addEventListener('input', (e) => {
  showUrlSuggestions(e.target.value);
});

urlBar.addEventListener('focus', (e) => {
  showUrlSuggestions(e.target.value);
});

urlBar.addEventListener('blur', () => {
  // Delay hiding suggestions to allow for clicks
  setTimeout(() => {
    urlSuggestions.style.display = 'none';
  }, 200);
});

// Add click handlers for suggestions
document.addEventListener('click', (e) => {
  const suggestionItem = e.target.closest('.suggestion-item');
  if (suggestionItem) {
    const url = suggestionItem.dataset.url;
    navigateToUrl(url);
    urlSuggestions.style.display = 'none';
  }
});

// Add keyboard navigation for suggestions
urlBar.addEventListener('keydown', (e) => {
  const items = urlSuggestions.querySelectorAll('.suggestion-item');
  const activeItem = urlSuggestions.querySelector('.suggestion-item.active');
  
  switch(e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (!activeItem && items.length > 0) {
        items[0].classList.add('active');
      } else if (activeItem && activeItem.nextElementSibling) {
        activeItem.classList.remove('active');
        activeItem.nextElementSibling.classList.add('active');
      }
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      if (activeItem && activeItem.previousElementSibling) {
        activeItem.classList.remove('active');
        activeItem.previousElementSibling.classList.add('active');
      }
      break;
      
    case 'Enter':
      if (activeItem) {
        e.preventDefault();
        navigateToUrl(activeItem.dataset.url);
        urlSuggestions.style.display = 'none';
      }
      break;
      
    case 'Escape':
      urlSuggestions.style.display = 'none';
      break;
  }
});
