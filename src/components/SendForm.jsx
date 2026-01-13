import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, AtSign, Loader2, Check, AlertCircle, ChevronDown, Coins } from 'lucide-react';
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
  
  // Token selection state
  const [selectedToken, setSelectedToken] = useState(null); // null = native token
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const tokenSelectorRef = useRef(null);

  // Username resolution state
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [resolvedUsername, setResolvedUsername] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState(null);
  const debounceTimerRef = useRef(null);

  const { sendTransaction, sendTokenTransaction, isLoadingSend, getTransactions, clearTransactionResult } = useTransactionStore();
  const { 
    walletAddress, 
    balance, 
    tokens, 
    fetchBalance, 
    selectedNetwork, 
    getKeypair, 
    selectedEnvironment, 
    getCurrentRpcUrl,
    smartRefreshTokens 
  } = useWalletStore();
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

  // Cleanup debounce timer and click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tokenSelectorRef.current && !tokenSelectorRef.current.contains(event.target)) {
        setShowTokenSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      document.removeEventListener('mousedown', handleClickOutside);
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

  // Get available tokens (native + SPL tokens)
  const getAvailableTokens = useCallback(() => {
    const nativeToken = {
      symbol: selectedNetwork.symbol,
      name: selectedNetwork.name,
      balance: balance || 0,
      decimals: 9,
      mintAddress: null, // null indicates native token
      icon: selectedNetwork.icon
    };

    const splTokens = tokens
      .filter(token => parseFloat(token.formatted_balance || 0) > 0)
      .map(token => ({
        symbol: token.symbol || 'Unknown',
        name: token.name || token.symbol || 'Unknown Token',
        balance: parseFloat(token.formatted_balance || 0),
        decimals: token.decimals || 9,
        mintAddress: token.mintAddress,
        icon: token.image || token.uri
      }));

    return [nativeToken, ...splTokens];
  }, [selectedNetwork, balance, tokens]);

  // Get current token balance
  const getCurrentTokenBalance = useCallback(() => {
    if (!selectedToken) {
      return balance || 0;
    }
    return selectedToken.balance || 0;
  }, [selectedToken, balance]);

  // Get current token symbol
  const getCurrentTokenSymbol = useCallback(() => {
    if (!selectedToken) {
      return selectedNetwork.symbol;
    }
    return selectedToken.symbol;
  }, [selectedToken, selectedNetwork.symbol]);

  const performTransaction = async () => {
    try {
      clearError();
      clearTransactionResult(); // Clear any previous results
      setShowPopup(true); // Show popup immediately

      // Get the effective address (resolved username or direct address)
      const effectiveAddress = getEffectiveAddress();

      if (!selectedToken) {
        // Native token transfer
        await sendTransaction({
          toAddress: effectiveAddress,
          amount,
          walletAddress,
          getKeypair,
          selectedNetwork,
          getCurrentRpcUrl,
          selectedEnvironment
        });
      } else {
        // SPL token transfer
        await sendTokenTransaction({
          toAddress: effectiveAddress,
          amount,
          tokenMint: selectedToken.mintAddress,
          tokenDecimals: selectedToken.decimals,
          walletAddress,
          getKeypair,
          selectedNetwork,
          getCurrentRpcUrl,
          selectedEnvironment
        });
      }

      // Save the resolved address as recent address after successful transaction
      await saveRecentAddress(effectiveAddress);

      await getTransactions(walletAddress, selectedNetwork.chain, selectedEnvironment, selectedNetwork, getCurrentRpcUrl);
      
      // Refresh balance and tokens after successful transaction
      setTimeout(async () => {
        await fetchBalance();
        await smartRefreshTokens();
      }, 5000);
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
    const currentBalance = getCurrentTokenBalance();
    if (currentBalance > 0) {
      if (!selectedToken) {
        // Native token - subtract estimated fee
        const estimatedFee = 0.000005;
        const maxAmount = Math.max(0, currentBalance - estimatedFee);
        setAmount(maxAmount.toFixed(9));
      } else {
        // SPL token - use full balance (fee paid in native token)
        setAmount(currentBalance.toString());
      }
    }
  };

  const handleTokenSelect = (token) => {
    setSelectedToken(token.mintAddress ? token : null);
    setShowTokenSelector(false);
    setAmount(''); // Clear amount when switching tokens
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const availableTokens = getAvailableTokens();
  const currentBalance = getCurrentTokenBalance();
  const currentSymbol = getCurrentTokenSymbol();

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
          {/* Token Selection Section */}
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Select Token
            </label>
            <div className="relative" ref={tokenSelectorRef}>
              <button
                type="button"
                onClick={() => setShowTokenSelector(!showTokenSelector)}
                className="w-full bg-zinc-700 border border-zinc-600 text-white p-2.5 rounded-md text-sm focus:outline-none focus:border-cyan-400 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {selectedToken ? (
                    <>
                      {selectedToken.icon ? (
                        <img 
                          src={selectedToken.icon} 
                          alt={selectedToken.symbol}
                          className="w-5 h-5 rounded-full"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-5 h-5 bg-zinc-600 rounded-full flex items-center justify-center text-xs"
                        style={{ display: selectedToken.icon ? 'none' : 'flex' }}
                      >
                        <Coins size={12} className="text-zinc-400" />
                      </div>
                      <span>{selectedToken.symbol}</span>
                      <span className="text-zinc-400 text-xs">({selectedToken.name})</span>
                    </>
                  ) : (
                    <>
                      {selectedNetwork.icon ? (
                        <img 
                          src={selectedNetwork.icon} 
                          alt={selectedNetwork.symbol}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-zinc-600 rounded-full flex items-center justify-center">
                          <Coins size={12} className="text-zinc-400" />
                        </div>
                      )}
                      <span>{selectedNetwork.symbol}</span>
                      <span className="text-zinc-400 text-xs">(Native)</span>
                    </>
                  )}
                </div>
                <ChevronDown size={16} className={`text-zinc-400 transition-transform ${showTokenSelector ? 'rotate-180' : ''}`} />
              </button>

              {/* Token Selector Dropdown */}
              {showTokenSelector && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-700 border border-zinc-600 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                  {availableTokens.map((token, index) => (
                    <button
                      key={token.mintAddress || 'native'}
                      type="button"
                      onClick={() => handleTokenSelect(token)}
                      className="w-full p-3 text-left hover:bg-zinc-600 flex items-center justify-between border-b border-zinc-600 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        {token.icon ? (
                          <img 
                            src={token.icon} 
                            alt={token.symbol}
                            className="w-5 h-5 rounded-full"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-5 h-5 bg-zinc-600 rounded-full flex items-center justify-center text-xs"
                          style={{ display: token.icon ? 'none' : 'flex' }}
                        >
                          <Coins size={12} className="text-zinc-400" />
                        </div>
                        <div>
                          <div className="text-white text-sm">{token.symbol}</div>
                          <div className="text-zinc-400 text-xs">{token.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-sm">{formatBalance(token.balance, false)}</div>
                        <div className="text-zinc-400 text-xs">{token.mintAddress ? 'SPL Token' : 'Native'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                Amount ({currentSymbol})
              </label>
              <div className="flex items-center gap-2 text-xs">
                {Boolean(currentBalance) ? (
                  <span className="text-zinc-400">
                    Available: <span className="text-white font-medium">{formatBalance(currentBalance, false)}</span>
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
                disabled={!currentBalance}
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
            {isLoadingSend ? 'Sending...' : isResolving ? 'Resolving...' : resolvedUsername ? `Send to @${resolvedUsername}` : `Send ${selectedToken ? selectedToken.symbol : selectedNetwork.symbol}`}
          </button>
        </form>
      </div>

      {showPopup && (
        <SendTransactionPopup
          isOpen={showPopup}
          onClose={handleClosePopup}
          amount={amount}
          token={selectedToken}
        />
      )}
    </>
  );
}

export default SendForm;
