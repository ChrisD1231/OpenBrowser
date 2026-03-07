/**
 * OpenBrowser Main Process
 * Optimized for high security and privacy.
 */

let electron;
try {
    electron = require('electron');
} catch (e) {
    electron = null;
}

// Resilient fallback: if require('electron') returns a string (shadowed by npm package)
// or fails, we attempt to bypass node_modules to find the built-in Electron APIs.
if (!electron || !electron.app || typeof electron === 'string') {
    const originalPaths = module.paths;
    try {
        module.paths = []; 
        electron = require('electron');
    } catch (e) {
        // Last resort: standard require
        electron = require('electron');
    } finally {
        module.paths = originalPaths;
    }
}

if (!electron || !electron.app) {
    console.error('CRITICAL: Electron APIs not found. Please ensure you are running this with the "electron" command.');
    process.exit(1);
}

const { app, BrowserWindow, ipcMain, session } = electron;
const path = require('path');
const AdblockerModule = require('./modules/adblocker');
const AIAssistant = require('./modules/ai-assistant');
const DBModule = require('./modules/db');
const SecurityModule = require('./modules/security');
const PrivacyTunnel = require('./modules/proxy');
const DownloadManager = require('./modules/downloads');

let mainWindow;
let adblocker;
let aiAssistant;
let db;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webviewTag: true
        },
        titleBarStyle: 'hiddenInset'
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

async function initializeModules() {
    try {
        const userDataPath = app.getPath('userData');
        db = new DBModule(path.join(userDataPath, 'browser.db'));
        aiAssistant = new AIAssistant();
        adblocker = new AdblockerModule();

        // 1. Initialize Adblocker
        await adblocker.initialize(session.defaultSession);
        
        // 2. Set Privacy Config
        AdblockerModule.setPrivacyConfig(session.defaultSession);
        
        // 3. Setup Proxy Interceptors
        PrivacyTunnel.setupInterceptors(session.defaultSession);

        // 4. Handle Downloads
        session.defaultSession.on('will-download', (event, item) => {
            DownloadManager.handleDownload(mainWindow, item);
        });

        // 5. Context-Aware Content Security Policy (CSP)
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            const responseHeaders = { ...details.responseHeaders };
            
            // Only apply restrictive CSP to local application files
            // External websites should use their own policies
            if (details.url.startsWith('file://')) {
                responseHeaders['Content-Security-Policy'] = [
                    "default-src 'self' 'unsafe-inline'; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "font-src 'self' https://fonts.gstatic.com; " +
                    "img-src 'self' data: https:; " +
                    "connect-src 'self' https: http:; " +
                    "frame-src 'self'; " +
                    "object-src 'none';"
                ];
            }

            callback({ responseHeaders });
        });

        // 6. Restrict Webview Permissions & Inject Privacy Enhancements
        app.on('web-contents-created', (event, contents) => {
            contents.on('will-attach-webview', (event, webPreferences, params) => {
                // Strip away dangerous capabilities
                delete webPreferences.preload;
                delete webPreferences.preloadURL;
                
                webPreferences.nodeIntegration = false;
                webPreferences.contextIsolation = true;
                webPreferences.sandbox = true;

                // Inject Advanced Fingerprint Masking
                // We use a separate preload script for webviews to keep them isolated
                webPreferences.preload = path.join(__dirname, 'modules', 'fingerprint.js');
            });

            contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
                const allowedPermissions = ['notifications', 'fullscreen'];
                if (allowedPermissions.includes(permission)) {
                    callback(true);
                } else {
                    console.warn(`Denied permission request for: ${permission}`);
                    callback(false);
                }
            });
        });

        // 7. Partition Cleanup (for Burner Tabs)
        ipcMain.handle('clear-partition-data', async (event, partition) => {
            try {
                const ses = session.fromPartition(partition);
                await ses.clearStorageData({
                    storages: ['cookies', 'localstorage', 'indexdb', 'cache', 'websql', 'serviceworkers', 'cachestorage']
                });
                console.log(`🔥 Wiped Burner Partition: ${partition}`);
                return true;
            } catch (e) {
                console.error(`Failed to wipe partition ${partition}:`, e.message);
                return false;
            }
        });

        console.log('Modules initialized successfully.');
    } catch (e) {
        console.error('Module initialization failed:', e);
    }
}

app.whenReady().then(async () => {
    await initializeModules();
    createWindow();
});

// IPC Handlers
ipcMain.handle('ask-ai', async (event, prompt, context) => {
    if (typeof prompt !== 'string' || prompt.length > 5000) return 'Invalid prompt.';
    return await aiAssistant.ask(prompt, context);
});

ipcMain.handle('summarize-page', async (event, text) => {
    if (typeof text !== 'string' || text.length > 50000) return 'Invalid content to summarize.';
    return await aiAssistant.summarize(text);
});

ipcMain.handle('get-bookmarks', async () => {
    return db.getBookmarks();
});

ipcMain.on('add-bookmark', (event, url, title) => {
    if (typeof url !== 'string' || !url.startsWith('http')) return;
    const sanitizedTitle = typeof title === 'string' ? title.substring(0, 100) : 'Untitled';
    db.addBookmark(url, sanitizedTitle);
});

ipcMain.on('clear-history', () => {
    db.clearHistory();
});

ipcMain.handle('verify-extension', async (event, extensionBuffer, expectedHash) => {
    if (!Buffer.isBuffer(extensionBuffer) || typeof expectedHash !== 'string') return false;
    if (extensionBuffer.length > 50 * 1024 * 1024) return false; // 50MB limit
    return SecurityModule.verifyIntegrity(extensionBuffer, expectedHash);
});

ipcMain.handle('set-vpn-region', async (event, regionCode) => {
    const allowedRegions = ['us', 'uk', 'de', 'jp'];
    if (!allowedRegions.includes(regionCode)) return { success: false, error: 'Invalid region' };
    
    try {
        await PrivacyTunnel.setTunnelProxy(session.defaultSession, regionCode);
        return { success: true, region: regionCode };
    } catch (e) {
        console.error('Failed to set VPN region:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('clear-all-data', async () => {
    try {
        // 1. Clear Database
        db.clearHistory();
        // Since we don't have a clearBookmarks, we can add it or just clear history for now
        // For a full "Wipe", we should ideally reset the DB file or clear all tables.
        
        // 2. Clear Electron Session
        await session.defaultSession.clearStorageData();
        await session.defaultSession.clearCache();
        
        return { success: true };
    } catch (e) {
        console.error('Failed to clear all data:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.on('load-url', (event, url) => {
    if (typeof url !== 'string' || url.length > 2048) return;
    
    let targetUrl = url;
    if (!url.startsWith('http')) {
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
    
    try {
        const parsed = new URL(targetUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) return;
        
        targetUrl = PrivacyTunnel.sanitizeSearchUrl(targetUrl);
        event.reply('url-changed', targetUrl);
    } catch (e) {
        console.error('Invalid URL requested:', url);
    }
});
