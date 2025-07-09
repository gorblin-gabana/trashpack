import { useState } from 'react';
import { Copy, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useWalletStore } from '../store';
import { formatBalance } from '../util';

function BalanceDisplay() {
  const { 
    balance, 
    isLoadingBalance, 
    selectedNetwork, 
    refreshBalance 
  } = useWalletStore();

  const [copied, setCopied] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [showUSD, setShowUSD] = useState(false);

  const copyBalance = async () => {
    try {
      await navigator.clipboard.writeText(balance?.toString() || '0');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy balance:', error);
    }
  };

  const toggleBalanceVisibility = () => {
    setShowBalance(!showBalance);
  };

  const toggleUSDValue = () => {
    setShowUSD(!showUSD);
  };

  const handleRefresh = () => {
    if (!isLoadingBalance) {
      refreshBalance();
    }
  };

  const estimateUSDValue = (balance) => {
    // Mock USD conversion - in production this would come from price API
    const mockPrice = 0.85; // $0.85 per GORB
    return (parseFloat(balance || 0) * mockPrice).toFixed(2);
  };

  return (
    <div className="bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 backdrop-blur-sm border border-zinc-700/40 rounded-2xl p-5 my-4">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <span className="text-zinc-300 font-medium text-sm">Total Balance</span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Copy Button */}
          <button
            onClick={copyBalance}
            className="p-2 rounded-lg hover:bg-zinc-700/30 text-zinc-500 hover:text-zinc-300 transition-all duration-200"
            title="Copy balance"
          >
            {copied ? 
              <Check size={14} className="text-emerald-400" /> : 
              <Copy size={14} />
            }
          </button>

          {/* Show/Hide Balance */}
          <button
            onClick={toggleBalanceVisibility}
            className="p-2 rounded-lg hover:bg-zinc-700/30 text-zinc-500 hover:text-zinc-300 transition-all duration-200"
            title={showBalance ? "Hide balance" : "Show balance"}
          >
            {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isLoadingBalance}
            className="p-2 rounded-lg hover:bg-zinc-700/30 text-zinc-500 hover:text-zinc-300 transition-all duration-200 disabled:opacity-50"
            title="Refresh balance"
          >
            <RefreshCw size={14} className={isLoadingBalance ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Balance Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-4xl font-bold text-white">
            {showBalance ? formatBalance(balance, true) : '••••'}
          </div>
          <div className="flex items-center gap-2">
            {selectedNetwork?.icon && (
              <img 
                src={selectedNetwork.icon} 
                alt={selectedNetwork.symbol} 
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-xl font-semibold text-zinc-300">
              {selectedNetwork?.symbol || 'TOKEN'}
            </span>
          </div>
        </div>

        {/* USD Toggle */}
        {showBalance && (
          <button
            onClick={toggleUSDValue}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-zinc-700/30 text-zinc-400 hover:text-zinc-300 transition-all duration-200"
            title="Toggle USD value"
          >
            <span className="text-sm">
              {showUSD ? `$${estimateUSDValue(balance)}` : '~ USD value'}
            </span>
          </button>
        )}
      </div>

      {/* Network Status */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-700/30">
        <div className="text-xs text-zinc-500">
          Updated {isLoadingBalance ? 'now' : '6 minutes ago'} • {selectedNetwork?.name || 'Network'}
        </div>
        
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
          <span className="text-xs text-zinc-500">Live</span>
        </div>
      </div>
    </div>
  );
}

export default BalanceDisplay;
