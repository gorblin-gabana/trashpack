import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AtSign, Check, X, Loader2, AlertCircle, CheckCircle, Copy, User
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWalletStore } from '../store';
import { useProfileStore } from '../store/profileStore';
import BackBtn from '../components/BackBtn';
import { copyToClipboard } from '../util';

function ProfilePage({ requireUnlock }) {
  const { walletAddress, hasWallet, getKeypair } = useWalletStore();
  const {
    profile,
    username,
    isLoading,
    isChecking,
    isClaiming,
    error,
    usernameAvailable,
    fetchProfile,
    checkAvailability,
    claimUsername,
    clearError,
    resetAvailabilityCheck
  } = useProfileStore();

  // Form state
  const [usernameInput, setUsernameInput] = useState('');

  // UI state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Debounce timer ref
  const debounceTimerRef = useRef(null);

  // Fetch profile on mount
  useEffect(() => {
    if (walletAddress) {
      fetchProfile(walletAddress);
    }
  }, [walletAddress, fetchProfile]);

  // Validate username input
  const validateUsername = useCallback((input) => {
    if (!input) {
      setValidationError('');
      return false;
    }

    const sanitized = input.toLowerCase().replace(/[^a-z0-9._-]/g, '');

    if (sanitized !== input.toLowerCase()) {
      setValidationError('Only lowercase letters, numbers, dots, underscores, and hyphens allowed');
      return false;
    }

    if (sanitized.length < 3) {
      setValidationError('Username must be at least 3 characters');
      return false;
    }

    if (sanitized.length > 32) {
      setValidationError('Username cannot exceed 32 characters');
      return false;
    }

    setValidationError('');
    return true;
  }, []);

  // Handle username input change with debounced availability check
  const handleUsernameChange = useCallback((e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '').substring(0, 32);
    setUsernameInput(value);
    clearError();

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Validate format
    if (!validateUsername(value)) {
      resetAvailabilityCheck();
      return;
    }

    // Debounce availability check
    debounceTimerRef.current = setTimeout(() => {
      checkAvailability(value);
    }, 500);
  }, [validateUsername, clearError, resetAvailabilityCheck, checkAvailability]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle claim submission
  const handleClaimSubmit = () => {
    if (!usernameInput || !usernameAvailable) return;

    // Check if wallet needs unlock
    if (requireUnlock && requireUnlock()) {
      return;
    }

    setShowConfirmModal(true);
  };

  // Confirm claim
  const handleConfirmClaim = async () => {
    setShowConfirmModal(false);

    try {
      // Get fresh keypair at claim time (in case wallet was just unlocked)
      const keypair = getKeypair();
      if (!keypair) {
        toast.error('Wallet is locked. Please unlock your wallet first.');
        // Trigger unlock prompt
        if (requireUnlock) {
          requireUnlock();
        }
        return;
      }

      // Pass empty strings for the optional fields we're hiding
      await claimUsername(keypair, usernameInput, '', '', '', '', '');
      toast.success(`Username @${usernameInput} claimed successfully!`);
      setUsernameInput('');
    } catch (err) {
      toast.error(err.message || 'Failed to claim username');
    }
  };

  // Copy username
  const handleCopyUsername = async () => {
    if (!username) return;
    const result = await copyToClipboard(`@${username}`, 'Username');
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  // No wallet state
  if (!hasWallet) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex mb-6">
          <BackBtn />
          <h2 className="text-xl font-bold text-white mx-auto pr-7">Profile</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AtSign size={48} className="mx-auto text-zinc-600 mb-4" />
            <div className="text-zinc-400 mb-2">No wallet found</div>
            <p className="text-sm text-zinc-500">Create or restore a wallet to claim your username</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex mb-6">
          <BackBtn />
          <h2 className="text-xl font-bold text-white mx-auto pr-7">Profile</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-cyan-500" />
        </div>
      </div>
    );
  }

  // Profile exists - show claimed username
  if (profile && username) {
    return (
      <div className="flex flex-col h-full overflow-y-auto pr-2 -mr-3">
        <div className="flex mb-6">
          <BackBtn />
          <h2 className="text-xl font-bold text-white mx-auto pr-7">Profile</h2>
        </div>

        <div className="space-y-4">
          {/* Username Card */}
          <div className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/30 rounded-lg p-6 text-center">
            <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={40} className="text-white" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-2xl font-bold text-white">@{username}</h3>
              <CheckCircle size={20} className="text-cyan-400" title="Verified on-chain" />
            </div>
            <p className="text-sm text-zinc-400 mb-4 truncate">{walletAddress}</p>

            <button
              onClick={handleCopyUsername}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white hover:bg-zinc-700 transition-colors"
            >
              <Copy size={14} />
              Copy Username
            </button>
          </div>

          {/* Info Card */}
          <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-2">Username Benefits</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                <span>Others can send you funds using @{username}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                <span>Permanently linked to your wallet on-chain</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                <span>Easy to share and remember</span>
              </li>
            </ul>
          </div>

          {/* Profile Info */}
          <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-3">
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wide">
              Profile Details
            </label>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Created</span>
                <span className="text-white">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Profile Address</span>
                <span className="text-white font-mono text-xs truncate max-w-[150px]">{profile.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Claim username form (no profile exists)
  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 -mr-3">
      <div className="flex mb-6">
        <BackBtn />
        <h2 className="text-xl font-bold text-white mx-auto pr-7">Claim Username</h2>
      </div>

      <div className="space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/30 rounded-lg p-4 text-center">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <AtSign size={32} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Claim Your Username</h3>
          <p className="text-sm text-zinc-400">
            Reserve a unique username on the blockchain. Others can send you funds using your username instead of your address.
          </p>
        </div>

        {/* Username Input */}
        <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-4">
          <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wide">
            Choose Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-lg">@</span>
            <input
              type="text"
              value={usernameInput}
              onChange={handleUsernameChange}
              placeholder="username"
              className="w-full pl-9 pr-10 bg-zinc-800 border border-zinc-600 rounded-lg py-3 text-white text-lg focus:border-cyan-500 focus:outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {isChecking && <Loader2 size={20} className="animate-spin text-zinc-400" />}
              {!isChecking && usernameAvailable === true && usernameInput.length >= 3 && (
                <Check size={20} className="text-green-500" />
              )}
              {!isChecking && usernameAvailable === false && usernameInput.length >= 3 && (
                <X size={20} className="text-red-500" />
              )}
            </span>
          </div>

          {/* Validation/Availability Message */}
          {validationError && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle size={12} />
              {validationError}
            </p>
          )}
          {!validationError && usernameAvailable === true && usernameInput.length >= 3 && (
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <Check size={12} />
              Username is available!
            </p>
          )}
          {!validationError && usernameAvailable === false && usernameInput.length >= 3 && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <X size={12} />
              Username is already taken
            </p>
          )}

          {/* Rules */}
          <div className="mt-4 text-xs text-zinc-500 space-y-1">
            <p className="font-medium text-zinc-400">Username rules:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>3-32 characters</li>
              <li>Lowercase letters, numbers, dots, underscores, hyphens</li>
              <li>Cannot be changed after claiming</li>
            </ul>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Claim Button */}
        <button
          onClick={handleClaimSubmit}
          disabled={!usernameInput || !usernameAvailable || isClaiming || isChecking || validationError}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isClaiming ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Claiming Username...
            </>
          ) : (
            <>
              <AtSign size={18} />
              Claim @{usernameInput || 'username'}
            </>
          )}
        </button>

        <p className="text-xs text-zinc-500 text-center">
          Transaction fee: ~0.002 GORB
        </p>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 rounded-lg p-4 w-full max-w-[320px] border border-zinc-600">
            <h3 className="text-lg font-bold text-white mb-2">Confirm Username Claim</h3>
            <p className="text-sm text-zinc-400 mb-4">
              You are about to claim:
            </p>
            <div className="bg-zinc-900 rounded-lg p-3 mb-4 text-center">
              <span className="text-xl font-bold text-cyan-400">@{usernameInput}</span>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              This action cannot be undone. Your username will be permanently linked to your wallet address.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClaim}
                className="flex-1 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
