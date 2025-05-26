const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Database paths
const userDataPath = app.getPath('userData');
const dbDir = path.join(userDataPath, 'BrowserData');
const bookmarksPath = path.join(dbDir, 'bookmarks.json');
const historyPath = path.join(dbDir, 'history.json');

// Initialize database
function init() {
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Create empty database files if they don't exist
  if (!fs.existsSync(bookmarksPath)) {
    fs.writeFileSync(bookmarksPath, JSON.stringify([]));
  }
  
  if (!fs.existsSync(historyPath)) {
    fs.writeFileSync(historyPath, JSON.stringify([]));
  }
}

// Bookmarks

// Add a bookmark
function addBookmark(bookmark, callback) {
  fs.readFile(bookmarksPath, 'utf8', (err, data) => {
    if (err) {
      return callback(err);
    }
    
    try {
      const bookmarks = JSON.parse(data);
      
      // Add ID and timestamp to bookmark
      const newBookmark = {
        id: Date.now().toString(),
        url: bookmark.url,
        title: bookmark.title,
        favicon: bookmark.favicon || '',
        timestamp: Date.now()
      };
      
      // Add to array
      bookmarks.push(newBookmark);
      
      // Write back to file
      fs.writeFile(bookmarksPath, JSON.stringify(bookmarks, null, 2), (err) => {
        if (err) {
          return callback(err);
        }
        
        callback(null, newBookmark);
      });
    } catch (error) {
      callback(error);
    }
  });
}

// Get all bookmarks
function getBookmarks() {
  return new Promise((resolve, reject) => {
    fs.readFile(bookmarksPath, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }
      
      try {
        const bookmarks = JSON.parse(data);
        resolve(bookmarks);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Delete a bookmark
function deleteBookmark(id, callback) {
  fs.readFile(bookmarksPath, 'utf8', (err, data) => {
    if (err) {
      return callback(err);
    }
    
    try {
      let bookmarks = JSON.parse(data);
      
      // Filter out the bookmark with the given ID
      bookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
      
      // Write back to file
      fs.writeFile(bookmarksPath, JSON.stringify(bookmarks, null, 2), callback);
    } catch (error) {
      callback(error);
    }
  });
}

// History

// Add a history entry
function addHistory(historyItem, callback) {
  fs.readFile(historyPath, 'utf8', (err, data) => {
    if (err) {
      return callback(err);
    }
    
    try {
      const history = JSON.parse(data);
      
      // Add ID and ensure timestamp
      const newHistoryItem = {
        id: Date.now().toString(),
        url: historyItem.url,
        title: historyItem.title,
        timestamp: historyItem.timestamp || Date.now()
      };
      
      // Add to array
      history.push(newHistoryItem);
      
      // Write back to file
      fs.writeFile(historyPath, JSON.stringify(history, null, 2), (err) => {
        if (err) {
          return callback(err);
        }
        
        callback(null, newHistoryItem);
      });
    } catch (error) {
      callback(error);
    }
  });
}

// Get browsing history
function getHistory() {
  return new Promise((resolve, reject) => {
    fs.readFile(historyPath, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }
      
      try {
        const history = JSON.parse(data);
        resolve(history);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Clear browsing history
function clearHistory(callback) {
  fs.writeFile(historyPath, JSON.stringify([]), callback);
}

// Get history for a specific date range
function getHistoryForDateRange(startDate, endDate, callback) {
  fs.readFile(historyPath, 'utf8', (err, data) => {
    if (err) {
      return callback(err);
    }
    
    try {
      const history = JSON.parse(data);
      
      // Filter by date range
      const filteredHistory = history.filter(item => {
        const timestamp = item.timestamp;
        return timestamp >= startDate && timestamp <= endDate;
      });
      
      callback(null, filteredHistory);
    } catch (error) {
      callback(error);
    }
  });
}

// Search history
function searchHistory(query, callback) {
  fs.readFile(historyPath, 'utf8', (err, data) => {
    if (err) {
      return callback(err);
    }
    
    try {
      const history = JSON.parse(data);
      
      // Search in title and URL
      const results = history.filter(item => {
        const title = item.title.toLowerCase();
        const url = item.url.toLowerCase();
        const searchTerm = query.toLowerCase();
        
        return title.includes(searchTerm) || url.includes(searchTerm);
      });
      
      callback(null, results);
    } catch (error) {
      callback(error);
    }
  });
}

module.exports = {
  init,
  addBookmark,
  getBookmarks,
  deleteBookmark,
  addHistory,
  getHistory,
  clearHistory,
  getHistoryForDateRange,
  searchHistory
};
