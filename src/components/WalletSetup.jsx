import { useState } from 'react';
import { Wallet, Key, Download, Eye, EyeOff, Copy, CopyIcon, Wallet2Icon, CheckCircle } from 'lucide-react';
import { useWalletStore, useUIStore } from '../store';
import { toast } from 'react-hot-toast';
import PasswordSetup from './PasswordSetup';

function WalletSetup() {
  const [mode, setMode] = useState(''); // 'create' or 'restore'
  const [restoreMnemonic, setRestoreMnemonic] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdMnemonic, setCreatedMnemonic] = useState('');
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [userPassword, setUserPassword] = useState('');
  const [seedPhraseExported, setSeedPhraseExported] = useState(false); // Track if seed phrase is exported
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const { generateWallet, restoreWallet, finalizeWalletSetup } = useWalletStore();
  const { error, setError, clearError } = useUIStore();

  const handleCreateWallet = async () => {
    try {
      setIsCreating(true);
      clearError();
      const result = await generateWallet();
      setCreatedMnemonic(result.mnemonic);
      setIsCreating(false);
      
      // Show success animation
      setShowSuccessAnimation(true);
      
      // After 2 seconds, hide animation and show keyphrase
      setTimeout(() => {
        setShowSuccessAnimation(false);
        toast.success('Wallet created successfully!');
      }, 2000);
    } catch (err) {
      setError(err.message);
      setIsCreating(false);
    }
  };

  const handleRestoreWallet = async () => {
    try {
      setIsCreating(true);
      clearError();

      if (!restoreMnemonic.trim()) {
        throw new Error('Please enter your mnemonic phrase');
      }

      await restoreWallet(restoreMnemonic.trim());
      toast.success('Wallet restored successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(createdMnemonic);
    toast.success('Mnemonic copied to clipboard!');
  };

  const downloadMnemonic = () => {
    const element = document.createElement('a');
    const file = new Blob([createdMnemonic], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'trashpack-wallet-mnemonic.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Mnemonic downloaded!');
  };

  const handleContinue = () => {
    // Show password setup for new wallet security
    setShowPasswordSetup(true);
  };

  const handlePasswordSet = (password) => {
    setUserPassword(password);
    setShowPasswordSetup(false);
    finalizeWalletWithPassword(password);
  };

  const handlePasswordCancel = () => {
    setShowPasswordSetup(false);
    // Don't finalize wallet without password - user must set a password
    setError('Password is required to secure your wallet');
  };

  const finalizeWalletWithPassword = async (password) => {
    try {
      if (password) {
        // Store the password in the wallet store for finalization
        const walletStore = useWalletStore.getState();
        walletStore.encryptionPassword = password;
      }

      await finalizeWalletSetup();
      toast.success('Wallet setup complete!');
    } catch (err) {
      setError(err.message);
    }
  };

  // Show password setup modal
  if (showPasswordSetup) {
    return (
      <PasswordSetup
        onPasswordSet={handlePasswordSet}
        onCancel={handlePasswordCancel}
      />
    );
  }

  // Show success animation
  if (showSuccessAnimation) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-center">
          <div className="relative">
            <CheckCircle className="mx-auto text-green-500 animate-pulse" size={80} />
            <div className="absolute inset-0 border-4 border-green-500 rounded-full animate-ping opacity-75"></div>
          </div>
          <h2 className="text-3xl font-bold text-white mt-6 animate-fade-in">
            Wallet Created!
          </h2>
          <p className="text-zinc-400 mt-2 text-sm animate-fade-in">
            Preparing your recovery phrase...
          </p>
        </div>
      </div>
    );
  }

  if (createdMnemonic && !showSuccessAnimation) {
    return (
      <div className="flex flex-col h-full p-4">
        {/* Compact Header */}
        <div className="text-center mb-4">
          <h2 className="text-lg text-white mb-1">Save Your Recovery Phrase</h2>
          <p className="text-zinc-400 text-xs">
            Write down these 12 words in order and store them safely
          </p>
        </div>

        {/* Recovery Phrase Section */}
        <div className="flex-1 flex flex-col">
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-zinc-400">Recovery Phrase</span>
              <div className="flex gap-1">
                <button
                  onClick={copyMnemonic}
                  className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-700 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  <CopyIcon size={14} />
                </button>
                <button
                  onClick={downloadMnemonic}
                  className="p-1.5 text-zinc-400 hover:text-green-400 hover:bg-zinc-700 rounded transition-colors"
                  title="Download as file"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
            
            {/* Mnemonic Container with Reveal Overlay */}
            <div className="relative bg-zinc-800 rounded-lg border border-zinc-600 overflow-hidden">
              <div className="p-2.5">
                <div className="grid grid-cols-3 gap-1">
                  {createdMnemonic.split(' ').map((word, index) => (
                    <div 
                      key={index} 
                      className={`bg-zinc-700 px-2 py-2 rounded-md ${!showMnemonic ? 'blur-sm' : ''}`}
                    >
                      <div className="text-zinc-400 text-xs font-medium mb-0.5">
                        {index + 1}.
                      </div>
                      <div className="text-white text-xs font-mono">
                        {word}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Center Overlay Button */}
              {!showMnemonic && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <button
                    onClick={() => setShowMnemonic(true)}
                    className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors border border-zinc-500"
                  >
                    <Eye size={18} />
                    <span className="text-sm">Reveal Seed Phrase</span>
                  </button>
                </div>
              )}
              
              {/* Hide button when visible */}
              {showMnemonic && (
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => setShowMnemonic(false)}
                    className="p-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-white rounded transition-colors"
                    title="Hide phrase"
                  >
                    <EyeOff size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Compact Important Message */}
          <div className="mb-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-400 text-xs text-center">
              <strong>Important:</strong> Write down your recovery phrase and store it safely. You'll need it to restore your wallet if you forget your password.
            </p>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="mt-auto">
          <button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-cyan-400 to-purple-600 text-white py-3 px-6 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            Set Password
          </button>
        </div>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-full">
        <div className="text-center mb-8">
          <Wallet className="mx-auto mb-4 text-cyan-400" size={64} />
          <h2 className="text-2xl mb-2 text-white">Setup Your Wallet</h2>
          <p className="text-zinc-400 text-sm">
            Create a new wallet or restore an existing one using your mnemonic phrase.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => setMode('create')}
            className="w-full bg-gradient-to-r from-cyan-400 to-purple-600 text-white py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
          >
            Create New Wallet
          </button>
          <button
            onClick={() => setMode('restore')}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-6 rounded-lg transition-colors"
          >
            Restore Existing Wallet
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-full">
        <div className="text-center mb-8">
          <Wallet2Icon className="mx-auto mb-4 text-cyan-400" size={64} />
          <h2 className="text-2xl mb-2 text-white">Create New Wallet</h2>
          <p className="text-zinc-400 text-sm">
            This will generate a new mnemonic phrase for your wallet.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={handleCreateWallet}
            disabled={isCreating}
            className="w-full bg-gradient-to-r from-cyan-400 to-purple-600 text-white py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Generate Wallet'}
          </button>
          <button
            onClick={() => setMode('')}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-6 rounded-lg transition-colors"
          >
            Back
          </button>
        </div>

        {error && <p className="text-red-500 text-center mt-4 text-sm">{error}</p>}
      </div>
    );
  }

  if (mode === 'restore') {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-full">
        <div className="text-center mb-6">
          <Key className="mx-auto mb-4 text-cyan-400" size={48} />
          <h2 className="text-2xl mb-2 text-white">Restore Wallet</h2>
          <p className="text-zinc-400 text-sm">
            Enter your 12-word mnemonic phrase to restore your wallet.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <textarea
            value={restoreMnemonic}
            onChange={(e) => setRestoreMnemonic(e.target.value)}
            placeholder="Enter your 12-word mnemonic phrase..."
            className="w-full bg-zinc-700 border border-zinc-600 text-white p-3 rounded-lg resize-none h-24 text-sm placeholder-zinc-400"
            rows={3}
          />
          <button
            onClick={handleRestoreWallet}
            disabled={isCreating || !restoreMnemonic.trim()}
            className="w-full bg-gradient-to-r from-cyan-400 to-purple-600 text-white py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isCreating ? 'Restoring...' : 'Restore Wallet'}
          </button>
          <button
            onClick={() => setMode('')}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-6 rounded-lg transition-colors"
          >
            Back
          </button>
        </div>

        {error && <p className="text-red-500 text-center mt-4 text-sm">{error}</p>}
      </div>
    );
  }
}

export default WalletSetup;
