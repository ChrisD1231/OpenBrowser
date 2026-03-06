const axios = require('axios');

/**
 * Google Search Privacy Proxy & Privacy Tunnel (VPN)
 * Sanitizes requests and routes traffic through dynamic regional nodes.
 */
class PrivacyTunnel {
    static REGIONS = {
        'us': 'US',
        'uk': 'GB',
        'de': 'DE',
        'jp': 'JP'
    };

    static activeRegion = null;
    static activeProxy = null;

    /**
     * Configure session to use a regional proxy tunnel
     */
    static async setTunnelProxy(session, regionCode) {
        this.activeRegion = regionCode;
        
        if (!regionCode || !this.REGIONS[regionCode]) {
            this.activeProxy = null;
            await session.setProxy({ proxyRules: 'direct://' });
            return;
        }

        try {
            // Fetch working proxies for the specified region
            const countryCode = this.REGIONS[regionCode];
            const proxies = await this.fetchWorkingProxies(countryCode);
            
            if (proxies.length === 0) {
                throw new Error(`No working proxies found for ${regionCode}`);
            }

            // Pick a random proxy from the list
            this.activeProxy = proxies[Math.floor(Math.random() * proxies.length)];
            const proxyRules = `${this.activeProxy.protocol}://${this.activeProxy.ip}:${this.activeProxy.port}`;
            
            await session.setProxy({ proxyRules, proxyBypassRules: '<local>' });
            console.log(`VPN Connected via ${proxyRules} (${regionCode})`);
        } catch (e) {
            console.error('VPN Connection Error:', e.message);
            this.activeProxy = null;
            await session.setProxy({ proxyRules: 'direct://' });
            throw e;
        }
    }

    /**
     * Fetch a list of working proxies for a specific country
     */
    static async fetchWorkingProxies(countryCode) {
        try {
            // Using ProxyScrape API for free, public proxies
            const response = await axios.get(`https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=${countryCode}&ssl=all&anonymity=all`, { timeout: 10000 });
            
            if (!response.data || typeof response.data !== 'string') return [];

            return response.data.trim().split('\r\n').map(p => {
                const [ip, port] = p.split(':');
                return { ip, port, protocol: 'http' };
            }).filter(p => p.ip && p.port);
        } catch (e) {
            console.error('Failed to fetch proxies:', e.message);
            return [];
        }
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
