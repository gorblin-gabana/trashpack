import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BalanceDisplay from '../components/BalanceDisplay';
import WalletActions from '../components/WalletActions';
import AssetTabs from '../components/AssetTabs';
import WalletSetup from '../components/WalletSetup';
import ReceiveModal from '../components/ReceiveModal';
import { useWalletStore } from '../store';
import toast from 'react-hot-toast';

function HomePage() {
  const navigate = useNavigate();
  const { hasWallet, walletAddress } = useWalletStore();
  const [showReceiveModal, setShowReceiveModal] = useState(false);

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
