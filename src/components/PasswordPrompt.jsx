import { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useWalletStore } from '../store';
import { toast } from 'react-hot-toast';

function PasswordPrompt({ onUnlock, onCancel }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { unlockWallet } = useWalletStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await unlockWallet(password);
      toast.success('Wallet unlocked successfully!');
      onUnlock();
    } catch (err) {
      setError(err.message);
      console.error('Unlock error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    onCancel();
  };

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 w-full max-w-md mx-auto">
      <div className="text-center mb-4">
        <Lock className="mx-auto mb-2 text-blue-400" size={32} />
        <h2 className="text-lg font-semibold text-white mb-1">Unlock Wallet</h2>
        <p className="text-zinc-400 text-sm">
          Enter your password to access your wallet
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              placeholder="Enter your password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-2 rounded-lg">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 px-3 rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-3 rounded-lg transition-colors text-sm"
          >
            {isLoading ? 'Unlocking...' : 'Unlock'}
          </button>
        </div>
      </form>

      <div className="mt-3 text-xs text-zinc-500 text-center">
        This password encrypts your wallet data locally and is never sent anywhere.
      </div>
    </div>
  );
}

export default PasswordPrompt;
