import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtSign, ChevronRight, Gift } from 'lucide-react';
import BalanceDisplay from '../components/BalanceDisplay';
import WalletActions from '../components/WalletActions';
import AssetTabs from '../components/AssetTabs';
import WalletSetup from '../components/WalletSetup';
import ReceiveModal from '../components/ReceiveModal';
import { useWalletStore } from '../store';
import { useProfileStore } from '../store/profileStore';
import toast from 'react-hot-toast';

function HomePage() {
  const navigate = useNavigate();
  const { hasWallet, walletAddress } = useWalletStore();
  const { username, profile, fetchProfile } = useProfileStore();
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    if (walletAddress) {
      fetchProfile(walletAddress);
    }
  }, [walletAddress, fetchProfile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Don't trigger shortcuts if user is typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Check for modifier keys to avoid conflicts
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 's':
          event.preventDefault();
          navigate('/send');
          toast.success('Opening Send...', {
            icon: '📤',
            duration: 1500,
            style: {
              background: '#18181b',
              color: '#fafafa',
              border: '1px solid #27272a'
            }
          });
          break;
        case 'r':
          event.preventDefault();
          setShowReceiveModal(true);
          toast.success('Opening Receive...', {
            icon: '📥',
            duration: 1500,
            style: {
              background: '#18181b',
              color: '#fafafa',
              border: '1px solid #27272a'
            }
          });
          break;
        case 'w':
          event.preventDefault();
          navigate('/bridge');
          toast.success('Opening Swap...', {
            icon: '🔄',
            duration: 1500,
            style: {
              background: '#18181b',
              color: '#fafafa',
              border: '1px solid #27272a'
            }
          });
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  // Show wallet setup if no wallet exists
  if (!hasWallet || !walletAddress) {
    return <WalletSetup />;
  }

  const handleReceiveClick = () => {
    setShowReceiveModal(true);
  };

  const handleCloseReceiveModal = () => {
    setShowReceiveModal(false);
  };

  // Show normal wallet interface
  return (
    <div className="" role="main" aria-label="Wallet Dashboard">
      <BalanceDisplay />
      <WalletActions onReceiveClick={handleReceiveClick} />

      {/* Token Unlocks Button */}
      <button
        onClick={() => navigate('/token-unlocks')}
        className="w-full mb-2 bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 border border-amber-500/30 hover:border-amber-400/50 rounded-xl p-3 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div className="text-left">
              <span className="text-sm font-medium text-white block">Token Unlocks</span>
              <span className="text-xs text-zinc-400">View your vesting schedules</span>
            </div>
          </div>
          <ChevronRight size={18} className="text-zinc-400 group-hover:text-amber-400 transition-colors" />
        </div>
      </button>

      {/* Claim Username - Only show if no username claimed */}
      {!username && (
        <button
          onClick={() => navigate('/profile')}
          className="w-full mb-2 flex items-center justify-between px-3 py-2.5 bg-zinc-800/40 hover:bg-zinc-700/40 border border-zinc-700/30 hover:border-zinc-600/50 rounded-lg transition-all group"
        >
          <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Claim @username</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-yellow-400 font-medium">+500 Points</span>
            <ChevronRight size={16} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          </div>
        </button>
      )}

      <AssetTabs />

      {/* Receive Modal */}
      <ReceiveModal
        isOpen={showReceiveModal}
        onClose={handleCloseReceiveModal}
      />
    </div>
  );
}

export default HomePage;
