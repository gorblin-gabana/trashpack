import { useState } from 'react';
import { Wallet, Key, Download, Eye, EyeOff, Copy, CopyIcon, Wallet2Icon } from 'lucide-react';
import { useWalletStore, useUIStore } from '../store';
import { toast } from 'react-hot-toast';
import PasswordSetup from './PasswordSetup';

function WalletSetup() {
  const [mode, setMode] = useState(''); // 'create' or 'restore'
  const [restoreMnemonic, setRestoreMnemonic] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createdMnemonic, setCreatedMnemonic] = useState('');
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [userPassword, setUserPassword] = useState('');
  const [seedPhraseExported, setSeedPhraseExported] = useState(false); // Track if seed phrase is exported

  const { generateWallet, restoreWallet, finalizeWalletSetup } = useWalletStore();
  const { error, setError, clearError } = useUIStore();

  const handleCreateWallet = async () => {
    try {
      setIsCreating(true);
      clearError();
      const result = await generateWallet();
      setCreatedMnemonic(result.mnemonic);
      toast.success('Wallet created successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
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
    // User can still continue with auto-generated password
    finalizeWalletWithPassword(null);
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

  if (createdMnemonic) {
    return (
      <div className="flex flex-col items-center h-full p-4">
        <div className="text-center mb-4">
          <Wallet className="mx-auto mb-3 text-green-500" size={40} />
          <h2 className="text-xl mb-2 text-white">Wallet Created!</h2>
          <p className="text-zinc-400 text-xs">
            Save your recovery phrase securely before setting up password
          </p>
        </div>

        <div className="w-full max-w-sm mb-4">
          <div className="bg-zinc-700 p-2 rounded-lg border border-zinc-600">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-zinc-400">Recovery Phrase</span>
              <div className="flex gap-1">
                <button
                  onClick={copyMnemonic}
                  className="p-1 text-zinc-400 hover:text-blue-400 hover:bg-zinc-600 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  <CopyIcon size={14} />
                </button>
                <button
                  onClick={downloadMnemonic}
                  className="p-1 text-zinc-400 hover:text-green-400 hover:bg-zinc-600 rounded transition-colors"
                  title="Download as file"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => setShowMnemonic(!showMnemonic)}
                  className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-600 rounded transition-colors"
                  title={showMnemonic ? "Hide phrase" : "Show phrase"}
                >
                  {showMnemonic ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="bg-zinc-800 p-2 rounded text-xs">
              {showMnemonic ? (
                <div className="grid grid-cols-3 gap-1">
                  {createdMnemonic.split(' ').map((word, index) => (
                    <span key={index} className="text-white bg-zinc-700 px-1.5 py-2 rounded text-xs">
                      {index + 1}. {word}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-zinc-500 py-2 text-center">Click the eye icon to reveal</div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 bg-blue-400/10 border border-blue-400/20 rounded-lg p-3 w-full max-w-sm">
          <p className="text-blue-400 text-xs text-center">
            <strong>Important:</strong> Write down your recovery phrase and store it safely.
            You'll need it to restore your wallet if you forget your password.
          </p>
        </div>

        {!seedPhraseExported && (
          <div className="mb-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2 w-full max-w-sm">
            <p className="text-red-500 text-xs text-center">
              <strong>Warning:</strong> Seed phrase not secured! Please export and back it up safely.
            </p>
          </div>
        )}

        <button
          onClick={handleContinue}
          className="w-full max-w-sm bg-gradient-to-r from-cyan-400 to-purple-600 text-white py-2.5 px-6 rounded-lg hover:opacity-90 transition-opacity text-sm"
        >
          Continue & Set Password
        </button>
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
