/**
 * Gorbscan API Service
 * Handles token balances, transactions, and NFT data with smart caching
 */

const GORBSCAN_BASE_URL = 'https://api.gorbscan.com/api';

class GorbscanService {
  constructor() {
    this.cache = new Map();
    this.metadataCache = new Map(); // Cache for token metadata
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.metadataCacheTimeout = 24 * 60 * 60 * 1000; // 24 hours for metadata
    this.lastBalanceHash = new Map(); // Track balance changes
  }

  /**
   * Fetch token metadata from URI and cache it
   * @param {string} uri - Metadata URI (IPFS or HTTP)
   * @param {string} mintAddress - Token mint address for caching
   * @returns {Promise<Object|null>} Metadata object or null if failed
   */
  async fetchTokenMetadata(uri, mintAddress) {
    if (!uri || !mintAddress) return null;

    const cacheKey = `metadata_${mintAddress}`;
    
    // Check cache first
    if (this.metadataCache.has(cacheKey)) {
      const cached = this.metadataCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.metadataCacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Handle IPFS URLs
      let fetchUrl = uri;
      if (uri.startsWith('ipfs://')) {
        fetchUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metadata = await response.json();
      
      // Validate metadata structure
      const processedMetadata = {
        name: metadata.name || '',
        symbol: metadata.symbol || '',
        description: metadata.description || '',
        image: metadata.image || '',
        attributes: metadata.attributes || [],
        ...metadata // Include any other fields
      };

      // Handle IPFS image URLs
      if (processedMetadata.image && processedMetadata.image.startsWith('ipfs://')) {
        processedMetadata.image = processedMetadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }

      // Cache the processed metadata
      this.metadataCache.set(cacheKey, {
        data: processedMetadata,
        timestamp: Date.now()
      });

      return processedMetadata;
    } catch (error) {
      // Return cached data if available, even if expired
      if (this.metadataCache.has(cacheKey)) {
        return this.metadataCache.get(cacheKey).data;
      }
      
      return null;
    }
  }

  /**
   * Fetch token balances for an address
   * @param {string} address - Wallet address
   * @param {boolean} useCache - Whether to use cached data
   * @returns {Promise<Array>} Array of token balance objects
   */
  async getTokenBalances(address, useCache = true) {
    const cacheKey = `tokens_${address}`;
    
    // Check cache first if useCache is true
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${GORBSCAN_BASE_URL}/balance/${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Ensure data is array
      const tokenBalances = Array.isArray(data) ? data : [];
      
      // Process and normalize the data
      const processedTokens = await Promise.all(tokenBalances.map(async (token) => {
        const baseToken = {
          ...token,
          // Ensure required fields exist
          token_balance: token.token_balance || 0,
          formatted_balance: token.formatted_balance || '0',
          mintAddress: token.mintAddress || '',
          symbol: token.symbol || 'Unknown',
          name: token.name || 'Unknown Token',
          decimals: parseInt(token.decimals) || 0,
          uri: token.uri || '',
          isNFT: token.decimals === "0" || token.decimals === 0,
          isFrozen: token.isFrozen || false,
          programId: token.programId || '',
        };

        // Fetch metadata if URI exists
        if (baseToken.uri) {
          try {
            const metadata = await this.fetchTokenMetadata(baseToken.uri, baseToken.mintAddress);
            if (metadata) {
              return {
                ...baseToken,
                metadata,
                // Use metadata fields if available, fallback to original
                name: metadata.name || baseToken.name,
                symbol: metadata.symbol || baseToken.symbol,
                description: metadata.description || '',
                image: metadata.image || '', // This is the actual image URL
                attributes: metadata.attributes || []
              };
            }
          } catch (metadataError) {
            // Metadata fetch failed, continue with base token
          }
        }

        return baseToken;
      }));

      // Cache the processed data
      this.cache.set(cacheKey, {
        data: processedTokens,
        timestamp: Date.now()
      });

      return processedTokens;
    } catch (error) {
      // Return cached data if available, even if expired
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey).data;
      }
      
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Get cached metadata for a token
   * @param {string} mintAddress - Token mint address
   * @returns {Object|null} Cached metadata or null
   */
  getCachedMetadata(mintAddress) {
    const cacheKey = `metadata_${mintAddress}`;
    if (this.metadataCache.has(cacheKey)) {
      return this.metadataCache.get(cacheKey).data;
    }
    return null;
  }

  /**
   * Preload metadata for multiple tokens (background loading)
   * @param {Array} tokens - Array of token objects with uri and mintAddress
   */
  async preloadMetadata(tokens) {
    const tokensToLoad = tokens.filter(token => 
      token.uri && token.mintAddress && !this.getCachedMetadata(token.mintAddress)
    );

    if (tokensToLoad.length === 0) return;

    // Load metadata in batches to avoid overwhelming the network
    const batchSize = 5;
    for (let i = 0; i < tokensToLoad.length; i += batchSize) {
      const batch = tokensToLoad.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(token => this.fetchTokenMetadata(token.uri, token.mintAddress))
      );
      
      // Small delay between batches
      if (i + batchSize < tokensToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  /**
   * Get only token balances (excluding NFTs)
   * @param {string} address - Wallet address
   * @param {boolean} useCache - Whether to use cached data
   * @returns {Promise<Array>} Array of token objects
   */
  async getTokens(address, useCache = true) {
    const allBalances = await this.getTokenBalances(address, useCache);
    return allBalances.filter(token => !token.isNFT && parseFloat(token.formatted_balance) > 0);
  }

  /**
   * Get only NFTs
   * @param {string} address - Wallet address
   * @param {boolean} useCache - Whether to use cached data
   * @returns {Promise<Array>} Array of NFT objects
   */
  async getNFTs(address, useCache = true) {
    const allBalances = await this.getTokenBalances(address, useCache);
    return allBalances.filter(token => token.isNFT && parseFloat(token.formatted_balance) > 0);
  }

  /**
   * Check if balance has changed since last check
   * @param {string} address - Wallet address
   * @param {number} currentBalance - Current native balance
   * @returns {boolean} True if balance changed
   */
  hasBalanceChanged(address, currentBalance) {
    const lastBalance = this.lastBalanceHash.get(address);
    const balanceChanged = lastBalance !== currentBalance;
    
    if (balanceChanged) {
      this.lastBalanceHash.set(address, currentBalance);
    }
    
    return balanceChanged;
  }

  /**
   * Force refresh token data (bypass cache)
   * @param {string} address - Wallet address
   * @returns {Promise<Array>} Fresh token balance data
   */
  async refreshTokenBalances(address) {
    return await this.getTokenBalances(address, false);
  }

  /**
   * Get transaction history (placeholder for now)
   * @param {string} address - Wallet address
   * @param {number} limit - Number of transactions to fetch
   * @returns {Promise<Array>} Array of transaction objects
   */
  async getTransactions(address, limit = 20) {
    // TODO: Implement transaction API when available
    // For now, return empty array or mock data
    try {
      // This would be the actual API call:
      // const response = await fetch(`${GORBSCAN_BASE_URL}/transactions/${address}?limit=${limit}`);
      
      return []; // Return empty for now
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear cache for specific address or all cache
   * @param {string} address - Optional address to clear specific cache
   */
  clearCache(address = null) {
    if (address) {
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        if (key.includes(address)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
      this.lastBalanceHash.delete(address);
    } else {
      this.cache.clear();
      this.lastBalanceHash.clear();
    }
  }

  /**
   * Clear metadata cache
   * @param {string} mintAddress - Optional mint address to clear specific metadata
   */
  clearMetadataCache(mintAddress = null) {
    if (mintAddress) {
      this.metadataCache.delete(`metadata_${mintAddress}`);
    } else {
      this.metadataCache.clear();
    }
  }

  /**
   * Get cache status for debugging
   * @returns {Object} Cache information
   */
  getCacheStatus() {
    return {
      cacheSize: this.cache.size,
      metadataCacheSize: this.metadataCache.size,
      balanceHashSize: this.lastBalanceHash.size,
      cacheTimeout: this.cacheTimeout,
      metadataCacheTimeout: this.metadataCacheTimeout,
      cachedAddresses: Array.from(this.lastBalanceHash.keys())
    };
  }
}

// Export singleton instance
const gorbscanService = new GorbscanService();
export default gorbscanService; 