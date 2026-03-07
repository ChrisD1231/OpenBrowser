/**
 * Advanced Fingerprint Masking Script
 * Injected into webviews to spoof Canvas, WebGL, and Audio hardware identifiers.
 */
(function() {
    // 1. Canvas Fingerprinting Protection
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

    HTMLCanvasElement.prototype.toDataURL = function() {
        if (this.width > 0 && this.height > 0) {
            const ctx = this.getContext('2d');
            const imageData = ctx.getImageData(0, 0, 1, 1);
            imageData.data[0] = imageData.data[0] ^ 1; // Flip a single bit
            ctx.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, arguments);
    };

    CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
        const imageData = originalGetImageData.apply(this, arguments);
        // Inject subtle noise if width/height are significant (often used for fingerprinting)
        if (w > 10 && h > 10) {
            for (let i = 0; i < 10; i++) {
                const index = Math.floor(Math.random() * imageData.data.length);
                imageData.data[index] = imageData.data[index] ^ 1;
            }
        }
        return imageData;
    };

    // 2. WebGL Fingerprinting Protection
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // Mask Vendor and Renderer
        if (parameter === 37445) return 'Intel Open Source Technology Center'; // UNMASKED_VENDOR_WEBGL
        if (parameter === 37446) return 'Mesa DRI Intel(R) HD Graphics (Skylake GT2)'; // UNMASKED_RENDERER_WEBGL
        if (parameter === 7936) return 'WebKit'; // VENDOR
        if (parameter === 7937) return 'WebKit WebGL'; // RENDERER
        return originalGetParameter.apply(this, arguments);
    };

    // 3. Audio Fingerprinting Protection
    if (window.AudioBuffer) {
        const originalCopyFromChannel = AudioBuffer.prototype.copyFromChannel;
        AudioBuffer.prototype.copyFromChannel = function(destination, channelNumber, startInChannel) {
            originalCopyFromChannel.apply(this, arguments);
            // Add microscopic jitter to audio buffer
            for (let i = 0; i < destination.length; i += 100) {
                destination[i] += Math.random() * 0.0000001;
            }
        };
    }

    console.log('🛡️ OpenBrowser: Advanced Fingerprint Masking Active');
})();
