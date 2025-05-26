// Browser UI functionality
class BrowserUI {
    constructor() {
        this.tabs = [];
        this.tabGroups = [];
        this.activeTabId = null;
        this.tabCounter = 1;
        this.groupCounter = 1;
        this.bookmarksVisible = true;
        this.settingsVisible = false;
        this.draggedTab = null;
        this.groupColors = ['blue', 'red', 'green', 'yellow', 'purple', 'pink', 'orange', 'gray'];
        this.groupTimeouts = new Map(); // Store group timeout IDs
        this.groupTimers = new Map(); // Store group timer intervals
        this.GROUP_TIMEOUT_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
        this.WARNING_TIME = 30 * 1000; // 30 seconds warning before closing
        this.disposableMode = true; // Enable disposable browser mode
        
        this.init();
        this.loadSettings();
    }

    init() {
        this.bindEvents();
        this.createInitialTab();
    }

    bindEvents() {
        // Tab management
        document.querySelector('.new-tab-btn').addEventListener('click', () => this.createNewTab());
        document.querySelector('.new-tab-group-btn').addEventListener('click', () => this.createNewTabGroupWithTab());
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-close')) {
                e.stopPropagation();
                const tabElement = this.findClosest(e.target, '.tab');
                if (tabElement) {
                    const tabId = tabElement.dataset.tabId;
                    this.closeTab(tabId);
                }
            } else if (this.findClosest(e.target, '.tab-group-header')) {
                const groupElement = this.findClosest(e.target, '.tab-group');
                if (groupElement && e.target.classList.contains('tab-group-toggle')) {
                    e.stopPropagation();
                    this.toggleTabGroup(groupElement.dataset.groupId);
                } else if (e.button === 2) { // Right click
                    e.preventDefault();
                    this.showTabGroupMenu(groupElement, e);
                }
            } else {
                const tabElement = this.findClosest(e.target, '.tab');
                if (tabElement) {
                    const tabId = tabElement.dataset.tabId;
                    this.switchToTab(tabId);
                }
            }
        });

        // Tab group context menu
        document.addEventListener('contextmenu', (e) => {
            const tabElement = this.findClosest(e.target, '.tab');
            const groupElement = this.findClosest(e.target, '.tab-group');
            
            if (tabElement) {
                e.preventDefault();
                this.showTabContextMenu(tabElement, e);
            } else if (groupElement) {
                e.preventDefault();
                this.showTabGroupMenu(groupElement, e);
            }
        });

        // Navigation buttons
        document.querySelector('.nav-btn.back').addEventListener('click', () => this.goBack());
        document.querySelector('.nav-btn.forward').addEventListener('click', () => this.goForward());
        document.querySelector('.nav-btn.refresh').addEventListener('click', () => this.refresh());
        document.querySelector('.nav-btn.home').addEventListener('click', () => this.goHome());

        // Address bar
        const addressInput = document.querySelector('.address-input');
        addressInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.navigate(addressInput.value);
            }
        });
        addressInput.addEventListener('focus', () => {
            addressInput.select();
        });

        // Bookmark management
        document.querySelector('.bookmark-btn').addEventListener('click', () => this.toggleBookmark());
        document.querySelector('.bookmark-toggle').addEventListener('click', () => this.toggleBookmarkBar());

        // Settings
        document.querySelector('.menu-btn.settings').addEventListener('click', () => this.toggleSettings());
        document.querySelector('.close-settings').addEventListener('click', () => this.closeSettings());

        // Theme switching
        document.getElementById('theme-select').addEventListener('change', (e) => {
            this.changeTheme(e.target.value);
        });

        // Window controls
        document.querySelector('.control-btn.minimize').addEventListener('click', () => this.minimizeWindow());
        document.querySelector('.control-btn.maximize').addEventListener('click', () => this.maximizeWindow());
        document.querySelector('.control-btn.close').addEventListener('click', () => this.closeWindow());

        // Tab hover preview
        document.addEventListener('mouseenter', (e) => {
            const tabElement = this.findClosest(e.target, '.tab');
            if (tabElement && !tabElement.classList.contains('active')) {
                this.showTabPreview(tabElement);
            }
        }, true);

        document.addEventListener('mouseleave', (e) => {
            const tabElement = this.findClosest(e.target, '.tab');
            if (tabElement) {
                this.hideTabPreview();
            }
        }, true);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 't':
                        e.preventDefault();
                        this.createNewTab();
                        break;
                    case 'w':
                        e.preventDefault();
                        if (this.activeTabId) {
                            this.closeTab(this.activeTabId);
                        }
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refresh();
                        break;
                    case 'l':
                        e.preventDefault();
                        document.querySelector('.address-input').focus();
                        break;
                }
            }
        });

        // Settings panel outside click
        document.addEventListener('click', (e) => {
            const settingsPanel = this.findClosest(e.target, '.settings-panel');
            const settingsBtn = this.findClosest(e.target, '.menu-btn.settings');
            if (this.settingsVisible && !settingsPanel && !settingsBtn) {
                this.closeSettings();
            }
        });

        // Quick action buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('new-session') || this.findClosest(e.target, '.new-session')) {
                this.startNewDisposableSession();
            } else if (e.target.classList.contains('private-mode') || this.findClosest(e.target, '.private-mode')) {
                this.togglePrivateMode();
            }
        });
    }

    // Disposable Browser Functions
    startNewDisposableSession() {
        // Clear all existing groups and tabs
        this.tabGroups.forEach(group => this.clearGroupTimer(group.id));
        this.tabs = [];
        this.tabGroups = [];
        this.activeTabId = null;
        
        // Create new disposable session
        const sessionGroup = this.createNewTabGroup('Disposable Session', 'blue');
        this.createNewTab('New Tab', '', sessionGroup.id);
        
        this.showNotification('New disposable session started - Auto-cleanup in 10 minutes');
    }

    togglePrivateMode() {
        this.disposableMode = !this.disposableMode;
        
        if (this.disposableMode) {
            this.showNotification('Private mode enabled - No data will be saved');
            document.documentElement.setAttribute('data-private', 'true');
        } else {
            this.showNotification('Private mode disabled');
            document.documentElement.removeAttribute('data-private');
        }
    }

    // Helper function to replace closest() for better browser compatibility
    findClosest(element, selector) {
        while (element && element.nodeType === 1) {
            if (element.matches && element.matches(selector)) {
                return element;
            }
            element = element.parentElement;
        }
        return null;
    }

    createInitialTab() {
        // Create default tab group
        const defaultGroup = this.createNewTabGroup('Work', 'blue');
        this.createNewTab('New Tab', 'https://www.example.com', defaultGroup.id);
    }

    // Tab Group Management
    createNewTabGroup(name = null, color = null) {
        const groupId = ++this.groupCounter;
        const groupName = name || `Group ${groupId}`;
        const groupColor = color || this.groupColors[Math.floor(Math.random() * this.groupColors.length)];
        
        const group = {
            id: groupId,
            name: groupName,
            color: groupColor,
            collapsed: false,
            tabIds: [],
            createdAt: Date.now(),
            timeRemaining: this.GROUP_TIMEOUT_DURATION
        };

        this.tabGroups.push(group);
        this.startGroupTimer(groupId);
        this.renderTabGroups();
        return group;
    }

    createNewTabGroupWithTab(groupName = null, tabTitle = 'New Tab', tabUrl = '') {
        // Create new tab group
        const newGroup = this.createNewTabGroup(groupName);
        
        // Add a new tab to this group
        this.createNewTab(tabTitle, tabUrl, newGroup.id);
        
        this.showNotification(`New tab group "${newGroup.name}" created with tab`);
        return newGroup;
    }

    startGroupTimer(groupId) {
        const group = this.tabGroups.find(g => g.id === groupId);
        if (!group) return;

        // Clear existing timers for this group
        this.clearGroupTimer(groupId);

        // Start countdown timer (updates every second)
        const timerInterval = setInterval(() => {
            group.timeRemaining -= 1000;
            this.updateGroupTimer(groupId);

            // Show warning at 30 seconds
            if (group.timeRemaining === this.WARNING_TIME) {
                this.showGroupTimeoutWarning(groupId);
            }

            // Close group when time runs out
            if (group.timeRemaining <= 0) {
                this.closeGroupDueToTimeout(groupId);
            }
        }, 1000);

        this.groupTimers.set(groupId, timerInterval);
    }

    clearGroupTimer(groupId) {
        if (this.groupTimers.has(groupId)) {
            clearInterval(this.groupTimers.get(groupId));
            this.groupTimers.delete(groupId);
        }
        if (this.groupTimeouts.has(groupId)) {
            clearTimeout(this.groupTimeouts.get(groupId));
            this.groupTimeouts.delete(groupId);
        }
    }

    updateGroupTimer(groupId) {
        const group = this.tabGroups.find(g => g.id === groupId);
        if (!group) return;

        const groupElement = document.querySelector(`[data-group-id="${groupId}"]`);
        if (groupElement) {
            const timerElement = groupElement.querySelector('.group-timer');
            if (timerElement) {
                const minutes = Math.floor(group.timeRemaining / 60000);
                const seconds = Math.floor((group.timeRemaining % 60000) / 1000);
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                // Change color based on remaining time
                if (group.timeRemaining <= this.WARNING_TIME) {
                    timerElement.style.color = '#ef4444'; // Red
                    timerElement.style.fontWeight = 'bold';
                } else if (group.timeRemaining <= 2 * 60 * 1000) { // 2 minutes
                    timerElement.style.color = '#f59e0b'; // Orange
                } else {
                    timerElement.style.color = 'hsl(var(--text-secondary))';
                    timerElement.style.fontWeight = 'normal';
                }
            }
        }
    }

    showGroupTimeoutWarning(groupId) {
        const group = this.tabGroups.find(g => g.id === groupId);
        if (!group) return;

        const warningNotification = document.createElement('div');
        warningNotification.className = 'timeout-warning-notification';
        warningNotification.innerHTML = `
            <div class="warning-content">
                <div class="warning-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="color: #f59e0b;">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <span>Tab Group Closing Soon</span>
                </div>
                <p>Group "${group.name}" will close in 30 seconds</p>
                <div class="warning-actions">
                    <button class="extend-btn" data-group-id="${groupId}">Extend Time</button>
                    <button class="close-now-btn" data-group-id="${groupId}">Close Now</button>
                </div>
            </div>
        `;

        warningNotification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: hsl(var(--surface));
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px hsla(var(--shadow) / 0.2);
            z-index: 10000;
            max-width: 300px;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(warningNotification);

        // Handle button clicks
        warningNotification.addEventListener('click', (e) => {
            if (e.target.classList.contains('extend-btn')) {
                this.extendGroupTime(groupId);
                warningNotification.remove();
            } else if (e.target.classList.contains('close-now-btn')) {
                this.closeGroupDueToTimeout(groupId);
                warningNotification.remove();
            }
        });

        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (warningNotification.parentNode) {
                warningNotification.remove();
            }
        }, 30000);
    }

    extendGroupTime(groupId) {
        const group = this.tabGroups.find(g => g.id === groupId);
        if (group) {
            group.timeRemaining = this.GROUP_TIMEOUT_DURATION; // Reset to 10 minutes
            this.updateGroupTimer(groupId);
            this.showNotification(`Extended "${group.name}" group time by 10 minutes`);
        }
    }

    closeGroupDueToTimeout(groupId) {
        const group = this.tabGroups.find(g => g.id === groupId);
        if (group) {
            this.showNotification(`Group "${group.name}" closed automatically after 10 minutes`);
            
            // Close all tabs in the group
            group.tabIds.forEach(tabId => this.closeTab(tabId));
            
            // Remove the group
            this.deleteTabGroup(groupId);
            this.clearGroupTimer(groupId);
        }
    }

    resetGroupTimer(groupId) {
        const group = this.tabGroups.find(g => g.id === groupId);
        if (group) {
            group.timeRemaining = this.GROUP_TIMEOUT_DURATION;
            this.startGroupTimer(groupId);
        }
    }

    addTabToGroup(tabId, groupId) {
        const group = this.tabGroups.find(g => g.id === groupId);
        const tab = this.tabs.find(t => t.id === tabId);
        
        if (group && tab) {
            // Remove tab from previous group
            this.tabGroups.forEach(g => {
                g.tabIds = g.tabIds.filter(id => id !== tabId);
            });
            
            group.tabIds.push(tabId);
            tab.groupId = groupId;
            this.renderTabGroups();
        }
    }

    removeTabFromGroup(tabId) {
        this.tabGroups.forEach(group => {
            group.tabIds = group.tabIds.filter(id => id !== tabId);
        });
        
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab) {
            delete tab.groupId;
        }
        
        this.renderTabGroups();
    }

    toggleTabGroup(groupId) {
        const group = this.tabGroups.find(g => g.id === parseInt(groupId));
        if (group) {
            group.collapsed = !group.collapsed;
            this.renderTabGroups();
        }
    }

    deleteTabGroup(groupId) {
        const group = this.tabGroups.find(g => g.id === parseInt(groupId));
        if (group) {
            // Clear timers for this group
            this.clearGroupTimer(groupId);
            
            // Move tabs out of group
            group.tabIds.forEach(tabId => {
                const tab = this.tabs.find(t => t.id === tabId);
                if (tab) {
                    delete tab.groupId;
                }
            });
            
            this.tabGroups = this.tabGroups.filter(g => g.id !== parseInt(groupId));
            this.renderTabGroups();
        }
    }

    renameTabGroup(groupId, newName) {
        const group = this.tabGroups.find(g => g.id === parseInt(groupId));
        if (group) {
            group.name = newName;
            this.renderTabGroups();
        }
    }

    changeTabGroupColor(groupId, newColor) {
        const group = this.tabGroups.find(g => g.id === parseInt(groupId));
        if (group) {
            group.color = newColor;
            this.renderTabGroups();
        }
    }

    createNewTab(title = 'New Tab', url = '', groupId = null) {
        const tabId = ++this.tabCounter;
        const tab = {
            id: tabId,
            title: title,
            url: url,
            favicon: '🌐',
            canGoBack: false,
            canGoForward: false,
            isBookmarked: false,
            groupId: groupId
        };

        this.tabs.push(tab);
        
        // Add to group if specified or create new group if no group and not ungrouped
        if (groupId) {
            const group = this.tabGroups.find(g => g.id === groupId);
            if (group) {
                group.tabIds.push(tabId);
            }
        } else if (this.tabGroups.length === 0) {
            // If no groups exist, create first group automatically
            const newGroup = this.createNewTabGroup('Session 1');
            newGroup.tabIds.push(tabId);
            tab.groupId = newGroup.id;
        }
        
        this.renderTabGroups();
        this.switchToTab(tabId);
        
        // Focus address bar for new empty tabs
        if (!url) {
            setTimeout(() => {
                document.querySelector('.address-input').focus();
            }, 100);
        }
    }

    renderTabGroups() {
        const tabsContainer = document.querySelector('.tabs-container');
        tabsContainer.innerHTML = '';

        // Render grouped tabs
        this.tabGroups.forEach(group => {
            if (group.tabIds.length > 0) {
                const groupElement = this.createTabGroupElement(group);
                tabsContainer.appendChild(groupElement);
            }
        });

        // Render ungrouped tabs
        const ungroupedTabs = this.tabs.filter(tab => !tab.groupId);
        ungroupedTabs.forEach(tab => {
            const tabElement = this.createTabElement(tab);
            tabsContainer.appendChild(tabElement);
        });
    }

    createTabGroupElement(group) {
        const groupElement = document.createElement('div');
        groupElement.className = `tab-group ${group.collapsed ? 'collapsed' : ''}`;
        groupElement.dataset.groupId = group.id;

        const groupTabs = this.tabs.filter(tab => group.tabIds.includes(tab.id));
        const minutes = Math.floor(group.timeRemaining / 60000);
        const seconds = Math.floor((group.timeRemaining % 60000) / 1000);
        
        groupElement.innerHTML = `
            <div class="tab-group-header">
                <div class="tab-group-color color-option ${group.color}"></div>
                <span class="tab-group-title">${group.name}</span>
                <span class="tab-group-count">${groupTabs.length}</span>
                <span class="group-timer">${minutes}:${seconds.toString().padStart(2, '0')}</span>
                <button class="tab-group-toggle ${group.collapsed ? 'collapsed' : ''}" aria-label="Toggle group">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                    </svg>
                </button>
            </div>
            <div class="tab-group-tabs">
                ${groupTabs.map(tab => this.createTabHTML(tab)).join('')}
            </div>
        `;

        return groupElement;
    }

    createTabElement(tab) {
        const tabElement = document.createElement('div');
        tabElement.className = `tab ${this.activeTabId === tab.id ? 'active' : ''}`;
        tabElement.dataset.tabId = tab.id;
        tabElement.innerHTML = this.createTabHTML(tab);
        return tabElement;
    }

    createTabHTML(tab) {
        return `
            <div class="tab-content">
                <div class="tab-favicon">${tab.favicon}</div>
                <span class="tab-title">${tab.title}</span>
                <button class="tab-close" aria-label="Close tab">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `;
    }

    showTabContextMenu(tabElement, event) {
        const tabId = parseInt(tabElement.dataset.tabId);
        const tab = this.tabs.find(t => t.id === tabId);
        
        // Remove existing menus
        document.querySelectorAll('.tab-context-menu').forEach(menu => menu.remove());
        
        const menu = document.createElement('div');
        menu.className = 'tab-group-menu tab-context-menu';
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;
        menu.style.position = 'fixed';
        
        menu.innerHTML = `
            <div class="tab-group-menu-item" data-action="add-to-new-group">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Add to new group
            </div>
            <div class="tab-group-menu-item" data-action="remove-from-group">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
                Remove from group
            </div>
            <div class="tab-group-menu-item" data-action="duplicate-tab">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                Duplicate tab
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Handle menu clicks
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.tab-group-menu-item')?.dataset.action;
            if (action) {
                switch (action) {
                    case 'add-to-new-group':
                        const newGroup = this.createNewTabGroup();
                        this.addTabToGroup(tabId, newGroup.id);
                        break;
                    case 'remove-from-group':
                        this.removeTabFromGroup(tabId);
                        break;
                    case 'duplicate-tab':
                        this.createNewTab(tab.title, tab.url, tab.groupId);
                        break;
                }
            }
            menu.remove();
        });
        
        // Close menu on outside click
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }

    showTabGroupMenu(groupElement, event) {
        const groupId = parseInt(groupElement.dataset.groupId);
        const group = this.tabGroups.find(g => g.id === groupId);
        
        // Remove existing menus
        document.querySelectorAll('.tab-group-menu').forEach(menu => menu.remove());
        
        const menu = document.createElement('div');
        menu.className = 'tab-group-menu';
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;
        menu.style.position = 'fixed';
        
        menu.innerHTML = `
            <div class="tab-group-menu-item" data-action="rename">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
                Rename group
            </div>
            <div class="tab-group-menu-item" data-action="new-tab">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Add new tab
            </div>
            <div class="tab-group-menu-item" data-action="close-group">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
                Close group
            </div>
            <div class="tab-group-colors">
                ${this.groupColors.map(color => 
                    `<div class="color-option ${color} ${group.color === color ? 'selected' : ''}" data-color="${color}"></div>`
                ).join('')}
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Handle menu clicks
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.tab-group-menu-item')?.dataset.action;
            const color = e.target.dataset.color;
            
            if (action) {
                switch (action) {
                    case 'rename':
                        const newName = prompt('Enter new group name:', group.name);
                        if (newName && newName.trim()) {
                            this.renameTabGroup(groupId, newName.trim());
                        }
                        break;
                    case 'new-tab':
                        this.createNewTab('New Tab', '', groupId);
                        break;
                    case 'close-group':
                        if (confirm(`Close all tabs in "${group.name}" group?`)) {
                            group.tabIds.forEach(tabId => this.closeTab(tabId));
                            this.deleteTabGroup(groupId);
                        }
                        break;
                }
            } else if (color) {
                this.changeTabGroupColor(groupId, color);
            }
            
            menu.remove();
        });
        
        // Close menu on outside click
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }



    switchToTab(tabId) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Add active class to selected tab
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            tabElement.classList.add('active');
            this.activeTabId = parseInt(tabId);
            
            // Update UI with tab data
            const tab = this.tabs.find(t => t.id === parseInt(tabId));
            if (tab) {
                this.updateUIForTab(tab);
            }
        }
    }

    closeTab(tabId) {
        const tabIndex = this.tabs.findIndex(t => t.id === parseInt(tabId));
        if (tabIndex === -1) return;

        // Remove tab from array
        this.tabs.splice(tabIndex, 1);

        // Remove tab element
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            tabElement.remove();
        }

        // If this was the active tab, switch to another tab
        if (this.activeTabId === parseInt(tabId)) {
            if (this.tabs.length > 0) {
                // Switch to the tab that was to the right, or to the left if none to the right
                const newActiveTab = this.tabs[Math.min(tabIndex, this.tabs.length - 1)];
                this.switchToTab(newActiveTab.id);
            } else {
                // No tabs left, create a new one
                this.createNewTab();
            }
        }
    }

    updateUIForTab(tab) {
        // Update address bar
        document.querySelector('.address-input').value = tab.url;
        
        // Update navigation buttons
        document.querySelector('.nav-btn.back').disabled = !tab.canGoBack;
        document.querySelector('.nav-btn.forward').disabled = !tab.canGoForward;
        
        // Update bookmark button
        const bookmarkBtn = document.querySelector('.bookmark-btn');
        if (tab.isBookmarked) {
            bookmarkBtn.style.color = 'hsl(var(--accent))';
        } else {
            bookmarkBtn.style.color = '';
        }
        
        // Update page title
        document.title = tab.title;
    }

    navigate(url) {
        if (!this.activeTabId) return;

        // Simple URL validation and formatting
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (url.includes('.') && !url.includes(' ')) {
                url = 'https://' + url;
            } else {
                // Treat as search query
                url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
            }
        }

        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (tab) {
            tab.url = url;
            tab.canGoBack = true;
            tab.title = this.extractDomainFromUrl(url);
            
            // Update tab title in UI
            const tabElement = document.querySelector(`[data-tab-id="${this.activeTabId}"] .tab-title`);
            if (tabElement) {
                tabElement.textContent = tab.title;
            }
            
            this.updateUIForTab(tab);
            this.simulatePageLoad();
        }
    }

    extractDomainFromUrl(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.startsWith('www.') ? domain.substring(4) : domain;
        } catch {
            return 'New Tab';
        }
    }

    simulatePageLoad() {
        // Add a loading indicator simulation
        const addressInput = document.querySelector('.address-input');
        const originalValue = addressInput.value;
        
        addressInput.style.opacity = '0.6';
        
        setTimeout(() => {
            addressInput.style.opacity = '1';
            // Update security indicator based on URL
            const securityIndicator = document.querySelector('.security-indicator');
            if (originalValue.startsWith('https://')) {
                securityIndicator.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                `;
                securityIndicator.style.color = 'green';
            } else {
                securityIndicator.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                    </svg>
                `;
                securityIndicator.style.color = '';
            }
        }, 500);
    }

    goBack() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (tab && tab.canGoBack) {
            // Simulate going back
            tab.canGoForward = true;
            this.updateUIForTab(tab);
        }
    }

    goForward() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (tab && tab.canGoForward) {
            // Simulate going forward
            tab.canGoForward = false;
            this.updateUIForTab(tab);
        }
    }

    refresh() {
        this.simulatePageLoad();
    }

    goHome() {
        this.navigate('https://www.opera.com');
    }

    toggleBookmark() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (tab) {
            tab.isBookmarked = !tab.isBookmarked;
            this.updateUIForTab(tab);
            
            if (tab.isBookmarked) {
                this.showNotification('Bookmark added');
            } else {
                this.showNotification('Bookmark removed');
            }
        }
    }

    toggleBookmarkBar() {
        this.bookmarksVisible = !this.bookmarksVisible;
        const bookmarkBar = document.querySelector('.bookmark-bar');
        const toggleBtn = document.querySelector('.bookmark-toggle');
        
        if (this.bookmarksVisible) {
            bookmarkBar.style.display = 'flex';
            toggleBtn.style.transform = 'rotate(0deg)';
        } else {
            bookmarkBar.style.display = 'none';
            toggleBtn.style.transform = 'rotate(180deg)';
        }
        
        this.saveSettings();
    }

    toggleSettings() {
        this.settingsVisible = !this.settingsVisible;
        const settingsPanel = document.querySelector('.settings-panel');
        
        if (this.settingsVisible) {
            settingsPanel.classList.remove('hidden');
        } else {
            settingsPanel.classList.add('hidden');
        }
    }

    closeSettings() {
        this.settingsVisible = false;
        document.querySelector('.settings-panel').classList.add('hidden');
    }

    changeTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (theme === 'light') {
            document.documentElement.removeAttribute('data-theme');
        } else if (theme === 'auto') {
            // Auto theme based on system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
        
        this.saveSettings();
    }

    showTabPreview(tabElement) {
        const tabId = parseInt(tabElement.dataset.tabId);
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;

        const preview = document.querySelector('.tab-preview');
        const previewTitle = preview.querySelector('.preview-title');
        const previewUrl = preview.querySelector('.preview-url');
        
        previewTitle.textContent = tab.title;
        previewUrl.textContent = tab.url;
        
        // Position preview above the tab
        const tabRect = tabElement.getBoundingClientRect();
        preview.style.left = `${tabRect.left}px`;
        preview.style.top = `${tabRect.top - 10}px`;
        
        preview.classList.remove('hidden');
    }

    hideTabPreview() {
        document.querySelector('.tab-preview').classList.add('hidden');
    }

    minimizeWindow() {
        this.showNotification('Window minimized');
    }

    maximizeWindow() {
        this.showNotification('Window maximized');
    }

    closeWindow() {
        if (confirm('Are you sure you want to close the browser?')) {
            this.showNotification('Browser closed');
        }
    }

    showNotification(message) {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: hsl(var(--surface));
            color: hsl(var(--text-primary));
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid hsl(var(--border));
            box-shadow: 0 4px 12px hsla(var(--shadow) / 0.15);
            z-index: 10000;
            font-size: 14px;
            animation: slideIn 0.3s ease;
        `;
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 2000);
    }

    saveSettings() {
        const settings = {
            theme: document.getElementById('theme-select').value,
            bookmarksVisible: this.bookmarksVisible,
            adBlockEnabled: document.getElementById('block-ads').checked,
            vpnEnabled: document.getElementById('vpn-enabled').checked
        };
        
        localStorage.setItem('browserSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('browserSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // Apply theme
            document.getElementById('theme-select').value = settings.theme || 'light';
            this.changeTheme(settings.theme || 'light');
            
            // Apply bookmark bar visibility
            if (settings.bookmarksVisible !== undefined) {
                this.bookmarksVisible = settings.bookmarksVisible;
                if (!this.bookmarksVisible) {
                    this.toggleBookmarkBar();
                }
            }
            
            // Apply other settings
            if (settings.adBlockEnabled !== undefined) {
                document.getElementById('block-ads').checked = settings.adBlockEnabled;
            }
            
            if (settings.vpnEnabled !== undefined) {
                document.getElementById('vpn-enabled').checked = settings.vpnEnabled;
            }
        }
    }
}

// Initialize browser UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BrowserUI();
});

// Handle system theme changes for auto theme
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect.value === 'auto') {
        if (e.matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }
});

// Handle window resize for responsive behavior
window.addEventListener('resize', () => {
    // Hide tab preview on resize
    document.querySelector('.tab-preview').classList.add('hidden');
});

// Add context menu for tabs (right-click functionality)
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.tab')) {
        e.preventDefault();
        
        const tabElement = e.target.closest('.tab');
        const tabId = parseInt(tabElement.dataset.tabId);
        
        // Create simple context menu
        const contextMenu = document.createElement('div');
        contextMenu.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            background: hsl(var(--surface));
            border: 1px solid hsl(var(--border));
            border-radius: 6px;
            padding: 8px 0;
            box-shadow: 0 4px 12px hsla(var(--shadow) / 0.15);
            z-index: 10000;
            min-width: 150px;
        `;
        
        const menuItems = [
            { text: 'New tab', action: () => window.browserUI.createNewTab() },
            { text: 'Duplicate tab', action: () => window.browserUI.duplicateTab(tabId) },
            { text: 'Close tab', action: () => window.browserUI.closeTab(tabId) },
            { text: 'Close other tabs', action: () => window.browserUI.closeOtherTabs(tabId) }
        ];
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.textContent = item.text;
            menuItem.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                color: hsl(var(--text-primary));
                font-size: 14px;
            `;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = 'hsl(var(--button-hover))';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = '';
            });
            
            menuItem.addEventListener('click', () => {
                item.action();
                contextMenu.remove();
            });
            
            contextMenu.appendChild(menuItem);
        });
        
        document.body.appendChild(contextMenu);
        
        // Remove context menu when clicking elsewhere
        const removeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 0);
    }
});

// Make browser UI globally accessible for context menu
window.addEventListener('load', () => {
    const browserUIElement = document.querySelector('.browser-window');
    if (browserUIElement && !window.browserUI) {
        // Store reference to browser UI instance
        window.browserUI = new BrowserUI();
    }
});
