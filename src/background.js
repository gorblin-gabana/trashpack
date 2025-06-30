// Background service worker for TrashPack Wallet Extension

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('TrashPack Wallet Extension installed:', details);

  // Set up default storage values
  chrome.storage.sync.set({
    isAuthenticated: false,
    userPrincipal: null,
    walletAddress: null,
    connectedSites: []
  });
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('TrashPack Wallet Extension started');
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🎯 Background received message:', message.type, 'from tab:', sender.tab?.id);
  console.log('🎯 Full message details:', { message, sender });

  switch (message.type) {
    case 'GET_STORAGE':
      chrome.storage.sync.get(message.keys, (result) => {
        sendResponse(result);
      });
      return true; // Keep the message channel open for async response

    case 'SET_STORAGE':
      chrome.storage.sync.set(message.data, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'CLEAR_STORAGE':
      chrome.storage.sync.clear(() => {
        sendResponse({ success: true });
      });
      return true;

    case 'REQUEST_CONNECTION':
      handleConnectionRequest(message, sender, sendResponse);
      return true;

    case 'DISCONNECT_WALLET':
      handleDisconnectWallet(message, sender, sendResponse);
      return true;

    case 'SIGN_TRANSACTION':
      handleSignTransaction(message, sender, sendResponse);
      return true;

    case 'SIGN_ALL_TRANSACTIONS':
      handleSignAllTransactions(message, sender, sendResponse);
      return true;

    case 'SIGN_MESSAGE':
      handleSignMessage(message, sender, sendResponse);
      return true;

    case 'SIGN_AND_SEND_TRANSACTION':
      handleSignAndSendTransaction(message, sender, sendResponse);
      return true;

    case 'CONNECTION_APPROVED':
      handleConnectionApproved(message, sender, sendResponse);
      return true;

    case 'CONNECTION_REJECTED':
      handleConnectionRejected(message, sender, sendResponse);
      return true;

    case 'AUTH_COMPLETED':
      handleAuthCompleted(message, sender, sendResponse);
      return true;

    default:
      console.log('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
});

// Store pending connection requests
const pendingConnectionRequests = new Map();

// Handle connection requests from dApps
async function handleConnectionRequest(message, sender, sendResponse) {
  console.log('🔗 Background: Processing connection request from:', sender.tab?.url);

  try {
    const storage = await chrome.storage.sync.get(['isAuthenticated', 'walletAddress']);
    const siteUrl = new URL(sender.tab.url).origin;

    console.log('🔗 Background: Storage check:', { isAuthenticated: storage.isAuthenticated, hasWallet: !!storage.walletAddress });
    console.log('🔗 Background: Site URL:', siteUrl);

    // Generate unique request ID for this connection attempt
    const requestId = Date.now() + Math.random().toString(36).substr(2, 9);

    // Store the pending request (even if not authenticated yet)
    pendingConnectionRequests.set(requestId, {
      sendResponse,
      tabId: sender.tab.id,
      origin: siteUrl,
      timestamp: Date.now(),
      authenticated: storage.isAuthenticated
    });

    // Get site info for the popup
    const siteTitle = sender.tab.title || 'Unknown Site';
    const siteFavicon = sender.tab.favIconUrl || null;

    if (!storage.isAuthenticated) {
      console.log('🔑 User not authenticated, opening extension popup first...');

      // Open extension popup for authentication first - use hash routing consistently
      const authPopupUrl = chrome.runtime.getURL('popup.html') +
        `#/?auth=true&requestId=${requestId}&returnTo=connection`;

      console.log('🚀 Opening auth popup with URL:', authPopupUrl);

      chrome.windows.create({
        url: authPopupUrl,
        type: 'popup',
        width: 400,
        height: 600,
        focused: true
      });

      // Don't send response yet - wait for authentication
      return;
    }

    // Check if site is already connected
    const { connectedSites = [] } = await chrome.storage.sync.get(['connectedSites']);

    if (connectedSites.includes(siteUrl)) {
      // Clean up and return immediately for already connected sites
      pendingConnectionRequests.delete(requestId);
      sendResponse({
        success: true,
        publicKey: storage.walletAddress
      });
      return;
    }

    // Create connection approval popup - use search parameters, not hash parameters
    const popupUrl = chrome.runtime.getURL('popup.html') +
      `?page=connection-request&` +
      `origin=${encodeURIComponent(siteUrl)}&` +
      `title=${encodeURIComponent(siteTitle)}&` +
      `favicon=${encodeURIComponent(siteFavicon || '')}&` +
      `tabId=${sender.tab.id}&` +
      `requestId=${requestId}#/connection-request`;

    console.log('🔗 Opening connection approval popup:', popupUrl);

    chrome.windows.create({
      url: popupUrl,
      type: 'popup',
      width: 400,
      height: 600,
      focused: true
    });

    // Set timeout for request (5 minutes)
    setTimeout(() => {
      if (pendingConnectionRequests.has(requestId)) {
        const request = pendingConnectionRequests.get(requestId);
        request.sendResponse({
          success: false,
          error: 'Connection request timed out'
        });
        pendingConnectionRequests.delete(requestId);
      }
    }, 5 * 60 * 1000); // 5 minutes

  } catch (error) {
    console.error('Connection request error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle wallet disconnection
async function handleDisconnectWallet(message, sender, sendResponse) {
  try {
    const { connectedSites = [] } = await chrome.storage.sync.get(['connectedSites']);
    const siteUrl = new URL(sender.tab.url).origin;

    const updatedSites = connectedSites.filter(site => site !== siteUrl);
    await chrome.storage.sync.set({ connectedSites: updatedSites });

    sendResponse({ success: true });
  } catch (error) {
    console.error('Disconnection error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle transaction signing
async function handleSignTransaction(message, sender, sendResponse) {
  try {
    // Check authentication and connection
    const storage = await chrome.storage.sync.get(['isAuthenticated', 'connectedSites']);
    const siteUrl = new URL(sender.tab.url).origin;

    if (!storage.isAuthenticated || !storage.connectedSites.includes(siteUrl)) {
      sendResponse({
        success: false,
        error: 'Wallet not connected to this site'
      });
      return;
    }

    // In a real implementation, you would:
    // 1. Show transaction approval popup
    // 2. Sign the transaction with the user's private key
    // 3. Return the signed transaction

    // For now, return a mock response
    sendResponse({
      success: false,
      error: 'Transaction signing not yet implemented'
    });
  } catch (error) {
    console.error('Transaction signing error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle signing multiple transactions
async function handleSignAllTransactions(message, sender, sendResponse) {
  try {
    const storage = await chrome.storage.sync.get(['isAuthenticated', 'connectedSites']);
    const siteUrl = new URL(sender.tab.url).origin;

    if (!storage.isAuthenticated || !storage.connectedSites.includes(siteUrl)) {
      sendResponse({
        success: false,
        error: 'Wallet not connected to this site'
      });
      return;
    }

    // Mock implementation
    sendResponse({
      success: false,
      error: 'Batch transaction signing not yet implemented'
    });
  } catch (error) {
    console.error('Batch signing error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle message signing
async function handleSignMessage(message, sender, sendResponse) {
  try {
    const storage = await chrome.storage.sync.get(['isAuthenticated', 'connectedSites']);
    const siteUrl = new URL(sender.tab.url).origin;

    if (!storage.isAuthenticated || !storage.connectedSites.includes(siteUrl)) {
      sendResponse({
        success: false,
        error: 'Wallet not connected to this site'
      });
      return;
    }

    // Mock implementation
    sendResponse({
      success: false,
      error: 'Message signing not yet implemented'
    });
  } catch (error) {
    console.error('Message signing error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle sign and send transaction
async function handleSignAndSendTransaction(message, sender, sendResponse) {
  try {
    const storage = await chrome.storage.sync.get(['isAuthenticated', 'connectedSites']);
    const siteUrl = new URL(sender.tab.url).origin;

    if (!storage.isAuthenticated || !storage.connectedSites.includes(siteUrl)) {
      sendResponse({
        success: false,
        error: 'Wallet not connected to this site'
      });
      return;
    }

    // Mock implementation
    sendResponse({
      success: false,
      error: 'Sign and send transaction not yet implemented'
    });
  } catch (error) {
    console.error('Sign and send error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle connection approval
async function handleConnectionApproved(message, sender, sendResponse) {
  try {
    const { requestId, publicKey, origin } = message;

    if (!pendingConnectionRequests.has(requestId)) {
      sendResponse({ success: false, error: 'Request not found or expired' });
      return;
    }

    const request = pendingConnectionRequests.get(requestId);

    // Send success response to the original dApp request
    request.sendResponse({
      success: true,
      publicKey: publicKey
    });

    // Clean up the pending request
    pendingConnectionRequests.delete(requestId);

    sendResponse({ success: true });
  } catch (error) {
    console.error('Connection approval error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle connection rejection
async function handleConnectionRejected(message, sender, sendResponse) {
  try {
    const { requestId } = message;

    if (!pendingConnectionRequests.has(requestId)) {
      sendResponse({ success: false, error: 'Request not found or expired' });
      return;
    }

    const request = pendingConnectionRequests.get(requestId);

    // Send rejection response to the original dApp request
    request.sendResponse({
      success: false,
      error: 'User rejected the connection request'
    });

    // Clean up the pending request
    pendingConnectionRequests.delete(requestId);

    sendResponse({ success: true });
  } catch (error) {
    console.error('Connection rejection error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle authentication completion
async function handleAuthCompleted(message, sender, sendResponse) {
  try {
    const { requestId } = message;

    console.log('🎯 AUTH_COMPLETED received for requestId:', requestId);
    console.log('📦 Pending requests:', Array.from(pendingConnectionRequests.keys()));

    if (!requestId || !pendingConnectionRequests.has(requestId)) {
      console.log('❌ No pending connection request found for requestId:', requestId);
      sendResponse({ success: false, error: 'No pending connection request found' });
      return;
    }

    const request = pendingConnectionRequests.get(requestId);
    const { origin, tabId } = request;

    console.log('✅ Authentication completed, proceeding with connection approval...');
    console.log('🌐 Request details:', { origin, tabId });

    // Get updated storage after authentication
    const storage = await chrome.storage.sync.get(['isAuthenticated', 'walletAddress', 'connectedSites']);

    console.log('💾 Current storage:', storage);

    if (!storage.isAuthenticated) {
      // Still not authenticated
      console.log('❌ Storage shows user still not authenticated');
      request.sendResponse({
        success: false,
        error: 'Authentication failed'
      });
      pendingConnectionRequests.delete(requestId);
      sendResponse({ success: false, error: 'Authentication failed' });
      return;
    }

    // Check if site is already connected
    const { connectedSites = [] } = storage;
    if (connectedSites.includes(origin)) {
      // Auto-approve if already connected
      console.log('✅ Site already connected, auto-approving');
      request.sendResponse({
        success: true,
        publicKey: storage.walletAddress
      });
      pendingConnectionRequests.delete(requestId);
      sendResponse({ success: true });
      return;
    }

    // Get tab info for the approval popup
    try {
      const tab = await chrome.tabs.get(tabId);
      const siteTitle = tab.title || 'Unknown Site';
      const siteFavicon = tab.favIconUrl || null;

      // Open connection approval popup - fix URL structure
      const popupUrl = chrome.runtime.getURL('popup.html') +
        `?page=connection-request&` +
        `origin=${encodeURIComponent(origin)}&` +
        `title=${encodeURIComponent(siteTitle)}&` +
        `favicon=${encodeURIComponent(siteFavicon || '')}&` +
        `tabId=${tabId}&` +
        `requestId=${requestId}#/connection-request`;

      console.log('🔗 Opening connection approval popup after auth:', popupUrl);

      const newWindow = await chrome.windows.create({
        url: popupUrl,
        type: 'popup',
        width: 400,
        height: 600,
        focused: true
      });

      console.log('🪟 Connection approval window created:', newWindow.id);

      sendResponse({ success: true });

    } catch (tabError) {
      console.error('❌ Error getting tab info:', tabError);
      // Tab might be closed, reject the request
      request.sendResponse({
        success: false,
        error: 'Original tab no longer available'
      });
      pendingConnectionRequests.delete(requestId);
      sendResponse({ success: false, error: 'Tab no longer available' });
    }

  } catch (error) {
    console.error('❌ Auth completion error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('Storage changed:', changes, 'in', areaName);

  // Notify all open tabs about storage changes
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'STORAGE_CHANGED',
        changes: changes
      }).catch(() => {
        // Ignore errors for tabs that don't have content script
      });
    });
  });
});

// Handle tab updates (if needed for injecting content script)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Could inject content script dynamically if needed
    console.log('Tab updated:', tab.url);
  }
});
