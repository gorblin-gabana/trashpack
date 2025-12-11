import { LogOut, ArrowLeft, ChevronDown, Plus, Edit2, Lock, X, Star } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Jdenticon from 'react-jdenticon';
// import HamburgerMenu from './HamburgerMenu';
import { useAuthStore, useWalletStore } from '../store';
import AddAccountModal from './AddAccountModal';
import PointsModal from './PointsModal';

function WalletHeader({ onLogout }) {
  const { principal } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    selectedNetwork, 
    walletAddress, 
    accounts, 
    activeAccountIndex, 
    hasWallet,
    switchAccount, 
    addAccount, 
    updateAccountName,
    unlockWallet,
    isWalletUnlocked 
  } = useWalletStore();

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const dropdownRef = useRef(null);

  // Mock user points - will be replaced with actual data
  const userPoints = 1250;
  
  const activeAccount = accounts && accounts.length > 0 ? (accounts[activeAccountIndex] || accounts[0]) : null;
  const shouldShowAccountDropdown = hasWallet && walletAddress;

  // Close dropdown when clicking outside and reset when wallet doesn't exist
  useEffect(() => {
    if (!shouldShowAccountDropdown) {
      setShowAccountDropdown(false);
      return;
    }
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAccountDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shouldShowAccountDropdown]);

  const handleWalletIconClick = () => {
    navigate('/settings');
  };

  const handleAccountSelect = async (accountIndex) => {
    try {
      await switchAccount(accountIndex);
      setShowAccountDropdown(false);
    } catch (err) {
      console.error('Error switching account:', err);
      toast.error('Failed to switch account: ' + err.message);
    }
  };

  const handleAddAccount = () => {
    setShowAddAccountModal(true);
    setShowAccountDropdown(false);
  };

  const handleUnlockAndAddAccount = async () => {
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsUnlocking(true);
    try {
      // Unlock the wallet first
      await unlockWallet(password);
      
      // Now add the account
      await addAccount();
      
      // Clean up
      setShowPasswordPrompt(false);
      setPassword('');
      toast.success('Wallet unlocked and new account added successfully!');
    } catch (err) {
      console.error('Error unlocking wallet or adding account:', err);
      if (err.message.includes('Invalid password')) {
        toast.error('Invalid password. Please try again.');
      } else {
        toast.error('Failed to unlock wallet or add account: ' + err.message);
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleCancelPasswordPrompt = () => {
    setShowPasswordPrompt(false);
    setPassword('');
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account.index);
    setNewAccountName(account.name);
    setShowAccountDropdown(false);
  };

  const handleSaveAccountName = async (accountIndex) => {
    try {
      if (newAccountName.trim()) {
        await updateAccountName(accountIndex, newAccountName.trim());
        toast.success('Account name updated successfully!');
      }
      setEditingAccount(null);
      setNewAccountName('');
    } catch (err) {
      console.error('Error updating account name:', err);
      
      // Check if it's a session/unlock issue
      if (err.message.includes('must be unlocked')) {
        // Show password prompt instead of just error
        setShowPasswordPrompt(true);
        setEditingAccount(null);
        setNewAccountName('');
      } else {
        toast.error('Failed to update account name: ' + err.message);
      }
    }
  };

  const formatPoints = (num) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-600 flex-shrink-0">
      <div className="flex items-center gap-2">
        {/* Chain Logo as Settings Button */}
        <button
          id="wallet-icon"
          onClick={handleWalletIconClick}
          className="w-8 h-8 rounded-full ring-1 ring-teal-600 hover:opacity-60 transition-all duration-200 flex items-center justify-center overflow-hidden"
        >
          <img
            src={selectedNetwork.icon}
            alt={selectedNetwork.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to Jdenticon if image fails to load
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `<div class="w-full h-full"></div>`;
            }}
          />
        </button>

        {/* Environment Badge */}
        <span className="bg-purple-800/20 text-purple-300 border border-purple-300/30 text-xs font-medium py-0.5 px-2 rounded text-[0.65rem] tracking-wide uppercase">
          {selectedNetwork.environment}
        </span>

      </div>

      <div className="flex items-center gap-2">
        {/* Gorb Points Button */}
        {hasWallet && (
          <button
            onClick={() => setShowPointsModal(true)}
            className="flex items-center gap-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-400/50 px-2 py-1 rounded-md transition-all"
          >
            <Star size={12} className="text-yellow-400" fill="currentColor" />
            <span className="text-xs font-semibold text-yellow-400">{formatPoints(userPoints)}</span>
          </button>
        )}

        {/* Account Dropdown - Only show when wallet exists */}
        {shouldShowAccountDropdown && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-zinc-500">
                <Jdenticon 
                  value={activeAccount ? activeAccount.address : walletAddress || 'default'} 
                  size="24"
                />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-white font-medium">
                  {activeAccount 
                    ? activeAccount.name 
                    : 'Account 1'
                  }
                </span>
                <span className="font-mono text-zinc-400 text-[10px]">
                  {activeAccount 
                    ? `${activeAccount.address.slice(0, 4)}...${activeAccount.address.slice(-4)}` 
                    : walletAddress 
                      ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
                      : '...'
                  }
                </span>
              </div>
              <ChevronDown size={14} />
            </button>

            {showAccountDropdown && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  <div className="text-xs text-zinc-400 mb-2 px-2">Accounts</div>
                  
                  {/* Show accounts if they exist, otherwise show current wallet as default account */}
                  {accounts && accounts.length > 0 ? (
                    accounts.map((account, arrayIndex) => (
                      <div key={account.index} className="mb-1">
                        <div
                          className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer ${
                            arrayIndex === activeAccountIndex ? 'bg-zinc-700' : ''
                          }`}
                        >
                          <div 
                            className="flex-1 flex items-center gap-2"
                            onClick={() => handleAccountSelect(arrayIndex)}
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-zinc-600">
                              <Jdenticon 
                                value={account.address} 
                                size="32"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="text-sm text-white">{account.name}</div>
                                {arrayIndex === activeAccountIndex && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                )}
                              </div>
                              <div className="text-xs text-zinc-400 font-mono">
                                {account.address.slice(0, 8)}...{account.address.slice(-8)}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAccount(account);
                            }}
                            className="p-1 text-zinc-400 hover:text-white transition-colors"
                            title="Edit account name"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    /* Show default account when no accounts array exists */
                    walletAddress && (
                      <div className="mb-1">
                        <div className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-700 text-left">
                          <div className="flex-1 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-zinc-600">
                              <Jdenticon 
                                value={walletAddress} 
                                size="32"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="text-sm text-white">Account 1</div>
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              </div>
                              <div className="text-xs text-zinc-400 font-mono">
                                {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                  
                  <div className="border-t border-zinc-600 mt-2 pt-2">
                    <button
                      onClick={handleAddAccount}
                      className="w-full flex items-center gap-2 p-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <Plus size={16} />
                      Add Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
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

      {/* Edit Account Name Modal */}
      {editingAccount !== null && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-zinc-800 rounded-lg p-4 w-full max-w-[360px] border border-zinc-600">
            <h3 className="text-white text-lg mb-3">Edit Account Name</h3>
            <input
              type="text"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Account name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveAccountName(editingAccount);
                } else if (e.key === 'Escape') {
                  setEditingAccount(null);
                  setNewAccountName('');
                }
              }}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setEditingAccount(null);
                  setNewAccountName('');
                }}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 px-3 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveAccountName(editingAccount)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 w-full max-w-[360px] shadow-2xl">
            {/* Header with close button */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Lock size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Unlock Wallet</h3>
                  <p className="text-zinc-400 text-sm">Enter password to continue</p>
                </div>
              </div>
              <button
                onClick={handleCancelPasswordPrompt}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                disabled={isUnlocking}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Password Input */}
            <div className="mb-6">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your wallet password"
                className="w-full bg-zinc-800 border border-zinc-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleUnlockAndAddAccount();
                  }
                }}
                autoFocus
              />
            </div>
            
            {/* Unlock Button */}
            <button
              onClick={handleUnlockAndAddAccount}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isUnlocking}
            >
              {isUnlocking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Unlocking...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Unlock & Add Account
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
      />

      {/* Points Modal */}
      <PointsModal
        isOpen={showPointsModal}
        onClose={() => setShowPointsModal(false)}
      />
    </div>
  );
}

export default WalletHeader;
