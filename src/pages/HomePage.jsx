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

      {/* Username Claim Banner - Only show if no username claimed */}
      {!username && (
        <div
          onClick={() => navigate('/profile')}
          className="mx-3 mt-3 bg-gradient-to-r from-purple-900/40 to-cyan-900/40 border border-purple-500/30 rounded-xl p-3 cursor-pointer hover:border-purple-400/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
              <AtSign size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">Claim your @username</span>
                <span className="px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-[10px] text-yellow-400 font-medium flex items-center gap-1">
                  <Gift size={10} />
                  +Points
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate">Get a unique identity & earn rewards</p>
            </div>
            <ChevronRight size={18} className="text-zinc-400 flex-shrink-0" />
          </div>
        </div>
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
