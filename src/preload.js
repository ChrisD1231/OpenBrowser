// Canvas Fingerprint Randomization
const originalGetImageData = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, options) {
    const context = originalGetImageData.apply(this, [type, options]);
    if (type === '2d') {
        const originalFillText = context.fillText;
        context.fillText = function () {
            // Subtle noise injection
            this.setTransform(1 + Math.random() * 0.0000001, 0, 0, 1 + Math.random() * 0.0000001, 0, 0);
            return originalFillText.apply(this, arguments);
        };
    }
    return context;
};

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Navigation
    loadURL: (url) => ipcRenderer.send('load-url', url),
    goBack: () => ipcRenderer.send('go-back'),
    goForward: () => ipcRenderer.send('go-forward'),
    refresh: () => ipcRenderer.send('refresh'),
    
    // AI Assistant
    askAI: (prompt, context) => ipcRenderer.invoke('ask-ai', prompt, context),
    summarizePage: (text) => ipcRenderer.invoke('summarize-page', text),
    
    // Data
    getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
    addBookmark: (url, title) => ipcRenderer.send('add-bookmark', url, title),
    clearHistory: () => ipcRenderer.send('clear-history'),
    clearAllData: () => ipcRenderer.invoke('clear-all-data'),
    
    // Privacy
    toggleAdblocker: (enabled) => ipcRenderer.send('toggle-adblocker', enabled),
    verifyExtension: (buffer, hash) => ipcRenderer.invoke('verify-extension', buffer, hash),
    setVPNRegion: (regionCode) => ipcRenderer.invoke('set-vpn-region', regionCode),
    
    // Events
    onPageLoaded: (callback) => ipcRenderer.on('page-loaded', (event, data) => callback(data)),
    onUrlChanged: (callback) => ipcRenderer.on('url-changed', (event, url) => callback(url)),
    onDownloadStatus: (callback) => ipcRenderer.on('download-status', (event, data) => callback(data)),
});
