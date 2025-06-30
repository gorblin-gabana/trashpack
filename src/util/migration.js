// Migration utility for moving from insecure IndexedDB to secure Chrome storage
import { get as idbGet, del as idbDel } from 'idb-keyval';
import { decrypt } from './encryption';
import secureStorage from './secureStorage';

class MigrationService {
  constructor() {
    this.migrationComplete = false;
  }

  // Check if there's old data that needs migration
  async checkForLegacyData() {
    try {
      const legacyMnemonic = await idbGet('walletMnemonic');
      const legacyAddress = await idbGet('walletAddress');
      const legacyHasWallet = await idbGet('hasWallet');

      return {
        hasLegacyData: !!(legacyMnemonic && legacyAddress && legacyHasWallet),
        legacyMnemonic,
        legacyAddress,
        legacyHasWallet
      };
    } catch (error) {
      console.error('Error checking for legacy data:', error);
      return { hasLegacyData: false };
    }
  }

  // Migrate data from IndexedDB to secure Chrome storage
  async migrateLegacyData(userPassword) {
    try {
      const legacyCheck = await this.checkForLegacyData();

      if (!legacyCheck.hasLegacyData) {
        console.log('No legacy data found to migrate');
        return { success: false, reason: 'No legacy data found' };
      }

      console.log('Starting migration of legacy wallet data...');

      // Decrypt the old mnemonic using the insecure method
      let decryptedMnemonic;
      try {
        decryptedMnemonic = decrypt(legacyCheck.legacyMnemonic);
      } catch (error) {
        console.error('Failed to decrypt legacy mnemonic:', error);
        return { success: false, reason: 'Failed to decrypt legacy data' };
      }

      // Load additional legacy data
      const legacyEnvironment = await idbGet('selectedEnvironment');
      const legacyNetworkId = await idbGet('selectedNetworkId');
      const legacyNetworkEnvironment = await idbGet('selectedNetworkEnvironment');
      const legacyCustomRpcUrls = await idbGet('customRpcUrls');

      // Prepare new secure wallet data
      const walletData = {
        mnemonic: decryptedMnemonic,
        walletAddress: legacyCheck.legacyAddress,
        hasWallet: legacyCheck.legacyHasWallet,
        selectedNetworkId: legacyNetworkId,
        selectedNetworkEnvironment: legacyNetworkEnvironment,
        selectedEnvironment: legacyEnvironment
      };

      // Store securely with user-provided password
      await secureStorage.setSecureData('walletData', walletData, userPassword);

      // Store non-sensitive data
      await secureStorage.setData('walletAddress', legacyCheck.legacyAddress);
      await secureStorage.setData('hasWallet', legacyCheck.legacyHasWallet);

      if (legacyEnvironment) {
        await secureStorage.setData('selectedEnvironment', legacyEnvironment);
      }

      if (legacyNetworkId) {
        await secureStorage.setData('selectedNetworkId', legacyNetworkId);
      }

      if (legacyNetworkEnvironment) {
        await secureStorage.setData('selectedNetworkEnvironment', legacyNetworkEnvironment);
      }

      if (legacyCustomRpcUrls) {
        await secureStorage.setData('customRpcUrls', legacyCustomRpcUrls);
      }

      // Clean up old insecure data
      await this.cleanupLegacyData();

      console.log('Migration completed successfully');
      this.migrationComplete = true;

      return {
        success: true,
        walletAddress: legacyCheck.legacyAddress,
        message: 'Wallet data migrated successfully to secure storage'
      };

    } catch (error) {
      console.error('Migration failed:', error);
      return {
        success: false,
        reason: 'Migration failed: ' + error.message
      };
    }
  }

  // Clean up old IndexedDB data after successful migration
  async cleanupLegacyData() {
    try {
      const keysToDelete = [
        'walletMnemonic',
        'walletAddress',
        'hasWallet',
        'selectedEnvironment',
        'selectedNetworkId',
        'selectedNetworkEnvironment',
        'customRpcUrls',
        'isAuthenticated'
      ];

      for (const key of keysToDelete) {
        try {
          await idbDel(key);
        } catch (error) {
          console.warn(`Failed to delete legacy key ${key}:`, error);
        }
      }

      console.log('Legacy data cleanup completed');
    } catch (error) {
      console.error('Error during legacy data cleanup:', error);
    }
  }

  // Check if migration has been completed
  isMigrationComplete() {
    return this.migrationComplete;
  }

  // Force cleanup of legacy data (for troubleshooting)
  async forceLegacyCleanup() {
    console.warn('Force cleaning legacy data...');
    await this.cleanupLegacyData();
  }
}

export default new MigrationService();
