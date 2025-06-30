import { create } from 'zustand';
import { address, createSolanaRpc, devnet } from '@solana/kit';
import * as bip39 from 'bip39';
import secureStorage from '../util/secureStorage';
import { networks } from '../lib/config';

export const useWalletStore = create((set, get) => ({
  // State
  walletAddress: '',
  balance: null,
  selectedNetwork: networks[1], // Default to first network (Gorbagana)
  selectedEnvironment: 'mainnet', // Default to testnet
  customRpcUrls: {}, // Custom RPC URLs per network and environment
  isLoadingBalance: false,
  mnemonic: '',
  keypair: null,
  hasWallet: false,
  encryptionPassword: null, // Session-only encryption password

  // Generate a session encryption password
  generateSessionPassword: () => {
    const password = secureStorage.generateSecurePassword();
    set({ encryptionPassword: password });
    return password;
  },

  // Actions
  setWalletAddress: async (address) => {
    set({ walletAddress: address });

    // Update chrome storage for extension
    try {
      await secureStorage.setData('walletAddress', address);
    } catch (err) {
      console.error('Error saving wallet address:', err);
    }
  },

  setSelectedNetwork: async (network) => {
    set({ selectedNetwork: network });
    // Persist the selected network (only ID and environment)
    try {
      await secureStorage.setData('selectedNetworkId', network.id);
      await secureStorage.setData('selectedNetworkEnvironment', network.environment);
    } catch (err) {
      console.error('Error saving selected network:', err);
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
      console.error('Error saving selected environment:', err);
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
      console.error('Error saving custom RPC URL:', err);
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
      console.error('Error resetting custom RPC URL:', err);
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
      console.error('Error loading custom RPC URLs:', err);
    }
  },

  getFilteredNetworks: () => {
    const { selectedEnvironment } = get();
    return networks.filter(network =>
      network.environment === selectedEnvironment ||
      (selectedEnvironment === 'testnet' && network.environment === 'devnet')
    );
  },

  generateWallet: async () => {
    set({ isLoadingBalance: true });

    try {
      // Generate a new mnemonic
      const mnemonic = bip39.generateMnemonic();

      // Create keypair from mnemonic
      const keypair = await get().createKeypairFromMnemonic(mnemonic);
      const walletAddress = keypair.publicKey.toString();

      // Store wallet data but don't set hasWallet yet
      set({
        mnemonic,
        keypair,
        walletAddress,
        isLoadingBalance: false
      });

      return { walletAddress, mnemonic };
    } catch (err) {
      set({ isLoadingBalance: false });
      console.error('Error generating wallet:', err);
      throw new Error('Error generating wallet: ' + err.message);
    }
  },

  // New function to finalize wallet setup after user saves mnemonic
  finalizeWalletSetup: async () => {
    const { mnemonic, walletAddress, keypair, selectedNetwork, selectedEnvironment } = get();

    if (!mnemonic || !walletAddress || !keypair) {
      throw new Error('No wallet data to finalize');
    }

    try {
      // Generate encryption password for this session
      const password = get().generateSessionPassword();

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

      // Store non-sensitive data
      await secureStorage.setData('walletAddress', walletAddress);
      await secureStorage.setData('hasWallet', true);

      // Fetch initial balance
      await get().fetchBalance(walletAddress);
    } catch (err) {
      console.error('Error finalizing wallet setup:', err);
      throw new Error('Error finalizing wallet setup: ' + err.message);
    }
  },

  createKeypairFromMnemonic: async (mnemonic) => {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    try {
      // Generate seed from mnemonic
      const seed = bip39.mnemonicToSeedSync(mnemonic, "");

      // Use the first 32 bytes of the seed as the private key (simpler approach)
      const privateKey = seed.slice(0, 32);

      // Create keypair from the private key
      const keypair = Keypair.fromSeed(privateKey);

      return keypair;
    } catch (error) {
      console.error('Error creating keypair from mnemonic:', error);
      throw new Error('Failed to create keypair from mnemonic: ' + error.message);
    }
  },

  restoreWallet: async (mnemonic) => {
    set({ isLoadingBalance: true });

    try {
      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Create keypair from mnemonic
      const keypair = await get().createKeypairFromMnemonic(mnemonic);
      const walletAddress = keypair.publicKey.toString();

      const { selectedNetwork, selectedEnvironment } = get();

      // Generate encryption password for this session
      const password = get().generateSessionPassword();

      // Store wallet data
      set({
        mnemonic,
        keypair,
        walletAddress,
        hasWallet: true
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

      // Store non-sensitive data
      await secureStorage.setData('walletAddress', walletAddress);
      await secureStorage.setData('hasWallet', true);

      // Fetch balance
      await get().fetchBalance(walletAddress);

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

      // Load stored environment or default to testnet
      if (storedEnvironment) {
        set({ selectedEnvironment: storedEnvironment });
      }

      // Load stored network
      if (storedNetworkId && storedNetworkEnvironment) {
        const storedNetwork = networks.find(n =>
          n.id === storedNetworkId && n.environment === storedNetworkEnvironment
        );

        if (storedNetwork) {
          set({ selectedNetwork: storedNetwork });
        } else {
          // If stored network not found, find a suitable network in the stored environment
          const availableNetworks = networks.filter(n =>
            n.environment === storedEnvironment || storedEnvironment === 'testnet'
          );
          if (availableNetworks.length > 0) {
            set({ selectedNetwork: availableNetworks[0] });
          }
        }
      }

      if (storedAddress && hasStoredWallet) {
        console.log('Found stored wallet:', storedAddress);

        // For security, only set basic wallet info without sensitive data
        set({
          walletAddress: storedAddress,
          hasWallet: true
        });

        // Fetch balance
        await get().fetchBalance(storedAddress);
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

      set({
        mnemonic: encryptedWalletData.mnemonic,
        keypair,
        walletAddress: encryptedWalletData.walletAddress,
        hasWallet: true,
        encryptionPassword: password
      });

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
    set({
      walletAddress: '',
      balance: null,
      isLoadingBalance: false,
      mnemonic: '',
      keypair: null,
      hasWallet: false,
      encryptionPassword: null
    });

    // Clear wallet data from secure storage
    try {
      await secureStorage.clearSecureData();
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
    if (!keypair) {
      throw new Error('Wallet must be unlocked to access keypair');
    }
    return keypair;
  },

  fetchBalance: async (address, chain) => {
    const { walletAddress, selectedNetwork, selectedEnvironment } = get();
    const targetAddress = address || walletAddress;
    const targetChain = chain || selectedNetwork.chain;
    const currentNetwork = networks.find(network => network.chain === targetChain && network.environment === selectedEnvironment);

    if (!targetAddress) return;

    set({ isLoadingBalance: true });

    try {
      console.log("currentNetwork", currentNetwork, targetChain, selectedEnvironment);

      // Use custom RPC URL if available
      const rpcUrl = get().getCurrentRpcUrl();

      const connection = createSolanaRpc(rpcUrl, {
        commitment: 'confirmed',
        wsEndpoint: currentNetwork.wsUrl,
        disableRetryOnRateLimit: false,
      });
      const publicKey = address(targetAddress);
      const balanceInLamports = await connection.getBalance(publicKey);
      const balanceInRaw = balanceInLamports / 1000000000;

      set({
        balance: balanceInRaw,
        isLoadingBalance: false
      });

      console.log("Balance fetched:", { lamports: balanceInLamports, sol: balanceInRaw });
    } catch (err) {
      set({ isLoadingBalance: false });
      console.error('Balance fetch error:', err);
      throw new Error('Error fetching balance: ' + err.message);
    }
  },
}));
