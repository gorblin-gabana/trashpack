// Universal secure storage utility for both Chrome extensions and web applications
// Uses Web Crypto API for proper encryption with fallbacks for different environments

class SecureStorage {
  constructor() {
    this.isExtensionContext = typeof chrome !== 'undefined' && chrome.storage;
    this.isWebContext = typeof window !== 'undefined' && !this.isExtensionContext;
    this.storageKey = 'wallet_encrypted_data';
    this.saltKey = 'wallet_encryption_salt';

    // Initialize storage backend
    this.initializeStorage();
  }

  // Initialize appropriate storage backend
  initializeStorage() {
    if (this.isExtensionContext) {
      this.storageBackend = 'chrome';
      console.log('🔒 Secure storage initialized for Chrome Extension');
    } else if (this.isWebContext) {
      // Check if IndexedDB is available for web apps
      if (typeof indexedDB !== 'undefined') {
        this.storageBackend = 'indexeddb';
        console.log('🔒 Secure storage initialized for Web App (IndexedDB)');
      } else {
        this.storageBackend = 'localstorage';
        console.log('🔒 Secure storage initialized for Web App (localStorage fallback)');
      }
    } else {
      throw new Error('Unsupported environment for secure storage');
    }
  }

  // Generate a cryptographically secure random salt
  async generateSalt() {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(salt);
  }

  // Derive encryption key from password using PBKDF2
  async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(salt),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt data using AES-GCM
  async encrypt(data, password) {
    try {
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(JSON.stringify(data));

      // Generate salt and IV
      const salt = await this.generateSalt();
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Derive key
      const key = await this.deriveKey(password, salt);

      // Encrypt data
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBytes
      );

      return {
        encryptedData: Array.from(new Uint8Array(encryptedData)),
        salt: salt,
        iv: Array.from(iv),
        version: '2.0' // Version for future compatibility
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data using AES-GCM
  async decrypt(encryptedPackage, password) {
    try {
      const { encryptedData, salt, iv, version } = encryptedPackage;

      // Handle legacy data without version
      if (!version) {
        throw new Error('Legacy encrypted data detected - migration required');
      }

      // Derive key using stored salt
      const key = await this.deriveKey(password, salt);

      // Decrypt data
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        new Uint8Array(encryptedData)
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decryptedData));
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data - invalid password or corrupted data');
    }
  }

  // Chrome Extension Storage Methods
  async chromeSetSecureData(key, data, password) {
    const encryptedPackage = await this.encrypt(data, password);
    await chrome.storage.local.set({ [key]: encryptedPackage });
    return true;
  }

  async chromeGetSecureData(key, password) {
    const result = await chrome.storage.local.get([key]);
    const encryptedPackage = result[key];

    if (!encryptedPackage) {
      return null;
    }

    return await this.decrypt(encryptedPackage, password);
  }

  async chromeSetData(key, data) {
    await chrome.storage.sync.set({ [key]: data });
    return true;
  }

  async chromeGetData(key) {
    const result = await chrome.storage.sync.get([key]);
    return result[key] || null;
  }

  async chromeRemoveData(key) {
    await chrome.storage.local.remove([key]);
    return true;
  }

  async chromeClearData() {
    await chrome.storage.local.clear();
    await chrome.storage.sync.clear();
    return true;
  }

  // IndexedDB Storage Methods (for web apps)
  async openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SecureWalletDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('secureData')) {
          db.createObjectStore('secureData');
        }
        if (!db.objectStoreNames.contains('publicData')) {
          db.createObjectStore('publicData');
        }
      };
    });
  }

  async indexedDBSetSecureData(key, data, password) {
    const encryptedPackage = await this.encrypt(data, password);
    const db = await this.openIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['secureData'], 'readwrite');
      const store = transaction.objectStore('secureData');
      const request = store.put(encryptedPackage, key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async indexedDBGetSecureData(key, password) {
    const db = await this.openIndexedDB();

    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction(['secureData'], 'readonly');
      const store = transaction.objectStore('secureData');
      const request = store.get(key);

      request.onsuccess = async () => {
        const encryptedPackage = request.result;
        if (!encryptedPackage) {
          resolve(null);
          return;
        }

        try {
          const decryptedData = await this.decrypt(encryptedPackage, password);
          resolve(decryptedData);
        } catch (error) {
          reject(error);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async indexedDBSetData(key, data) {
    const db = await this.openIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['publicData'], 'readwrite');
      const store = transaction.objectStore('publicData');
      const request = store.put(data, key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async indexedDBGetData(key) {
    const db = await this.openIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['publicData'], 'readonly');
      const store = transaction.objectStore('publicData');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async indexedDBRemoveData(key) {
    const db = await this.openIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['secureData'], 'readwrite');
      const store = transaction.objectStore('secureData');
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async indexedDBClearData() {
    const db = await this.openIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['secureData', 'publicData'], 'readwrite');
      const secureStore = transaction.objectStore('secureData');
      const publicStore = transaction.objectStore('publicData');

      const clearSecure = secureStore.clear();
      const clearPublic = publicStore.clear();

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // localStorage Storage Methods (fallback for web apps)
  async localStorageSetSecureData(key, data, password) {
    const encryptedPackage = await this.encrypt(data, password);
    localStorage.setItem(`secure_${key}`, JSON.stringify(encryptedPackage));
    return true;
  }

  async localStorageGetSecureData(key, password) {
    const stored = localStorage.getItem(`secure_${key}`);
    if (!stored) {
      return null;
    }

    const encryptedPackage = JSON.parse(stored);
    return await this.decrypt(encryptedPackage, password);
  }

  async localStorageSetData(key, data) {
    localStorage.setItem(`public_${key}`, JSON.stringify(data));
    return true;
  }

  async localStorageGetData(key) {
    const stored = localStorage.getItem(`public_${key}`);
    return stored ? JSON.parse(stored) : null;
  }

  async localStorageRemoveData(key) {
    localStorage.removeItem(`secure_${key}`);
    return true;
  }

  async localStorageClearData() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('secure_') || key.startsWith('public_')) {
        localStorage.removeItem(key);
      }
    });
    return true;
  }

  // Universal API Methods (auto-route to appropriate backend)
  async setSecureData(key, data, password) {
    try {
      switch (this.storageBackend) {
        case 'chrome':
          return await this.chromeSetSecureData(key, data, password);
        case 'indexeddb':
          return await this.indexedDBSetSecureData(key, data, password);
        case 'localstorage':
          return await this.localStorageSetSecureData(key, data, password);
        default:
          throw new Error('No storage backend available');
      }
    } catch (error) {
      console.error('Secure storage error:', error);
      throw new Error('Failed to store secure data');
    }
  }

  async getSecureData(key, password) {
    try {
      switch (this.storageBackend) {
        case 'chrome':
          return await this.chromeGetSecureData(key, password);
        case 'indexeddb':
          return await this.indexedDBGetSecureData(key, password);
        case 'localstorage':
          return await this.localStorageGetSecureData(key, password);
        default:
          throw new Error('No storage backend available');
      }
    } catch (error) {
      console.error('Secure retrieval error:', error);
      throw new Error('Failed to retrieve secure data');
    }
  }

  async setData(key, data) {
    try {
      switch (this.storageBackend) {
        case 'chrome':
          return await this.chromeSetData(key, data);
        case 'indexeddb':
          return await this.indexedDBSetData(key, data);
        case 'localstorage':
          return await this.localStorageSetData(key, data);
        default:
          throw new Error('No storage backend available');
      }
    } catch (error) {
      console.error('Storage error:', error);
      throw new Error('Failed to store data');
    }
  }

  async getData(key) {
    try {
      switch (this.storageBackend) {
        case 'chrome':
          return await this.chromeGetData(key);
        case 'indexeddb':
          return await this.indexedDBGetData(key);
        case 'localstorage':
          return await this.localStorageGetData(key);
        default:
          throw new Error('No storage backend available');
      }
    } catch (error) {
      console.error('Retrieval error:', error);
      throw new Error('Failed to retrieve data');
    }
  }

  async removeSecureData(key) {
    try {
      switch (this.storageBackend) {
        case 'chrome':
          return await this.chromeRemoveData(key);
        case 'indexeddb':
          return await this.indexedDBRemoveData(key);
        case 'localstorage':
          return await this.localStorageRemoveData(key);
        default:
          throw new Error('No storage backend available');
      }
    } catch (error) {
      console.error('Secure removal error:', error);
      throw new Error('Failed to remove secure data');
    }
  }

  async clearSecureData() {
    try {
      switch (this.storageBackend) {
        case 'chrome':
          return await this.chromeClearData();
        case 'indexeddb':
          return await this.indexedDBClearData();
        case 'localstorage':
          return await this.localStorageClearData();
        default:
          throw new Error('No storage backend available');
      }
    } catch (error) {
      console.error('Clear storage error:', error);
      throw new Error('Failed to clear storage');
    }
  }

  // Generate secure random password for encryption
  generateSecurePassword() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Check environment information
  getStorageInfo() {
    return {
      isExtension: this.isExtensionContext,
      isWeb: this.isWebContext,
      backend: this.storageBackend,
      cryptoSupported: typeof crypto !== 'undefined' && !!crypto.subtle
    };
  }

  // Check if running in extension context
  isExtension() {
    return this.isExtensionContext;
  }
}

export default new SecureStorage();
