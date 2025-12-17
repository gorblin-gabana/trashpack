import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';

import tokenService from '../lib/tokenService';
import newBridge from '../lib/newBridge';
import { useWalletStore } from '../store/walletStore';
import { useUIStore } from '../store/uiStore';
import PasswordPrompt from '../components/PasswordPrompt';
import { SOLANA_MAINNET_RPC, SOLANA_MAINNET_RPC_WS } from '../lib/config';
import { NATIVE_MINT } from '@solana/spl-token';

function BridgePage() {
  const navigate = useNavigate();
  const { walletAddress, getKeypair, isWalletUnlocked } = useWalletStore();
  const { setError, clearError } = useUIStore();

  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [portfolioTokens, setPortfolioTokens] = useState([]);

  const [selectedMint, setSelectedMint] = useState(null);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [tokenPrice, setTokenPrice] = useState(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);

  // Initialize default recipient as active wallet address when available
  useEffect(() => {
    if (walletAddress && !recipient) {
      setRecipient(walletAddress);
    }
  }, [walletAddress, recipient]);

  // Load portfolio from Moralis (Solana mainnet)
  useEffect(() => {
    const load = async () => {
      if (!walletAddress) return;

      try {
        setIsLoadingPortfolio(true);

        const portfolio = await tokenService.getSolanaPortfolio(walletAddress);
        if (!portfolio) {
          toast.error('Failed to load Solana portfolio');
          return;
        }

        const nativeSol = Number(portfolio.nativeBalance?.solana || 0);

        // Always include native SOL
        const tokens = [];
        tokens.push({
          mint: 'So11111111111111111111111111111111111111111',
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          amount: nativeSol,
          logo: tokenService.getDefaultIcon('SOL'),
          isNative: true,
        });

        // Add SPL tokens with balance > 0
        if (Array.isArray(portfolio.tokens)) {
          for (const t of portfolio.tokens) {
            const balance = Number(t.amount || 0);
            if (balance <= 0) continue;

            tokens.push({
              mint: t.mint,
              symbol: t.symbol || 'TOKEN',
              name: t.name || t.symbol || t.mint,
              decimals: t.decimals || 6,
              amount: balance,
              logo: t.logo,
              isNative: false,
            });
          }
        }

        setPortfolioTokens(tokens);

        // Default selection: first token
        if (tokens.length > 0) {
          setSelectedMint(tokens[0].mint);
        }
      } catch (err) {
        console.error('Failed to load Solana portfolio:', err);
        toast.error('Unable to load Solana tokens');
      } finally {
        setIsLoadingPortfolio(false);
      }
    };

    load();
  }, [walletAddress]);

  const selectedToken = useMemo(
    () => portfolioTokens.find((t) => t.mint === selectedMint) || null,
    [portfolioTokens, selectedMint],
  );

  // Load token USD price whenever selected token changes
  useEffect(() => {
    const loadPrice = async () => {
      if (!selectedToken) {
        setTokenPrice(null);
        return;
      }

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

  const handleAmountChange = (value) => {
    if (value && !isNaN(parseFloat(value))) {
      setAmount(value);
    } else {
      setAmount(value);
    }
  };

  const maxAmount = selectedToken ? selectedToken.amount : 0;
  const parsedAmount = amount ? parseFloat(amount) || 0 : 0;
  const clampedAmount = Math.max(0, Math.min(parsedAmount, maxAmount));

  const expectedUsd = useMemo(() => {
    if (!tokenPrice || !clampedAmount) return 0;
    return clampedAmount * tokenPrice;
  }, [clampedAmount, tokenPrice]);

  const formatUsd = (value) =>
    `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const canSubmit =
    !!selectedToken &&
    clampedAmount > 0 &&
    recipient.trim().length > 0 &&
    !isLoadingPortfolio &&
    !isLoadingPrice;

  const performBridge = async () => {
    try {
      clearError();

      const connection = new Connection(SOLANA_MAINNET_RPC, { wsEndpoint: SOLANA_MAINNET_RPC_WS, commitment: "confirmed" });
      const keypair = getKeypair();

      if (!keypair) {
        throw new Error('Please unlock your wallet first');
      }

      // Convert stored keypair (nacl style) to web3.js Keypair
      const solanaKeypair = Keypair.fromSecretKey(new Uint8Array(keypair.secretKey));

      // Wallet adapter compatible shape
      const wallet = {
        publicKey: new PublicKey(solanaKeypair.publicKey),
        async signTransaction(tx) {
          tx.sign(solanaKeypair);
          return tx;
        },
      };

      console.log("Selected token ==>", selectedToken);

      // Show loading toast
      const loadingToast = toast.loading('Processing bridge transaction...');
      console.log("toast id 0=> ", loadingToast);
      let mint = selectedToken.mint;
      if (new PublicKey(mint).toBase58() === new PublicKey("So11111111111111111111111111111111111111111").toBase58()) {
        mint = "So11111111111111111111111111111111111111112";
      }

      const signature = await newBridge.lock_token({
        connection,
        wallet,
        destination: recipient,
        solAmount: clampedAmount,
        token: {
          ...selectedToken,
          mint: mint,
        }
      });

      // Dismiss loading toast
      toast.dismiss();

      console.log("Signature => ", signature);

      // Show success toast with explorer link
      const explorerUrl = `https://solscan.io/tx/${signature}`;

      toast.success(
        (t) => (
          <div className="flex flex-col gap-2">
            <div className="font-semibold">Bridge Successful!</div>
            <div className="text-sm">
              Bridged {clampedAmount} {selectedToken.symbol} (~{formatUsd(expectedUsd || 0)})
            </div>
            <div className="text-xs text-gray-400">
              To: {recipient.substring(0, 6)}...{recipient.substring(recipient.length - 4)}
            </div>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 underline mt-1"
              onClick={() => toast.dismiss()}
            >
              View on Solscan →
            </a>
          </div>
        ),
        {
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
        }
      );

      setTimeout(() => {
        toast.dismiss();
      }, 4000)

      // Reset form
      setAmount('');
      setRecipient(walletAddress);
    } catch (err) {
      console.error('Bridge failed:', err);

      // Check if the error is due to wallet being locked
      if (err.message.includes('unlock your wallet')) {
        setShowUnlockPrompt(true);
      } else {
        setError(err.message);
        toast.error(err?.message || 'Bridge failed', { duration: 1000 });

        setTimeout(() => {
          setError(null);
        }, 4000);
      }
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    if (parsedAmount > maxAmount) {
      toast.error('Amount exceeds available balance');
      return;
    }

    // Check if wallet is unlocked before proceeding
    if (!isWalletUnlocked()) {
      setShowUnlockPrompt(true);
      return;
    }

    await performBridge();
  };

  const handleUnlock = async () => {
    setShowUnlockPrompt(false);
    // Retry the bridge operation after successful unlock
    await performBridge();
  };

  const handleUnlockCancel = () => {
    setShowUnlockPrompt(false);
  };

  // If unlock prompt is showing, only show that
  if (showUnlockPrompt) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="w-full max-w-md">
          <PasswordPrompt
            onUnlock={handleUnlock}
            onCancel={handleUnlockCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full p-4">
      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-all duration-200"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-white font-bold text-lg">Bridge</h1>
              <p className="text-gray-400 text-xs">
                From Solana mainnet to Gorbchain
              </p>
            </div>
          </div>
        </div>

        {/* Token selector */}
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">
            Select token (Solana mainnet)
          </label>
          <button
            disabled={isLoadingPortfolio || portfolioTokens.length === 0}
            className="w-full flex items-center justify-between bg-gray-800/70 border border-gray-700/60 rounded-2xl px-3 py-2.5 text-left disabled:opacity-60 disabled:cursor-not-allowed hover:border-cyan-500/60 transition-colors"
            onClick={() => {
              if (portfolioTokens.length === 0 || isLoadingPortfolio) return;
              setIsTokenModalOpen(true);
            }}
          >
            <div className="flex items-center gap-2">
              {isLoadingPortfolio ? (
                <Loader size={16} className="animate-spin text-gray-400" />
              ) : selectedToken ? (
                <>
                  <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {selectedToken.logo ? (
                      <img
                        src={selectedToken.logo}
                        alt={selectedToken.symbol}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-white font-bold">
                        {selectedToken.symbol[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-semibold">
                      {selectedToken.symbol}
                    </span>
                    <span className="text-gray-500 text-xs">
                      Balance:{' '}
                      {selectedToken.amount.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-gray-500 text-sm">
                  No Solana tokens found
                </span>
              )}
            </div>
            <ChevronDown size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Amount input */}
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">Amount</label>
          <div className="bg-gray-800/70 border border-gray-700/60 rounded-2xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <input
                type="number"
                min="0"
                step="0.000001"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="bg-transparent flex-1 text-sm text-white outline-none placeholder-gray-600"
                placeholder="0.0"
              />
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-md bg-gray-700/80 text-gray-200 hover:bg-gray-600/80 transition-colors"
                onClick={() =>
                  selectedToken &&
                  setAmount(
                    selectedToken.amount.toLocaleString('en-US', {
                      useGrouping: false,
                      maximumFractionDigits: 9,
                    }),
                  )
                }
                disabled={!selectedToken}
              >
                Max
              </button>
            </div>
            <div className="mt-1 text-[11px] text-gray-500 flex justify-between">
              <span>
                Available:{' '}
                {selectedToken
                  ? selectedToken.amount.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })
                  : 0}{' '}
                {selectedToken?.symbol || ''}
              </span>
            </div>
          </div>
        </div>

        {/* Received amount (USD estimate) */}
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">
            Estimated received value
          </label>
          <div className="bg-gray-800/70 border border-gray-700/60 rounded-2xl px-3 py-2.5 flex items-center justify-between">
            <div className="text-sm text-white">
              {isLoadingPrice ? (
                <span className="flex items-center gap-2 text-gray-400">
                  <Loader size={14} className="animate-spin" />
                  Fetching price...
                </span>
              ) : expectedUsd > 0 ? (
                <span>{formatUsd(expectedUsd)}</span>
              ) : (
                <span className="text-gray-500">$0.00</span>
              )}
            </div>
            <div className="text-[11px] text-gray-500">
              {tokenPrice
                ? `1 ${selectedToken?.symbol || ''} ≈ ${formatUsd(tokenPrice)}`
                : '--'}
            </div>
          </div>
        </div>

        {/* Recipient address */}
        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-1">
            Recipient address (Gorbchain)
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter recipient address"
            className="w-full bg-gray-800/70 border border-gray-700/60 rounded-2xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500/70"
          />
        </div>

        {/* Token selection modal */}
        {isTokenModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm max-h-[70vh] bg-gray-900/95 border border-gray-700/70 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Select token
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Tokens from your Solana mainnet wallet
                  </p>
                </div>
                <button
                  onClick={() => setIsTokenModalOpen(false)}
                  className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                {portfolioTokens.map((t) => (
                  <button
                    key={t.mint}
                    onClick={() => {
                      setSelectedMint(t.mint);
                      setIsTokenModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-left transition-colors ${selectedMint === t.mint
                      ? 'bg-cyan-500/20 border border-cyan-500/50'
                      : 'bg-gray-800/70 border border-gray-800 hover:bg-gray-800 hover:border-cyan-500/40'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                        {t.logo ? (
                          <img
                            src={t.logo}
                            alt={t.symbol}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-white font-bold">
                            {t.symbol[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">
                          {t.symbol}
                          {t.isNative && (
                            <span className="ml-1 text-[10px] text-cyan-400 uppercase">
                              native
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-gray-500 truncate max-w-[180px]">
                          {t.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-gray-400">
                      <div className="font-medium text-gray-200">
                        {t.amount.toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {t.symbol}
                      </div>
                    </div>
                  </button>
                ))}

                {portfolioTokens.length === 0 && !isLoadingPortfolio && (
                  <div className="px-2 py-4 text-center text-xs text-gray-500">
                    No tokens detected for this Solana address.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-linear-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:from-gray-600 disabled:to-gray-700 text-white py-2.5 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {canSubmit ? 'Review Bridge' : 'Enter details'}
        </button>
      </div>
    </div>
  );
}

export default BridgePage;


