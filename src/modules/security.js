const crypto = require('crypto');

/**
 * SHA-256 Security Module
 */
class SecurityModule {
    /**
     * Generate a SHA-256 hash of the input string.
     * @param {string} data 
     * @param {string} salt 
     * @returns {string}
     */
    static hash(data, salt = '') {
        return crypto.createHmac('sha256', salt)
            .update(data)
            .digest('hex');
    }

    /**
     * Create an anonymized identifier (e.g., for session IDs)
     * @returns {string}
     */
    static generateAnonymizedId() {
        const randomSalt = crypto.randomBytes(32).toString('hex');
        const timestamp = Date.now().toString();
        return this.hash(timestamp, randomSalt);
    }

    /**
     * Hash a URL for privacy-safe history storage
     * @param {string} url 
     * @returns {string}
     */
    static hashUrl(url) {
        // In a real app, we might use a persistent salt stored in the user's config
        const persistentSalt = 'browser-internal-salt'; 
        return this.hash(url, persistentSalt);
    }

    /**
     * Verify a file's integrity using SHA-256
     * @param {Buffer} buffer 
     * @param {string} expectedHash 
     * @returns {boolean}
     */
    static verifyIntegrity(buffer, expectedHash) {
        const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
        return actualHash === expectedHash;
    }
}

module.exports = SecurityModule;
