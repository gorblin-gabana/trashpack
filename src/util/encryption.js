// DEPRECATED: This file contains insecure encryption methods
// Use secureStorage.js instead for proper encryption

import secureStorage from './secureStorage';

// Legacy encryption functions - DEPRECATED AND INSECURE
// These are kept only for migration purposes
const generateKey = () => {
  const fingerprint = navigator.userAgent + navigator.language + screen.width + screen.height;
  return btoa(fingerprint).slice(0, 32);
};

// DEPRECATED: Simple XOR encryption (not cryptographically secure)
export const encrypt = (text) => {
  console.warn('DEPRECATED: Using insecure encryption. Migrate to secureStorage.js');
  try {
    const key = generateKey();
    let encrypted = '';

    for (let i = 0; i < text.length; i++) {
      const keyChar = key.charCodeAt(i % key.length);
      const textChar = text.charCodeAt(i);
      encrypted += String.fromCharCode(textChar ^ keyChar);
    }

    return btoa(encrypted);
  } catch (err) {
    console.error('Encryption error:', err);
    return text;
  }
};

// DEPRECATED: Simple XOR decryption (not cryptographically secure)
export const decrypt = (encryptedText) => {
  console.warn('DEPRECATED: Using insecure decryption. Migrate to secureStorage.js');
  try {
    const key = generateKey();
    const encrypted = atob(encryptedText);
    let decrypted = '';

    for (let i = 0; i < encrypted.length; i++) {
      const keyChar = key.charCodeAt(i % key.length);
      const encryptedChar = encrypted.charCodeAt(i);
      decrypted += String.fromCharCode(encryptedChar ^ keyChar);
    }

    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return encryptedText;
  }
};

// Export secure storage for migration
export { default as secureStorage } from './secureStorage';
