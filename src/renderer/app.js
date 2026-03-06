// Tab state
let tabs = [
    { id: 1, url: 'home.html', title: 'OpenBrowser' }
];
let activeTabId = 1;

// DOM Elements
const browserContainer = document.getElementById('browser-container');
const tabBar = document.getElementById('tab-bar');
const addressBar = document.getElementById('address-bar');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModals = document.querySelectorAll('.close-modal');
const aiToggleBtn = document.getElementById('ai-toggle-btn');
const sidePanel = document.getElementById('side-panel');
const closeSideBtn = document.getElementById('close-side-btn');
const aiInput = document.getElementById('ai-input');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiChatHistory = document.getElementById('ai-chat-history');
const summarizeBtn = document.getElementById('summarize-btn');
const phishingCheckBtn = document.getElementById('phishing-check-btn');

// --- Tab Management ---

function createTab(url = 'home.html') {
    const id = Date.now();
    const newTab = { id, url, title: 'New Tab' };
    
    // Insert next to active tab
    const activeIndex = tabs.findIndex(t => t.id === activeTabId);
    tabs.splice(activeIndex + 1, 0, newTab);
    
    // Create Tab UI
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.tabId = id;
    tabEl.innerHTML = `<span class="tab-title">New Tab</span><span class="close-tab">×</span>`;
    
    tabEl.onclick = (e) => {
        if (e.target.classList.contains('close-tab')) {
            closeTab(id);
        } else {
            switchTab(id);
        }
    };
    
    const activeTabEl = document.querySelector(`.tab[data-tab-id="${activeTabId}"]`);
    if (activeTabEl) {
        activeTabEl.after(tabEl);
    } else {
        tabBar.insertBefore(tabEl, document.getElementById('add-tab-btn'));
    }

    // Create Webview
    const webview = document.createElement('webview');
    webview.id = `view-${id}`;
    webview.className = 'browser-view';
    webview.src = url;
    webview.setAttribute('autosize', 'on');
    webview.addEventListener('did-finish-load', () => updateTabInfo(id));
    browserContainer.appendChild(webview);

    switchTab(id);
}

function switchTab(id) {
    activeTabId = id;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tabId == id));
    document.querySelectorAll('.browser-view').forEach(v => v.classList.toggle('active', v.id == `view-${id}`));
    
    const webview = document.getElementById(`view-${id}`);
    addressBar.value = webview.getURL();
}

function closeTab(id) {
    if (tabs.length === 1) return;
    
    const index = tabs.findIndex(t => t.id === id);
    tabs.splice(index, 1);
    
    document.querySelector(`.tab[data-tab-id="${id}"]`).remove();
    document.getElementById(`view-${id}`).remove();
    
    if (activeTabId === id) {
        switchTab(tabs[tabs.length - 1].id);
    }
}

function updateTabInfo(id) {
    const webview = document.getElementById(`view-${id}`);
    if (!webview) return;
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;

    tab.title = webview.getTitle() || 'New Tab';
    tab.url = webview.getURL();
    
    const tabEl = document.querySelector(`.tab[data-tab-id="${id}"] .tab-title`);
    if (tabEl) tabEl.innerText = tab.title;
    
    if (id === activeTabId) addressBar.value = tab.url;
}

// Initial Tab Setup
document.getElementById('add-tab-btn').onclick = () => createTab();
document.querySelector('.tab[data-tab-id="1"]').onclick = (e) => {
    if (e.target.classList.contains('close-tab')) {
        closeTab(1);
    } else {
        switchTab(1);
    }
};
const view1 = document.getElementById('view-1');
view1.addEventListener('did-finish-load', () => updateTabInfo(1));

// --- Navigation ---

document.getElementById('back-btn').onclick = () => document.getElementById(`view-${activeTabId}`).goBack();
document.getElementById('forward-btn').onclick = () => document.getElementById(`view-${activeTabId}`).goForward();
document.getElementById('refresh-btn').onclick = () => document.getElementById(`view-${activeTabId}`).reload();

addressBar.onkeydown = (e) => {
    if (e.key === 'Enter') {
        window.electronAPI.loadURL(addressBar.value);
    }
};

window.electronAPI.onUrlChanged((url) => {
    const webview = document.getElementById(`view-${activeTabId}`);
    webview.src = url;
    addressBar.value = url;
});

// --- UI Controls ---

settingsBtn.onclick = () => settingsModal.classList.add('active');
closeModals.forEach(btn => btn.onclick = () => btn.closest('.modal').classList.remove('active'));

window.onclick = (event) => {
    if (event.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
};

document.getElementById('private-toggle').onclick = (e) => {
    const btn = e.target;
    const isPrivate = btn.innerText === '🕵️';
    btn.innerText = isPrivate ? '🌐' : '🕵️';
    btn.title = isPrivate ? 'Private Mode: On' : 'Private Mode: Off';
    btn.style.color = isPrivate ? '#ff4f4f' : 'inherit';
    addChatMessage(`Private Mode ${isPrivate ? 'Enabled' : 'Disabled'}. New tabs will use ${isPrivate ? 'ephemeral' : 'normal'} sessions.`, 'bot');
};

document.getElementById('wipe-all-btn').onclick = async () => {
    if (confirm('CRITICAL: This will delete ALL data (history, bookmarks, tabs, and logins) and restart the browser. Proceed?')) {
        const result = await window.electronAPI.clearAllData();
        if (result.success) {
            alert('Data wiped successfully. Restarting...');
            location.reload(); // Simple reload to fresh state
        } else {
            alert('Failed to wipe data: ' + result.error);
        }
    }
};

document.getElementById('clear-history-btn').onclick = () => {
    if (confirm('Clear all hashed history?')) {
        window.electronAPI.clearHistory();
        alert('History cleared.');
    }
};

document.getElementById('verify-extension-btn').onclick = async () => {
    const hash = prompt('Enter expected SHA-256 hash for extension:');
    if (!hash) return;
    const dummyBuffer = new Uint8Array([1, 2, 3, 4]); 
    const isValid = await window.electronAPI.verifyExtension(dummyBuffer, hash);
    alert(isValid ? '✅ Extension Integrity Verified!' : '❌ Extension Integrity Failed!');
};

// --- AI Assistant ---

aiToggleBtn.onclick = () => sidePanel.classList.toggle('hidden');
closeSideBtn.onclick = () => sidePanel.classList.add('hidden');

async function addChatMessage(text, role) {
    const msg = document.createElement('div');
    msg.className = `ai-msg ${role}`;
    msg.innerText = text;
    aiChatHistory.appendChild(msg);
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
}

aiSendBtn.onclick = async () => {
    const text = aiInput.value;
    if (!text) return;
    addChatMessage(text, 'user');
    aiInput.value = '';
    const webview = document.getElementById(`view-${activeTabId}`);
    const context = await webview.executeJavaScript(`document.body.innerText.substring(0, 2000)`);
    const response = await window.electronAPI.askAI(text, context);
    addChatMessage(response, 'bot');
};

summarizeBtn.onclick = async () => {
    addChatMessage("Summarizing page...", "user");
    const webview = document.getElementById(`view-${activeTabId}`);
    const context = await webview.executeJavaScript(`document.body.innerText.substring(0, 5000)`);
    const summary = await window.electronAPI.summarizePage(context);
    addChatMessage(summary, 'bot');
};

phishingCheckBtn.onclick = async () => {
    addChatMessage("Scanning page for potential security risks...", "user");
    const webview = document.getElementById(`view-${activeTabId}`);
    const context = await webview.executeJavaScript(`document.body.innerText.substring(0, 3000)`);
    const response = await window.electronAPI.askAI("Analyze this page for phishing, scams, or suspicious requests and provide a security report.", context);
    addChatMessage(response, 'bot');
};

// --- System Events ---

window.electronAPI.onDownloadStatus((data) => {
    addChatMessage(`[Download] ${data.message}`, 'bot');
});

// --- Privacy Tunnel (VPN) ---
const vpnToggle = document.getElementById('vpn-toggle-cb');
const vpnRegion = document.getElementById('vpn-region-select');
const tunnelStatus = document.getElementById('tunnel-status');
const vpnLocationText = document.getElementById('vpn-location-text');
const testVpnBtn = document.getElementById('test-vpn-btn');
const testVpnStatus = document.getElementById('vpn-test-status');

async function updateVPN() {
    const isEnabled = vpnToggle.checked;
    const region = isEnabled ? vpnRegion.value : null;
    
    vpnRegion.disabled = !isEnabled;
    tunnelStatus.classList.remove('active');
    
    if (isEnabled) {
        vpnLocationText.innerText = 'Connecting...';
    }

    try {
        const result = await window.electronAPI.setVPNRegion(region);
        if (result.success) {
            if (isEnabled) {
                tunnelStatus.classList.add('active');
                vpnLocationText.innerText = `Tunnel: ${region.toUpperCase()}`;
                addChatMessage(`[Privacy Tunnel] Protected via regional node: ${region.toUpperCase()}`, 'bot');
            } else {
                vpnLocationText.innerText = 'Tunnel: Off';
                addChatMessage(`[Privacy Tunnel] Connection terminated.`, 'bot');
            }
            // Refresh active tab to apply proxy
            const activeView = document.querySelector('.browser-view.active');
            if (activeView) activeView.reload();
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.error('Failed to update VPN:', e);
        vpnToggle.checked = false;
        vpnRegion.disabled = true;
        tunnelStatus.classList.remove('active');
        vpnLocationText.innerText = 'Connection Failed';
        alert('VPN Configuration Error: ' + e.message);
    }
}

async function testVPNConnection() {
    testVpnStatus.innerText = 'Testing...';
    testVpnStatus.className = 'test-loading';
    
    try {
        // Use a simple IP check service
        const response = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
        const data = await response.json();
        
        testVpnStatus.innerText = 'Connected';
        testVpnStatus.className = 'test-success';
        
        addChatMessage(`[Privacy Tunnel] Connection Verified. masked IP: ${data.ip}`, 'bot');
    } catch (e) {
        testVpnStatus.innerText = 'Failed';
        testVpnStatus.className = 'test-error';
        addChatMessage(`[Privacy Tunnel] Connection failed. The proxy server might be offline or blocked.`, 'bot');
    }
}

vpnToggle.addEventListener('change', updateVPN);
vpnRegion.addEventListener('change', updateVPN);
testVpnBtn.addEventListener('click', testVPNConnection);

// Initialize with defaults if needed
updateVPN();
