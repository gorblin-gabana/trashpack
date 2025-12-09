import { useState } from 'react';
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

function PasswordSetup({ onPasswordSet, onCancel }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (pwd) => {
    const requirements = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };

    return requirements;
  };

  const getPasswordStrength = (pwd) => {
    const requirements = validatePassword(pwd);
    const score = Object.values(requirements).filter(Boolean).length;

    if (score === 0) return { strength: 'none', color: 'gray', text: '' };
    if (score <= 2) return { strength: 'weak', color: 'red', text: 'Weak' };
    if (score <= 3) return { strength: 'medium', color: 'yellow', text: 'Medium' };
    if (score <= 4) return { strength: 'good', color: 'blue', text: 'Good' };
    return { strength: 'strong', color: 'green', text: 'Strong' };
  };

  const handleSubmit = (e) => {
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

    const requirements = validatePassword(password);
    const score = Object.values(requirements).filter(Boolean).length;

    if (score < 3) {
      setError('Password is too weak. Please include uppercase, lowercase, numbers, and special characters.');
      return;
    }

    onPasswordSet(password);
  };

  const requirements = validatePassword(password);
  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-zinc-800 rounded-lg p-4 w-full max-w-[360px] mx-3 my-3 border border-zinc-700">
        <div className="text-center mb-4">
          <Shield className="mx-auto mb-2 text-blue-400" size={32} />
          <h2 className="text-lg font-semibold text-white mb-1">Secure Your Wallet</h2>
          <p className="text-zinc-400 text-xs">
            Set a strong password to encrypt your wallet data
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                placeholder="Enter a strong password"
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

            {/* Password strength indicator */}
            {password && (
              <div className="mt-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400">Password Strength</span>
                  <span className={`text-xs font-medium text-${passwordStrength.color}-400`}>
                    {passwordStrength.text}
                  </span>
                </div>
                <div className="w-full bg-zinc-600 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full bg-${passwordStrength.color}-400 transition-all duration-300`}
                    style={{ width: `${(Object.values(requirements).filter(Boolean).length / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
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
            />
          </div>

          {/* Password requirements */}
          {password && (
            <div className="bg-zinc-700/50 rounded-lg p-2">
              <div className="text-xs text-zinc-400 mb-1">Password Requirements:</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {[
                  { key: 'length', text: '8+ characters' },
                  { key: 'uppercase', text: 'Uppercase' },
                  { key: 'lowercase', text: 'Lowercase' },
                  { key: 'number', text: 'Number' },
                  { key: 'special', text: 'Special char' }
                ].map(({ key, text }) => (
                  <div key={key} className="flex items-center gap-1">
                    {requirements[key] ? (
                      <CheckCircle size={10} className="text-green-400 flex-shrink-0" />
                    ) : (
                      <div className="w-2.5 h-2.5 border border-zinc-500 rounded-full flex-shrink-0"></div>
                    )}
                    <span className={`text-xs ${requirements[key] ? 'text-green-400' : 'text-zinc-400'}`}>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 p-2 rounded-lg">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-2">
            <p className="text-blue-400 text-xs">
              <strong>Important:</strong> This password encrypts your wallet data locally.
              If you forget it, you'll need your mnemonic phrase to restore access.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 px-3 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password || !confirmPassword || password !== confirmPassword || passwordStrength.strength === 'weak'}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-3 rounded-lg transition-colors text-sm"
            >
              Set Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PasswordSetup;
