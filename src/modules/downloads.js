const SecurityModule = require('./security');
const fs = require('fs');
const path = require('path');

/**
 * Download Manager Module
 * Handles file downloads and SHA-256 integrity verification using native Electron APIs.
 */
class DownloadManager {
    /**
     * Handle download for a given item
     * @param {BrowserWindow} window 
     * @param {DownloadItem} item 
     * @param {string} expectedHash 
     */
    static handleDownload(window, item, expectedHash = null) {
        const filePath = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads', item.getFilename());
        item.setSavePath(filePath);

        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                window.webContents.send('download-status', { status: 'error', message: 'Download interrupted' });
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    window.webContents.send('download-status', { status: 'info', message: 'Download paused' });
                } else {
                    const progress = item.getReceivedBytes() / item.getTotalBytes();
                    window.webContents.send('download-progress', progress);
                }
            }
        });

        item.once('done', (event, state) => {
            if (state === 'completed') {
                if (expectedHash) {
                    try {
                        const fileBuffer = fs.readFileSync(filePath);
                        const isValid = SecurityModule.verifyIntegrity(fileBuffer, expectedHash);
                        
                        if (isValid) {
                            window.webContents.send('download-status', { 
                                status: 'success', 
                                message: 'Download complete and integrity verified.',
                                path: filePath 
                            });
                        } else {
                            window.webContents.send('download-status', { 
                                status: 'warning', 
                                message: 'CRITICAL: File integrity check failed! SHA-256 mismatch.',
                                path: filePath 
                            });
                        }
                    } catch (e) {
                        window.webContents.send('download-status', { status: 'error', message: `Verification failed: ${e.message}` });
                    }
                } else {
                    window.webContents.send('download-status', { 
                        status: 'success', 
                        message: 'Download complete.',
                        path: filePath 
                    });
                }
            } else {
                window.webContents.send('download-status', { status: 'error', message: `Download failed: ${state}` });
            }
        });
    }
}

module.exports = DownloadManager;
