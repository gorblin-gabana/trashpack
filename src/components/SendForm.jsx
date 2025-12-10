import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, AtSign, Loader2, Check, AlertCircle } from 'lucide-react';
import { useTransactionStore, useWalletStore, useUIStore } from '../store';
import SendTransactionPopup from './SendTransactionPopup';
import PasswordPrompt from './PasswordPrompt';
import { useNavigate } from 'react-router-dom';
import secureStorage from '../util/secureStorage';
import { formatBalance } from '../util';
import profileService from '../lib/profileService';

function SendForm() {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [recentAddress, setRecentAddress] = useState('');

  // Username resolution state
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [resolvedUsername, setResolvedUsername] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState(null);
  const debounceTimerRef = useRef(null);

  const { sendTransaction, isLoadingSend, getTransactions, clearTransactionResult } = useTransactionStore();
  const { walletAddress, balance, fetchBalance, selectedNetwork, getKeypair, selectedEnvironment, getCurrentRpcUrl } = useWalletStore();
  const { setError, clearError } = useUIStore();
  const navigate = useNavigate();

  // Load recent address from secure storage on component mount
  useEffect(() => {
    const loadRecentAddress = async () => {
      try {
        const stored = await secureStorage.getData('recentAddress');
        if (stored) {
          setRecentAddress(stored);
        }
      } catch (err) {
        console.error('Error loading recent address:', err);
      }
    };

    loadRecentAddress();
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle address input change with username resolution
  const handleAddressChange = useCallback((value) => {
    setToAddress(value);
    setResolveError(null);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If empty, reset resolution state
    if (!value.trim()) {
      setResolvedAddress(null);
      setResolvedUsername(null);
      setIsResolving(false);
      return;
    }

    // Check if it looks like a username
    if (profileService.isUsername(value)) {
      setIsResolving(true);

      // Debounce the resolution
      debounceTimerRef.current = setTimeout(async () => {
        const result = await profileService.resolveToAddress(value);

        if (result.isResolved && result.address) {
          setResolvedAddress(result.address);
          setResolvedUsername(result.username);
          setResolveError(null);
        } else {
          setResolvedAddress(null);
          setResolvedUsername(null);
          setResolveError(result.error);
        }
        setIsResolving(false);
      }, 500);
    } else {
      // Not a username, use as-is
      setResolvedAddress(value.trim());
      setResolvedUsername(null);
      setIsResolving(false);
    }
  }, []);

  // Get the actual address to send to (resolved or direct)
  const getEffectiveAddress = useCallback(() => {
    if (resolvedUsername && resolvedAddress) {
      return resolvedAddress;
    }
    return toAddress.trim();
  }, [resolvedUsername, resolvedAddress, toAddress]);

  // Function to save address as recent address
  const saveRecentAddress = async (address) => {
    try {
      await secureStorage.setData('recentAddress', address);
      setRecentAddress(address);
    } catch (err) {
      console.error('Error saving recent address:', err);
    }
  };

  const performTransaction = async () => {
    try {
      clearError();
      clearTransactionResult(); // Clear any previous results
      setShowPopup(true); // Show popup immediately

      // Get the effective address (resolved username or direct address)
      const effectiveAddress = getEffectiveAddress();

      await sendTransaction({
        toAddress: effectiveAddress,
        amount,
        walletAddress,
        getKeypair,
        selectedNetwork,
        getCurrentRpcUrl,
        selectedEnvironment
      });

      // Save the resolved address as recent address after successful transaction
      await saveRecentAddress(effectiveAddress);

      await getTransactions(walletAddress, selectedNetwork.chain, selectedEnvironment, selectedNetwork, getCurrentRpcUrl);
      // Refresh balance after successful transaction (single call after 5 seconds)
      setTimeout(async () => await fetchBalance(), 5000);
    } catch (err) {
      // Check if the error is due to wallet being locked
      if (err.message.includes('unlock your wallet')) {
        setShowPopup(false); // Hide transaction popup
        setShowUnlockPrompt(true); // Show unlock prompt
      } else {
        setError(err.message);
        setShowPopup(false); // Hide popup on error
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!toAddress || !amount) return;

    // If resolving is in progress, wait
    if (isResolving) return;

    // If there's a resolve error, don't proceed
    if (resolveError) return;

    // If using a username but it didn't resolve, don't proceed
    if (profileService.isUsername(toAddress) && !resolvedAddress) return;

    await performTransaction();
  };

  const handleUnlock = async () => {
    setShowUnlockPrompt(false);
    // Retry the transaction after successful unlock
    await performTransaction();
  };

  const handleUnlockCancel = () => {
    setShowUnlockPrompt(false);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    // Clear form on close
    setToAddress('');
    setAmount('');
    setResolvedAddress(null);
    setResolvedUsername(null);
    setResolveError(null);
    clearTransactionResult();
    navigate("/");
  };

  const handleMaxAmount = () => {
    if (balance) {
      // Solana transaction fee is typically around 0.000005 SOL (5000 lamports)
      const estimatedFee = 0.000005;
      const maxAmount = Math.max(0, balance - estimatedFee);
      setAmount(maxAmount.toFixed(9)); // Use 9 decimal places for precision
    }
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // If unlock prompt is showing, only show that
  if (showUnlockPrompt) {
    return (
      <div className="w-full max-w-lg">
        <PasswordPrompt
          onUnlock={handleUnlock}
          onCancel={handleUnlockCancel}
        />
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient Address Section */}
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Recipient Address or @username
            </label>
            <div className="relative">
              <input
                type="text"
                value={toAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="Enter address or @username..."
                className="w-full bg-zinc-700 border border-zinc-600 text-white p-2.5 pr-10 rounded-md text-sm placeholder-zinc-400 focus:outline-none focus:border-cyan-400"
                required
              />
              {/* Resolution status indicator */}
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {isResolving && <Loader2 size={16} className="animate-spin text-zinc-400" />}
                {!isResolving && resolvedUsername && resolvedAddress && (
                  <Check size={16} className="text-green-500" />
                )}
                {!isResolving && resolveError && (
                  <AlertCircle size={16} className="text-red-500" />
                )}
              </span>
            </div>

            {/* Username resolution feedback */}
            {resolvedUsername && resolvedAddress && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <AtSign size={12} className="text-cyan-400" />
                <span className="text-cyan-400">@{resolvedUsername}</span>
                <span className="text-zinc-500">→</span>
                <span className="text-zinc-400 font-mono">{truncateAddress(resolvedAddress)}</span>
              </div>
            )}

            {/* Resolution error */}
            {resolveError && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle size={12} />
                {resolveError}
              </p>
            )}

            {/* Recent address suggestion - more compact */}
            {recentAddress && !toAddress && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">Recent:</span>
                  <button
                    type="button"
                    onClick={() => handleAddressChange(recentAddress)}
                    className="bg-zinc-700 hover:bg-zinc-600 border border-zinc-500 rounded px-3 py-1 text-xs text-zinc-300 hover:text-white transition-colors"
                    title={recentAddress}
                  >
                    {truncateAddress(recentAddress)}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Amount Section */}
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-300">
                Amount ({selectedNetwork.symbol})
              </label>
              <div className="flex items-center gap-2 text-xs">
                {Boolean(balance) ? (
                  <span className="text-zinc-400">
                    Available: <span className="text-white font-medium">{formatBalance(balance, false)}</span>
                  </span>
                ) : (
                  <span className="text-red-400">Insufficient Balance</span>
                )}
              </div>
            </div>
            
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-zinc-700 border border-zinc-600 text-white p-2.5 rounded-md text-sm placeholder-zinc-400 focus:outline-none focus:border-cyan-400 pr-16"
                required
              />
              <button
                type="button"
                onClick={handleMaxAmount}
                disabled={!balance}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-600 disabled:text-zinc-400 text-white text-xs px-3 py-1 rounded transition-colors"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!toAddress || !amount || isLoadingSend || isResolving || resolveError || (profileService.isUsername(toAddress) && !resolvedAddress)}
            className="w-full bg-gradient-to-r from-cyan-400 to-purple-600 text-white py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
          >
            <Send size={18} />
            {isLoadingSend ? 'Sending...' : isResolving ? 'Resolving...' : resolvedUsername ? `Send to @${resolvedUsername}` : 'Send Transaction'}
          </button>
        </form>
      </div>

      {showPopup && (
        <SendTransactionPopup
          isOpen={showPopup}
          onClose={handleClosePopup}
          amount={amount}
        />
      )}
    </>
  );
}

export default SendForm;
