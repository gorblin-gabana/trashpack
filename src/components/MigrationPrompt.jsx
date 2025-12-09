import { useState } from 'react';
import { Shield, AlertTriangle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import migrationService from '../util/migration';

function MigrationPrompt({ onMigrationComplete, onSkip }) {
  const [step, setStep] = useState(1); // 1: Intro, 2: Set Password, 3: Migrating
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartMigration = () => {
    setStep(2);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setStep(3);
    setIsLoading(true);

    try {
      const result = await migrationService.migrateLegacyData(password);

      if (result.success) {
        toast.success('Migration completed successfully!');
        onMigrationComplete(result.walletAddress, password);
      } else {
        setError(result.reason || 'Migration failed');
        setStep(2);
      }
    } catch (err) {
      setError('Migration failed: ' + err.message);
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipMigration = () => {
    // Show warning before skipping
    if (window.confirm('Are you sure you want to skip migration? Your existing wallet data will remain in less secure storage.')) {
      onSkip();
    }
  };

  if (step === 1) {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto">
        <div className="bg-zinc-800 rounded-lg p-4 w-full max-w-[360px] mx-3 my-3 border border-zinc-700">
          <div className="text-center mb-4">
            <Shield className="mx-auto mb-2 text-yellow-400" size={36} />
            <h2 className="text-lg font-semibold text-white mb-1">Security Upgrade Available</h2>
          </div>

          <div className="space-y-3 mb-4">
            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-yellow-400 mt-0.5 flex-shrink-0" size={16} />
                <div>
                  <h3 className="text-yellow-400 font-medium text-sm mb-1">Important Security Notice</h3>
                  <p className="text-zinc-300 text-xs">
                    We've detected wallet data stored in less secure storage. We recommend migrating to our new secure storage system.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-medium text-sm">Benefits of upgrading:</h4>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Shield size={12} className="text-green-400 flex-shrink-0" />
                  Enhanced encryption using Web Crypto API
                </li>
                <li className="flex items-center gap-2">
                  <Shield size={12} className="text-green-400 flex-shrink-0" />
                  Isolated Chrome extension storage
                </li>
                <li className="flex items-center gap-2">
                  <Shield size={12} className="text-green-400 flex-shrink-0" />
                  Password-protected wallet access
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSkipMigration}
              className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 px-3 rounded-lg transition-colors text-sm"
            >
              Skip for Now
            </button>
            <button
              onClick={handleStartMigration}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
            >
              Upgrade Now
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto">
        <div className="bg-zinc-800 rounded-lg p-4 w-full max-w-[360px] mx-3 my-3 border border-zinc-700">
          <div className="text-center mb-4">
            <Shield className="mx-auto mb-2 text-blue-400" size={32} />
            <h2 className="text-lg font-semibold text-white mb-1">Set Security Password</h2>
            <p className="text-zinc-400 text-xs">
              Choose a strong password to encrypt your wallet data
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Enter a strong password"
                  minLength={8}
                  required
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

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm your password"
                minLength={8}
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-400/10 p-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-2">
              <p className="text-blue-400 text-xs">
                <strong>Important:</strong> This password encrypts your wallet data locally.
                Make sure to remember it as it cannot be recovered.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 px-3 rounded-lg transition-colors text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!password || !confirmPassword || password !== confirmPassword}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-3 rounded-lg transition-colors text-sm"
              >
                Migrate Wallet
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-zinc-800 rounded-lg p-4 w-full max-w-[360px] mx-3 border border-zinc-700">
          <div className="text-center">
            <div className="animate-spin mx-auto mb-3">
              <Shield className="text-blue-400" size={32} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Migrating Wallet Data</h2>
            <p className="text-zinc-400 text-xs mb-3">
              Please wait while we securely migrate your wallet data...
            </p>
            <div className="bg-zinc-700 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-400 h-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default MigrationPrompt;
