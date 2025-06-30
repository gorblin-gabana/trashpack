import { LogOut, ArrowLeft, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Jdenticon from 'react-jdenticon';
// import HamburgerMenu from './HamburgerMenu';
import { useAuthStore, useWalletStore } from '../store';

function WalletHeader({ onLogout }) {
  const { principal } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedNetwork } = useWalletStore();
  const isHomePage = location.pathname === '/';

  const handleWalletIconClick = () => {
    navigate('/settings');
  };

  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-600 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          id="wallet-icon"
          onClick={handleWalletIconClick}
          className="rounded-full ring-1 ring-teal-600 hover:opacity-60 transition-all duration-200 flex items-center justify-center"
        >
          <Jdenticon size="32" value={principal} />
        </button>
        <span className="bg-purple-800/20 text-purple-300 border border-purple-300/30 text-xs font-medium py-0.5 px-2 rounded text-[0.65rem] tracking-wide uppercase">
          {selectedNetwork.environment}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {!isHomePage && (
          <button
            onClick={() => navigate('/')}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
            title="Home"
          >
            <Home size={16} />
          </button>
        )}

        {/* <button
          onClick={onLogout}
          className="bg-neutral-700 border border-zinc-500 text-zinc-300 py-1.5 px-2.5 rounded-md cursor-pointer flex items-center justify-center gap-1.5 text-xs transition-all duration-200 hover:bg-zinc-500 hover:text-white"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button> */}

        {/* <HamburgerMenu /> */}
      </div>
    </div>
  );
}

export default WalletHeader;
