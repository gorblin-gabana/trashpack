import { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown, ChevronDown, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';

import tokenService from '../lib/tokenService';
import newBridge from '../lib/newBridge';
import { universalSwap } from '../lib/swapService';
import { useWalletStore } from '../store/walletStore';
import { useUIStore } from '../store/uiStore';
import PasswordPrompt from '../components/PasswordPrompt';
import { networks, SOLANA_MAINNET_RPC, SOLANA_MAINNET_RPC_WS } from '../lib/config';

function TradePage() {
  const navigate = useNavigate();

  const { walletAddress, getKeypair, isWalletUnlocked, hasWallet } = useWalletStore();
  const { clearError } = useUIStore();

  // Core state
  const [currentStep, setCurrentStep] = useState('form');
  const [operationType, setOperationType] = useState('bridge'); // 'bridge' or 'swap'

  // Unified portfolio state (Solana + Gorbchain tokens)
  const [portfolioTokens, setPortfolioTokens] = useState([]);
  const [selectedMint, setSelectedMint] = useState(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [isLoadingGorbTokens, setIsLoadingGorbTokens] = useState(false);

  // Swap-specific state
  const [pools, setPools] = useState([]);
  const [isLoadingPools, setIsLoadingPools] = useState(false);
  const [matchingPools, setMatchingPools] = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);
  const [destinationTokens, setDestinationTokens] = useState([]);
  const [selectedDestinationMint, setSelectedDestinationMint] = useState(null);
  const [showDestinationTokenModal, setShowDestinationTokenModal] = useState(false);

  // Amount and destination
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');

  // Price state
  const [tokenPrice, setTokenPrice] = useState(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  // Transaction state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // UI state
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [imageErrors, setImageErrors] = useState(new Set());
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  const [destinationSearchQuery, setDestinationSearchQuery] = useState('');

  // Initialize destination address
  useEffect(() => {
    if (walletAddress && !destinationAddress) {
      setDestinationAddress(walletAddress);
    }
  }, [walletAddress, destinationAddress]);

  // Load portfolio on mount and mode change
  useEffect(() => {
    loadPortfolio();
  }, [walletAddress]);

  // Refresh portfolio when returning to the page (on mount)
  useEffect(() => {
    // Force refresh when component mounts
    if (walletAddress) {
      loadPortfolio();
    }
  }, []);

  // Fetch and cache pools on mount
  useEffect(() => {
    fetchPools();
  }, []);

  // Load both Solana and Gorbchain portfolios
  const loadPortfolio = async () => {
    if (!walletAddress) return;

    setIsLoadingPortfolio(true);
    const allTokens = [];

    try {
      // Load Solana tokens
      const portfolio = await tokenService.getSolanaPortfolio(walletAddress);

      if (portfolio) {
        const nativeSol = Number(portfolio.nativeBalance?.solana || 0);

        // Native SOL
        allTokens.push({
          mint: 'So11111111111111111111111111111111111111111',
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          amount: nativeSol,
          logo: tokenService.getDefaultIcon('SOL'),
          isNative: true,
          chain: 'solana',
          chainName: 'Solana',
        });

        // SPL tokens with balance
        if (Array.isArray(portfolio.tokens)) {
          for (const t of portfolio.tokens) {
            const tokenBalance = Number(t.amount || 0);
            if (tokenBalance <= 0) continue;

            allTokens.push({
              mint: t.mint,
              symbol: t.symbol || 'TOKEN',
              name: t.name || t.symbol || t.mint,
              decimals: t.decimals || 6,
              amount: tokenBalance,
              logo: t.logo,
              isNative: false,
              chain: 'solana',
              chainName: 'Solana',
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load Solana portfolio:', err);
    }

    try {
      // Load Gorbchain tokens
      setIsLoadingGorbTokens(true);
      
      // Get native GORB balance from store
      const storeState = useWalletStore.getState();
      const gorbBalance = storeState.balance;
      
      if (gorbBalance !== null && gorbBalance !== undefined) {
        allTokens.push({
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'GORB',
          name: 'Gorbchain',
          decimals: 9,
          amount: gorbBalance,
          logo: tokenService.getDefaultIcon('GORB'),
          isNative: true,
          chain: 'gorbchain',
          chainName: 'Gorbchain',
        });
      }

      // Get Gorbchain SPL tokens using gorbscanService directly
      const gorbTokens = await storeState.fetchTokens(walletAddress, false);
      if (Array.isArray(gorbTokens)) {
        for (const token of gorbTokens) {
          const tokenBalance = parseFloat(token.formatted_balance || token.balance || 0);
          if (tokenBalance <= 0) continue;

          allTokens.push({
            mint: token.mintAddress || token.mint,
            symbol: token.symbol || 'TOKEN',
            name: token.name || token.symbol || 'Unknown Token',
            decimals: token.decimals || 9,
            amount: tokenBalance,
            logo: token.image || token.logo,
            isNative: false,
            chain: 'gorbchain',
            chainName: 'Gorbchain',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load Gorbchain tokens:', err);
    } finally {
      setIsLoadingGorbTokens(false);
    }

    // Sort tokens: Solana first, then Gorbchain, then by balance
    allTokens.sort((a, b) => {
      if (a.chain !== b.chain) {
        return a.chain === 'solana' ? -1 : 1;
      }
      if (a.isNative !== b.isNative) {
        return a.isNative ? -1 : 1;
      }
      return b.amount - a.amount;
    });

    setPortfolioTokens(allTokens);
    if (allTokens.length > 0 && !selectedMint) {
      setSelectedMint(allTokens[0].mint);
    }
    setIsLoadingPortfolio(false);
  };

  // Selected token
  const selectedToken = useMemo(
    () => portfolioTokens.find((t) => t.mint === selectedMint) || null,
    [portfolioTokens, selectedMint]
  );

  // Bridge pairs for fee estimation
  const bridgeFee = 0.003;
  const estimatedTime = '~5 min';

  // Determine bridge direction and destination token based on selected token
  const bridgeDirection = useMemo(() => {
    if (!selectedToken) return { from: 'Solana', to: 'Gorbchain' };
    return selectedToken.chain === 'solana' 
      ? { from: 'Solana', to: 'Gorbchain' }
      : { from: 'Gorbchain', to: 'Solana' };
  }, [selectedToken]);

  // Constant wrapped token on Gorbchain for Solana -> Gorbchain bridge
  const WRAPPED_TOKEN_GORBCHAIN = {
    mintAddress: 'aacJqpHJUXcmqqVgKLDzJDWrDQN1Kdx9H14aq7wQSp4',
    programId: 'G22oYgZ6LnVcy7v8eSNi2xpNk1NcZiPD8CVKSTut7oZ6',
    symbol: 'MTK',
    name: 'My Token',
    decimals: 9,
    uri: 'https://example.com/metadata.json',
    price: 1.0, // Hardcoded price: $1 per MTK
  };

  // Get the destination token info (what user will receive)
  const destinationToken = useMemo(() => {
    if (!selectedToken) return { symbol: 'MTK', name: 'My Token', isWrapped: true, price: 1.0 };
    
    if (selectedToken.chain === 'solana') {
      // Bridging from Solana to Gorbchain
      // The received token will always be the wrapped MTK token on Gorbchain
      return {
        symbol: WRAPPED_TOKEN_GORBCHAIN.symbol,
        name: WRAPPED_TOKEN_GORBCHAIN.name,
        mint: WRAPPED_TOKEN_GORBCHAIN.mintAddress,
        decimals: WRAPPED_TOKEN_GORBCHAIN.decimals,
        price: WRAPPED_TOKEN_GORBCHAIN.price,
        isWrapped: true
      };
    } else {
      // Bridging from Gorbchain to Solana (future implementation)
      return {
        symbol: selectedToken.symbol,
        name: selectedToken.name,
        isWrapped: true
      };
    }
  }, [selectedToken]);

  // Load token price
  useEffect(() => {
    if (!selectedToken) {
      setTokenPrice(null);
      return;
    }

    const loadPrice = async () => {
      try {
        setIsLoadingPrice(true);
        const price = await tokenService.getTokenPrice(selectedToken.mint);
        setTokenPrice(price ?? null);
      } catch (err) {
        console.error('Failed to load token price:', err);
        setTokenPrice(null);
      } finally {
        setIsLoadingPrice(false);
      }
    };

    loadPrice();
  }, [selectedToken]);

  // Computed values
  const maxAmount = selectedToken?.amount || 0;
  const parsedAmount = amount ? parseFloat(amount) || 0 : 0;
  const clampedAmount = Math.max(0, Math.min(parsedAmount, maxAmount));
  const estimatedReceived = Math.max(0, clampedAmount - bridgeFee);

  const expectedUsd = useMemo(() => {
    if (tokenPrice && clampedAmount) {
      return clampedAmount * tokenPrice;
    }
    return 0;
  }, [clampedAmount, tokenPrice]);

  // Calculate expected USD for received token
  const expectedReceivedUsd = useMemo(() => {
    if (selectedToken?.chain === 'solana' && destinationToken.price && estimatedReceived > 0) {
      return estimatedReceived * destinationToken.price;
    }
    return 0;
  }, [selectedToken, destinationToken, estimatedReceived]);

  // Update operation type based on selected token
  useEffect(() => {
    if (selectedToken) {
      if (selectedToken.chain === 'gorbchain') {
        setOperationType('swap');
        // Find matching pools for swap
        findMatchingPools(selectedToken.mint);
      } else {
        setOperationType('bridge');
        setMatchingPools([]);
        setSelectedPool(null);
        setDestinationTokens([]);
        setSelectedDestinationMint(null);
      }
    }
  }, [selectedToken]);

  const formatUsd = (value) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const canSubmit = operationType === 'swap' 
    ? !!selectedToken && clampedAmount > 0 && !!selectedDestinationMint && !isLoadingPortfolio && !isLoadingPrice && !isLoadingGorbTokens
    : !!selectedToken && clampedAmount > 0 && destinationAddress.trim().length > 0 && !isLoadingPortfolio && !isLoadingPrice && !isLoadingGorbTokens;

  // Handlers
  const handleAmountChange = (value) => {
    setAmount(value);
  };

  const handleMaxAmount = () => {
    if (selectedToken) {
      // Reserve a small amount for transaction fees
      const reserve = selectedToken.isNative ? 0.01 : 0;
      const maxAmt = Math.max(0, selectedToken.amount - reserve);
      setAmount(maxAmt.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 9 }));
    }
  };

  const handlePercentageAmount = (percentage) => {
    if (!selectedToken) return;
    const reserve = selectedToken.isNative ? 0.01 : 0;
    const maxAmt = Math.max(0, selectedToken.amount - reserve);
    const amt = (maxAmt * percentage) / 100;
    setAmount(amt.toFixed(6));
  };

  const handleTokenSelect = (mint) => {
    setSelectedMint(mint);
    setAmount('');
    setShowTokenModal(false);
    setTokenSearchQuery(''); // Clear search when closing
  };

  // Fetch pools from Gorbchain API
  const fetchPools = async () => {
    if (pools.length > 0) {
      console.log('✅ Pools already cached, skipping fetch');
      return;
    }

    setIsLoadingPools(true);
    try {
      console.log('🔄 Fetching pools from Gorbchain API...');
      const API_URL = 'https://api.gorbscan.com/api';
      const response = await fetch(`${API_URL}/pool/pools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Pools fetched successfully:', result);

      const poolsData = result.success && result.data ? result.data : (Array.isArray(result) ? result : []);
      
      if (Array.isArray(poolsData) && poolsData.length > 0) {
        console.log(`🔄 Processing ${poolsData.length} pools from API...`);
        setPools(poolsData);
        console.log(`✅ Cached ${poolsData.length} pools`);
      } else {
        console.warn('⚠️ No pools data found in API response');
        setPools([]);
      }
    } catch (error) {
      console.error('❌ Error fetching pools:', error);
      setPools([]);
    } finally {
      setIsLoadingPools(false);
    }
  };

  // Find matching pools for the selected token
  const findMatchingPools = (tokenMint) => {
    console.log('🔍 Finding pools for token:', tokenMint);
    
    const matches = pools.filter(pool => {
      const tokenAMint = pool.tokenA || pool.tokenAInfo?.mintAddress || '';
      const tokenBMint = pool.tokenB || pool.tokenBInfo?.mintAddress || '';
      
      return tokenAMint === tokenMint || tokenBMint === tokenMint;
    });

    console.log(`✅ Found ${matches.length} matching pools:`, matches);
    setMatchingPools(matches);

    if (matches.length > 0) {
      // Select first pool by default
      const firstPool = matches[0];
      setSelectedPool(firstPool);
      console.log('✅ Selected first pool:', firstPool);

      // Extract destination tokens from matching pools
      const destTokens = matches.map(pool => {
        const tokenAMint = pool.tokenA || pool.tokenAInfo?.mintAddress || '';
        const tokenBMint = pool.tokenB || pool.tokenBInfo?.mintAddress || '';
        
        // Return the token that's NOT the selected token
        if (tokenAMint === tokenMint) {
          return {
            mint: tokenBMint,
            symbol: pool.tokenBInfo?.symbol || 'Unknown',
            name: pool.tokenBInfo?.name || 'Unknown Token',
            decimals: parseInt(pool.tokenBInfo?.decimals || '9'),
            logo: pool.tokenBInfo?.uri || pool.tokenBInfo?.metadata?.tokenMetadata?.image,
            pool: pool
          };
        } else {
          return {
            mint: tokenAMint,
            symbol: pool.tokenAInfo?.symbol || 'Unknown',
            name: pool.tokenAInfo?.name || 'Unknown Token',
            decimals: parseInt(pool.tokenAInfo?.decimals || '9'),
            logo: pool.tokenAInfo?.uri || pool.tokenAInfo?.metadata?.tokenMetadata?.image,
            pool: pool
          };
        }
      });

      setDestinationTokens(destTokens);
      
      // Select first destination token by default
      if (destTokens.length > 0) {
        setSelectedDestinationMint(destTokens[0].mint);
        console.log('✅ Selected first destination token:', destTokens[0]);
      }
    } else {
      setSelectedPool(null);
      setDestinationTokens([]);
      setSelectedDestinationMint(null);
      console.log('⚠️ No pools found for this token');
    }
  };

  // Handle destination token selection for swap
  const handleDestinationTokenSelect = (mint) => {
    setSelectedDestinationMint(mint);
    
    // Find the pool that matches this destination token
    const destToken = destinationTokens.find(t => t.mint === mint);
    if (destToken && destToken.pool) {
      setSelectedPool(destToken.pool);
      console.log('✅ Updated selected pool:', destToken.pool);
    }
    
    setShowDestinationTokenModal(false);
    setDestinationSearchQuery(''); // Clear search when closing
  };

  // Perform swap operation
  const performSwap = async () => {
    try {
      clearError();
      setLoading(true);
      setCurrentStep('processing');

      console.log('🔄 Performing swap with details:');
      console.log({
        operationType: 'swap',
        fromToken: {
          mint: selectedToken?.mint,
          symbol: selectedToken?.symbol,
          amount: clampedAmount,
          chain: selectedToken?.chain
        },
        toToken: {
          mint: selectedDestinationMint,
          symbol: destinationTokens.find(t => t.mint === selectedDestinationMint)?.symbol
        },
        pool: {
          address: selectedPool?.poolAddress,
          type: selectedPool?.poolType,
          reserveA: selectedPool?.reserveA,
          reserveB: selectedPool?.reserveB,
          fee: selectedPool?.feeBps
        },
        estimatedReceived: estimatedReceived,
        walletAddress: walletAddress
      });

      // Get Gorbchain RPC connection
      
      const connection = new Connection(networks[0].rpcUrl, {
        wsEndpoint : networks[0].wsUrl,
        commitment: 'confirmed'
      });

      // Get keypair from wallet store
      const keypair = getKeypair();
      if (!keypair) {
        throw new Error('Please unlock your wallet first');
      }

      // Create Solana-compatible keypair
      const solanaKeypair = Keypair.fromSecretKey(new Uint8Array(keypair.secretKey));

      console.log("Wallet Address => ",solanaKeypair.publicKey.toBase58())
      
      // Create wallet adapter compatible wallet object
      const wallet = {
        publicKey: new PublicKey(solanaKeypair.publicKey),
        async signTransaction(tx) {
          tx.sign(solanaKeypair);
          return tx;
        },
      };

      // Get destination token info
      const destinationToken = destinationTokens.find(t => t.mint === selectedDestinationMint);
      if (!destinationToken) {
        throw new Error('Destination token not found');
      }

      // Prepare token objects for swap
      const fromToken = {
        mint: selectedToken.mint,
        symbol: selectedToken.symbol,
        decimals: selectedToken.decimals
      };

      const toToken = {
        mint: destinationToken.mint,
        symbol: destinationToken.symbol,
        decimals: destinationToken.decimals
      };

      // Execute swap
      const swapResult = await universalSwap(
        clampedAmount,
        fromToken,
        toToken,
        wallet,
        connection
      );

      if (!swapResult.success) {
        throw new Error(swapResult.error || 'Swap failed');
      }

      // Set success result
      setResult({
        success: true,
        signature: swapResult.signature,
        amount: clampedAmount,
        token: selectedToken.symbol,
        destinationToken: destinationToken.symbol,
        operationType: 'swap'
      });

      setCurrentStep('success');
      
      // Show success toast with explorer link
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="font-semibold">Swap Successful!</div>
          <div className="text-xs">
            Swapped {clampedAmount} {selectedToken.symbol} → {destinationToken.symbol}
          </div>
          <a
            href={`https://gorbscan.com/transactions?search=${swapResult.signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00DFD8] hover:opacity-80 underline text-xs"
          >
            View on Gorbscan
          </a>
        </div>,
        { duration: 6000 }
      );

    } catch (err) {
      console.error('Swap failed:', err);
      setResult({ success: false, error: err.message, operationType: 'swap' });
      setCurrentStep('error');
      toast.error(err?.message || 'Swap failed');
    } finally {
      setLoading(false);
    }
  };

  // Bridge execution
  const executeBridge = async () => {
    try {
      clearError();
      setLoading(true);
      setCurrentStep('processing');

      const connection = new Connection(SOLANA_MAINNET_RPC, {
        wsEndpoint: SOLANA_MAINNET_RPC_WS,
        commitment: 'confirmed',
      });

      const keypair = getKeypair();
      if (!keypair) {
        throw new Error('Please unlock your wallet first');
      }


      const solanaKeypair = Keypair.fromSecretKey(new Uint8Array(keypair.secretKey));


      const wallet = {
        publicKey: new PublicKey(solanaKeypair.publicKey),
        async signTransaction(tx) {
          tx.sign(solanaKeypair);
          return tx;
        },
      };

      // Handle native SOL mint address
      let mint = selectedToken.mint;
      if (new PublicKey(mint).toBase58() === new PublicKey('So11111111111111111111111111111111111111111').toBase58()) {
        mint = 'So11111111111111111111111111111111111111112';
      }

      const signature = await newBridge.lock_token({
        connection,
        wallet,
        destination: destinationAddress,
        solAmount: clampedAmount,
        token: { ...selectedToken, mint },
      });

      setResult({
        success: true,
        signature,
        amount: clampedAmount,
        token: selectedToken.symbol,
        usdValue: expectedUsd,
        destinationAddress,
      });

      setCurrentStep('success');
      toast.success('Bridge successful!');
    } catch (err) {
      console.error('Transaction failed:', err);
      setResult({ success: false, error: err.message });
      setCurrentStep('error');
      toast.error(err?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    if (parsedAmount > maxAmount) {
      toast.error('Amount exceeds available balance');
      return;
    }

    if (!hasWallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Handle swap operation
    if (operationType === 'swap') {
      if (!selectedPool) {
        toast.error('No pool available for this token pair');
        return;
      }
      
      if (!selectedDestinationMint) {
        toast.error('Please select a destination token');
        return;
      }

      // Check if wallet is unlocked for swap
      if (!isWalletUnlocked()) {
        setShowUnlockPrompt(true);
        return;
      }

      // Execute swap directly
      await performSwap();
      return;
    }

    // Handle bridge operation
    if (!isWalletUnlocked()) {
      setShowUnlockPrompt(true);
      return;
    }

    setCurrentStep('confirmation');
  };

  const handleConfirm = async () => {
    await executeBridge();
  };

  const handleUnlock = async () => {
    setShowUnlockPrompt(false);
    
    // If it's a swap operation, execute swap directly
    if (operationType === 'swap') {
      await performSwap();
    } else {
      // For bridge, go to confirmation step
      setCurrentStep('confirmation');
    }
  };

  const handleUnlockCancel = () => {
    setShowUnlockPrompt(false);
  };

  const resetForm = () => {
    setCurrentStep('form');
    setAmount('');
    setDestinationAddress(walletAddress || '');
    setResult(null);
    // Refresh portfolio after successful bridge
    loadPortfolio();
  };

  const handleImageError = (imageKey) => {
    setImageErrors((prev) => new Set([...prev, imageKey]));
  };

  // Token Icon component
  const TokenIcon = ({ tokenSymbol, logo, size = 'w-6 h-6' }) => {
    const imageKey = tokenSymbol;
    const hasError = imageErrors.has(imageKey);
    const iconUrl = logo || tokenService.getDefaultIcon(tokenSymbol);

    if (hasError || !iconUrl) {
      return (
        <div className={`${size} rounded-full bg-gradient-to-br from-[#00DFD8] to-[#6A0DAD] flex items-center justify-center`}>
          <span className="text-white font-bold text-xs">{tokenSymbol?.charAt(0) || '?'}</span>
        </div>
      );
    }

    return (
      <img
        src={iconUrl}
        alt={tokenSymbol}
        className={`${size} rounded-full object-cover`}
        onError={() => handleImageError(imageKey)}
      />
    );
  };

  // Show unlock prompt
  if (showUnlockPrompt) {
    return (
      <div className="w-full max-w-lg p-4">
        <PasswordPrompt onUnlock={handleUnlock} onCancel={handleUnlockCancel} />
      </div>
    );
  }

  // Filter tokens based on search query
  const filteredPortfolioTokens = useMemo(() => {
    if (!tokenSearchQuery.trim()) return portfolioTokens;
    
    const query = tokenSearchQuery.toLowerCase().trim();
    return portfolioTokens.filter(token => 
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.mint.toLowerCase().includes(query)
    );
  }, [portfolioTokens, tokenSearchQuery]);

  // Filter destination tokens based on search query
  const filteredDestinationTokens = useMemo(() => {
    if (!destinationSearchQuery.trim()) return destinationTokens;
    
    const query = destinationSearchQuery.toLowerCase().trim();
    return destinationTokens.filter(token => 
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.mint.toLowerCase().includes(query)
    );
  }, [destinationTokens, destinationSearchQuery]);

  // Token Selection Modal
  const TokenModal = () => {
    if (!showTokenModal) return null;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-800 border border-zinc-600 rounded-xl w-full max-w-sm max-h-[70vh] overflow-hidden shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-zinc-700">
            <h3 className="text-white font-bold text-base">Select Token</h3>
            <button
              onClick={() => {
                setShowTokenModal(false);
                setTokenSearchQuery('');
              }}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-3 border-b border-zinc-700">
            <input
              type="text"
              value={tokenSearchQuery}
              onChange={(e) => setTokenSearchQuery(e.target.value)}
              placeholder="Search by name, symbol, or address..."
              className="w-full bg-zinc-700 border border-zinc-600 text-white text-sm p-2.5 rounded-lg placeholder-zinc-400 focus:outline-none focus:border-[#00DFD8]"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto max-h-80 p-2">
            {filteredPortfolioTokens.map((token) => (
              <button
                key={`${token.chain}-${token.mint}`}
                onClick={() => handleTokenSelect(token.mint)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-zinc-700 transition-colors rounded-lg mb-1 ${
                  token.mint === selectedMint ? 'bg-zinc-700/50 border border-[#00DFD8]/30' : ''
                }`}
              >
                <TokenIcon tokenSymbol={token.symbol} logo={token.logo} size="w-10 h-10" />
                <div className="flex flex-col items-start flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{token.symbol}</span>
                    {token.isNative && <span className="text-[10px] text-[#00DFD8] uppercase">native</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      token.chain === 'solana' 
                        ? 'bg-purple-500/20 text-purple-300' 
                        : 'bg-cyan-500/20 text-cyan-300'
                    }`}>
                      {token.chainName}
                    </span>
                  </div>
                  <span className="text-zinc-400 text-sm">{token.name}</span>
                </div>
                <div className="text-right text-sm text-zinc-400">
                  {token.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>
              </button>
            ))}

            {filteredPortfolioTokens.length === 0 && portfolioTokens.length > 0 && (
              <div className="p-4 text-center text-sm text-zinc-500">
                No tokens match "{tokenSearchQuery}"
              </div>
            )}

            {portfolioTokens.length === 0 && !isLoadingPortfolio && !isLoadingGorbTokens && (
              <div className="p-4 text-center text-sm text-zinc-500">No tokens found in wallet</div>
            )}

            {(isLoadingPortfolio || isLoadingGorbTokens) && (
              <div className="p-4 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#00DFD8]" />
                <p className="text-xs text-zinc-500 mt-2">Loading tokens...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Destination Token Selection Modal (for swap)
  const DestinationTokenModal = () => {
    if (!showDestinationTokenModal) return null;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-800 border border-zinc-600 rounded-xl w-full max-w-sm max-h-[70vh] overflow-hidden shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-zinc-700">
            <h3 className="text-white font-bold text-base">Select Destination Token</h3>
            <button
              onClick={() => {
                setShowDestinationTokenModal(false);
                setDestinationSearchQuery('');
              }}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-3 border-b border-zinc-700">
            <input
              type="text"
              value={destinationSearchQuery}
              onChange={(e) => setDestinationSearchQuery(e.target.value)}
              placeholder="Search by name, symbol, or address..."
              className="w-full bg-zinc-700 border border-zinc-600 text-white text-sm p-2.5 rounded-lg placeholder-zinc-400 focus:outline-none focus:border-[#00DFD8]"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto max-h-80 p-2">
            {filteredDestinationTokens.map((token, index) => (
              <button
                key={`${token.mint}-${index}`}
                onClick={() => handleDestinationTokenSelect(token.mint)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-zinc-700 transition-colors rounded-lg mb-1 ${
                  token.mint === selectedDestinationMint ? 'bg-zinc-700/50 border border-[#00DFD8]/30' : ''
                }`}
              >
                <TokenIcon tokenSymbol={token.symbol} logo={token.logo} size="w-10 h-10" />
                <div className="flex flex-col items-start flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{token.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      Gorbchain
                    </span>
                  </div>
                  <span className="text-zinc-400 text-sm">{token.name}</span>
                </div>
                <div className="text-right text-xs text-zinc-500">
                  Pool {index + 1}
                </div>
              </button>
            ))}

            {filteredDestinationTokens.length === 0 && destinationTokens.length > 0 && (
              <div className="p-4 text-center text-sm text-zinc-500">
                No tokens match "{destinationSearchQuery}"
              </div>
            )}

            {destinationTokens.length === 0 && (
              <div className="p-4 text-center text-sm text-zinc-500">No pools available for this token</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Form Step
  const renderForm = () => (
    <>
      {/* Header */}
      <div className="flex mb-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 w-fit text-zinc-400 hover:text-white transition-colors"
        >
          <X size={28} />
        </button>
        <h2 className="text-lg font-bold text-white mx-auto pr-7">Trade</h2>
      </div>

      {/* From Section */}
      <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-4 mb-2">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-zinc-300">You send</label>
          <div className="flex items-center gap-2 text-xs">
            <span className={parsedAmount > maxAmount ? 'text-red-400' : 'text-zinc-400'}>
              Balance: <span className="text-white font-medium">
                {selectedToken?.amount.toLocaleString(undefined, { maximumFractionDigits: 4 }) || '0'}
              </span>
            </span>
            <button
              onClick={handleMaxAmount}
              className="bg-[#00DFD8] hover:bg-[#00DFD8]/80 text-zinc-900 text-xs font-semibold px-2 py-0.5 rounded transition-colors"
            >
              Max
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <input
              type="number"
              step="0.000001"
              min="0"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0"
              className="w-full bg-zinc-700 border border-zinc-600 text-white text-2xl font-bold p-2.5 rounded-lg placeholder-zinc-500 focus:outline-none focus:border-[#00DFD8]"
              onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
            />
            <div className="text-xs text-zinc-500 mt-1">
              {expectedUsd > 0 ? formatUsd(expectedUsd) : '$0.00'}
            </div>
          </div>

          <button
            onClick={() => setShowTokenModal(true)}
            disabled={isLoadingPortfolio || isLoadingGorbTokens}
            className="flex items-center gap-2 bg-zinc-700 border border-zinc-600 hover:border-[#00DFD8] rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
          >
            {(isLoadingPortfolio || isLoadingGorbTokens) ? (
              <Loader2 size={16} className="animate-spin text-zinc-400" />
            ) : (
              <>
                <TokenIcon tokenSymbol={selectedToken?.symbol || 'SOL'} logo={selectedToken?.logo} size="w-6 h-6" />
                <div className="flex flex-col items-start">
                  <span className="text-white font-semibold text-sm">{selectedToken?.symbol || 'SOL'}</span>
                  <span className="text-zinc-400 text-xs">{selectedToken?.chainName || 'Solana'}</span>
                </div>
                <ChevronDown size={14} className="text-zinc-400" />
              </>
            )}
          </button>
        </div>

        {/* Percentage buttons */}
        <div className="flex gap-1">
          {[10, 25, 50, 75].map((pct) => (
            <button
              key={pct}
              onClick={() => handlePercentageAmount(pct)}
              className="flex-1 py-1 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition-colors"
            >
              {pct}%
            </button>
          ))}
          <button
            onClick={handleMaxAmount}
            className="flex-1 py-1 rounded text-xs font-semibold bg-[#00DFD8] hover:bg-[#00DFD8]/80 text-zinc-900 transition-colors"
          >
            MAX
          </button>
        </div>
      </div>

      {/* Direction Indicator */}
      <div className="relative flex justify-center -my-4 z-10">
        <div className="w-10 h-10 bg-gradient-to-r from-[#00DFD8] to-[#6A0DAD] border-4 border-zinc-900 rounded-full flex items-center justify-center shadow-lg">
          <ArrowUpDown size={16} className="text-white" />
        </div>
      </div>

      {/* To Section */}
      <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-zinc-300">You receive</label>
          <span className="text-xs text-zinc-500">{operationType === 'swap' ? 'Gorbchain' : bridgeDirection.to}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-2xl font-bold text-white flex items-center min-h-[40px]">
              {isLoadingPrice || isLoadingPools ? (
                <Loader2 size={20} className="animate-spin text-zinc-400" />
              ) : estimatedReceived > 0 ? (
                estimatedReceived.toFixed(4)
              ) : (
                <span className="text-zinc-500">0</span>
              )}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {expectedReceivedUsd > 0 ? `~${formatUsd(expectedReceivedUsd)}` : '$0.00'}
            </div>
          </div>

          {operationType === 'swap' ? (
            <button
              onClick={() => setShowDestinationTokenModal(true)}
              disabled={destinationTokens.length === 0}
              className="flex items-center gap-2 bg-zinc-700 border border-zinc-600 hover:border-[#00DFD8] rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
            >
              {destinationTokens.length === 0 ? (
                <span className="text-zinc-400 text-sm">No pools available</span>
              ) : (
                <>
                  <TokenIcon 
                    tokenSymbol={destinationTokens.find(t => t.mint === selectedDestinationMint)?.symbol || 'TOKEN'} 
                    logo={destinationTokens.find(t => t.mint === selectedDestinationMint)?.logo} 
                    size="w-6 h-6" 
                  />
                  <div className="flex flex-col items-start">
                    <span className="text-white font-semibold text-sm">
                      {destinationTokens.find(t => t.mint === selectedDestinationMint)?.symbol || 'Select'}
                    </span>
                    <span className="text-zinc-400 text-xs">
                      {destinationTokens.length} pool{destinationTokens.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <ChevronDown size={14} className="text-zinc-400" />
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2">
              <TokenIcon 
                tokenSymbol={destinationToken.symbol} 
                logo={tokenService.getDefaultIcon(destinationToken.symbol)} 
                size="w-6 h-6" 
              />
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <span className="text-white font-semibold text-sm">
                    {destinationToken.symbol}
                  </span>
                  {destinationToken.isWrapped && (
                    <span className="text-[9px] text-cyan-400 uppercase">wrapped</span>
                  )}
                </div>
                <span className="text-zinc-400 text-xs">{destinationToken.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-3 mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Route</span>
            <div className="flex items-center gap-2 text-zinc-300 font-medium">
              <span>{bridgeDirection.from}</span>
              <span className="text-[#00DFD8]">&rarr;</span>
              <span>{bridgeDirection.to}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Estimated time</span>
            <span className="text-zinc-300">{estimatedTime}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Fee</span>
            <span className="text-zinc-300">~{bridgeFee} {selectedToken?.symbol || 'SOL'}</span>
          </div>
        </div>
      </div>

      {/* Recipient - Only show for bridge operations */}
      {operationType === 'bridge' && (
        <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-4 mb-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Recipient ({bridgeDirection.to})
          </label>
          <input
            type="text"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder="Enter recipient address"
            className="w-full bg-zinc-700 border border-zinc-600 text-white p-2.5 rounded-lg text-sm placeholder-zinc-400 focus:outline-none focus:border-[#00DFD8]"
          />
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full bg-gradient-to-r from-[#00DFD8] to-[#6A0DAD] text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 font-semibold shadow-lg"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Processing...
          </>
        ) : !amount || parseFloat(amount) <= 0 ? (
          'Enter Amount'
        ) : parsedAmount > maxAmount ? (
          'Insufficient Balance'
        ) : operationType === 'swap' ? (
          'Swap'
        ) : (
          'Bridge'
        )}
      </button>

      {/* Token Modal */}
      <TokenModal />
      
      {/* Destination Token Modal for Swap */}
      {operationType === 'swap' && (
        <DestinationTokenModal />
      )}
    </>
  );

  // Confirmation Step
  const renderConfirmation = () => (
    <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-6">
      <div className="text-center mb-6">
        <CheckCircle size={48} className="text-[#00DFD8] mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Confirm Bridge</h2>
        <p className="text-zinc-400 text-sm">Review your transaction details</p>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between p-4 bg-zinc-700 rounded-lg">
          <span className="text-zinc-400 text-sm">You Pay</span>
          <div className="flex items-center gap-2">
            <TokenIcon tokenSymbol={selectedToken?.symbol} logo={selectedToken?.logo} size="w-5 h-5" />
            <span className="text-white font-semibold">{clampedAmount} {selectedToken?.symbol}</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-zinc-700 rounded-lg">
          <span className="text-zinc-400 text-sm">You Receive</span>
          <div className="flex items-center gap-2">
            <TokenIcon 
              tokenSymbol={destinationToken.symbol} 
              logo={tokenService.getDefaultIcon(destinationToken.symbol)} 
              size="w-5 h-5" 
            />
            <span className="text-[#00DFD8] font-semibold">
              ~{estimatedReceived.toFixed(4)} {destinationToken.symbol}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-zinc-700 rounded-lg">
          <span className="text-zinc-400 text-sm">To Address</span>
          <span className="text-white text-sm font-mono">
            {destinationAddress.substring(0, 8)}...{destinationAddress.substring(destinationAddress.length - 6)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setCurrentStep('form')}
          className="bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 rounded-xl font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="bg-gradient-to-r from-[#00DFD8] to-[#6A0DAD] hover:opacity-90 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-opacity shadow-lg"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm'}
        </button>
      </div>
    </div>
  );

  // Processing Step
  const renderProcessing = () => (
    <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-8 text-center">
      <Loader2 className="w-12 h-12 text-[#00DFD8] animate-spin mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">
        {operationType === 'swap' ? 'Processing Swap' : 'Processing Bridge'}
      </h2>
      <p className="text-zinc-400 text-sm">Your transaction is being processed...</p>
    </div>
  );

  // Success Step
  const renderSuccess = () => (
    <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-8 text-center">
      <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">
        {result?.operationType === 'swap' ? 'Swap Successful!' : 'Bridge Successful!'}
      </h2>
      <p className="text-zinc-400 text-sm mb-4">
        {result?.operationType === 'swap' ? (
          <>Swapped {result?.amount} {result?.token} → {result?.destinationToken}</>
        ) : (
          <>Sent {result?.amount} {result?.token} to {bridgeDirection.to}</>
        )}
      </p>

      {result?.signature && (
        <a
          href={result?.operationType === 'swap' 
            ? `https://gorbscan.com/transactions?search=${result.signature}`
            : `https://solscan.io/tx/${result.signature}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00DFD8] hover:opacity-80 text-sm underline mb-4 block"
        >
          View on {result?.operationType === 'swap' ? 'Gorbscan' : 'Solscan'}
        </a>
      )}

      <button
        onClick={resetForm}
        className="w-full bg-gradient-to-r from-[#00DFD8] to-[#6A0DAD] hover:opacity-90 text-white py-3 rounded-xl font-semibold transition-opacity shadow-lg"
      >
        {result?.operationType === 'swap' ? 'Swap Again' : 'Bridge Again'}
      </button>
    </div>
  );

  // Error Step
  const renderError = () => (
    <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-8 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">
        {result?.operationType === 'swap' ? 'Swap Failed' : 'Bridge Failed'}
      </h2>
      <p className="text-zinc-400 text-sm mb-2">There was an error processing your transaction</p>
      {result?.error && <p className="text-red-400 text-xs mb-4">{result.error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={resetForm}
          className="bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 rounded-xl font-medium transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-[#00DFD8] to-[#6A0DAD] hover:opacity-90 text-white py-2.5 rounded-xl font-semibold transition-opacity shadow-lg"
        >
          Go Home
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-2">
      {currentStep === 'form' && renderForm()}
      {currentStep === 'confirmation' && renderConfirmation()}
      {currentStep === 'processing' && renderProcessing()}
      {currentStep === 'success' && renderSuccess()}
      {currentStep === 'error' && renderError()}
    </div>
  );
}

export default TradePage;
