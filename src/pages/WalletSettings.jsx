import { useState } from 'react';
import { Key, Download, Eye, EyeOff, Trash2, Copy, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore, useUIStore, useWalletStore } from '../store';
import BackBtn from '../components/BackBtn';
import { copyToClipboard } from '../util';

function WalletSettings({ requireUnlock }) {
  const { logout } = useAuthStore();
  const { setError, clearError } = useUIStore();
  const {
    exportMnemonic,
    clearWallet,
    mnemonic,
    hasWallet,
    walletAddress
  } = useWalletStore();

  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Don't show this page if there's no wallet
  if (!hasWallet) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex mb-6">
          <BackBtn />
          <h2 className="text-xl font-bold text-white mx-auto pr-7">Wallet Settings</h2>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-zinc-400 mb-2">No wallet found</div>
            <p className="text-sm text-zinc-500">Create or restore a wallet to access wallet settings</p>
          </div>
        </div>
      </div>
    );
  }

  const handleExportMnemonic = () => {
    try {
      clearError();

      // Check if wallet needs to be unlocked first
      if (requireUnlock && requireUnlock()) {
        // Unlock prompt is shown, user needs to unlock first
        return;
      }

      const mnemonic = exportMnemonic();
      setShowMnemonic(true);
      toast.success('Mnemonic phrase revealed');
    } catch (err) {
      setError(err.message);
    }
  };

  const copyMnemonic = () => {
    try {
      // Check if wallet needs to be unlocked first
      if (requireUnlock && requireUnlock()) {
        // Unlock prompt is shown, user needs to unlock first
        return;
      }

      const mnemonic = exportMnemonic();
      navigator.clipboard.writeText(mnemonic);
      toast.success('Mnemonic copied to clipboard!');
    } catch (err) {
      setError(err.message);
    }
  };

  const downloadMnemonic = () => {
    try {
      // Check if wallet needs to be unlocked first
      if (requireUnlock && requireUnlock()) {
        // Unlock prompt is shown, user needs to unlock first
        return;
      }

      const mnemonic = exportMnemonic();
      const element = document.createElement('a');
      const file = new Blob([mnemonic], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = 'trashpack-wallet-mnemonic.txt';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success('Mnemonic downloaded!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteWallet = async () => {
    try {
      clearWallet();
      await logout();
      toast.success('Wallet deleted successfully');
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCopyAddress = async () => {
    const result = await copyToClipboard(walletAddress, 'Wallet Address');
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 -mr-3">
      <div className="flex mb-6">
        <BackBtn />
        <h2 className="text-xl font-bold text-white mx-auto pr-7">Wallet Settings</h2>
      </div>

      <div className="space-y-4">
        {/* Backup Section */}
        <div className="bg-zinc-700 p-4 rounded-lg border border-zinc-600">
          <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
            <Key size={20} />
            Backup Wallet
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Export your mnemonic phrase to backup your wallet. Keep it safe and never share it.
          </p>

          {!showMnemonic ? (
            <button
              onClick={handleExportMnemonic}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm flex items-center gap-2"
            >
              <Eye size={16} />
              Show Mnemonic Phrase
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-zinc-800 p-3 rounded">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-zinc-400">Recovery Phrase</span>
                  <button
                    onClick={() => setShowMnemonic(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <EyeOff size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {mnemonic ? (
                    mnemonic.split(' ').map((word, index) => (
                      <span key={index} className="text-white bg-zinc-700 px-2 py-1 rounded text-xs">
                        {index + 1}. {word}
                      </span>
                    ))
                  ) : (
                    <div className="col-span-3 text-red-400 text-xs text-center">
                      Wallet must be unlocked to view mnemonic
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyMnemonic}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm flex items-center justify-center gap-2"
                >
                  <Key size={16} />
                  Copy
                </button>
                <button
                  onClick={downloadMnemonic}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Wallet Address Section */}
        <div className="bg-zinc-700 p-4 rounded-lg border border-zinc-600">
          <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
            <Wallet size={20} />
            Wallet Address
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Your unique wallet address. You can use this to receive funds.
          </p>
          <div className="bg-zinc-800 p-3 rounded flex items-center gap-2 overflow-hidden">
            <span className="text-sm text-zinc-400 flex-1 truncate min-w-0">{walletAddress}</span>
            <button
              onClick={handleCopyAddress}
              className="text-zinc-400 hover:text-white flex-shrink-0"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>

        {/* Security Information */}
        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-600/30">
          <h3 className="text-lg font-semibold mb-3 text-blue-400 flex items-center gap-2">
            <Key size={20} />
            Security Notice
          </h3>
          <div className="space-y-2 text-sm text-zinc-300">
            <p>• Your mnemonic phrase is the master key to your wallet</p>
            <p>• Store it securely offline and never share it with anyone</p>
            <p>• Anyone with access to your mnemonic can control your funds</p>
            <p>• Make sure to backup your mnemonic before deleting the wallet</p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-900/20 p-4 rounded-lg border border-red-600/30">
          <h3 className="text-lg font-semibold mb-3 text-red-400 flex items-center gap-2">
            <Trash2 size={20} />
            Danger Zone
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Permanently delete your wallet from this device. Make sure you have backed up your mnemonic phrase.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-sm"
            >
              Delete Wallet
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-400">
                Are you sure? This action cannot be undone. You will need your mnemonic phrase to restore your wallet.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteWallet}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-sm"
                >
                  Yes, Delete Wallet
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-zinc-600 hover:bg-zinc-700 text-white py-2 px-4 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WalletSettings; 