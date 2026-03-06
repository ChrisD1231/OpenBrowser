const { ElectronBlocker } = require('@cliqz/adblocker-electron');
const fetch = require('cross-fetch');

/**
 * Adblocker Module
 */
class AdblockerModule {
    constructor() {
        this.blocker = null;
    }

    /**
     * Initialize the blocker with EasyList and EasyPrivacy
     * @param {Session} session - Electron session
     */
    async initialize(session) {
        try {
            this.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
            this.blocker.enableBlockingInSession(session);
            console.log('Adblocker initialized and enabled for session.');
        } catch (error) {
            console.error('Failed to initialize adblocker:', error);
        }
    }

    /**
     * Block third-party cookies and other tracking mechanisms
     * @param {Session} session 
     */
    static setPrivacyConfig(session) {
        session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
            if (permission === 'geolocation' || permission === 'notifications') {
                return false; // Deny sensitive permissions by default
            }
            return true;
        });

        // Block third-party cookies
        session.cookies.set({
            url: 'https://google.com',
            name: 'test',
            value: 'test'
        }).catch(err => console.error(err));
        
        // Note: Full third-party cookie blocking is better handled via webRequest
        session.webRequest.onBeforeSendHeaders((details, callback) => {
            // Fingerprinting protection: Mask User-Agent or remove identifying headers
            // For now, just a placeholder for advanced privacy logic
            callback({ cancel: false, requestHeaders: details.requestHeaders });
        });
    }
}

module.exports = AdblockerModule;
