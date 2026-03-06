/**
 * Google Search Privacy Proxy & Privacy Tunnel (VPN)
 * Sanitizes requests and routes traffic through global regional nodes.
 */
class PrivacyTunnel {
    static REGIONS = {
        'us': 'http://us-west.privacy-tunnel.io:8080',
        'uk': 'http://uk-london.privacy-tunnel.io:8080',
        'de': 'http://de-frankfurt.privacy-tunnel.io:8080',
        'jp': 'http://jp-tokyo.privacy-tunnel.io:8080'
    };

    static activeRegion = null;

    /**
     * Configure session to use a regional proxy tunnel
     */
    static async setTunnelProxy(session, regionCode) {
        this.activeRegion = regionCode;
        if (!regionCode || !this.REGIONS[regionCode]) {
            await session.setProxy({ proxyRules: 'direct://' });
            return;
        }

        const proxyRules = this.REGIONS[regionCode];
        await session.setProxy({ proxyRules, proxyBypassRules: '<local>' });
    }

    /**
     * Sanitize a URL before navigation (Google-specific)
     */
    static sanitizeSearchUrl(urlString) {
        try {
            const url = new URL(urlString);
            if (url.hostname.includes('google.com') && url.pathname === '/search') {
                const paramsToKeep = ['q', 'tbm', 'start', 'hl', 'udm'];
                const searchParams = new URLSearchParams();
                url.searchParams.forEach((value, key) => {
                    if (paramsToKeep.includes(key)) searchParams.append(key, value);
                });
                url.search = searchParams.toString();
                return url.toString();
            }
        } catch (e) {}
        return urlString;
    }

    /**
     * Set up privacy interceptors on the session
     * @param {Session} session 
     */
    static setupInterceptors(session) {
        session.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
            const headers = details.requestHeaders;
            
            // Standard Privacy Cleanup
            delete headers['Cookie'];
            
            // Dynamic Regional Header Spoofing
            const region = this.activeRegion || 'us';
            const langMap = { 'us': 'en-US,en;q=0.9', 'uk': 'en-GB,en;q=0.9', 'de': 'de-DE,de;q=0.9', 'jp': 'ja-JP,ja;q=0.9' };
            const uaMap = {
                'us': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'jp': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'de': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            };

            headers['User-Agent'] = uaMap[region] || uaMap['us'];
            headers['Accept-Language'] = langMap[region] || langMap['us'];
            
            Object.keys(headers).forEach(key => {
                if (key.toLowerCase().startsWith('sec-ch-ua')) delete headers[key];
            });

            callback({ requestHeaders: headers });
        });
    }
}

module.exports = PrivacyTunnel;
