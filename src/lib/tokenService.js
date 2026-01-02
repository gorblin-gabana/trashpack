// Token service for fetching and managing token configurations
import tokensConfig from './tokens.json';
import axios from 'axios';
import { MORALIS_API_KEY } from './config';

class TokenService {
  constructor() {
    this.solanaTokens = null;
    this.gorbchainTokens = null;
    this.fallbackConfig = tokensConfig; // Use local config as fallback
    this.tokenCache = new Map();
  }

  // Fetch Solana tokens from trashpack.tech
  async fetchSolanaTokens() {
    try {
      const response = await fetch('https://trashpack.tech/Tokens.json', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        cache: 'default'
      });
      
      if (response.ok) {
        const tokens = await response.json();
        this.solanaTokens = tokens;
        return tokens;
      } else {
        console.log('Response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('Failed to fetch Solana tokens from trashpack.tech:', error);
      // Try alternative approach for CORS
      try {
        const proxyResponse = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://trashpack.tech/Tokens.json')}`);
        if (proxyResponse.ok) {
          const data = await proxyResponse.json();
          const tokens = JSON.parse(data.contents);
          this.solanaTokens = tokens;
          return tokens;
        }
      } catch (proxyError) {
        console.log('Proxy fetch also failed:', proxyError);
      }
    }

    // Fallback to local tokens if remote fails
    return this.getFallbackSolanaTokens();
  }

  // Fetch Gorbchain tokens (for now just native token)
  async fetchGorbchainTokens() {
    try {
      // For now, create the native GORB token until the endpoint is ready
      const gorbNativeToken = {
        name: "Gorbagana",
        symbol: "GORB", 
        address: "11111111111111111111111111111112",
        decimals: 9,
        metadata: {
          icon: "https://upward-sport-headed.quicknode-ipfs.com/ipfs/QmQAtMVZPjsfaTJM9QErBdVqHi1bD9FCBZDr5uzGV96zhU"
        }
      };
      
      this.gorbchainTokens = [gorbNativeToken];
      return [gorbNativeToken];
    } catch (error) {
      console.log('Failed to fetch Gorbchain tokens:', error);
      return [];
    }
  }

  // Get fallback Solana tokens from local config
  getFallbackSolanaTokens() {
    const fallbackTokens = [
      {
        name: "SOL",
        symbol: "SOL",
        address: "So11111111111111111111111111111111111111111",
        decimals: 9,
        metadata: {
          icon: "https://statics.solscan.io/solscan-img/solana_icon.svg"
        }
      },
      {
        name: "USDC",
        symbol: "USDC", 
        address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        decimals: 6,
        metadata: {
          icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
        }
      }
    ];
    this.solanaTokens = fallbackTokens;
    return fallbackTokens;
  }

  // Get all supported chains (transform to expected format)
  async getChains() {
    // Ensure tokens are loaded
    await this.getTokensForChain('solana');
    await this.getTokensForChain('gorbagana');

    return [
      {
        chainId: 'solana-devnet',
        name: 'Solana',
        symbol: 'SOL',
        environment: 'devnet'
      },
      {
        chainId: 'gorbagana-mainnet', 
        name: 'Gorbchain',
        symbol: 'GORB',
        environment: 'mainnet'
      }
    ];
  }

  // Get tokens for a specific chain
  async getTokensForChain(chainId) {
    const cacheKey = `tokens-${chainId}`;
    if (this.tokenCache.has(cacheKey)) {
      return this.tokenCache.get(cacheKey);
    }

    let tokens = [];

    if (chainId === 'solana' || chainId.includes('solana')) {
      if (!this.solanaTokens) {
        await this.fetchSolanaTokens();
      }
      tokens = this.solanaTokens || [];
    } else if (chainId === 'gorbagana' || chainId.includes('gorbagana') || chainId.includes('gorb')) {
      if (!this.gorbchainTokens) {
        await this.fetchGorbchainTokens();
      }
      tokens = this.gorbchainTokens || [];
    }

    // Transform tokens to expected format
    const transformedTokens = tokens.map(token => ({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals || 9,
      icon: token.metadata?.icon || this.getDefaultIcon(token.symbol)
    }));

    this.tokenCache.set(cacheKey, transformedTokens);
    return transformedTokens;
  }

  // Get bridge pairs (hardcoded for now, can be made dynamic later)
  async getBridgePairs() {
    return [
      {
        fromChain: 'solana',
        toChain: 'gorbagana',
        fromToken: 'SOL',
        toToken: 'GORB',
        minAmount: 0.001,
        maxAmount: 1000,
        fee: 0.003,
        estimatedTime: '5-10 minutes'
      },
      {
        fromChain: 'gorbagana',
        toChain: 'solana', 
        fromToken: 'GORB',
        toToken: 'SOL',
        minAmount: 0.001,
        maxAmount: 1000,
        fee: 0.003,
        estimatedTime: '10-15 minutes'
      },
      {
        fromChain: 'solana',
        toChain: 'gorbagana',
        fromToken: 'USDC',
        toToken: 'GORB',
        minAmount: 1,
        maxAmount: 10000,
        fee: 0.1,
        estimatedTime: '5-10 minutes'
      }
    ];
  }

  // Get available destination tokens for a given source token
  async getDestinationTokens(fromChain, fromToken) {
    const pairs = await this.getBridgePairs();
    return pairs
      .filter(pair => pair.fromChain === fromChain && pair.fromToken === fromToken)
      .map(pair => ({
        chainId: pair.toChain,
        symbol: pair.toToken,
        fee: pair.fee,
        minAmount: pair.minAmount,
        maxAmount: pair.maxAmount,
        estimatedTime: pair.estimatedTime
      }));
  }

  // Get bridge pair details
  async getBridgePair(fromChain, fromToken, toChain, toToken) {
    const pairs = await this.getBridgePairs();
    return pairs.find(pair => 
      pair.fromChain === fromChain && 
      pair.fromToken === fromToken && 
      pair.toChain === toChain && 
      pair.toToken === toToken
    );
  }

  // Get token info by chain and symbol
  async getTokenInfo(chainId, tokenSymbol) {
    const tokens = await this.getTokensForChain(chainId);
    return tokens.find(token => token.symbol === tokenSymbol);
  }

  // Get chain info by chain ID (simplified)
  async getChainInfo(chainId) {
    const chains = await this.getChains();
    return chains.find(chain => chain.chainId === chainId);
  }

  // Get default icon for token
  getDefaultIcon(tokenSymbol) {
    const iconMap = {
      'SOL': 'https://statics.solscan.io/solscan-img/solana_icon.svg',
      'GORB': 'https://upward-sport-headed.quicknode-ipfs.com/ipfs/QmQAtMVZPjsfaTJM9QErBdVqHi1bD9FCBZDr5uzGV96zhU',
      'USDC': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      'USDT': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg'
    };
    return iconMap[tokenSymbol] || 'https://via.placeholder.com/32/666666/ffffff?text=' + tokenSymbol?.charAt(0);
  }

  // Format token icon URL (direct return since we're using full URLs now)
  formatIconUrl(iconPath) {
    if (!iconPath) return 'https://via.placeholder.com/32/666666/ffffff?text=?';
    if (iconPath.startsWith('http')) return iconPath;
    return this.getDefaultIcon('?');
  }

  // Clear cache (useful for refreshing token data)
  clearCache() {
    this.tokenCache.clear();
    this.solanaTokens = null;
    this.gorbchainTokens = null;
  }

  // Fetch live USD price for a Solana token by mint address using Moralis
  async getTokenPrice(mintAddress) {
    if (!mintAddress) return null;
    let mint = mintAddress;
    if (mint === 'So11111111111111111111111111111111111111111') {
      mint = "So11111111111111111111111111111111111111112";
    }

    try {
      const url = `https://solana-gateway.moralis.io/token/mainnet/${mint}/price`;
      const response = await axios.get(url, {
        headers: {
          accept: 'application/json',
          'X-API-Key': MORALIS_API_KEY,
        },
      });

      if (!response.data || response.data.usdPrice == null) {
        return null;
      }

      

      return parseFloat(response.data.usdPrice);
    } catch (err) {
      console.error(`Failed to fetch price for token ${mintAddress}:`, err?.message || err);
      return null;
    }
  }

  /**
   * Get full Solana mainnet portfolio (native SOL + SPL tokens) for a wallet
   * using Moralis account portfolio API.
   *
   * @param {string} address - Solana wallet address (base58)
   * @returns {Promise<{
   *   nativeBalance: { lamports: string, solana: string },
   *   tokens: Array,
   *   nfts: Array
   * } | null>}
   */
  async getSolanaPortfolio(address) {
    if (!address) return null;

    try {
      const url = `https://solana-gateway.moralis.io/account/mainnet/${address}/portfolio`;
      const params = new URLSearchParams({
        nftMetadata: 'false',
        mediaItems: 'false',
        excludeSpam: 'true',
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': MORALIS_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Moralis portfolio error: ${response.status}`);
      }

      const data = await response.json();
      console.log(data);
      return data;
    } catch (err) {
      console.error(`Failed to fetch Solana portfolio for ${address}:`, err?.message || err);
      return null;
    }
  }

  /**
   * Convenience helper: get native SOL and token balances from Moralis,
   * already normalized to numbers where possible.
   *
   * @param {string} address
   * @returns {Promise<{
   *   nativeSol: number,
   *   nativeLamports: number,
   *   tokens: Array<{
   *     mint: string,
   *     amount: number,
   *     amountRaw: string,
   *     decimals: number,
   *     name?: string,
   *     symbol?: string,
   *     logo?: string
   *   }>
   * } | null>}
   */
  async getSolanaBalances(address) {
    const portfolio = await this.getSolanaPortfolio(address);
    if (!portfolio) return null;

    const nativeLamports = Number(portfolio.nativeBalance?.lamports || 0);
    const nativeSol = Number(portfolio.nativeBalance?.solana || 0);

    const tokens = Array.isArray(portfolio.tokens)
      ? portfolio.tokens.map((t) => ({
          mint: t.mint,
          amount: Number(t.amount || 0),
          amountRaw: t.amountRaw,
          decimals: t.decimals,
          name: t.name,
          symbol: t.symbol,
          logo: t.logo,
          associatedTokenAddress: t.associatedTokenAddress,
        }))
      : [];

    return {
      nativeSol,
      nativeLamports,
      tokens,
    };
  }
}

// Export singleton instance
export default new TokenService(); 