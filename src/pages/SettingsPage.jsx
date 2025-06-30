import { useState } from 'react';
import { Copy, HelpCircle, ExternalLink, Settings, MessageSquare, Key, Download, Eye, EyeOff, Trash2, CopyIcon, Save, RotateCcw, Edit3, DeleteIcon, LucideDelete } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore, useUIStore, useWalletStore } from '../store';
import BackBtn from '../components/BackBtn';
import { copyToClipboard } from '../util';
import { networks } from '../lib/config';

function SettingsPage() {
  const { principal } = useAuthStore();
  const { setHelpModalOpen } = useUIStore();
  const {
    walletAddress,
    selectedNetwork,
    selectedEnvironment,
    setSelectedNetwork,
    setSelectedEnvironment,
    getFilteredNetworks,
    exportMnemonic,
    clearWallet,
    getCurrentRpcUrl,
    setCustomRpcUrl,
    resetRpcUrl,
    customRpcUrls
  } = useWalletStore();
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingRpc, setIsEditingRpc] = useState(false);
  const [rpcUrlInput, setRpcUrlInput] = useState('');

  const { logout } = useAuthStore();
  const { setError, clearError } = useUIStore();

  // Check if current RPC URL is custom
  const currentRpcUrl = getCurrentRpcUrl();
  const defaultRpcUrl = selectedNetwork?.rpcUrl;
  const isCustomRpc = currentRpcUrl !== defaultRpcUrl;

  const handleNetworkChange = (networkIndex) => {
    const filteredNetworks = getFilteredNetworks();
    const network = filteredNetworks[networkIndex];
    if (network) {
      setSelectedNetwork(network);
      // Reset RPC editing state when network changes
      setIsEditingRpc(false);
      setRpcUrlInput('');
    }
  };

  const handleEnvironmentChange = (environment) => {
    setSelectedEnvironment(environment);
    // Reset RPC editing state when environment changes
    setIsEditingRpc(false);
    setRpcUrlInput('');
  };

  const handleCopyPrincipal = async () => {
    const result = await copyToClipboard(walletAddress, 'Wallet Address');
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleHelpClick = () => {
    setHelpModalOpen(true);
  };

  const handleExplorer = () => {
    window.open('https://gorbscan.com/explorer/', '_blank');
  };

  const handleSupport = () => {
    window.open('https://discord.gg/', '_blank');
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

  const handleExportMnemonic = () => {
    try {
      clearError();
      const mnemonic = exportMnemonic();
      setShowMnemonic(true);
      toast.success('Mnemonic phrase revealed');
    } catch (err) {
      setError(err.message);
    }
  };

  const copyMnemonic = () => {
    try {
      const mnemonic = exportMnemonic();
      navigator.clipboard.writeText(mnemonic);
      toast.success('Mnemonic copied to clipboard!');
    } catch (err) {
      setError(err.message);
    }
  };

  const downloadMnemonic = () => {
    try {
      const mnemonic = exportMnemonic();
      const element = document.createElement('a');
      const file = new Blob([mnemonic], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = 'trashpack-wallet-mnemonic.txt';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success('Mnemonic downloaded!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteWallet = async () => {
    try {
      clearWallet();
      await logout();
      toast.success('Wallet deleted successfully');
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err.message);
    }
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

        {/* Quick Actions */}
        <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-3">
          <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wide">Quick Actions</label>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyPrincipal}
              className="p-2 bg-zinc-800 border border-zinc-600 rounded-md hover:bg-zinc-700 transition-colors flex items-center gap-2 text-sm text-white"
            >
              <Copy size={14} />
              Copy Address
            </button>

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
              className="p-2 bg-zinc-800 border border-zinc-600 rounded-md hover:bg-zinc-700 transition-colors flex items-center gap-2 text-sm text-white"
            >
              <ExternalLink size={14} />
              Explorer
            </button>
          </div>
        </div>

        {/* Backup Section */}
        <div className="bg-zinc-700 p-4 rounded-lg border border-zinc-600">
          <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
            <Key size={20} />
            Backup Wallet
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Export your mnemonic phrase to backup your wallet. Keep it safe and never share it.
          </p>

          {!showMnemonic ? (
            <button
              onClick={handleExportMnemonic}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm flex items-center gap-2"
            >
              <Eye size={16} />
              Show Mnemonic Phrase
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-zinc-800 p-3 rounded">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-zinc-400">Recovery Phrase</span>
                  <button
                    onClick={() => setShowMnemonic(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <EyeOff size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {exportMnemonic().split(' ').map((word, index) => (
                    <span key={index} className="text-white bg-zinc-700 px-2 py-1 rounded text-xs">
                      {index + 1}. {word}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyMnemonic}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm flex items-center justify-center gap-2"
                >
                  <Key size={16} />
                  Copy
                </button>
                <button
                  onClick={downloadMnemonic}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-red-900/20 p-4 rounded-lg border border-red-600/30">
          <h3 className="text-lg font-semibold mb-3 text-red-400 flex items-center gap-2">
            <Trash2 size={20} />
            Danger Zone
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Permanently delete your wallet from this device. Make sure you have backed up your mnemonic phrase.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-sm"
            >
              Delete Wallet
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-400">
                Are you sure? This action cannot be undone. You will need your mnemonic phrase to restore your wallet.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteWallet}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-sm"
                >
                  Yes, Delete Wallet
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-zinc-600 hover:bg-zinc-700 text-white py-2 px-4 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
