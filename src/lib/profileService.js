/**
 * Profile Service
 * Handles on-chain username profile interactions for TrashPack wallet
 */

import { Connection, PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import { networks } from './config.js';

// Simple wallet implementation for browser environment (matches bridgeService pattern)
class SimpleWallet {
  constructor(keypair) {
    this.payer = keypair;
    this.publicKey = keypair.publicKey;
  }

  async signTransaction(tx) {
    tx.sign(this.payer);
    return tx;
  }

  async signAllTransactions(txs) {
    return txs.map(tx => {
      tx.sign(this.payer);
      return tx;
    });
  }
}

// Profile Program ID
const PROGRAM_ID = new PublicKey('GrJrqEtxztquco6Zsg9WfrArYwy5BZwzJ4ce4TfcJLuJ');

// Profile IDL (minimal definition for account decoding)
const PROFILE_IDL = {
  version: "0.1.0",
  name: "profile",
  address: "GrJrqEtxztquco6Zsg9WfrArYwy5BZwzJ4ce4TfcJLuJ",
  instructions: [
    {
      name: "createProfile",
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "profile", isMut: true, isSigner: false },
        { name: "reverse", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "username", type: "string" },
        { name: "bio", type: "string" },
        { name: "avatar", type: "string" },
        { name: "twitter", type: "string" },
        { name: "discord", type: "string" },
        { name: "website", type: "string" }
      ]
    },
    {
      name: "updateProfile",
      accounts: [
        { name: "authority", isMut: true, isSigner: true },
        { name: "profile", isMut: true, isSigner: false }
      ],
      args: [
        { name: "bio", type: "string" },
        { name: "avatar", type: "string" },
        { name: "twitter", type: "string" },
        { name: "discord", type: "string" },
        { name: "website", type: "string" }
      ]
    }
  ],
  accounts: [
    {
      name: "Profile",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "username", type: "string" },
          { name: "bio", type: "string" },
          { name: "avatar", type: "string" },
          { name: "twitter", type: "string" },
          { name: "discord", type: "string" },
          { name: "website", type: "string" },
          { name: "createdAt", type: "i64" },
          { name: "updatedAt", type: "i64" },
          { name: "bump", type: "u8" }
        ]
      }
    },
    {
      name: "ReverseProfile",
      type: {
        kind: "struct",
        fields: [
          { name: "username", type: "string" },
          { name: "bump", type: "u8" }
        ]
      }
    }
  ]
};

class ProfileService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get RPC endpoint for Gorbchain mainnet
   */
  getRpcEndpoint() {
    const gorbMainnet = networks.find(n => n.id === 'gorbchain-mainnet');
    return gorbMainnet?.rpcUrl || 'https://rpc.gorbchain.xyz';
  }

  /**
   * Create a connection to the RPC
   */
  getConnection() {
    return new Connection(this.getRpcEndpoint(), { commitment: 'confirmed' });
  }

  /**
   * Sanitize string input (ASCII only, max length)
   */
  sanitizeString(input, maxLength) {
    if (!input) return "";
    return input
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .substring(0, maxLength)
      .trim();
  }

  /**
   * Validate and sanitize username
   */
  validateUsername(username) {
    if (!username) throw new Error('Username is required');

    const sanitized = username
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '') // Only allow lowercase letters, numbers, dots, underscores, hyphens
      .substring(0, 32);

    if (sanitized.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    return sanitized;
  }

  /**
   * Get Profile PDA
   */
  async getProfilePDA(username) {
    const [profilePda] = await PublicKey.findProgramAddress(
      [Buffer.from("profile"), Buffer.from(username)],
      PROGRAM_ID
    );
    return profilePda;
  }

  /**
   * Get Reverse PDA (wallet -> profile lookup)
   */
  async getReversePDA(walletPublicKey) {
    const pubkey = typeof walletPublicKey === 'string'
      ? new PublicKey(walletPublicKey)
      : walletPublicKey;

    const [reversePda] = await PublicKey.findProgramAddress(
      [Buffer.from("reverse"), pubkey.toBuffer()],
      PROGRAM_ID
    );
    return reversePda;
  }

  /**
   * Check if a username is available
   */
  async checkUsernameAvailability(username) {
    try {
      const validatedUsername = this.validateUsername(username);
      const profilePda = await this.getProfilePDA(validatedUsername);
      const connection = this.getConnection();

      const accountInfo = await connection.getAccountInfo(profilePda);
      return accountInfo === null; // Available if account doesn't exist
    } catch (error) {
      console.error('Error checking username availability:', error);
      throw new Error(`Failed to check username availability: ${error.message}`);
    }
  }

  /**
   * Get profile by username
   */
  async getProfileByUsername(username) {
    try {
      const validatedUsername = this.validateUsername(username);
      const cacheKey = `profile_${validatedUsername}`;

      // Check cache
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const profilePda = await this.getProfilePDA(validatedUsername);
      const connection = this.getConnection();

      const accountInfo = await connection.getAccountInfo(profilePda);
      if (!accountInfo) {
        return null;
      }

      // Create a dummy provider for decoding
      const dummyKeypair = Keypair.generate();
      const provider = new AnchorProvider(
        connection,
        new SimpleWallet(dummyKeypair),
        { commitment: 'confirmed' }
      );

      const program = new Program(PROFILE_IDL, provider);
      const profileData = program.coder.accounts.decode('Profile', accountInfo.data);

      const result = {
        address: profilePda.toString(),
        username: profileData.username,
        bio: profileData.bio,
        avatar: profileData.avatar,
        twitter: profileData.twitter,
        discord: profileData.discord,
        website: profileData.website,
        authority: profileData.authority.toString(),
        createdAt: profileData.createdAt ? new Date(profileData.createdAt.toNumber() * 1000) : null,
        updatedAt: profileData.updatedAt ? new Date(profileData.updatedAt.toNumber() * 1000) : null
      };

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error('Error getting profile by username:', error);
      return null;
    }
  }

  /**
   * Get profile by wallet address (reverse lookup)
   */
  async getProfileByWallet(walletAddress) {
    try {
      const cacheKey = `wallet_profile_${walletAddress}`;

      // Check cache
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const reversePda = await this.getReversePDA(walletAddress);
      const connection = this.getConnection();

      const accountInfo = await connection.getAccountInfo(reversePda);
      if (!accountInfo) {
        return null;
      }

      // Create a dummy provider for decoding
      const dummyKeypair = Keypair.generate();
      const provider = new AnchorProvider(
        connection,
        new SimpleWallet(dummyKeypair),
        { commitment: 'confirmed' }
      );

      const program = new Program(PROFILE_IDL, provider);
      const reverseData = program.coder.accounts.decode('ReverseProfile', accountInfo.data);

      // Now fetch the full profile using the username from reverse lookup
      const profile = await this.getProfileByUsername(reverseData.username);

      // Cache the result
      this.cache.set(cacheKey, { data: profile, timestamp: Date.now() });

      return profile;
    } catch (error) {
      console.error('Error getting profile by wallet:', error);
      return null;
    }
  }

  /**
   * Create a new profile on-chain
   */
  async createProfile(keypair, username, bio = '', avatar = '', twitter = '', discord = '', website = '') {
    try {
      // Check if keypair is provided
      if (!keypair) {
        throw new Error('Wallet is locked. Please unlock your wallet first.');
      }

      const connection = this.getConnection();

      // Convert keypair to proper Solana Keypair format
      let walletKeypair;
      if (typeof keypair === 'string') {
        // Base58 encoded private key string
        const privateKeyBytes = bs58.decode(keypair);
        walletKeypair = Keypair.fromSecretKey(privateKeyBytes);
      } else if (keypair.secretKey) {
        // Custom keypair object from walletStore (publicKey is Uint8Array, not PublicKey)
        // Reconstruct proper Solana Keypair from the secretKey
        // The secretKey from tweetnacl is 64 bytes (32 private + 32 public)
        let secretKey;
        if (keypair.secretKey instanceof Uint8Array) {
          secretKey = keypair.secretKey;
        } else if (Array.isArray(keypair.secretKey)) {
          secretKey = new Uint8Array(keypair.secretKey);
        } else if (keypair.secretKey.data) {
          // Handle serialized Uint8Array format
          secretKey = new Uint8Array(Object.values(keypair.secretKey));
        } else {
          secretKey = new Uint8Array(Object.values(keypair.secretKey));
        }

        walletKeypair = Keypair.fromSecretKey(secretKey);
      } else if (keypair._naclKeypair) {
        // Use the raw nacl keypair if available
        const secretKey = keypair._naclKeypair.secretKey instanceof Uint8Array
          ? keypair._naclKeypair.secretKey
          : new Uint8Array(keypair._naclKeypair.secretKey);
        walletKeypair = Keypair.fromSecretKey(secretKey);
      } else {
        console.error('Invalid keypair structure:', Object.keys(keypair));
        throw new Error('Invalid keypair format. Please unlock your wallet and try again.');
      }

      // Create provider with the actual wallet
      const provider = new AnchorProvider(
        connection,
        new SimpleWallet(walletKeypair),
        { commitment: 'confirmed' }
      );

      // Create program instance
      const program = new Program(PROFILE_IDL, provider);

      // Validate and sanitize inputs
      const validatedUsername = this.validateUsername(username);
      const validatedBio = this.sanitizeString(bio, 200);
      const validatedAvatar = this.sanitizeString(avatar, 200);
      const validatedTwitter = this.sanitizeString(twitter, 50);
      const validatedDiscord = this.sanitizeString(discord, 50);
      const validatedWebsite = this.sanitizeString(website, 200);

      // Generate PDAs
      const profilePda = await this.getProfilePDA(validatedUsername);
      const reversePda = await this.getReversePDA(walletKeypair.publicKey);

      // Create profile transaction
      const tx = await program.methods
        .createProfile(
          validatedUsername,
          validatedBio,
          validatedAvatar,
          validatedTwitter,
          validatedDiscord,
          validatedWebsite
        )
        .accounts({
          authority: walletKeypair.publicKey,
          profile: profilePda,
          reverse: reversePda,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      tx.feePayer = walletKeypair.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(walletKeypair);

      const signature = await connection.sendRawTransaction(tx.serialize());

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Clear cache for this wallet
      this.clearCache(walletKeypair.publicKey.toString());

      return {
        signature,
        profileAddress: profilePda.toString(),
        username: validatedUsername
      };
    } catch (error) {
      console.error('Error creating profile on chain:', error);
      throw new Error(`Failed to create profile: ${error.message}`);
    }
  }

  /**
   * Update an existing profile on-chain
   */
  async updateProfile(keypair, bio = '', avatar = '', twitter = '', discord = '', website = '') {
    try {
      // Check if keypair is provided
      if (!keypair) {
        throw new Error('Wallet is locked. Please unlock your wallet first.');
      }

      const connection = this.getConnection();

      // Convert keypair to proper Solana Keypair format
      let walletKeypair;
      if (typeof keypair === 'string') {
        // Base58 encoded private key string
        const privateKeyBytes = bs58.decode(keypair);
        walletKeypair = Keypair.fromSecretKey(privateKeyBytes);
      } else if (keypair.secretKey) {
        // Custom keypair object from walletStore (publicKey is Uint8Array, not PublicKey)
        // Reconstruct proper Solana Keypair from the secretKey
        let secretKey;
        if (keypair.secretKey instanceof Uint8Array) {
          secretKey = keypair.secretKey;
        } else if (Array.isArray(keypair.secretKey)) {
          secretKey = new Uint8Array(keypair.secretKey);
        } else if (keypair.secretKey.data) {
          secretKey = new Uint8Array(Object.values(keypair.secretKey));
        } else {
          secretKey = new Uint8Array(Object.values(keypair.secretKey));
        }
        walletKeypair = Keypair.fromSecretKey(secretKey);
      } else if (keypair._naclKeypair) {
        // Use the raw nacl keypair if available
        const secretKey = keypair._naclKeypair.secretKey instanceof Uint8Array
          ? keypair._naclKeypair.secretKey
          : new Uint8Array(keypair._naclKeypair.secretKey);
        walletKeypair = Keypair.fromSecretKey(secretKey);
      } else {
        console.error('Invalid keypair structure:', Object.keys(keypair));
        throw new Error('Invalid keypair format. Please unlock your wallet and try again.');
      }

      // First, get the current profile to find the username
      const currentProfile = await this.getProfileByWallet(walletKeypair.publicKey.toString());
      if (!currentProfile) {
        throw new Error('No profile found for this wallet');
      }

      // Create provider
      const provider = new AnchorProvider(
        connection,
        new SimpleWallet(walletKeypair),
        { commitment: 'confirmed' }
      );

      // Create program instance
      const program = new Program(PROFILE_IDL, provider);

      // Validate and sanitize inputs
      const validatedBio = this.sanitizeString(bio, 200);
      const validatedAvatar = this.sanitizeString(avatar, 200);
      const validatedTwitter = this.sanitizeString(twitter, 50);
      const validatedDiscord = this.sanitizeString(discord, 50);
      const validatedWebsite = this.sanitizeString(website, 200);

      // Get profile PDA
      const profilePda = await this.getProfilePDA(currentProfile.username);

      // Update profile transaction
      const tx = await program.methods
        .updateProfile(
          validatedBio,
          validatedAvatar,
          validatedTwitter,
          validatedDiscord,
          validatedWebsite
        )
        .accounts({
          authority: walletKeypair.publicKey,
          profile: profilePda,
        })
        .transaction();

      tx.feePayer = walletKeypair.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(walletKeypair);

      const signature = await connection.sendRawTransaction(tx.serialize());

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Clear cache
      this.clearCache(walletKeypair.publicKey.toString());

      return {
        signature,
        profileAddress: profilePda.toString()
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Clear cache for a specific wallet or all cache
   */
  clearCache(walletAddress = null) {
    if (walletAddress) {
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        if (key.includes(walletAddress)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Check if a string looks like a username (vs an address)
   */
  isUsername(input) {
    if (!input || typeof input !== 'string') return false;

    // Remove @ prefix if present
    const cleaned = input.startsWith('@') ? input.slice(1) : input;

    // Usernames are 3-32 chars, lowercase alphanumeric + ._-
    // Addresses are typically 32-44 chars of base58
    if (cleaned.length < 3 || cleaned.length > 32) return false;

    // Check if it matches username pattern (lowercase, alphanumeric, ._-)
    const usernamePattern = /^[a-z0-9._-]+$/;
    if (!usernamePattern.test(cleaned)) return false;

    // If it looks like a base58 address (all alphanumeric, 32+ chars), it's not a username
    // Base58 addresses typically start with a capital letter or number
    if (cleaned.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(cleaned)) {
      return false;
    }

    return true;
  }

  /**
   * Resolve a username or address input to a wallet address
   * Returns { address, username, isResolved }
   */
  async resolveToAddress(input) {
    if (!input || typeof input !== 'string') {
      return { address: null, username: null, isResolved: false, error: 'Invalid input' };
    }

    const trimmed = input.trim();

    // Check if it looks like a username
    if (this.isUsername(trimmed)) {
      const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

      try {
        const profile = await this.getProfileByUsername(username);

        if (profile && profile.authority) {
          return {
            address: profile.authority,
            username: profile.username,
            isResolved: true,
            error: null
          };
        } else {
          return {
            address: null,
            username: username,
            isResolved: false,
            error: `Username @${username} not found`
          };
        }
      } catch (error) {
        return {
          address: null,
          username: username,
          isResolved: false,
          error: `Failed to resolve @${username}`
        };
      }
    }

    // Not a username, return as-is (assuming it's an address)
    return {
      address: trimmed,
      username: null,
      isResolved: true,
      error: null
    };
  }
}

// Export singleton instance
const profileService = new ProfileService();
export default profileService;
