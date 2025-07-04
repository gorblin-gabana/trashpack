import { useState } from 'react';
import { ChevronDown, Wifi } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWalletStore } from '../store';
import BackBtn from './BackBtn';

function NetworkSelector() {
  const {
    selectedNetwork,
    selectedEnvironment,
    setSelectedNetwork,
    setSelectedEnvironment,
    getFilteredNetworks
  } = useWalletStore();

  const [isExpanded, setIsExpanded] = useState(false);

  const handleNetworkChange = (networkIndex) => {
    const filteredNetworks = getFilteredNetworks();
    const network = filteredNetworks[networkIndex];
    if (network) {
      setSelectedNetwork(network);
      setIsExpanded(false);
      toast.success(`Switched to ${network.name}`);
    }
  };

  const handleEnvironmentChange = (environment) => {
    setSelectedEnvironment(environment);
    toast.success(`Switched to ${environment}`);
  };

  if (!isExpanded) {
    // Collapsed view - show just current network
    return (
      <div className="flex flex-col h-full">
        <div className="flex mb-6">
          <BackBtn />
          <h2 className="text-xl font-bold text-white mx-auto pr-7">Networks</h2>
        </div>

        <div className="space-y-4">
          {/* Current Network Display */}
          <div 
            onClick={() => setIsExpanded(true)}
            className="bg-neutral-700 border border-zinc-600 rounded-lg p-4 cursor-pointer hover:bg-neutral-600 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedNetwork.icon}
                  alt={selectedNetwork.name}
                  className="size-8 object-cover rounded"
                />
                <div>
                  <h3 className="text-white font-medium">{selectedNetwork.name}</h3>
                  <p className="text-zinc-400 text-sm capitalize">{selectedNetwork.environment}</p>
                </div>
              </div>
              <ChevronDown size={20} className="text-zinc-400" />
            </div>
          </div>

          {/* Environment Toggle */}
          <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-4">
            <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wide">Environment</label>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleEnvironmentChange('testnet')}
                className={`p-3 rounded-md border transition-all duration-200 flex items-center gap-2 ${
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
                className={`p-3 rounded-md border transition-all duration-200 flex items-center gap-2 ${
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

            <p className="text-xs text-zinc-400 mt-2 text-center">
              {selectedEnvironment === 'testnet'
                ? 'Using test networks for development and testing'
                : 'Using live networks with real assets'
              }
            </p>
          </div>

          {/* Connection Status */}
          <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Wifi size={16} className="text-green-400" />
              <span className="text-sm text-white">Connected</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {selectedNetwork.name} • {selectedEnvironment}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Expanded view - show all available networks
  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 -mr-3">
      <div className="flex mb-6">
        <button
          onClick={() => setIsExpanded(false)}
          className="flex items-center gap-2 w-fit text-zinc-400 hover:text-white transition-colors"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h2 className="text-xl font-bold text-white mx-auto pr-7">Select Network</h2>
      </div>

      <div className="space-y-3">
        {/* Network Selection */}
        <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-3">
          <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wide">Available Networks</label>

          <div className="space-y-2">
            {getFilteredNetworks().map((network, index) => (
              <button
                key={`${network.id}-${network.environment}`}
                onClick={() => handleNetworkChange(index)}
                className={`w-full p-3 rounded-md border transition-all duration-200 flex items-center gap-3 ${
                  selectedNetwork.id === network.id && selectedNetwork.environment === network.environment
                    ? 'border-teal-500 bg-teal-500/10'
                    : 'border-zinc-600 bg-zinc-800 hover:border-zinc-500'
                }`}
              >
                <img
                  src={network.icon}
                  alt={network.name}
                  className="size-8 object-cover rounded"
                />
                <div className="text-left">
                  <div className="text-sm text-white font-medium">{network.name}</div>
                  <div className="text-xs text-zinc-400 capitalize">{network.environment}</div>
                </div>
                {selectedNetwork.id === network.id && selectedNetwork.environment === network.environment && (
                  <div className="ml-auto w-2 h-2 bg-teal-400 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NetworkSelector; 