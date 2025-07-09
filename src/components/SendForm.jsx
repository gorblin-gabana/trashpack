import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useTransactionStore, useWalletStore, useUIStore } from '../store';
import SendTransactionPopup from './SendTransactionPopup';
import PasswordPrompt from './PasswordPrompt';
import { useNavigate } from 'react-router-dom';
import secureStorage from '../util/secureStorage';
import { formatBalance } from '../util';

function SendForm() {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [recentAddress, setRecentAddress] = useState('');

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

      await sendTransaction({
        toAddress,
        amount,
        walletAddress,
        getKeypair,
        selectedNetwork,
        getCurrentRpcUrl,
        selectedEnvironment
      });

      // Save the address as recent address after successful transaction
      await saveRecentAddress(toAddress);

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

  const handleAddressSuggestionClick = (address) => {
    setToAddress(address);
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
              Recipient Address
            </label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Enter Solana address..."
              className="w-full bg-zinc-700 border border-zinc-600 text-white p-2.5 rounded-md text-sm placeholder-zinc-400 focus:outline-none focus:border-cyan-400"
              required
            />

            {/* Recent address suggestion - more compact */}
            {recentAddress && !toAddress && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">Recent:</span>
                  <button
                    type="button"
                    onClick={() => handleAddressSuggestionClick(recentAddress)}
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
            disabled={!toAddress || !amount || isLoadingSend}
            className="w-full bg-gradient-to-r from-cyan-400 to-purple-600 text-white py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
          >
            <Send size={18} />
            {isLoadingSend ? 'Sending...' : 'Send Transaction'}
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
