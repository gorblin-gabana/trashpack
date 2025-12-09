import { useState } from 'react';
import { Plus, Key, X, Eye, EyeOff, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWalletStore } from '../store';

function AddAccountModal({ isOpen, onClose }) {
  const [mode, setMode] = useState(''); // 'create' or 'import'
  const [privateKey, setPrivateKey] = useState('');
  const [accountName, setAccountName] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  const { addAccount, importAccount, unlockWallet } = useWalletStore();

  const resetModal = () => {
    setMode('');
    setPrivateKey('');
    setAccountName('');
    setShowPrivateKey(false);
    setIsProcessing(false);
    setShowPasswordPrompt(false);
    setPassword('');
    setIsUnlocking(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleCreateAccount = async () => {
    try {
      setIsProcessing(true);
      await addAccount();
      toast.success('New account created successfully!');
      handleClose();
    } catch (err) {
      console.error('Error creating account:', err);
      
      // Check if it's an unlock issue
      if (err.message.includes('unlock')) {
        setShowPasswordPrompt(true);
      } else {
        toast.error('Failed to create account: ' + err.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportAccount = async () => {
    if (!privateKey.trim()) {
      toast.error('Please enter a private key');
      return;
    }

    try {
      setIsProcessing(true);
      await importAccount(privateKey.trim(), accountName.trim() || null);
      toast.success('Account imported successfully!');
      handleClose();
    } catch (err) {
      console.error('Error importing account:', err);
      
      // Check if it's an unlock issue
      if (err.message.includes('unlock')) {
        setShowPasswordPrompt(true);
      } else {
        toast.error('Failed to import account: ' + err.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlockAndProceed = async () => {
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsUnlocking(true);
    try {
      // Unlock the wallet first
      await unlockWallet(password);
      
      // Now proceed with the original action
      if (mode === 'create') {
        await addAccount();
        toast.success('Wallet unlocked and new account created successfully!');
      } else if (mode === 'import') {
        await importAccount(privateKey.trim(), accountName.trim() || null);
        toast.success('Wallet unlocked and account imported successfully!');
      }
      
      handleClose();
    } catch (err) {
      console.error('Error unlocking wallet or performing action:', err);
      if (err.message.includes('Invalid password')) {
        toast.error('Invalid password. Please try again.');
      } else {
        toast.error('Failed to unlock wallet: ' + err.message);
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleCancelPasswordPrompt = () => {
    setShowPasswordPrompt(false);
    setPassword('');
    setIsProcessing(false);
    setIsUnlocking(false);
  };

  const validatePrivateKey = (key) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return { isValid: false, message: '' };
    
    // Check if it's a valid base58 string (typical Solana private key)
    if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmedKey)) {
      if (trimmedKey.length >= 32 && trimmedKey.length <= 88) {
        return { isValid: true, message: 'Valid base58 private key' };
      }
    }
    
    // Check if it's a valid hex string
    const hexString = trimmedKey.replace(/^0x/, '');
    if (/^[0-9a-fA-F]+$/.test(hexString)) {
      if (hexString.length === 64 || hexString.length === 128) {
        return { isValid: true, message: 'Valid hex private key' };
      }
    }
    
    return { isValid: false, message: 'Invalid private key format' };
  };

  const privateKeyValidation = validatePrivateKey(privateKey);

  if (!isOpen) return null;

  // Password Prompt View
  if (showPasswordPrompt) {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 overflow-y-auto">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-[360px] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Lock size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-medium">Unlock Wallet</h3>
                <p className="text-zinc-400 text-xs">Enter password to continue</p>
              </div>
            </div>
            <button
              onClick={handleCancelPasswordPrompt}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              disabled={isUnlocking}
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="p-4">
            {/* Password Input */}
            <div className="mb-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your wallet password"
                className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleUnlockAndProceed();
                  }
                }}
                autoFocus
              />
            </div>
            
            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCancelPasswordPrompt}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 px-3 rounded-lg transition-colors text-sm"
                disabled={isUnlocking}
              >
                Cancel
              </button>
              <button
                onClick={handleUnlockAndProceed}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2 px-3 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                disabled={isUnlocking}
              >
                {isUnlocking ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    Unlock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-[360px] w-full max-h-[90%] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h3 className="text-white font-medium text-lg">Add Account</h3>
          <button
            onClick={handleClose}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {/* Mode Selection */}
          {!mode && (
            <div className="space-y-3">
              <p className="text-zinc-400 text-sm mb-4">
                Choose how you'd like to add a new account to your wallet.
              </p>
              
              <button
                onClick={() => setMode('create')}
                className="w-full p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Plus size={16} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm">Create New Account</h4>
                    <p className="text-zinc-400 text-xs">Generate from your seed phrase</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode('import')}
                className="w-full p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Key size={16} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm">Import from Private Key</h4>
                    <p className="text-zinc-400 text-xs">Add existing account</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Create Account Mode */}
          {mode === 'create' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Plus size={18} className="text-white" />
                </div>
                <h4 className="text-white font-medium mb-2">Create New Account</h4>
                <p className="text-zinc-400 text-xs">
                  Generate a new account from your existing seed phrase.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setMode('')}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 px-3 rounded-lg transition-colors text-sm"
                  disabled={isProcessing}
                >
                  Back
                </button>
                <button
                  onClick={handleCreateAccount}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 px-3 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      Create
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Import Account Mode */}
          {mode === 'import' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Key size={18} className="text-white" />
                </div>
                <h4 className="text-white font-medium mb-2">Import from Private Key</h4>
                <p className="text-zinc-400 text-xs">
                  Enter the private key of an existing account.
                </p>
              </div>

              {/* Account Name Input */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Account Name (Optional)
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g., Trading Account"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                />
              </div>

              {/* Private Key Input */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Private Key *
                </label>
                <div className="relative">
                  <input
                    type={showPrivateKey ? 'text' : 'password'}
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Enter private key"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showPrivateKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                
                {/* Validation Message */}
                {privateKey && (
                  <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                    privateKeyValidation.isValid ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {privateKeyValidation.isValid ? (
                      <CheckCircle size={12} />
                    ) : (
                      <AlertCircle size={12} />
                    )}
                    {privateKeyValidation.message}
                  </div>
                )}
              </div>

              {/* Security Warning */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-amber-200 text-xs font-medium">Security Warning</p>
                    <p className="text-amber-300/80 text-xs mt-0.5">
                      Never share your private key. TrashPack will encrypt it securely.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setMode('')}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 px-3 rounded-lg transition-colors text-sm"
                  disabled={isProcessing}
                >
                  Back
                </button>
                <button
                  onClick={handleImportAccount}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-2.5 px-3 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  disabled={isProcessing || !privateKeyValidation.isValid}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Key size={14} />
                      Import
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddAccountModal; 