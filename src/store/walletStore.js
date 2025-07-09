import { create } from 'zustand';
import { createSolanaRpc, devnet } from '@solana/kit';
import * as bip39 from 'bip39';
import secureStorage from '../util/secureStorage';
import { networks } from '../lib/config';
import { lamportsToTokens, safeToNumber } from '../util';
import gorbscanService from '../lib/gorbscanService';

export const useWalletStore = create((set, get) => ({
  // State
  walletAddress: '',
  balance: null,
  selectedNetwork: networks[0], // Default to Gorbchain mainnet
  selectedEnvironment: 'mainnet', // Default to mainnet
  customRpcUrls: {}, // Custom RPC URLs per network and environment
  isLoadingBalance: false,
  mnemonic: '',
  keypair: null,
  hasWallet: false,
  encryptionPassword: null, // Session-only encryption password
  accounts: [], // Array of derived accounts
  activeAccountIndex: 0, // Index of currently active account
  sessionTimeout: null, // Session timeout ID
  sessionDuration: 30 * 60 * 1000, // 30 minutes in milliseconds

  // Token-related state
  tokens: [], // Array of token balances
  nfts: [], // Array of NFTs
  isLoadingTokens: false,
  isLoadingNFTs: false,
  lastTokenRefresh: null, // Timestamp of last token refresh
  lastBalanceCheck: null, // Last native balance for change detection

  // Generate a session encryption password
  generateSessionPassword: () => {
    const password = secureStorage.generateSecurePassword();
    set({ encryptionPassword: password });
    return password;
  },

  // Start or extend wallet session
  startSession: (password) => {
    const { sessionTimeout, sessionDuration } = get();
    
    // Clear existing timeout
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    
    // Set encryption password
    set({ encryptionPassword: password });
    
    // Start new session timeout
    const newTimeout = setTimeout(() => {
      get().endSession();
    }, sessionDuration);
    
    set({ sessionTimeout: newTimeout });
  },

  // End wallet session (lock wallet)
  endSession: () => {
    const { sessionTimeout } = get();
    
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    
    set({
      encryptionPassword: null,
      sessionTimeout: null,
      mnemonic: '',
      keypair: null
    });
  },

  // Check if wallet is unlocked
  isWalletUnlocked: () => {
    const { encryptionPassword } = get();
    return !!encryptionPassword;
  },

  // Extend current session (called during operations)
  extendSession: () => {
    const { encryptionPassword, sessionTimeout, sessionDuration } = get();
    
    if (encryptionPassword && sessionTimeout) {
      // Clear existing timeout
      clearTimeout(sessionTimeout);
      
      // Start new session timeout
      const newTimeout = setTimeout(() => {
        get().endSession();
      }, sessionDuration);
      
      set({ sessionTimeout: newTimeout });
    }
  },

  // Actions
  setWalletAddress: async (address) => {
    set({ walletAddress: address });

    // Save wallet address to Chrome storage
    try {
      await secureStorage.setData('walletAddress', address);
    } catch (err) {
      // Silent fail for storage errors
    }
  },

  setSelectedNetwork: async (network) => {
    set({ selectedNetwork: network });
    // Persist the selected network (only ID and environment)
    try {
      await secureStorage.setData('selectedNetworkId', network.id);
      await secureStorage.setData('selectedNetworkEnvironment', network.environment);
    } catch (err) {
      // Silent fail for storage errors
    }
  },

  setSelectedEnvironment: async (environment) => {
    const { selectedNetwork } = get();
    // When environment changes, find a suitable network in that environment
    const availableNetworks = networks.filter(n =>
      n.environment === environment ||
      (environment === 'testnet' && n.environment === 'devnet')
    );

    // Try to keep the same chain if available in the new environment
    let newNetwork = availableNetworks.find(n => n.chain === selectedNetwork.chain);

    // If not available, pick the first network in the new environment
    if (!newNetwork) {
      newNetwork = availableNetworks[0];
    }

    set({
      selectedEnvironment: environment,
      selectedNetwork: newNetwork || selectedNetwork
    });

    // Persist the selected environment and network
    try {
      await secureStorage.setData('selectedEnvironment', environment);
      if (newNetwork) {
        await secureStorage.setData('selectedNetworkId', newNetwork.id);
        await secureStorage.setData('selectedNetworkEnvironment', newNetwork.environment);
      }
    } catch (err) {
      // Silent fail for storage errors
    }
  },

  // Get unique network key for custom RPC storage
  getNetworkKey: (network) => {
    // Create a unique key using network properties to differentiate between configs
    return `${network.id}_${network.environment}_${network.rpcUrl}`;
  },

  // Get RPC URL - returns custom URL if available, otherwise default
  getCurrentRpcUrl: () => {
    const { selectedNetwork, customRpcUrls } = get();
    const networkKey = get().getNetworkKey(selectedNetwork);
    return customRpcUrls[networkKey] || selectedNetwork.rpcUrl;
  },

  // Set custom RPC URL for current network
  setCustomRpcUrl: async (rpcUrl) => {
    const { selectedNetwork, customRpcUrls } = get();
    const networkKey = get().getNetworkKey(selectedNetwork);

    const updatedCustomRpcUrls = {
      ...customRpcUrls,
      [networkKey]: rpcUrl
    };

    set({ customRpcUrls: updatedCustomRpcUrls });

    // Persist to Chrome storage
    try {
      await secureStorage.setData('customRpcUrls', updatedCustomRpcUrls);
    } catch (err) {
      // Silent fail for storage errors
    }
  },

  // Reset RPC URL to default for current network
  resetRpcUrl: async () => {
    const { selectedNetwork, customRpcUrls } = get();
    const networkKey = get().getNetworkKey(selectedNetwork);

    const updatedCustomRpcUrls = { ...customRpcUrls };
    delete updatedCustomRpcUrls[networkKey];

    set({ customRpcUrls: updatedCustomRpcUrls });

    // Persist to Chrome storage
    try {
      await secureStorage.setData('customRpcUrls', updatedCustomRpcUrls);
    } catch (err) {
      // Silent fail for storage errors
    }
  },

  // Load custom RPC URLs from Chrome storage
  loadCustomRpcUrls: async () => {
    try {
      const storedCustomRpcUrls = await secureStorage.getData('customRpcUrls');
      if (storedCustomRpcUrls) {
        set({ customRpcUrls: storedCustomRpcUrls });
      }
    } catch (err) {
      // Silent fail for storage errors
    }
  },

  getFilteredNetworks: () => {
    const { selectedEnvironment } = get();
    return networks.filter(network =>
      network.environment === selectedEnvironment ||
      (selectedEnvironment === 'testnet' && network.environment === 'devnet')
    );
  },

  // Create keypair from mnemonic (browser-compatible)
  createKeypairFromMnemonic: async (mnemonic) => {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    try {
      // Generate seed from mnemonic
      const seed = bip39.mnemonicToSeedSync(mnemonic, "");

      // Use direct seed approach (browser-compatible)
      // For browser compatibility, we use the first 32 bytes of the seed directly
      // This is compatible with most Solana wallets and works reliably in browsers
      const derivedSeed = seed.slice(0, 32);

      // Use tweetnacl to create the Ed25519 keypair
      const nacl = await import('tweetnacl');
      const keypair = nacl.default.sign.keyPair.fromSeed(derivedSeed);

      // Convert public key to base58 address
      const bs58 = await import('bs58');
      const address = bs58.default.encode(keypair.publicKey);

      // Return a keypair object that's compatible with existing transaction code
      const compatibleKeypair = {
        address: address,
        secretKey: keypair.secretKey, // Already 64 bytes from tweetnacl
        publicKey: keypair.publicKey,
        // Store the raw nacl keypair for direct signing if needed
        _naclKeypair: keypair
      };

      return compatibleKeypair;
    } catch (error) {
      console.error('Error creating keypair from mnemonic:', error);
      throw new Error('Failed to create keypair from mnemonic: ' + error.message);
    }
  },

  // Create keypair from mnemonic and account index (browser-compatible)
  createKeypairFromMnemonicAndPath: async (mnemonic, accountIndex = 0) => {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    try {
      // Generate seed from the original mnemonic
      const seed = bip39.mnemonicToSeedSync(mnemonic, "");
      
      // For different accounts, modify the seed itself instead of the mnemonic
      // This maintains the original mnemonic's validity while creating different keypairs
      const accountSeed = new Uint8Array(seed);
      
      // Mix the account index into the seed to create unique seeds for each account
      if (accountIndex > 0) {
        for (let i = 0; i < accountSeed.length; i++) {
          accountSeed[i] = accountSeed[i] ^ (accountIndex * (i + 1) % 256);
        }
      }
      
      // Use direct seed approach (browser-compatible) 
      const derivedSeed = accountSeed.slice(0, 32);

      // Use tweetnacl to create the Ed25519 keypair
      const nacl = await import('tweetnacl');
      const keypair = nacl.default.sign.keyPair.fromSeed(derivedSeed);

      // Convert public key to base58 address
      const bs58 = await import('bs58');
      const address = bs58.default.encode(keypair.publicKey);

      // Return a keypair object that's compatible with existing transaction code
      const compatibleKeypair = {
        address: address,
        secretKey: keypair.secretKey, // Already 64 bytes from tweetnacl
        publicKey: keypair.publicKey,
        // Store the raw nacl keypair for direct signing if needed
        _naclKeypair: keypair
      };

      return compatibleKeypair;
    } catch (err) {
      console.error('Error creating keypair from mnemonic and path:', err);
      throw new Error('Failed to create keypair: ' + err.message);
    }
  },

  // Create keypair from private key (supports base58, hex, or byte array formats)
  createKeypairFromPrivateKey: async (privateKeyInput) => {
    try {
      let privateKeyBytes;

      // Handle different private key formats
      if (typeof privateKeyInput === 'string') {
        // Try base58 format first
        try {
          const bs58 = await import('bs58');
          privateKeyBytes = bs58.default.decode(privateKeyInput);
        } catch (base58Err) {
          // Try hex format
          try {
            // Remove 0x prefix if present
            const hexString = privateKeyInput.replace(/^0x/, '');
            if (!/^[0-9a-fA-F]+$/.test(hexString)) {
              throw new Error('Invalid hex format');
            }
            privateKeyBytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
          } catch (hexErr) {
            throw new Error('Invalid private key format. Expected base58 or hex string.');
          }
        }
      } else if (privateKeyInput instanceof Uint8Array || Array.isArray(privateKeyInput)) {
        privateKeyBytes = new Uint8Array(privateKeyInput);
      } else {
        throw new Error('Invalid private key format. Expected string, Uint8Array, or array.');
      }

      // Validate private key length
      if (privateKeyBytes.length === 64) {
        // This is likely a full secret key (32 bytes private + 32 bytes public)
        // Use the first 32 bytes as the seed
        privateKeyBytes = privateKeyBytes.slice(0, 32);
      } else if (privateKeyBytes.length !== 32) {
        throw new Error('Invalid private key length. Expected 32 or 64 bytes.');
      }

      // Use tweetnacl to create the Ed25519 keypair from the private key seed
      const nacl = await import('tweetnacl');
      const keypair = nacl.default.sign.keyPair.fromSeed(privateKeyBytes);

      // Convert public key to base58 address
      const bs58 = await import('bs58');
      const address = bs58.default.encode(keypair.publicKey);

      // Return a keypair object that's compatible with existing transaction code
      const compatibleKeypair = {
        address: address,
        secretKey: keypair.secretKey, // 64 bytes from tweetnacl
        publicKey: keypair.publicKey,
        // Store the raw nacl keypair for direct signing if needed
        _naclKeypair: keypair,
        // Mark this as imported so we know it's not derived from the main mnemonic
        isImported: true
      };

      return compatibleKeypair;
    } catch (err) {
      console.error('Error creating keypair from private key:', err);
      throw new Error('Failed to create keypair from private key: ' + err.message);
    }
  },

  generateWallet: async () => {
    set({ isLoadingBalance: true });

    try {
      // Generate a new mnemonic
      const mnemonic = bip39.generateMnemonic();

      // Create first account (index 0)
      const keypair = await get().createKeypairFromMnemonicAndPath(mnemonic, 0);
      const walletAddress = keypair.address;

      // Create initial account
      const initialAccount = {
        index: 0,
        name: 'Account 1',
        address: walletAddress,
        keypair: keypair,
        balance: null
      };

      // Store wallet data but don't set hasWallet yet
      set({
        mnemonic,
        keypair,
        walletAddress,
        accounts: [initialAccount],
        activeAccountIndex: 0,
        isLoadingBalance: false
      });

      // Save default network selection to localStorage when first creating wallet
      const { selectedNetwork, selectedEnvironment } = get();
      try {
        await secureStorage.setData('selectedNetworkId', selectedNetwork.id);
        await secureStorage.setData('selectedNetworkEnvironment', selectedNetwork.environment);
        await secureStorage.setData('selectedEnvironment', selectedEnvironment);
      } catch (err) {
        console.error('Error saving default network settings:', err);
      }

      return { walletAddress, mnemonic };
    } catch (err) {
      set({ isLoadingBalance: false });
      console.error('Error generating wallet:', err);
      throw new Error('Error generating wallet: ' + err.message);
    }
  },

  // Add new account from same seed phrase
  addAccount: async () => {
    const { mnemonic, accounts, encryptionPassword } = get();
    
    if (!mnemonic || !encryptionPassword) {
      throw new Error('Wallet must be unlocked to add new accounts. Please unlock your wallet first.');
    }

    // Extend session since user is actively using the wallet
    get().extendSession();

    try {
      // If this is the first account being added and the existing account has no keypair,
      // we might need to populate the first account's keypair too
      let updatedAccounts = [...accounts];
      
      // Check if first account needs keypair
      if (updatedAccounts.length > 0 && !updatedAccounts[0].keypair) {
        const firstAccountKeypair = await get().createKeypairFromMnemonicAndPath(mnemonic, 0);
        updatedAccounts[0] = {
          ...updatedAccounts[0],
          keypair: firstAccountKeypair
        };
      }
      
      const newIndex = accounts.length;
      const newKeypair = await get().createKeypairFromMnemonicAndPath(mnemonic, newIndex);
      
      const newAccount = {
        index: newIndex,
        name: `Account ${newIndex + 1}`,
        address: newKeypair.address,
        keypair: newKeypair,
        balance: null
      };

      updatedAccounts.push(newAccount);
      set({ accounts: updatedAccounts });

      // Save updated accounts to encrypted storage
      await get().saveAccountsToStorage();

      return newAccount;
    } catch (err) {
      console.error('Error adding account:', err);
      throw new Error('Failed to add account: ' + err.message);
    }
  },

  // Import account from private key
  importAccount: async (privateKey, accountName = null) => {
    const { accounts, encryptionPassword } = get();
    
    if (!encryptionPassword) {
      throw new Error('Wallet must be unlocked to import accounts. Please unlock your wallet first.');
    }

    // Extend session since user is actively using the wallet
    get().extendSession();

    try {
      // Create keypair from private key
      const newKeypair = await get().createKeypairFromPrivateKey(privateKey);
      
      // Check if account already exists
      const existingAccount = accounts.find(account => account.address === newKeypair.address);
      if (existingAccount) {
        throw new Error('Account with this address already exists in your wallet');
      }

      // Generate a unique index for the imported account
      // Use a high number to avoid conflicts with derived accounts
      const importedAccountIndex = 1000 + accounts.filter(acc => acc.index >= 1000).length;
      
      // Generate default name if not provided
      const defaultName = accountName || `Imported Account ${accounts.filter(acc => acc.index >= 1000).length + 1}`;
      
      const newAccount = {
        index: importedAccountIndex,
        name: defaultName,
        address: newKeypair.address,
        keypair: newKeypair,
        balance: null,
        isImported: true, // Mark as imported account
        privateKey: privateKey // Store the original private key for re-import if needed
      };

      const updatedAccounts = [...accounts, newAccount];
      set({ accounts: updatedAccounts });

      // Save updated accounts to encrypted storage
      await get().saveAccountsToStorage();

      return newAccount;
    } catch (err) {
      console.error('Error importing account:', err);
      throw new Error('Failed to import account: ' + err.message);
    }
  },

  // Switch to different account
  switchAccount: async (accountIndex) => {
    const { accounts } = get();
    
    if (accountIndex < 0 || accountIndex >= accounts.length) {
      throw new Error('Invalid account index');
    }

    const selectedAccount = accounts[accountIndex];
    
    // Clear token data for the previous account
    get().clearTokenData();
    
    set({
      activeAccountIndex: accountIndex,
      walletAddress: selectedAccount.address,
      keypair: selectedAccount.keypair
    });

    // Fetch balance for new account
    try {
      await get().fetchBalance(selectedAccount.address);
    } catch (balanceErr) {
      console.warn('Failed to fetch balance for switched account:', balanceErr);
    }

    // Smart refresh tokens for the new account (only if it's Gorbchain)
    try {
      await get().smartRefreshTokens(selectedAccount.address);
    } catch (tokenErr) {
      console.warn('Failed to refresh tokens for switched account:', tokenErr);
    }

    // Save active account index
    try {
      await secureStorage.setData('activeAccountIndex', accountIndex);
    } catch (err) {
      console.error('Error saving active account index:', err);
    }
  },

  // Update account name
  updateAccountName: async (accountIndex, newName) => {
    const { accounts, encryptionPassword } = get();
    
    if (accountIndex < 0 || accountIndex >= accounts.length) {
      throw new Error('Invalid account index');
    }

    // Check if wallet is unlocked
    if (!encryptionPassword) {
      throw new Error('Wallet must be unlocked to update account names. Please unlock your wallet first.');
    }

    // Extend session since user is actively using the wallet
    get().extendSession();

    const updatedAccounts = [...accounts];
    updatedAccounts[accountIndex] = {
      ...updatedAccounts[accountIndex],
      name: newName
    };

    set({ accounts: updatedAccounts });

    // Save updated accounts to encrypted storage
    await get().saveAccountsToStorage();
  },

  // Save accounts to encrypted storage
  saveAccountsToStorage: async () => {
    const { accounts, encryptionPassword, selectedNetwork, selectedEnvironment } = get();
    
    if (!encryptionPassword) {
      throw new Error('Password required to save accounts');
    }

    try {
      // Separate derived accounts from imported accounts
      const derivedAccounts = accounts.filter(account => !account.isImported);
      const importedAccounts = accounts.filter(account => account.isImported);

      // Save non-sensitive account data (names, indices, addresses) for all accounts
      const accountsToSave = accounts.map(account => ({
        index: account.index,
        name: account.name,
        address: account.address,
        isImported: account.isImported || false
      }));

      const accountData = {
        accounts: accountsToSave,
        selectedNetworkId: selectedNetwork.id,
        selectedNetworkEnvironment: selectedNetwork.environment,
        selectedEnvironment: selectedEnvironment
      };

      await secureStorage.setSecureData('accountData', accountData, encryptionPassword);

      // Separately save imported accounts with their private keys
      if (importedAccounts.length > 0) {
        const importedAccountsData = importedAccounts.map(account => ({
          index: account.index,
          name: account.name,
          address: account.address,
          privateKey: account.privateKey
        }));

        await secureStorage.setSecureData('importedAccounts', importedAccountsData, encryptionPassword);
      }

      // Also save account metadata to non-encrypted storage for UI display
      const accountMetadata = {
        count: accounts.length,
        accounts: accountsToSave // Names, indices, addresses are not sensitive
      };
      await secureStorage.setData('accountMetadata', accountMetadata);
    } catch (err) {
      console.error('Error saving accounts to storage:', err);
      throw new Error('Failed to save accounts: ' + err.message);
    }
  },

  // Load accounts from encrypted storage
  loadAccountsFromStorage: async (password) => {
    const { mnemonic } = get();
    
    try {
      const accountData = await secureStorage.getSecureData('accountData', password);
      
      if (!accountData || !accountData.accounts) {
        return [];
      }

      // Recreate keypairs for each account
      const accounts = [];
      
      for (const savedAccount of accountData.accounts) {
        if (savedAccount.isImported) {
          // Handle imported accounts - we need to get their private keys
          try {
            const importedAccountsData = await secureStorage.getSecureData('importedAccounts', password);
            const importedAccountData = importedAccountsData?.find(acc => acc.index === savedAccount.index);
            
            if (importedAccountData) {
              const keypair = await get().createKeypairFromPrivateKey(importedAccountData.privateKey);
              accounts.push({
                index: savedAccount.index,
                name: savedAccount.name,
                address: savedAccount.address,
                keypair: keypair,
                balance: null,
                isImported: true,
                privateKey: importedAccountData.privateKey
              });
            } else {
              console.warn(`Imported account data not found for account ${savedAccount.index}`);
              // Create placeholder without keypair
              accounts.push({
                index: savedAccount.index,
                name: savedAccount.name,
                address: savedAccount.address,
                keypair: null,
                balance: null,
                isImported: true
              });
            }
          } catch (err) {
            console.warn('Error loading imported account:', err);
            // Create placeholder without keypair
            accounts.push({
              index: savedAccount.index,
              name: savedAccount.name,
              address: savedAccount.address,
              keypair: null,
              balance: null,
              isImported: true
            });
          }
        } else {
          // Handle derived accounts - recreate from mnemonic
          if (!mnemonic) {
            console.warn('Mnemonic required to load derived accounts');
            // Create placeholder without keypair
            accounts.push({
              index: savedAccount.index,
              name: savedAccount.name,
              address: savedAccount.address,
              keypair: null,
              balance: null
            });
          } else {
            const keypair = await get().createKeypairFromMnemonicAndPath(mnemonic, savedAccount.index);
            accounts.push({
              index: savedAccount.index,
              name: savedAccount.name,
              address: savedAccount.address,
              keypair: keypair,
              balance: null
            });
          }
        }
      }

      return accounts;
    } catch (err) {
      console.error('Error loading accounts from storage:', err);
      return [];
    }
  },

  // New function to finalize wallet setup after user saves mnemonic
  finalizeWalletSetup: async () => {
    const { mnemonic, walletAddress, keypair, selectedNetwork, selectedEnvironment, accounts, encryptionPassword } = get();

    if (!mnemonic || !walletAddress || !keypair) {
      throw new Error('No wallet data to finalize');
    }

    try {
      // Use user's password if available, otherwise generate a session password
      const password = encryptionPassword || get().generateSessionPassword();

      // Now set hasWallet and store in secure Chrome storage
      set({ hasWallet: true });

      // Store encrypted wallet data securely
      const walletData = {
        mnemonic,
        walletAddress,
        hasWallet: true,
        selectedNetworkId: selectedNetwork.id,
        selectedNetworkEnvironment: selectedNetwork.environment,
        selectedEnvironment: selectedEnvironment
      };

      await secureStorage.setSecureData('walletData', walletData, password);

      // Save accounts data separately (includes metadata)
      await get().saveAccountsToStorage();

      // Store non-sensitive data
      await secureStorage.setData('walletAddress', walletAddress);
      await secureStorage.setData('hasWallet', true);
      await secureStorage.setData('activeAccountIndex', 0);

      // Fetch initial balance
      await get().fetchBalance(walletAddress);
    } catch (err) {
      console.error('Error finalizing wallet setup:', err);
      throw new Error('Error finalizing wallet setup: ' + err.message);
    }
  },



  restoreWallet: async (mnemonic, userPassword = null) => {
    set({ isLoadingBalance: true });

    try {
      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Create first account (index 0) from mnemonic
      const keypair = await get().createKeypairFromMnemonicAndPath(mnemonic, 0);
      const walletAddress = keypair.address;

      const { selectedNetwork, selectedEnvironment } = get();

      // Use provided password or generate a session password
      const password = userPassword || get().generateSessionPassword();

      // Create initial account
      const initialAccount = {
        index: 0,
        name: 'Account 1',
        address: walletAddress,
        keypair: keypair,
        balance: null
      };

      // Store wallet data
      set({
        mnemonic,
        keypair,
        walletAddress,
        hasWallet: true,
        accounts: [initialAccount],
        activeAccountIndex: 0,
        encryptionPassword: password // Store the password for saveAccountsToStorage
      });

      // Store encrypted wallet data securely
      const walletData = {
        mnemonic,
        walletAddress,
        hasWallet: true,
        selectedNetworkId: selectedNetwork.id,
        selectedNetworkEnvironment: selectedNetwork.environment,
        selectedEnvironment: selectedEnvironment
      };

      await secureStorage.setSecureData('walletData', walletData, password);

      // Save accounts data separately (includes metadata)
      await get().saveAccountsToStorage();

      // Store non-sensitive data
      await secureStorage.setData('walletAddress', walletAddress);
      await secureStorage.setData('hasWallet', true);
      await secureStorage.setData('activeAccountIndex', 0);

      // Fetch balance (don't fail if balance fetch fails)
      try {
        await get().fetchBalance(walletAddress);
      } catch (balanceErr) {
        console.warn('Failed to fetch balance on wallet restore:', balanceErr);
      }

      return { walletAddress, mnemonic };
    } catch (err) {
      set({ isLoadingBalance: false });
      console.error('Error restoring wallet:', err);
      throw new Error('Error restoring wallet: ' + err.message);
    }
  },

  // Add password prompt for loading stored wallet
  loadStoredWallet: async (userPassword = null) => {
    try {
      // Load basic wallet info first
      const storedAddress = await secureStorage.getData('walletAddress');
      const hasStoredWallet = await secureStorage.getData('hasWallet');
      const storedEnvironment = await secureStorage.getData('selectedEnvironment');
      const storedNetworkId = await secureStorage.getData('selectedNetworkId');
      const storedNetworkEnvironment = await secureStorage.getData('selectedNetworkEnvironment');

      // Load custom RPC URLs
      await get().loadCustomRpcUrls();

      // Set default environment and network if none stored
      const currentEnvironment = storedEnvironment || 'mainnet';
      set({ selectedEnvironment: currentEnvironment });

      // Load stored network or default to Gorbchain mainnet
      if (storedNetworkId && storedNetworkEnvironment) {
        const storedNetwork = networks.find(n =>
          n.id === storedNetworkId && n.environment === storedNetworkEnvironment
        );

        if (storedNetwork) {
          set({ selectedNetwork: storedNetwork });
        } else {
          // If stored network not found, default to Gorbchain mainnet
          const defaultNetwork = networks.find(n => n.id === 'gorbchain-mainnet') || networks[0];
          set({ selectedNetwork: defaultNetwork });
        }
      } else {
        // No stored network, default to Gorbchain mainnet
        const defaultNetwork = networks.find(n => n.id === 'gorbchain-mainnet') || networks[0];
        set({ selectedNetwork: defaultNetwork });
        
        // Save the default selection
        try {
          await secureStorage.setData('selectedNetworkId', defaultNetwork.id);
          await secureStorage.setData('selectedNetworkEnvironment', defaultNetwork.environment);
          await secureStorage.setData('selectedEnvironment', currentEnvironment);
        } catch (err) {
          console.error('Error saving default network settings:', err);
        }
      }

      if (storedAddress && hasStoredWallet) {

        // Load account metadata to show all accounts (even if locked)
        let accounts = [];
        try {
          const accountMetadata = await secureStorage.getData('accountMetadata');
          if (accountMetadata && accountMetadata.accounts) {
            // Create placeholder accounts from metadata
            accounts = accountMetadata.accounts.map(account => ({
              index: account.index,
              name: account.name,
              address: account.address,
              keypair: null, // Will be populated when unlocked
              balance: null
            }));
          }
        } catch (err) {
          console.warn('Failed to load account metadata:', err);
        }

        // If no metadata found, create default account
        if (accounts.length === 0) {
          accounts = [{
            index: 0,
            name: 'Account 1',
            address: storedAddress,
            keypair: null,
            balance: null
          }];
        }

        // Load active account index
        const activeIndex = await secureStorage.getData('activeAccountIndex') || 0;
        const safeActiveIndex = Math.min(activeIndex, accounts.length - 1);

        set({
          walletAddress: accounts[safeActiveIndex].address,
          hasWallet: true,
          accounts: accounts,
          activeAccountIndex: safeActiveIndex
        });

        // Fetch balance (don't fail if balance fetch fails)
        try {
          await get().fetchBalance(accounts[safeActiveIndex].address);
        } catch (balanceErr) {
          console.warn('Failed to fetch balance on wallet load:', balanceErr);
        }
        return storedAddress;
      }
      return null;
    } catch (err) {
      console.error('Error loading stored wallet:', err);
      return null;
    }
  },

  // Add method to unlock wallet with password
  unlockWallet: async (password) => {
    try {
      const encryptedWalletData = await secureStorage.getSecureData('walletData', password);

      if (!encryptedWalletData) {
        throw new Error('No encrypted wallet data found');
      }

      // Restore keypair from mnemonic
      const keypair = await get().createKeypairFromMnemonic(encryptedWalletData.mnemonic);

      // Load active account index
      const storedActiveIndex = await secureStorage.getData('activeAccountIndex') || 0;

      set({
        mnemonic: encryptedWalletData.mnemonic,
        keypair,
        walletAddress: encryptedWalletData.walletAddress,
        hasWallet: true,
        activeAccountIndex: storedActiveIndex
      });

      // Start session with password
      get().startSession(password);

      // Load accounts from encrypted storage and populate keypairs
      try {
        const loadedAccounts = await get().loadAccountsFromStorage(password);
        if (loadedAccounts.length > 0) {
          // Get current accounts (may have been loaded from metadata)
          const { accounts: currentAccounts } = get();
          
          // If we have existing accounts from metadata, merge with loaded data
          if (currentAccounts.length > 0) {
            const updatedAccounts = currentAccounts.map(existingAccount => {
              const loadedAccount = loadedAccounts.find(loaded => loaded.index === existingAccount.index);
              if (loadedAccount) {
                return {
                  ...existingAccount,
                  keypair: loadedAccount.keypair,
                  name: loadedAccount.name // Use encrypted name in case it was updated
                };
              }
              return existingAccount;
            });
            set({ accounts: updatedAccounts });
          } else {
            // No existing accounts, use loaded accounts
            set({ accounts: loadedAccounts });
          }
          
          // Set active account
          const { accounts: finalAccounts } = get();
          if (storedActiveIndex < finalAccounts.length) {
            const activeAccount = finalAccounts[storedActiveIndex];
            set({
              walletAddress: activeAccount.address,
              keypair: activeAccount.keypair
            });
          }
        } else {
          // If no accounts found, create initial account from existing data
          const initialAccount = {
            index: 0,
            name: 'Account 1',
            address: encryptedWalletData.walletAddress,
            keypair: keypair,
            balance: null
          };
          set({ accounts: [initialAccount] });
        }
      } catch (accountErr) {
        console.warn('Failed to load accounts, using default:', accountErr);
        // Fallback to single account
        const initialAccount = {
          index: 0,
          name: 'Account 1',
          address: encryptedWalletData.walletAddress,
          keypair: keypair,
          balance: null
        };
        set({ accounts: [initialAccount] });
      }

      return true;
    } catch (err) {
      console.error('Error unlocking wallet:', err);
      throw new Error('Invalid password or corrupted wallet data');
    }
  },

  exportMnemonic: () => {
    const { mnemonic } = get();
    if (!mnemonic) {
      throw new Error('Wallet must be unlocked to export mnemonic');
    }
    return mnemonic;
  },

  clearWallet: async () => {
    // End session first
    get().endSession();

    set({
      walletAddress: '',
      balance: null,
      isLoadingBalance: false,
      mnemonic: '',
      keypair: null,
      hasWallet: false,
      encryptionPassword: null,
      accounts: [],
      activeAccountIndex: 0,
      sessionTimeout: null
    });

    // Clear wallet data from secure storage
    try {
      await secureStorage.clearSecureData();
      await secureStorage.removeData('activeAccountIndex');
      await secureStorage.removeData('accountMetadata');
    } catch (err) {
      console.error('Error clearing wallet from secure storage:', err);
    }
  },

  signTransaction: async (transaction) => {
    const { keypair } = get();
    if (!keypair) {
      throw new Error('Wallet must be unlocked to sign transactions');
    }

    // Sign the transaction
    transaction.sign([keypair]);
    return transaction;
  },

  getKeypair: () => {
    const { keypair } = get();
    return keypair; // Return null if not unlocked, let calling code handle unlock prompt
  },

  fetchBalance: async (address, chain) => {
    const { walletAddress, selectedNetwork, selectedEnvironment } = get();
    const targetAddress = address || walletAddress;
    const targetChain = chain || selectedNetwork.chain;
    const currentNetwork = networks.find(network => network.chain === targetChain && network.environment === selectedEnvironment);

    if (!targetAddress) return;

    set({ isLoadingBalance: true });

    try {
      // Use custom RPC URL if available
      const rpcUrl = get().getCurrentRpcUrl();

      let balanceInTokens;

      if (targetChain === 'gorbagana') {
        // Use direct fetch for Gorbagana to avoid CORS issues
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'getBalance',
              params: [targetAddress],
              id: 1
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          if (data.result !== undefined) {
            const balanceInLamports = safeToNumber(data.result.value || data.result);
            balanceInTokens = lamportsToTokens(balanceInLamports);
          } else if (data.error) {
            throw new Error(`Gorbagana RPC error: ${data.error.message}`);
          } else {
            throw new Error('Invalid response from Gorbagana RPC');
          }
        } catch (fetchError) {
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timeout - RPC server not responding');
          }
          throw fetchError;
        }
      } else {
        // Use Solana client library for Solana chains with timeout and retry
        let retries = 3;
        let lastError;

        while (retries > 0) {
          try {
            const connection = createSolanaRpc(rpcUrl, {
              commitment: 'confirmed',
              wsEndpoint: currentNetwork?.wsUrl,
              disableRetryOnRateLimit: false,
            });
            
            // Get balance from the RPC with timeout
            const balanceRequest = await connection.getBalance(targetAddress);
            
            // Add timeout to the balance request
            const balancePromise = balanceRequest.send();
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Balance request timeout')), 8000);
            });
            
            const balanceResponse = await Promise.race([balancePromise, timeoutPromise]);
            
            // Extract and convert balance value (handles BigInt automatically)
            const rawValue = balanceResponse?.value || balanceResponse?.result?.value || balanceResponse;
            const balanceInLamports = safeToNumber(rawValue);
            
            // Convert lamports to token amount 
            balanceInTokens = lamportsToTokens(balanceInLamports);
            break; // Success, exit retry loop
            
          } catch (error) {
            lastError = error;
            retries--;
            
            if (retries > 0) {
              console.warn(`Balance fetch attempt failed, retrying... (${retries} retries left):`, error.message);
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
            }
          }
        }

        if (retries === 0) {
          throw lastError || new Error('All balance fetch attempts failed');
        }
      }

      set({
        balance: balanceInTokens,
        isLoadingBalance: false
      });
      
      return balanceInTokens;
    } catch (err) {
      set({ 
        balance: null, 
        isLoadingBalance: false 
      });
      
      // Provide more helpful error messages
      let errorMessage = 'Unknown error occurred';
      if (err.message.includes('timeout') || err.message.includes('AbortError')) {
        errorMessage = 'Network timeout - please check your connection and try again';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('fetch')) {
        errorMessage = 'Network error - unable to connect to RPC server';
      } else if (err.message.includes('HTTP 4')) {
        errorMessage = 'RPC server error - invalid request or address';
      } else if (err.message.includes('HTTP 5')) {
        errorMessage = 'RPC server temporarily unavailable';
      } else {
        errorMessage = err.message;
      }
      
      console.error('Balance fetch error:', err);
      throw new Error('Error fetching balance: ' + errorMessage);
    }
  },

  // Token-related methods

  /**
   * Fetch token balances for current or specified address
   * @param {string} address - Optional address, defaults to current wallet address
   * @param {boolean} forceRefresh - Force refresh bypassing cache and balance checks
   * @returns {Promise<Array>} Array of token objects
   */
  fetchTokens: async (address = null, forceRefresh = false) => {
    const { walletAddress, balance, lastBalanceCheck, selectedNetwork } = get();
    const targetAddress = address || walletAddress;

    if (!targetAddress) return [];

    // Only fetch for Gorbchain networks for now
    if (selectedNetwork.chain !== 'gorbagana') {
      return [];
    }

    set({ isLoadingTokens: true });

    try {
      // Check if we should refresh based on balance changes
      const shouldRefresh = forceRefresh || 
                           gorbscanService.hasBalanceChanged(targetAddress, balance) ||
                           lastBalanceCheck !== balance;

      const useCache = !shouldRefresh;
      const tokens = await gorbscanService.getTokens(targetAddress, useCache);

      // Background preload metadata for tokens that don't have images yet
      setTimeout(() => {
        const tokensNeedingMetadata = tokens.filter(token => 
          token.uri && !token.image && token.uri !== token.image
        );
        if (tokensNeedingMetadata.length > 0) {
          gorbscanService.preloadMetadata(tokensNeedingMetadata);
        }
      }, 100); // Small delay to not block UI

      set({
        tokens,
        isLoadingTokens: false,
        lastTokenRefresh: Date.now(),
        lastBalanceCheck: balance
      });

      return tokens;
    } catch (error) {
      console.error('Error fetching tokens:', error);
      set({ isLoadingTokens: false });
      return [];
    }
  },

  /**
   * Fetch NFTs for current or specified address
   * @param {string} address - Optional address, defaults to current wallet address
   * @param {boolean} forceRefresh - Force refresh bypassing cache
   * @returns {Promise<Array>} Array of NFT objects
   */
  fetchNFTs: async (address = null, forceRefresh = false) => {
    const { walletAddress, selectedNetwork } = get();
    const targetAddress = address || walletAddress;

    if (!targetAddress) return [];

    // Only fetch for Gorbchain networks for now
    if (selectedNetwork.chain !== 'gorbagana') {
      return [];
    }

    set({ isLoadingNFTs: true });

    try {
      const useCache = !forceRefresh;
      const nfts = await gorbscanService.getNFTs(targetAddress, useCache);

      set({
        nfts,
        isLoadingNFTs: false
      });

      return nfts;
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      set({ isLoadingNFTs: false });
      return [];
    }
  },

  /**
   * Refresh all token data (tokens and NFTs)
   * @param {string} address - Optional address, defaults to current wallet address
   */
  refreshTokenData: async (address = null) => {
    const targetAddress = address || get().walletAddress;
    
    if (!targetAddress) return;

    try {
      // Clear cache for this address first
      gorbscanService.clearCache(targetAddress);
      
      // Fetch fresh data
      await Promise.all([
        get().fetchTokens(targetAddress, true),
        get().fetchNFTs(targetAddress, true)
      ]);
    } catch (error) {
      console.error('Error refreshing token data:', error);
    }
  },

  /**
   * Smart refresh - only refresh if balance changed or data is stale
   * @param {string} address - Optional address, defaults to current wallet address
   */
  smartRefreshTokens: async (address = null) => {
    const { lastTokenRefresh, balance, lastBalanceCheck } = get();
    const targetAddress = address || get().walletAddress;

    if (!targetAddress) return;

    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const isStale = !lastTokenRefresh || (now - lastTokenRefresh) > staleThreshold;
    const balanceChanged = lastBalanceCheck !== balance;

    if (isStale || balanceChanged) {
      await get().fetchTokens(targetAddress, balanceChanged);
    }
  },

  /**
   * Get token by mint address
   * @param {string} mintAddress - Token mint address
   * @returns {Object|null} Token object or null if not found
   */
  getTokenByMint: (mintAddress) => {
    const { tokens } = get();
    return tokens.find(token => token.mintAddress === mintAddress) || null;
  },

  /**
   * Get total token count
   * @returns {number} Number of tokens with balance > 0
   */
  getTokenCount: () => {
    const { tokens } = get();
    return tokens.filter(token => parseFloat(token.formatted_balance) > 0).length;
  },

  /**
   * Get total NFT count
   * @returns {number} Number of NFTs
   */
  getNFTCount: () => {
    const { nfts } = get();
    return nfts.length;
  },

  /**
   * Clear token data (useful when switching accounts)
   */
  clearTokenData: () => {
    set({
      tokens: [],
      nfts: [],
      lastTokenRefresh: null,
      lastBalanceCheck: null,
      isLoadingTokens: false,
      isLoadingNFTs: false
    });
  },

  /**
   * Get cache status for debugging
   * @returns {Object} Cache information from gorbscanService
   */
  getTokenCacheStatus: () => {
    return gorbscanService.getCacheStatus();
  },

  /**
   * Clear metadata cache for better testing
   * @param {string} mintAddress - Optional mint address to clear specific metadata
   */
  clearMetadataCache: (mintAddress = null) => {
    gorbscanService.clearMetadataCache(mintAddress);
  },

}));
