import { useState, useEffect } from 'react';
import { Coins, Activity, Image, RefreshCw, AlertCircle, Loader } from 'lucide-react';
import { useWalletStore } from '../store';
import { formatBalance, formatNumber } from '../util';
import TokenList from './TokenList';
import RecentActivity from './RecentActivity';

function AssetTabs() {
  const [activeTab, setActiveTab] = useState('tokens');
  
  const {
    walletAddress,
    selectedNetwork,
    tokens,
    nfts,
    isLoadingTokens,
    isLoadingNFTs,
    fetchTokens,
    fetchNFTs,
    smartRefreshTokens,
    getTokenCount,
    getNFTCount,
    refreshTokenData
  } = useWalletStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Smart refresh on component mount and wallet address change
  useEffect(() => {
    if (walletAddress && selectedNetwork.chain === 'gorbagana') {
      smartRefreshTokens();
    }
  }, [walletAddress, selectedNetwork.chain]);

  // Auto-refresh tokens when switching to tokens tab
  useEffect(() => {
    if (activeTab === 'tokens' && walletAddress && selectedNetwork.chain === 'gorbagana') {
      smartRefreshTokens();
    } else if (activeTab === 'nfts' && walletAddress && selectedNetwork.chain === 'gorbagana') {
      fetchNFTs();
    }
  }, [activeTab, walletAddress, selectedNetwork.chain]);

  const handleRefresh = async () => {
    if (isRefreshing || !walletAddress) return;
    
    setIsRefreshing(true);
    try {
      await refreshTokenData();
    } catch (error) {
      console.error('Error refreshing asset data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const tabs = [
    {
      id: 'tokens',
      label: 'Tokens',
      icon: Coins,
      count: getTokenCount(),
      loading: isLoadingTokens
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: Activity,
      count: null,
      loading: false
    },
    {
      id: 'nfts',
      label: 'NFTs',
      icon: Image,
      count: getNFTCount(),
      loading: isLoadingNFTs
    }
  ];

  const isGorbchainNetwork = selectedNetwork.chain === 'gorbagana';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tokens':
        return <TokenList />;
      case 'activity':
        return <RecentActivity />;
      case 'nfts':
        return <NFTList />;
      default:
        return <TokenList />;
    }
  };

  const NFTList = () => {
    if (!isGorbchainNetwork) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle size={48} className="text-zinc-500 mb-3" />
          <p className="text-zinc-400 text-sm">
            NFTs are only available on Gorbchain networks
          </p>
        </div>
      );
    }

    if (isLoadingNFTs) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader size={24} className="animate-spin text-zinc-400" />
          <span className="ml-2 text-zinc-400 text-sm">Loading NFTs...</span>
        </div>
      );
    }

    if (nfts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Image size={48} className="text-zinc-500 mb-3" />
          <p className="text-zinc-400 text-sm mb-1">No NFTs found</p>
          <p className="text-zinc-500 text-xs">
            NFTs you own will appear here
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {nfts.map((nft, index) => (
          <div
            key={`${nft.mintAddress}-${index}`}
            className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:bg-zinc-800/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-700 border border-zinc-600 rounded-lg flex items-center justify-center overflow-hidden">
                {(nft.image || nft.uri) ? (
                  <img
                    src={nft.image || nft.uri}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="w-full h-full bg-zinc-700 flex items-center justify-center" style={{ display: (nft.image || nft.uri) ? 'none' : 'flex' }}>
                  <Image size={20} className="text-zinc-400" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm">
                    {nft.name || nft.symbol || 'Unknown NFT'}
                  </span>
                  {nft.isFrozen && (
                    <span className="bg-orange-500/20 text-orange-400 text-xs px-1.5 py-0.5 rounded">
                      Frozen
                    </span>
                  )}
                </div>
                <div className="text-zinc-400 text-xs font-mono">
                  {nft.mintAddress?.slice(0, 8)}...{nft.mintAddress?.slice(-8)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-medium text-sm">
                #{nft.formatted_balance || '1'}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 backdrop-blur-sm border border-zinc-700/40 rounded-2xl p-4 mt-4">
      {/* Header with tabs and refresh button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-zinc-700 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700/50'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-zinc-600 text-zinc-200'
                      : 'bg-zinc-700/50 text-zinc-500'
                  }`}>
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
                {tab.loading && (
                  <Loader size={12} className="animate-spin" />
                )}
              </button>
            );
          })}
        </div>

        {/* Refresh button - only show for token/NFT tabs */}
        {(activeTab === 'tokens' || activeTab === 'nfts') && isGorbchainNetwork && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-zinc-700/30 text-zinc-500 hover:text-zinc-300 transition-all duration-200 disabled:opacity-50"
            title="Refresh assets"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {renderTabContent()}
      </div>
    </div>
  );
}

export default AssetTabs; 