import { useState } from 'react';
import { HelpCircle, ExternalLink, MessageSquare, CopyIcon, Save, Trash2, Edit3, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useWalletStore } from '../store';
import BackBtn from '../components/BackBtn';
import { copyToClipboard } from '../util';

function SettingsPage({ requireUnlock }) {
  const navigate = useNavigate();
  const { setHelpModalOpen } = useUIStore();
  const {
    selectedNetwork,
    selectedEnvironment,
    hasWallet,
    getCurrentRpcUrl,
    setCustomRpcUrl,
    resetRpcUrl,
    getFilteredNetworks,
    setSelectedNetwork,
    setSelectedEnvironment
  } = useWalletStore();
  const [isEditingRpc, setIsEditingRpc] = useState(false);
  const [rpcUrlInput, setRpcUrlInput] = useState('');

  // Check if current RPC URL is custom
  const currentRpcUrl = getCurrentRpcUrl();
  const defaultRpcUrl = selectedNetwork?.rpcUrl;
  const isCustomRpc = currentRpcUrl !== defaultRpcUrl;

  const handleNetworkChange = (networkIndex) => {
    const filteredNetworks = getFilteredNetworks();
    const network = filteredNetworks[networkIndex];
    if (network) {
      setSelectedNetwork(network);
      toast.success(`Switched to ${network.name}`);
    }
  };

  const handleEnvironmentChange = (environment) => {
    setSelectedEnvironment(environment);
    toast.success(`Switched to ${environment}`);
  };

  const handleHelpClick = () => {
    setHelpModalOpen(true);
  };

  const handleExplorer = () => {
    window.open('https://gorbscan.com/', '_blank');
  };

  const handleSupport = () => {
    window.open('https://discord.gg/gorbagana', '_blank');
  };

  const handleWalletSettings = () => {
    navigate('/wallet-settings');
  };

  const handleRpcClick = async () => {
    const result = await copyToClipboard(currentRpcUrl, 'RPC URL');
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleEditRpc = () => {
    setIsEditingRpc(true);
    setRpcUrlInput(currentRpcUrl);
  };

  const handleSaveRpc = async () => {
    try {
      if (!rpcUrlInput.trim()) {
        toast.error('RPC URL cannot be empty');
        return;
      }

      // Basic URL validation
      try {
        new URL(rpcUrlInput.trim());
      } catch {
        toast.error('Please enter a valid URL');
        return;
      }

      await setCustomRpcUrl(rpcUrlInput.trim());
      setIsEditingRpc(false);
      toast.success('RPC URL updated successfully');
    } catch (err) {
      toast.error('Failed to save RPC URL');
      console.error(err);
    }
  };

  const handleResetRpc = async () => {
    try {
      await resetRpcUrl();
      setIsEditingRpc(false);
      setRpcUrlInput('');
      toast.success('RPC URL reset to default');
    } catch (err) {
      toast.error('Failed to reset RPC URL');
      console.error(err);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingRpc(false);
    setRpcUrlInput('');
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 -mr-3">
      <div className="flex mb-6">
        <BackBtn />
        <h2 className="text-xl font-bold text-white mx-auto pr-7">Settings</h2>
      </div>

      <div className="space-y-3">
        {/* RPC URL Display/Edit */}
        <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs text-zinc-400 uppercase tracking-wide">
              RPC Endpoint
              {isCustomRpc && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                  Custom
                </span>
              )}
            </label>
            <div className="flex gap-2">
              {!isEditingRpc ? (
                <>
                  <button
                    onClick={handleRpcClick}
                    className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                    title="Copy RPC URL"
                  >
                    <CopyIcon size={16} />
                  </button>
                  {isCustomRpc && (
                    <button
                      onClick={handleResetRpc}
                      className="p-1.5 text-orange-400 hover:text-orange-300 transition-colors"
                      title="Reset to default"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleEditRpc}
                    className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                    title="Edit RPC URL"
                  >
                    <Edit3 size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveRpc}
                    className="p-1.5 text-green-400 hover:text-green-300 transition-colors"
                    title="Save RPC URL"
                  >
                    <Save size={16} />
                  </button>
                  {isCustomRpc && (
                    <button
                      onClick={handleResetRpc}
                      className="p-1.5 text-orange-400 hover:text-orange-300 transition-colors"
                      title="Reset to default"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleCancelEdit}
                    className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                    title="Cancel"
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          </div>

          {!isEditingRpc ? (
            <div className="text-sm text-white font-mono max-w-[300px] truncate">
              {currentRpcUrl}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={rpcUrlInput}
                onChange={(e) => setRpcUrlInput(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                placeholder="Enter RPC URL..."
              />
               <p className="text-xs text-zinc-400">
                 Network: {selectedNetwork?.name} ({selectedNetwork?.environment})
               </p>
            </div>
          )}
        </div>

        {/* Network Selection */}
        <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-3">
          <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wide">Network</label>

          <div className="grid grid-cols-2 gap-2">
            {getFilteredNetworks().map((network, index) => (
              <button
                key={`${network.id}-${network.environment}`}
                onClick={() => handleNetworkChange(index)}
                className={`p-2 rounded-md border transition-all duration-200 flex items-center gap-2 ${
                  selectedNetwork.id === network.id && selectedNetwork.environment === network.environment
                    ? 'border-teal-500 bg-teal-500/10'
                    : 'border-zinc-600 bg-zinc-800 hover:border-zinc-500'
                }`}
                disabled={false}
              >
                <img
                  src={network.icon}
                  alt={network.name}
                  className="size-6 object-cover"
                />
                <span className="text-sm text-white">{network.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Environment Selection */}
        <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-3">
          <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wide">Environment</label>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleEnvironmentChange('testnet')}
              className={`p-2 rounded-md border transition-all duration-200 flex items-center gap-2 ${
                selectedEnvironment === 'testnet'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-zinc-600 bg-zinc-800 hover:border-zinc-500'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                selectedEnvironment === 'testnet' ? 'bg-purple-400' : 'bg-zinc-500'
              }`}></div>
              <span className="text-sm text-white">Testnet</span>
            </button>

            <button
              onClick={() => handleEnvironmentChange('mainnet')}
              className={`p-2 rounded-md border transition-all duration-200 flex items-center gap-2 ${
                selectedEnvironment === 'mainnet'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-zinc-600 bg-zinc-800 hover:border-zinc-500'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                selectedEnvironment === 'mainnet' ? 'bg-green-400' : 'bg-zinc-500'
              }`}></div>
              <span className="text-sm text-white">Mainnet</span>
            </button>
          </div>

          <p className="text-xs text-zinc-400 mt-2">
            {selectedEnvironment === 'testnet'
              ? 'Using test networks for development and testing'
              : 'Using live networks with real assets'
            }
          </p>
        </div>

        {/* General Actions */}
        <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-3">
          <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wide">General</label>

          <div className="grid grid-cols-2 gap-2">
            {hasWallet && (
              <button
                onClick={handleWalletSettings}
                className="p-2 bg-zinc-800 border border-zinc-600 rounded-md hover:bg-zinc-700 transition-colors flex items-center gap-2 text-sm text-white"
              >
                <Wallet size={14} />
                Wallet Settings
              </button>
            )}

            <button
              onClick={handleHelpClick}
              className="p-2 bg-zinc-800 border border-zinc-600 rounded-md hover:bg-zinc-700 transition-colors flex items-center gap-2 text-sm text-white"
            >
              <HelpCircle size={14} />
              About
            </button>

            <button
              onClick={handleSupport}
              className="p-2 bg-zinc-800 border border-zinc-600 rounded-md hover:bg-zinc-700 transition-colors flex items-center gap-2 text-sm text-white"
            >
              <MessageSquare size={14} />
              Support
            </button>

            <button
              onClick={handleExplorer}
              className="p-2 bg-zinc-800 border border-zinc-600 rounded-md hover:bg-zinc-700 transition-colors flex items-center gap-2 text-sm text-white col-span-2"
            >
              <ExternalLink size={14} />
              Explorer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
