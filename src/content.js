// Content script for TrashPack Wallet Extension
// This script runs in the context of web pages

console.log('TrashPack Wallet content script loaded');

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);

  switch (message.type) {
    case 'STORAGE_CHANGED':
      handleStorageChange(message.changes);
      break;

    case 'GET_PAGE_INFO':
      sendResponse({
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname
      });
      break;

    default:
      console.log('Unknown message type in content script:', message.type);
  }
});

// Handle storage changes
function handleStorageChange(changes) {
  console.log('Storage changed in content script:', changes);

  // Notify injected script of wallet state changes
  if (changes.isAuthenticated) {
    console.log('Authentication state changed:', changes.isAuthenticated.newValue);

    if (!changes.isAuthenticated.newValue) {
      // User logged out, disconnect wallet
      window.postMessage({
        type: 'TRASHPACK_DISCONNECTED'
      }, '*');
    }
  }

  if (changes.walletAddress) {
    console.log('Wallet address changed:', changes.walletAddress.newValue);

    // Notify about account change
    window.postMessage({
      type: 'TRASHPACK_ACCOUNT_CHANGED',
      data: {
        publicKey: changes.walletAddress.newValue
      }
    }, '*');
  }
}

// Inject TrashPack wallet functionality into web pages
function injectWalletAPI() {
  console.log('🚀 Attempting to inject TrashPack wallet script...');
  try {
    const script = document.createElement('script');
    const scriptUrl = chrome.runtime.getURL('injected.js');
    console.log('📄 Script URL:', scriptUrl);

    script.src = scriptUrl;
    script.onload = function() {
      console.log('✅ TrashPack injected.js loaded successfully');
      this.remove();
    };
    script.onerror = function(error) {
      console.error('❌ Failed to load injected.js:', error);
    };

    const target = document.head || document.documentElement;
    console.log('📍 Injecting into:', target.tagName);
    target.appendChild(script);

    console.log('📦 Script element added to DOM');
  } catch (error) {
    console.error('💥 Failed to inject TrashPack wallet script:', error);
  }
}

// Listen for messages from injected script
window.addEventListener('message', (event) => {
  if (event.source !== window || event.data.source !== 'trashpack-injected') {
    return;
  }

  const { type, data, messageId } = event.data;
  console.log('🔗 Content script received message from injected script:', { type, data, messageId });

  switch (type) {
    case 'TRASHPACK_CONNECT':
      handleTrashPackConnect(data, messageId);
      break;

    case 'TRASHPACK_DISCONNECT':
      handleTrashPackDisconnect(messageId);
      break;

    case 'TRASHPACK_SIGN_TRANSACTION':
      handleTrashPackSignTransaction(data, messageId);
      break;

    case 'TRASHPACK_SIGN_ALL_TRANSACTIONS':
      handleTrashPackSignAllTransactions(data, messageId);
      break;

    case 'TRASHPACK_SIGN_MESSAGE':
      handleTrashPackSignMessage(data, messageId);
      break;

    case 'TRASHPACK_SIGN_AND_SEND_TRANSACTION':
      handleTrashPackSignAndSendTransaction(data, messageId);
      break;
  }
});

// Handle TrashPack connection requests
function handleTrashPackConnect(data, messageId) {
  console.log('🔗 Content script handling TrashPack connect request:', { data, messageId });

  chrome.runtime.sendMessage({
    type: 'GET_STORAGE',
    keys: ['isAuthenticated', 'walletAddress']
  }, (response) => {
    console.log('🔗 Content script got storage response:', response);

    // Check for Chrome runtime errors
    if (chrome.runtime.lastError) {
      console.error('❌ Chrome runtime error in GET_STORAGE:', chrome.runtime.lastError);
      window.postMessage({
        type: 'TRASHPACK_CONNECT_RESPONSE',
        messageId,
        success: false,
        error: 'Extension communication error: ' + chrome.runtime.lastError.message
      }, '*');
      return;
    }

    if (response.isAuthenticated && response.walletAddress) {
      // Check if site is already connected
      chrome.runtime.sendMessage({
        type: 'GET_STORAGE',
        keys: ['connectedSites']
      }, (siteResponse) => {
        const { connectedSites = [] } = siteResponse;
        const siteUrl = window.location.origin;

        if (connectedSites.includes(siteUrl)) {
          console.log('✅ Content script: User already authenticated and site connected, sending success response');
          window.postMessage({
            type: 'TRASHPACK_CONNECT_RESPONSE',
            messageId,
            success: true,
            publicKey: response.walletAddress
          }, '*');
        } else {
          console.log('🔑 Content script: User authenticated but site not connected, requesting connection from background');
          chrome.runtime.sendMessage({
            type: 'REQUEST_CONNECTION',
            data
          }, (connectionResponse) => {
            console.log('🔗 Content script got connection response:', connectionResponse);

            if (chrome.runtime.lastError) {
              console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
              window.postMessage({
                type: 'TRASHPACK_CONNECT_RESPONSE',
                messageId,
                success: false,
                error: 'Extension communication error: ' + chrome.runtime.lastError.message
              }, '*');
              return;
            }

            if (connectionResponse && connectionResponse.success) {
              console.log('✅ Content script: Connection successful, sending success response');
              window.postMessage({
                type: 'TRASHPACK_CONNECT_RESPONSE',
                messageId,
                success: true,
                publicKey: connectionResponse.publicKey
              }, '*');
            } else {
              console.log('❌ Content script: Connection failed, sending error response');
              window.postMessage({
                type: 'TRASHPACK_CONNECT_RESPONSE',
                messageId,
                success: false,
                error: connectionResponse?.error || 'Connection rejected'
              }, '*');
            }
          });
        }
      });
    } else {
      console.log('🔑 Content script: User not authenticated or no wallet, requesting connection from background');
      // Request user to connect wallet - use the correct message type
      chrome.runtime.sendMessage({
        type: 'REQUEST_CONNECTION',  // This should match what background script expects
        data
      }, (connectionResponse) => {
        console.log('🔗 Content script got connection response:', connectionResponse);

        // Check for Chrome runtime errors
        if (chrome.runtime.lastError) {
          console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
          window.postMessage({
            type: 'TRASHPACK_CONNECT_RESPONSE',
            messageId,
            success: false,
            error: 'Extension communication error: ' + chrome.runtime.lastError.message
          }, '*');
          return;
        }

        if (connectionResponse && connectionResponse.success) {
          console.log('✅ Content script: Connection successful, sending success response');
          window.postMessage({
            type: 'TRASHPACK_CONNECT_RESPONSE',
            messageId,
            success: true,
            publicKey: connectionResponse.publicKey
          }, '*');
        } else {
          console.log('❌ Content script: Connection failed, sending error response');
          window.postMessage({
            type: 'TRASHPACK_CONNECT_RESPONSE',
            messageId,
            success: false,
            error: connectionResponse?.error || 'Connection rejected'
          }, '*');
        }
      });
    }
  });
}

// Handle TrashPack disconnection
function handleTrashPackDisconnect(messageId) {
  chrome.runtime.sendMessage({
    type: 'DISCONNECT_WALLET'
  }, () => {
    window.postMessage({
      type: 'TRASHPACK_DISCONNECT_RESPONSE',
      messageId,
      success: true
    }, '*');
  });
}

// Handle transaction signing
function handleTrashPackSignTransaction(data, messageId) {
  chrome.runtime.sendMessage({
    type: 'SIGN_TRANSACTION',
    transaction: data.transaction
  }, (response) => {
    window.postMessage({
      type: 'TRASHPACK_SIGN_TRANSACTION_RESPONSE',
      messageId,
      success: response.success,
      signedTransaction: response.signedTransaction,
      error: response.error
    }, '*');
  });
}

// Handle signing multiple transactions
function handleTrashPackSignAllTransactions(data, messageId) {
  chrome.runtime.sendMessage({
    type: 'SIGN_ALL_TRANSACTIONS',
    transactions: data.transactions
  }, (response) => {
    window.postMessage({
      type: 'TRASHPACK_SIGN_ALL_TRANSACTIONS_RESPONSE',
      messageId,
      success: response.success,
      signedTransactions: response.signedTransactions,
      error: response.error
    }, '*');
  });
}

// Handle message signing
function handleTrashPackSignMessage(data, messageId) {
  chrome.runtime.sendMessage({
    type: 'SIGN_MESSAGE',
    message: data.message
  }, (response) => {
    window.postMessage({
      type: 'TRASHPACK_SIGN_MESSAGE_RESPONSE',
      messageId,
      success: response.success,
      signature: response.signature,
      error: response.error
    }, '*');
  });
}

// Handle sign and send transaction
function handleTrashPackSignAndSendTransaction(data, messageId) {
  chrome.runtime.sendMessage({
    type: 'SIGN_AND_SEND_TRANSACTION',
    transaction: data.transaction,
    options: data.options
  }, (response) => {
    window.postMessage({
      type: 'TRASHPACK_SIGN_AND_SEND_TRANSACTION_RESPONSE',
      messageId,
      success: response.success,
      signature: response.signature,
      error: response.error
    }, '*');
  });
}

// Initialize the wallet API injection
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectWalletAPI);
} else {
  injectWalletAPI();
}
