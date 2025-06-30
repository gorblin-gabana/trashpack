(function() {
  'use strict';

  console.log('🗑️ TrashPack injected.js script starting...');

  // Prevent double injection
  if (window.trashpack) {
    console.log('⚠️ TrashPack wallet already exists, skipping injection');
    return;
  }

  // Event system for wallet
  class EventEmitter {
    constructor() {
      this.events = {};
    }

    on(event, callback) {
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].push(callback);
    }

    off(event, callback) {
      if (!this.events[event]) return;
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
      if (!this.events[event]) return;
      this.events[event].forEach(callback => callback(data));
    }
  }

  // TrashPack Wallet Provider
  class TrashPackWallet extends EventEmitter {
    constructor() {
      super();
      this.isTrashPack = true;
      this.name = 'TrashPack';
      this.icon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2IDBDOS4zNzMgMCA0IDUuMzczIDQgMTJTOS4zNzMgMjQgMTYgMjRTMjggMTguNjI3IDI4IDEyUzIyLjYyNyAwIDE2IDBaIiBmaWxsPSIjOUE0M0ZGIi8+Cjwvc3ZnPgo=';
      this.version = '1.0.0';
      this.connected = false;
      this.connecting = false;
      this.publicKey = null;

      // Bind methods
      this.connect = this.connect.bind(this);
      this.disconnect = this.disconnect.bind(this);
      this.signTransaction = this.signTransaction.bind(this);
      this.signAllTransactions = this.signAllTransactions.bind(this);
      this.signMessage = this.signMessage.bind(this);
      this.signAndSendTransaction = this.signAndSendTransaction.bind(this);

      // Listen for responses from content script
      window.addEventListener('message', this._handleMessage.bind(this));
    }

    // Connect to wallet
    async connect(options = {}) {
      if (this.connecting) {
        throw new Error('Connection request already pending');
      }

      if (this.connected) {
        return { publicKey: this.publicKey };
      }

      this.connecting = true;

      try {
        const response = await this._sendMessage('TRASHPACK_CONNECT', {
          onlyIfTrusted: options.onlyIfTrusted || false
        });

        if (response.success) {
          this.connected = true;
          this.publicKey = response.publicKey;
          this.emit('connect', this.publicKey);
          return { publicKey: this.publicKey };
        } else {
          throw new Error(response.error || 'Connection failed');
        }
      } finally {
        this.connecting = false;
      }
    }

    // Disconnect from wallet
    async disconnect() {
      if (!this.connected) {
        return;
      }

      try {
        await this._sendMessage('TRASHPACK_DISCONNECT');
        this.connected = false;
        this.publicKey = null;
        this.emit('disconnect');
      } catch (error) {
        console.error('Disconnect error:', error);
        // Force disconnect even if message fails
        this.connected = false;
        this.publicKey = null;
        this.emit('disconnect');
      }
    }

    // Sign transaction
    async signTransaction(transaction) {
      if (!this.connected) {
        throw new Error('Wallet not connected');
      }

      const response = await this._sendMessage('TRASHPACK_SIGN_TRANSACTION', {
        transaction: this._serializeTransaction(transaction)
      });

      if (response.success) {
        return this._deserializeTransaction(response.signedTransaction);
      } else {
        throw new Error(response.error || 'Transaction signing failed');
      }
    }

    // Sign multiple transactions
    async signAllTransactions(transactions) {
      if (!this.connected) {
        throw new Error('Wallet not connected');
      }

      const response = await this._sendMessage('TRASHPACK_SIGN_ALL_TRANSACTIONS', {
        transactions: transactions.map(tx => this._serializeTransaction(tx))
      });

      if (response.success) {
        return response.signedTransactions.map(tx => this._deserializeTransaction(tx));
      } else {
        throw new Error(response.error || 'Transaction signing failed');
      }
    }

    // Sign message
    async signMessage(message) {
      if (!this.connected) {
        throw new Error('Wallet not connected');
      }

      const encodedMessage = new TextEncoder().encode(message);
      const response = await this._sendMessage('TRASHPACK_SIGN_MESSAGE', {
        message: Array.from(encodedMessage)
      });

      if (response.success) {
        return {
          signature: new Uint8Array(response.signature),
          publicKey: this.publicKey
        };
      } else {
        throw new Error(response.error || 'Message signing failed');
      }
    }

    // Sign and send transaction
    async signAndSendTransaction(transaction, options = {}) {
      if (!this.connected) {
        throw new Error('Wallet not connected');
      }

      const response = await this._sendMessage('TRASHPACK_SIGN_AND_SEND_TRANSACTION', {
        transaction: this._serializeTransaction(transaction),
        options
      });

      if (response.success) {
        return { signature: response.signature };
      } else {
        throw new Error(response.error || 'Transaction failed');
      }
    }

    // Private method to send messages to content script
    _sendMessage(type, data = {}) {
      console.log(`🔗 TrashPack: Sending message type: ${type}`, { data, origin: window.location.origin });

      return new Promise((resolve, reject) => {
        const messageId = Date.now() + Math.random();

        const message = {
          type,
          data,
          messageId,
          source: 'trashpack-injected'
        };

        console.log('🔗 TrashPack: Posting message to content script:', message);
        window.postMessage(message, '*');

        const handleResponse = (event) => {
          console.log('🔗 TrashPack: Received response event:', event.data);
          if (event.data.type === `${type}_RESPONSE` && event.data.messageId === messageId) {
            console.log(`✅ TrashPack: Got matching response for ${type}:`, event.data);
            window.removeEventListener('message', handleResponse);
            resolve(event.data);
          }
        };

        window.addEventListener('message', handleResponse);

        // Timeout after 30 seconds
        setTimeout(() => {
          window.removeEventListener('message', handleResponse);
          reject(new Error('Request timeout'));
        }, 30000);
      });
    }

    // Handle messages from content script
    _handleMessage(event) {
      if (event.source !== window) return;

      const { type, data } = event.data;

      switch (type) {
        case 'TRASHPACK_ACCOUNT_CHANGED':
          this._handleAccountChanged(data);
          break;
        case 'TRASHPACK_DISCONNECTED':
          this._handleDisconnected();
          break;
      }
    }

    // Handle account change
    _handleAccountChanged(data) {
      const oldPublicKey = this.publicKey;
      this.publicKey = data.publicKey;

      if (oldPublicKey !== this.publicKey) {
        this.emit('accountChanged', this.publicKey);
      }
    }

    // Handle disconnection
    _handleDisconnected() {
      this.connected = false;
      this.publicKey = null;
      this.emit('disconnect');
    }

    // Serialize transaction for message passing
    _serializeTransaction(transaction) {
      // Convert transaction to serializable format
      return {
        ...transaction,
        serialize: () => Array.from(transaction.serialize())
      };
    }

    // Deserialize transaction from message
    _deserializeTransaction(serializedTransaction) {
      // Convert back to transaction object
      return serializedTransaction;
    }
  }

  // Create wallet instance
  const trashpack = new TrashPackWallet();

  // Add to window
  Object.defineProperty(window, 'trashpack', {
    value: trashpack,
    writable: false,
    configurable: false
  });

  // Also add to window.solana for compatibility
  if (!window.solana) {
    Object.defineProperty(window, 'solana', {
      value: trashpack,
      writable: false,
      configurable: false
    });
  }

  // Dispatch ready event
  window.dispatchEvent(new CustomEvent('trashpack#initialized', {
    detail: trashpack
  }));

  // For backwards compatibility
  window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', {
    detail: {
      register: (callback) => callback(trashpack)
    }
  }));

  console.log('✅ TrashPack wallet provider injected successfully');
  console.log('🔍 window.trashpack:', window.trashpack);
  console.log('🔍 window.solana:', window.solana);
})();
