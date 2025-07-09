import { useState } from 'react';
import { Coins, AlertCircle, Loader, Copy, ExternalLink } from 'lucide-react';
import { useWalletStore } from '../store';
import { formatBalance, formatNumber, copyToClipboard } from '../util';
import { toast } from 'react-hot-toast';

function TokenList() {
  const {
    walletAddress,
    selectedNetwork,
    tokens,
    isLoadingTokens,
    balance
  } = useWalletStore();

  const [copiedToken, setCopiedToken] = useState(null);

  const isGorbchainNetwork = selectedNetwork.chain === 'gorbagana';

  const handleCopyAddress = async (token) => {
    const result = await copyToClipboard(token.mintAddress, 'Token address');
    if (result.success) {
      toast.success(result.message);
      setCopiedToken(token.mintAddress);
      setTimeout(() => setCopiedToken(null), 2000);
    } else {
      toast.error(result.message);
    }
  };

  const getTokenIcon = (token) => {
    // Use the processed image from metadata if available, otherwise try URI
    const imageUrl = token.image || token.uri;
    
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={token.symbol}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      );
    }
    return null;
  };

  const getExplorerUrl = (mintAddress) => {
    // Return Gorbscan explorer URL for token
    return `https://gorbscan.com/token/${mintAddress}`;
  };

  if (!isGorbchainNetwork) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle size={48} className="text-zinc-500 mb-3" />
        <p className="text-zinc-400 text-sm mb-2">
          Token balances are only available on Gorbchain networks
        </p>
        <p className="text-zinc-500 text-xs">
          Switch to a Gorbchain network to view your tokens
        </p>
      </div>
    );
  }

  if (isLoadingTokens) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader size={24} className="animate-spin text-zinc-400" />
        <span className="ml-2 text-zinc-400 text-sm">Loading tokens...</span>
      </div>
    );
  }

  // Add native token (GORB) to the list if we have a balance
  const nativeToken = balance ? {
    symbol: selectedNetwork.symbol,
    name: selectedNetwork.name + ' Native Token',
    formatted_balance: formatBalance(balance, false),
    token_balance: balance,
    mintAddress: 'native',
    decimals: 9,
    isNative: true,
    uri: selectedNetwork.icon
  } : null;

  const allTokens = nativeToken ? [nativeToken, ...tokens] : tokens;

  if (allTokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Coins size={48} className="text-zinc-500 mb-3" />
        <p className="text-zinc-400 text-sm mb-1">No tokens found</p>
        <p className="text-zinc-500 text-xs">
          Tokens with balance will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allTokens.map((token, index) => (
        <div
          key={token.isNative ? 'native' : `${token.mintAddress}-${index}`}
          className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:bg-zinc-800/70 transition-colors group"
        >
          <div className="flex items-center gap-3 flex-1">
            {/* Token Icon */}
            <div className="w-10 h-10 bg-zinc-700 border border-zinc-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 relative">
              {getTokenIcon(token)}
              <div className="w-full h-full bg-zinc-700 flex items-center justify-center" style={{ display: (token.image || token.uri) ? 'none' : 'flex' }}>
                <Coins size={20} className="text-zinc-400" />
              </div>
              
              {/* Show loading indicator if we have URI but no processed image yet */}
              {token.uri && !token.image && (
                <div className="absolute inset-0 bg-zinc-800/80 flex items-center justify-center">
                  <Loader size={12} className="animate-spin text-zinc-400" />
                </div>
              )}
            </div>

            {/* Token Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-medium text-sm truncate">
                  {token.symbol || 'Unknown'}
                </span>
                {token.isNative && (
                  <span className="bg-blue-500/20 text-blue-400 text-xs px-1.5 py-0.5 rounded">
                    Native
                  </span>
                )}
                {token.isFrozen && (
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-1.5 py-0.5 rounded">
                    Frozen
                  </span>
                )}
              </div>
              <div className="text-zinc-400 text-xs truncate">
                {token.name || 'Unknown Token'}
              </div>
              {!token.isNative && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-zinc-500 text-xs font-mono">
                    {token.mintAddress?.slice(0, 8)}...{token.mintAddress?.slice(-8)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyAddress(token)}
                      className="p-1 hover:bg-zinc-600/50 rounded transition-colors"
                      title="Copy token address"
                    >
                      <Copy size={12} className={copiedToken === token.mintAddress ? 'text-green-400' : 'text-zinc-400'} />
                    </button>
                    <a
                      href={getExplorerUrl(token.mintAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-zinc-600/50 rounded transition-colors"
                      title="View on explorer"
                    >
                      <ExternalLink size={12} className="text-zinc-400" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Token Balance */}
            <div className="text-right flex-shrink-0">
              <div className="text-white font-medium text-sm">
                {formatBalance(parseFloat(token.formatted_balance), true)}
              </div>
              <div className="text-zinc-400 text-xs">
                {token.symbol}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Footer Info */}
      {allTokens.length > 0 && (
        <div className="pt-3 border-t border-zinc-700/30">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{allTokens.length} token{allTokens.length !== 1 ? 's' : ''}</span>
            <span>Updated just now</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TokenList; 