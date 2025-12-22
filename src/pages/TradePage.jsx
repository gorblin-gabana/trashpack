import { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown, ChevronDown, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';

import tokenService from '../lib/tokenService';
import newBridge from '../lib/newBridge';
import { useWalletStore } from '../store/walletStore';
import { useUIStore } from '../store/uiStore';
import PasswordPrompt from '../components/PasswordPrompt';
import { SOLANA_MAINNET_RPC, SOLANA_MAINNET_RPC_WS } from '../lib/config';

function TradePage() {
  const navigate = useNavigate();

  const { walletAddress, getKeypair, isWalletUnlocked, hasWallet } = useWalletStore();
  const { clearError } = useUIStore();

  // Core state
  const [currentStep, setCurrentStep] = useState('form');

  // Unified portfolio state (Moralis - real Solana balances)
  const [portfolioTokens, setPortfolioTokens] = useState([]);
  const [selectedMint, setSelectedMint] = useState(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);

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

  // Bridge pairs for fee estimation
  const bridgeFee = 0.003;
  const estimatedTime = '~5 min';

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

  // Load Solana portfolio from Moralis (used by both modes)
  const loadPortfolio = async () => {
    if (!walletAddress) return;

    try {
      setIsLoadingPortfolio(true);
      const portfolio = await tokenService.getSolanaPortfolio(walletAddress);

      if (!portfolio) {
        toast.error('Failed to load Solana portfolio');
        return;
      }

      const nativeSol = Number(portfolio.nativeBalance?.solana || 0);
      const tokens = [];

      // Native SOL
      tokens.push({
        mint: 'So11111111111111111111111111111111111111111',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        amount: nativeSol,
        logo: tokenService.getDefaultIcon('SOL'),
        isNative: true,
      });

      // SPL tokens with balance
      if (Array.isArray(portfolio.tokens)) {
        for (const t of portfolio.tokens) {
          const tokenBalance = Number(t.amount || 0);
          if (tokenBalance <= 0) continue;

          tokens.push({
            mint: t.mint,
            symbol: t.symbol || 'TOKEN',
            name: t.name || t.symbol || t.mint,
            decimals: t.decimals || 6,
            amount: tokenBalance,
            logo: t.logo,
            isNative: false,
          });
        }
      }

      setPortfolioTokens(tokens);
      if (tokens.length > 0 && !selectedMint) {
        setSelectedMint(tokens[0].mint);
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err);
      toast.error('Unable to load Solana tokens');
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  // Selected token
  const selectedToken = useMemo(
    () => portfolioTokens.find((t) => t.mint === selectedMint) || null,
    [portfolioTokens, selectedMint]
  );

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

  const formatUsd = (value) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const canSubmit = !!selectedToken && clampedAmount > 0 && destinationAddress.trim().length > 0 && !isLoadingPortfolio && !isLoadingPrice;

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
    setCurrentStep('confirmation');
  };

  const handleUnlockCancel = () => {
    setShowUnlockPrompt(false);
  };

  const resetForm = () => {
    setCurrentStep('form');
    setAmount('');
    setDestinationAddress(walletAddress || '');
    setResult(null);
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

  // Token Selection Modal
  const TokenModal = () => {
    if (!showTokenModal) return null;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-800 border border-zinc-600 rounded-xl w-full max-w-sm max-h-[70vh] overflow-hidden shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-zinc-700">
            <h3 className="text-white font-bold text-base">Select Token</h3>
            <button
              onClick={() => setShowTokenModal(false)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-80 p-2">
            {portfolioTokens.map((token) => (
              <button
                key={token.mint}
                onClick={() => handleTokenSelect(token.mint)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-zinc-700 transition-colors rounded-lg mb-1 ${
                  token.mint === selectedMint ? 'bg-zinc-700/50 border border-[#00DFD8]/30' : ''
                }`}
              >
                <TokenIcon tokenSymbol={token.symbol} logo={token.logo} size="w-10 h-10" />
                <div className="flex flex-col items-start flex-1">
                  <span className="text-white font-semibold">
                    {token.symbol}
                    {token.isNative && <span className="ml-2 text-[10px] text-[#00DFD8] uppercase">native</span>}
                  </span>
                  <span className="text-zinc-400 text-sm">{token.name}</span>
                </div>
                <div className="text-right text-sm text-zinc-400">
                  {token.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>
              </button>
            ))}

            {portfolioTokens.length === 0 && !isLoadingPortfolio && (
              <div className="p-4 text-center text-sm text-zinc-500">No tokens found in wallet</div>
            )}

            {isLoadingPortfolio && (
              <div className="p-4 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#00DFD8]" />
              </div>
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
            disabled={isLoadingPortfolio}
            className="flex items-center gap-2 bg-zinc-700 border border-zinc-600 hover:border-[#00DFD8] rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
          >
            {isLoadingPortfolio ? (
              <Loader2 size={16} className="animate-spin text-zinc-400" />
            ) : (
              <>
                <TokenIcon tokenSymbol={selectedToken?.symbol || 'SOL'} logo={selectedToken?.logo} size="w-6 h-6" />
                <div className="flex flex-col items-start">
                  <span className="text-white font-semibold text-sm">{selectedToken?.symbol || 'SOL'}</span>
                  <span className="text-zinc-400 text-xs">Solana</span>
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
          <span className="text-xs text-zinc-500">Gorbchain</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-2xl font-bold text-white flex items-center min-h-[40px]">
              {isLoadingPrice ? (
                <Loader2 size={20} className="animate-spin text-zinc-400" />
              ) : estimatedReceived > 0 ? (
                estimatedReceived.toFixed(4)
              ) : (
                <span className="text-zinc-500">0</span>
              )}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {expectedUsd > 0 ? `~${formatUsd(expectedUsd)}` : '$0.00'}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2">
            <TokenIcon tokenSymbol="GORB" logo={tokenService.getDefaultIcon('GORB')} size="w-6 h-6" />
            <div className="flex flex-col items-start">
              <span className="text-white font-semibold text-sm">GORB</span>
              <span className="text-zinc-400 text-xs">Gorbchain</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-3 mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Route</span>
            <div className="flex items-center gap-2 text-zinc-300 font-medium">
              <span>Solana</span>
              <span className="text-[#00DFD8]">&rarr;</span>
              <span>Gorbchain</span>
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

      {/* Recipient */}
      <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-4 mb-4">
        <label className="block text-sm font-medium text-zinc-300 mb-2">Recipient (Gorbchain)</label>
        <input
          type="text"
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
          placeholder="Enter recipient address"
          className="w-full bg-zinc-700 border border-zinc-600 text-white p-2.5 rounded-lg text-sm placeholder-zinc-400 focus:outline-none focus:border-[#00DFD8]"
        />
      </div>

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
        ) : (
          'Bridge'
        )}
      </button>

      {/* Token Modal */}
      <TokenModal />
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
            <TokenIcon tokenSymbol="GORB" logo={tokenService.getDefaultIcon('GORB')} size="w-5 h-5" />
            <span className="text-[#00DFD8] font-semibold">~{estimatedReceived.toFixed(4)} GORB</span>
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
      <h2 className="text-xl font-bold text-white mb-2">Processing Bridge</h2>
      <p className="text-zinc-400 text-sm">Your transaction is being processed...</p>
    </div>
  );

  // Success Step
  const renderSuccess = () => (
    <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-8 text-center">
      <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Bridge Successful!</h2>
      <p className="text-zinc-400 text-sm mb-4">
        Sent {result?.amount} {result?.token} to Gorbchain
      </p>

      {result?.signature && (
        <a
          href={`https://solscan.io/tx/${result.signature}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00DFD8] hover:opacity-80 text-sm underline mb-4 block"
        >
          View on Solscan
        </a>
      )}

      <button
        onClick={resetForm}
        className="w-full bg-gradient-to-r from-[#00DFD8] to-[#6A0DAD] hover:opacity-90 text-white py-3 rounded-xl font-semibold transition-opacity shadow-lg"
      >
        Bridge Again
      </button>
    </div>
  );

  // Error Step
  const renderError = () => (
    <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-8 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Bridge Failed</h2>
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
