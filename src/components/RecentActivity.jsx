import { useEffect, useState } from 'react';
import { RefreshCw, Check, ArrowUpRight, ArrowDownLeft, ExternalLink, User, Building, Zap } from 'lucide-react';
import { useTransactionStore } from '../store';
import { useWalletStore } from '../store';
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek } from 'date-fns';

function RecentActivity() {
  const { 
    transactions, 
    isLoadingTransactions, 
    getTransactions, 
    forceRefreshTransactions
  } = useTransactionStore();

  const { 
    walletAddress, 
    selectedNetwork, 
    selectedEnvironment, 
    getCurrentRpcUrl 
  } = useWalletStore();

  const [copiedItem, setCopiedItem] = useState(null);
  const [knownAddresses, setKnownAddresses] = useState({
    // Example known addresses - in production these would come from user's contacts
    '5Q4...1234': 'My Exchange',
    '8Hf...5678': 'Trading Bot',
    '9Kl...9abc': 'DeFi Protocol',
  });

  // Fetch transactions on mount and set up polling with longer interval
  useEffect(() => {
    if (walletAddress && selectedNetwork) {
      getTransactions(walletAddress, selectedNetwork.chain, selectedEnvironment, selectedNetwork, getCurrentRpcUrl);
      
      const interval = setInterval(() => {
        getTransactions(walletAddress, selectedNetwork.chain, selectedEnvironment, selectedNetwork, getCurrentRpcUrl);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [walletAddress, selectedNetwork, selectedEnvironment, getTransactions, getCurrentRpcUrl]);

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(type);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  const getDateGroup = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isToday(date)) return 'Today';
      if (isYesterday(date)) return 'Yesterday';
      if (isThisWeek(date)) return 'This Week';
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Unknown Date';
    }
  };

  const getAddressLabel = (address) => {
    // Check known addresses first
    if (knownAddresses[address]) {
      return {
        label: knownAddresses[address],
        isKnown: true
      };
    }

    // Generate friendly labels based on address patterns or common addresses
    if (address === walletAddress) {
      return {
        label: 'Me',
        isKnown: true
      };
    }

    // For unknown addresses, return the actual address
    return {
      label: address,
      isKnown: false
    };
  };

  const formatAddress = (address) => {
    if (!address || address === 'Unknown') return 'Unknown';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getTransactionDetails = (transaction) => {
    // Determine if transaction was sent or received by comparing addresses
    // Primary logic: if sender_address equals wallet, it's sent; if receiver_address equals wallet, it's received
    const isSent = transaction.sender_address === walletAddress;
    const isReceived = transaction.receiver_address === walletAddress;
    
    // Fallback to other fields if primary logic doesn't work
    const fallbackSent = transaction.from === walletAddress ||
                        transaction.type === 'sent' || 
                        transaction.type === 'send';
    
    const fallbackReceived = transaction.to === walletAddress ||
                            transaction.type === 'received' || 
                            transaction.type === 'receive';

    // Determine final type with priority on sender/receiver addresses
    let type;
    if (isSent) {
      type = 'sent';
    } else if (isReceived) {
      type = 'received';  
    } else if (fallbackSent) {
      type = 'sent';
    } else if (fallbackReceived) {
      type = 'received';
    } else {
      type = 'unknown';
    }
    
    // Get the other party's address
    const otherAddress = type === 'sent' 
      ? (transaction.receiver_address || transaction.to || 'Unknown')
      : (transaction.sender_address || transaction.from || 'Unknown');
    
    // Get the amount - prioritize sent_amount for sent transactions, received_amount for received
    const amount = type === 'sent' 
      ? (transaction.sent_amount || transaction.amount || 0)
      : (transaction.received_amount || transaction.amount || 0);

    // Get fees if available
    const fee = transaction.fee || transaction.fees || transaction.transaction_fee || 0;

    return { type, otherAddress, amount, fee };
  };

  const handleRefresh = () => {
    if (!isLoadingTransactions && walletAddress && selectedNetwork) {
      forceRefreshTransactions(walletAddress, selectedNetwork.chain, selectedEnvironment, selectedNetwork, getCurrentRpcUrl);
    }
  };

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '0';
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    
    // Show more decimals for very small amounts, fewer for larger amounts
    if (numAmount === 0) return '0';
    if (numAmount < 0.01) return numAmount.toFixed(6);
    if (numAmount < 1) return numAmount.toFixed(4);
    if (numAmount < 100) return numAmount.toFixed(3);
    return numAmount.toFixed(2);
  };

  const formatFee = (fee) => {
    if (!fee || fee === 0) return null;
    const numFee = typeof fee === 'number' ? fee : parseFloat(fee);
    if (numFee < 0.001) return numFee.toFixed(6);
    return numFee.toFixed(4);
  };

  // Group transactions by date
  const groupTransactionsByDate = (transactions) => {
    const groups = {};
    
    transactions.forEach(transaction => {
      const dateGroup = getDateGroup(transaction.timestamp || transaction.created_at);
      if (!groups[dateGroup]) {
        groups[dateGroup] = [];
      }
      groups[dateGroup].push(transaction);
    });

    return groups;
  };

  const transactionGroups = groupTransactionsByDate(transactions);
  const groupKeys = Object.keys(transactionGroups);

  // Sort groups with Today first, then Yesterday, etc.
  const sortedGroupKeys = groupKeys.sort((a, b) => {
    const order = ['Today', 'Yesterday', 'This Week'];
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // For date strings, sort newest first
    return new Date(b) - new Date(a);
  });

  const getContactIcon = (label, isKnown) => {
    if (!isKnown) return User; // Default for unknown addresses
    if (label === 'Me') return User;
    if (label.includes('Exchange') || label.includes('exchange')) return Building;
    if (label.includes('Protocol') || label.includes('Bot')) return Zap;
    return User;
  };

  const handleAddressClick = async (address, addressInfo, index, dateGroup) => {
    if (address && address !== 'Unknown') {
      await copyToClipboard(address, `address-${dateGroup}-${index}`);
    }
  };

  return (
    <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 backdrop-blur-sm border border-zinc-700/30 rounded-2xl p-4 mb-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg">Recent Activity</h3>
        <button
          onClick={handleRefresh}
          disabled={isLoadingTransactions}
          className="p-2 rounded-xl hover:bg-zinc-700/40 text-zinc-400 hover:text-white transition-all duration-200 disabled:opacity-50"
          title="Refresh transactions"
        >
          <RefreshCw size={16} className={isLoadingTransactions ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        {isLoadingTransactions && transactions.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="animate-spin" />
              <span className="text-sm">Loading transactions...</span>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <div className="w-12 h-12 bg-zinc-700/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <ArrowUpRight size={20} className="text-zinc-600" />
            </div>
            <p className="text-sm">No transactions yet</p>
            <p className="text-xs text-zinc-600 mt-1">Your transaction history will appear here</p>
          </div>
        ) : (
          sortedGroupKeys.map(dateGroup => (
            <div key={dateGroup} className="space-y-2">
              {/* Date Group Header */}
              <div className="flex items-center gap-2 px-1">
                <h4 className="text-zinc-400 font-medium text-sm">{dateGroup}</h4>
                <div className="flex-1 h-px bg-zinc-700/30"></div>
              </div>

              {/* Transactions in Group */}
              <div className="space-y-1.5">
                {transactionGroups[dateGroup].map((transaction, index) => {
                  const { type, otherAddress, amount, fee } = getTransactionDetails(transaction);
                  const txId = transaction.signature || transaction.hash || transaction.id;
                  const addressInfo = getAddressLabel(otherAddress);
                  const ContactIcon = getContactIcon(addressInfo.label, addressInfo.isKnown);
                  const formattedFee = formatFee(fee);
                  
                  return (
                    <div
                      key={txId || `${dateGroup}-${index}`}
                      className="group bg-zinc-800/30 hover:bg-zinc-700/40 border border-zinc-700/20 hover:border-zinc-600/30 rounded-xl p-3 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        {/* Left side - Icon and transaction info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Transaction Type Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            type === 'sent' 
                              ? 'bg-red-500/10 text-red-400' 
                              : type === 'received'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-zinc-600/10 text-zinc-400'
                          }`}>
                            {type === 'sent' ? 
                              <ArrowUpRight size={14} /> : 
                              type === 'received' ?
                              <ArrowDownLeft size={14} /> :
                              <div className="w-2 h-2 bg-current rounded-full" />
                            }
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Address/Contact - Clickable to copy */}
                            <button
                              onClick={() => handleAddressClick(otherAddress, addressInfo, index, dateGroup)}
                              className="flex items-center gap-2 hover:bg-zinc-600/20 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors group/address w-full text-left"
                              title={`Click to copy ${otherAddress}`}
                            >
                              <ContactIcon size={14} className="text-zinc-500 flex-shrink-0" />
                              <span className={`font-medium truncate ${
                                addressInfo.isKnown ? 'text-cyan-300' : 'text-zinc-200'
                              } group-hover/address:text-cyan-300 transition-colors`}>
                                {addressInfo.isKnown ? addressInfo.label : formatAddress(addressInfo.label)}
                              </span>
                              {copiedItem === `address-${dateGroup}-${index}` && (
                                <Check size={12} className="text-emerald-400 flex-shrink-0" />
                              )}
                            </button>
                            
                            {/* Time - below address */}
                            <div className="text-zinc-500 text-xs mt-1 px-2">
                              {formatTimestamp(transaction.timestamp || transaction.created_at)}
                            </div>
                          </div>
                        </div>

                        {/* Right side - Amount, Fee, and Explorer Link */}
                        <div className="flex items-center gap-3">
                          {/* Amount and Fee */}
                          <div className={`text-right ${
                            type === 'sent' ? 'text-red-400' : 
                            type === 'received' ? 'text-emerald-400' : 'text-zinc-400'
                          }`}>
                            {/* Main Amount */}
                            <div className="text-lg font-bold">
                              {type === 'sent' ? '-' : type === 'received' ? '+' : ''}{formatAmount(amount)}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {selectedNetwork?.symbol || 'TOKEN'}
                            </div>
                            
                            {/* Fee - shown separately if exists */}
                            {formattedFee && (
                              <div className="text-xs text-zinc-500 mt-1">
                                Fee: {formattedFee} {selectedNetwork?.symbol || 'TOKEN'}
                              </div>
                            )}
                          </div>

                          {/* Explorer link - always visible now */}
                          {txId && selectedNetwork?.explorerUrl && (
                            <a
                              href={selectedNetwork.explorerUrl(txId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-zinc-600/30 text-zinc-500 hover:text-cyan-400 transition-colors flex-shrink-0"
                              title="View in blockchain explorer"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Show more button if there are many transactions */}
      {transactions.length >= 10 && (
        <div className="mt-4 text-center">
          <button
            onClick={handleRefresh}
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
          >
            Load more transactions
          </button>
        </div>
      )}
    </div>
  );
}

export default RecentActivity;
