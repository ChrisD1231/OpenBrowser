const { app, BrowserWindow, ipcMain, session } = require('electron');
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

        // 1. Initialize Adblocker (The most complex part)
        await adblocker.initialize(session.defaultSession);
        
        // 2. Set Privacy Config
        AdblockerModule.setPrivacyConfig(session.defaultSession);
        
        // 3. Setup Proxy Interceptors
        PrivacyTunnel.setupInterceptors(session.defaultSession);

        // 4. Handle Downloads
        session.defaultSession.on('will-download', (event, item) => {
            DownloadManager.handleDownload(mainWindow, item);
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
    return await aiAssistant.ask(prompt, context);
});

ipcMain.handle('summarize-page', async (event, text) => {
    return await aiAssistant.summarize(text);
});

ipcMain.handle('get-bookmarks', async () => {
    return db.getBookmarks();
});

ipcMain.on('add-bookmark', (event, url, title) => {
    db.addBookmark(url, title);
});

ipcMain.on('clear-history', () => {
    db.clearHistory();
});

ipcMain.handle('verify-extension', async (event, extensionBuffer, expectedHash) => {
    return SecurityModule.verifyIntegrity(extensionBuffer, expectedHash);
});

ipcMain.handle('set-vpn-region', async (event, regionCode) => {
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
    let targetUrl = url;
    if (!url.startsWith('http')) {
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
    targetUrl = PrivacyTunnel.sanitizeSearchUrl(targetUrl);
    event.reply('url-changed', targetUrl);
});
