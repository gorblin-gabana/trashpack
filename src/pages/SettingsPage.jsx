import { useState } from 'react';
import {
  HelpCircle, ExternalLink, MessageSquare, CopyIcon, Save, Trash2, Edit3, Wallet,
  Clock, DollarSign, Globe, Bell, BellOff, Shield, ChevronRight, X, Link2Off, AtSign
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useWalletStore, useSettingsStore, AUTO_LOCK_OPTIONS, CURRENCY_OPTIONS } from '../store';
import { useProfileStore } from '../store/profileStore';
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

  const {
    autoLockTimeout,
    setAutoLockTimeout,
    displayCurrency,
    setDisplayCurrency,
    connectedDApps,
    removeConnectedDApp,
    clearAllConnectedDApps,
    notifications,
    toggleNotification
  } = useSettingsStore();

  const { profile, username } = useProfileStore();

  const [isEditingRpc, setIsEditingRpc] = useState(false);
  const [rpcUrlInput, setRpcUrlInput] = useState('');
  const [showConnectedDApps, setShowConnectedDApps] = useState(false);

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
    window.open('https://t.me/gorbagana', '_blank');
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

  const handleAutoLockChange = (value) => {
    setAutoLockTimeout(value);
    const option = AUTO_LOCK_OPTIONS.find(o => o.value === value);
    toast.success(`Auto-lock set to ${option?.label || 'custom'}`);
  };

  const handleCurrencyChange = (value) => {
    setDisplayCurrency(value);
    const option = CURRENCY_OPTIONS.find(o => o.value === value);
    toast.success(`Currency set to ${option?.label || value.toUpperCase()}`);
  };

  const handleDisconnectDApp = (origin) => {
    removeConnectedDApp(origin);
    toast.success('dApp disconnected');
  };

  const handleDisconnectAll = () => {
    clearAllConnectedDApps();
    toast.success('All dApps disconnected');
  };

  const handleToggleNotification = (key) => {
    toggleNotification(key);
    const newValue = !notifications[key];
    toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${newValue ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 -mr-3">
      <div className="flex mb-4">
        <BackBtn />
        <h2 className="text-xl font-bold text-white mx-auto pr-7">Settings</h2>
      </div>

      <div className="space-y-3">
        {/* Username Profile Card */}
        <div
          className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30 rounded-lg p-4 cursor-pointer hover:border-purple-400/50 transition-colors"
          onClick={() => navigate('/profile')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              <AtSign size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">
                {username ? `@${username}` : 'Claim Username'}
              </h3>
              <p className="text-sm text-zinc-400">
                {username ? 'View your profile' : 'Reserve your unique identity on-chain'}
              </p>
            </div>
            <ChevronRight className="text-zinc-400" size={20} />
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-3">
          <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wide flex items-center gap-2">
            <Shield size={12} />
            Security
          </label>

          {/* Auto-lock Timeout */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-zinc-400" />
                <span className="text-sm text-white">Auto-lock</span>
              </div>
            </div>
            <select
              value={autoLockTimeout}
              onChange={(e) => handleAutoLockChange(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-md px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
            >
              {AUTO_LOCK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 mt-1">
              Wallet will lock after inactivity
            </p>
          </div>

          {hasWallet && (
            <button
              onClick={handleWalletSettings}
              className="w-full p-2 bg-zinc-800 border border-zinc-600 rounded-md hover:bg-zinc-700 transition-colors flex items-center justify-between text-sm text-white"
            >
              <div className="flex items-center gap-2">
                <Wallet size={14} />
                Wallet Settings
              </div>
              <ChevronRight size={14} className="text-zinc-400" />
            </button>
          )}
        </div>

        {/* Display Settings */}
        <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-3">
          <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wide flex items-center gap-2">
            <DollarSign size={12} />
            Display
          </label>

          {/* Currency Selection */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white">Currency</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {CURRENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleCurrencyChange(option.value)}
                className={`p-2 rounded-md border text-center transition-all ${
                  displayCurrency === option.value
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                    : 'border-zinc-600 bg-zinc-800 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                <span className="text-lg">{option.symbol}</span>
                <span className="block text-xs mt-0.5">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Connected dApps */}
        <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-zinc-400 uppercase tracking-wide flex items-center gap-2">
              <Globe size={12} />
              Connected dApps
            </label>
            <span className="text-xs text-zinc-500">{connectedDApps.length} connected</span>
          </div>

          {connectedDApps.length === 0 ? (
            <div className="text-center py-4">
              <Globe size={24} className="mx-auto text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-500">No connected dApps</p>
              <p className="text-xs text-zinc-600">Connect to dApps to see them here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {connectedDApps.slice(0, showConnectedDApps ? undefined : 3).map((dApp) => (
                <div
                  key={dApp.origin}
                  className="flex items-center justify-between p-2 bg-zinc-800 rounded-md"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {dApp.favicon ? (
                      <img
                        src={dApp.favicon}
                        alt=""
                        className="w-6 h-6 rounded"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center">
                        <Globe size={12} className="text-zinc-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{dApp.name || new URL(dApp.origin).hostname}</p>
                      <p className="text-xs text-zinc-500 truncate">{dApp.origin}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnectDApp(dApp.origin)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    title="Disconnect"
                  >
                    <Link2Off size={14} />
                  </button>
                </div>
              ))}

              {connectedDApps.length > 3 && (
                <button
                  onClick={() => setShowConnectedDApps(!showConnectedDApps)}
                  className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 py-1"
                >
                  {showConnectedDApps ? 'Show less' : `Show ${connectedDApps.length - 3} more`}
                </button>
              )}

              {connectedDApps.length > 0 && (
                <button
                  onClick={handleDisconnectAll}
                  className="w-full p-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                >
                  Disconnect All
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-3">
          <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wide flex items-center gap-2">
            <Bell size={12} />
            Notifications
          </label>

          <div className="space-y-2">
            {[
              { key: 'transactions', label: 'Transaction alerts', description: 'Get notified about transactions' },
              { key: 'priceAlerts', label: 'Price alerts', description: 'Notifications for price changes' },
              { key: 'securityAlerts', label: 'Security alerts', description: 'Important security notifications' },
              { key: 'promotions', label: 'Promotions', description: 'News and promotional content' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => handleToggleNotification(item.key)}
                className="w-full flex items-center justify-between p-2 bg-zinc-800 rounded-md hover:bg-zinc-750 transition-colors"
              >
                <div className="text-left">
                  <p className="text-sm text-white">{item.label}</p>
                  <p className="text-xs text-zinc-500">{item.description}</p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors ${
                  notifications[item.key] ? 'bg-cyan-500' : 'bg-zinc-600'
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${
                    notifications[item.key] ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
                  }`} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Network Settings */}
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
              onClick={() => handleEnvironmentChange('devnet')}
              className={`p-2 rounded-md border transition-all duration-200 flex items-center gap-2 ${
                selectedEnvironment === 'devnet'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-zinc-600 bg-zinc-800 hover:border-zinc-500'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                selectedEnvironment === 'devnet' ? 'bg-purple-400' : 'bg-zinc-500'
              }`}></div>
              <span className="text-sm text-white">Devnet</span>
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
            {selectedEnvironment === 'devnet'
              ? 'Using test networks for development'
              : 'Using live networks with real assets'
            }
          </p>
        </div>

        {/* RPC URL */}
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

        {/* General Actions */}
        <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-3">
          <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wide">Resources</label>

          <div className="grid grid-cols-2 gap-2">
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

        {/* Version info */}
        <div className="text-center text-xs text-zinc-600 py-2">
          TrashPack Wallet v2.0.0
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
