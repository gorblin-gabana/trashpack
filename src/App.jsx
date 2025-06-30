import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { address, createSolanaRpc, devnet } from '@solana/kit';

// Store imports
import { useAuthStore, useWalletStore, useTransactionStore, useUIStore } from './store';

// Components and Pages
import HelpModal from './components/HelpModal';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SendPage from './pages/SendPage';
import ReceivePage from './pages/ReceivePage';
import BridgePage from './pages/BridgePage';
import SettingsPage from './pages/SettingsPage';
import ConnectionRequestPage from './pages/ConnectionRequestPage';
import TestConnectionPage from './pages/TestConnectionPage';
import AuthHandler from './components/AuthHandler';
import DebugInfo from './components/DebugInfo';
import MigrationPrompt from './components/MigrationPrompt';
import PasswordPrompt from './components/PasswordPrompt';

// Utilities
import migrationService from './util/migration';

// Enable console logging for debugging authentication issues
const isDevelopment = process.env.NODE_ENV === 'development';
const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

if (!isDevelopment) {
  console.log = () => { };
  console.error = () => { };
  console.warn = () => { };
}

function App() {
  // Check if this is a connection request popup
  const urlParams = new URLSearchParams(window.location.search);
  const isConnectionRequest = urlParams.get('page') === 'connection-request';

  // Migration and security state
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [migrationChecked, setMigrationChecked] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  const {
    isAuthenticated,
    initAuth,
    logout
  } = useAuthStore();

  console.log('🔗 App init - Connection request detected:', isConnectionRequest, window.location.href);

  const {
    generateWallet,
    loadStoredWallet,
    unlockWallet,
    fetchBalance,
    clearWallet,
    hasWallet,
    mnemonic
  } = useWalletStore();

  const { clearTransactionResult } = useTransactionStore();
  const { error, setError, clearError } = useUIStore();

  // Initialize authentication on app load
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Check for migration needs when authenticated
  useEffect(() => {
    if (isAuthenticated && !migrationChecked) {
      checkForMigration();
    }
  }, [isAuthenticated, migrationChecked]);

  // Initialize wallet when authenticated and migration is done
  useEffect(() => {
    if (isAuthenticated && migrationChecked && !showMigrationPrompt) {
      const initWallet = async () => {
        try {
          clearError();
          const storedWallet = await loadStoredWallet();

          if (storedWallet && !mnemonic) {
            // Wallet exists but is locked, show unlock prompt for sensitive operations
            setNeedsUnlock(true);
          }

          if (!storedWallet) {
            console.log('No stored wallet found');
          }
        } catch (err) {
          setError(err.message);
        }
      };

      initWallet();
    }
  }, [isAuthenticated, migrationChecked, showMigrationPrompt, loadStoredWallet, clearError, setError, mnemonic]);

  const checkForMigration = async () => {
    try {
      const legacyCheck = await migrationService.checkForLegacyData();
      if (legacyCheck.hasLegacyData) {
        setShowMigrationPrompt(true);
      } else {
        setMigrationChecked(true);
      }
    } catch (error) {
      console.error('Error checking for legacy data:', error);
      setMigrationChecked(true);
    }
  };

  const handleMigrationComplete = async (walletAddress, password) => {
    try {
      setShowMigrationPrompt(false);
      setMigrationChecked(true);

      // Unlock the wallet with the password used for migration
      await unlockWallet(password);

      toast.success('Wallet migration completed successfully!');
    } catch (error) {
      console.error('Error completing migration:', error);
      setError('Migration completed but failed to unlock wallet');
    }
  };

  const handleMigrationSkip = () => {
    setShowMigrationPrompt(false);
    setMigrationChecked(true);
    toast.info('Migration skipped. Your wallet data remains in less secure storage.');
  };

  const handleUnlockWallet = () => {
    setShowPasswordPrompt(false);
    setNeedsUnlock(false);
    toast.success('Wallet unlocked successfully!');
  };

  const handleUnlockCancel = () => {
    setShowPasswordPrompt(false);
    // Redirect to home page if user cancels unlock
  };

  const handleLogout = async () => {
    try {
      await logout();
      await clearWallet();
      clearTransactionResult();
      clearError();
      setNeedsUnlock(false);
      setShowPasswordPrompt(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // Show unlock prompt when needed for sensitive operations
  const requireUnlock = () => {
    if (hasWallet && !mnemonic) {
      setShowPasswordPrompt(true);
      return true;
    }
    return false;
  };

  return (
    <Router>
      <AuthHandler>
        {/* <DebugInfo /> */}
        <div className="flex w-[400px] h-[600px] flex-col items-center justify-center relative">
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#2A2A2A',
                color: '#FFFFFF',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                fontSize: '0.875rem',
              },
              success: {
                iconTheme: {
                  primary: '#00DFD8',
                  secondary: '#FFFFFF',
                },
              },
              error: {
                iconTheme: {
                  primary: '#e53e3e',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />

          <HelpModal />

          {/* Migration Prompt */}
          {showMigrationPrompt && (
            <MigrationPrompt
              onMigrationComplete={handleMigrationComplete}
              onSkip={handleMigrationSkip}
            />
          )}

          {/* Password Prompt for unlocking wallet */}
          {showPasswordPrompt && (
            <PasswordPrompt
              onUnlock={handleUnlockWallet}
              onCancel={handleUnlockCancel}
            />
          )}

          <main className="bg-neutral-800 rounded-lg flex w-full h-full flex-grow flex-col overflow-hidden">
            <Routes>
              {/* Connection request page - standalone without layout */}
              <Route path="/connection-request" element={<ConnectionRequestPage />} />
              {/* Test connection approval - standalone without layout */}
              <Route path="/test-connection" element={<TestConnectionPage />} />

              <Route path="/" element={<Layout onLogout={handleLogout} requireUnlock={requireUnlock} />}>
                {isConnectionRequest ? (
                  <>
                    {/* If this is a connection request popup, redirect to connection-request page */}
                    <Route index element={<Navigate to={`/connection-request${window.location.search}`} replace />} />
                    <Route path="*" element={<Navigate to={`/connection-request${window.location.search}`} replace />} />
                  </>
                ) : !isAuthenticated ? (
                  <>
                    <Route index element={<LoginPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </>
                ) : (
                  <>
                    <Route index element={<HomePage />} />
                    <Route path="/send" element={<SendPage requireUnlock={requireUnlock} />} />
                    <Route path="/receive" element={<ReceivePage />} />
                    <Route path="/bridge" element={<BridgePage requireUnlock={requireUnlock} />} />
                    <Route path="/settings" element={<SettingsPage requireUnlock={requireUnlock} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </>
                )}
              </Route>
            </Routes>

            {error && <p className="text-red-500 text-center mt-4 text-sm">{error}</p>}
          </main>
        </div>
      </AuthHandler>
    </Router>
  );
}

export default App;
