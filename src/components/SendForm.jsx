import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useTransactionStore, useWalletStore, useUIStore } from '../store';
import SendTransactionPopup from './SendTransactionPopup';
import { useNavigate } from 'react-router-dom';
import secureStorage from '../util/secureStorage';

function SendForm() {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [showPopup, setShowPopup] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!toAddress || !amount) return;

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
        getCurrentRpcUrl
      });

      // Save the address as recent address after successful transaction
      await saveRecentAddress(toAddress);

      await getTransactions(walletAddress, selectedNetwork.chain, selectedEnvironment);
      // Refresh balance after successful transaction
      setTimeout(async () => await fetchBalance(), 3000);
      setTimeout(async () => await fetchBalance(), 10000);
    } catch (err) {
      setError(err.message);
      setShowPopup(false); // Hide popup on error
    }
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

  return (
    <>
      <div className="w-full max-w-lg p-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Enter Solana address..."
              className="w-full bg-zinc-700 border border-zinc-600 text-white p-3 rounded-lg text-sm placeholder-zinc-400 focus:outline-none focus:border-cyan-400"
              required
            />

            {/* Recent address suggestion */}
            {recentAddress && !toAddress && (
              <div className="mt-2">
                <p className="text-xs text-zinc-400 mb-2">Recently used address:</p>
                <button
                  type="button"
                  onClick={() => handleAddressSuggestionClick(recentAddress)}
                  className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-md px-3 py-1.5 text-sm text-zinc-300 w-full hover:text-white transition-colors"
                  title={recentAddress}
                >
                  {truncateAddress(recentAddress)}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Amount ({selectedNetwork.symbol})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-zinc-700 border border-zinc-600 text-white p-3 rounded-lg text-sm placeholder-zinc-400 focus:outline-none focus:border-cyan-400 pr-16"
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
            {Boolean(balance) ? (
              <p className="text-xs text-zinc-400 mt-1">
                Available: {Number(balance).toFixed(6)} {selectedNetwork.symbol}
              </p>
            ) : (
              <p className="text-xs text-red-400 mt-1">Insufficient Balance</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!toAddress || !amount || isLoadingSend}
            className="w-full bg-gradient-to-r from-cyan-400 to-purple-600 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send size={20} />
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
