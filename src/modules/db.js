const Database = require('better-sqlite3');
const path = require('path');
const SecurityModule = require('./security');

/**
 * Database Module for local storage (Bookmarks, History, Settings)
 */
class DBModule {
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.init();
    }

    init() {
        // Create History table (URLs are hashed for privacy)
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url_hash TEXT NOT NULL,
                title TEXT,
                visit_time DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        // Create Bookmarks table
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                title TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        // Create Settings table
        this.db.prepare(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `).run();
    }

    /**
     * Add a URL to history (anonymized)
     * @param {string} url 
     * @param {string} title 
     */
    addHistory(url, title) {
        const urlHash = SecurityModule.hashUrl(url);
        this.db.prepare('INSERT INTO history (url_hash, title) VALUES (?, ?)').run(urlHash, title);
    }

    /**
     * Add a bookmark
     * @param {string} url 
     * @param {string} title 
     */
    addBookmark(url, title) {
        this.db.prepare('INSERT INTO bookmarks (url, title) VALUES (?, ?)').run(url, title);
    }

    /**
     * Get all bookmarks
     * @returns {Array}
     */
    getBookmarks() {
        return this.db.prepare('SELECT * FROM bookmarks').all();
    }

    /**
     * Set a setting
     * @param {string} key 
     * @param {string} value 
     */
    setSetting(key, value) {
        this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }

    /**
     * Get a setting
     * @param {string} key 
     * @returns {string|null}
     */
    getSetting(key) {
        const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        return row ? row.value : null;
    }

    /**
     * Clear all history
     */
    clearHistory() {
        this.db.prepare('DELETE FROM history').run();
    }
}

module.exports = DBModule;
