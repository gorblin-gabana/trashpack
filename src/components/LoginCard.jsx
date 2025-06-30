import { useAuthStore, useUIStore } from '../store';

function LoginCard() {
  const { login, isLoading } = useAuthStore();
  const { error, setError, clearError } = useUIStore();

  const handleLogin = async () => {
    try {
      clearError();
      await login();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 h-full">
      <header className="text-center mb-16 flex flex-col items-center gap-3">
        <div className="flex flex-row items-center justify-center gap-2">
                  <img src="/icons/trashpack.png" alt="TrashPack Logo" className="h-9 m-0" />
        <h1 className="text-3xl leading-none mt-0 mb-0 text-white">TrashPack <span className="text-sm leading-none text-zinc-400">v1.0</span></h1>
        </div>
        <p className="text-xs text-zinc-400">Your Solana Wallet Extension.</p>
      </header>
                <h2 className="text-2xl mb-2">Welcome to TrashPack</h2>
      <p className="text-zinc-400 mb-8 text-sm">Create or restore your Solana wallet to get started.</p>
      <button
        className="bg-gradient-to-r from-cyan-400 to-purple-600 text-white border-none py-3 px-6 text-sm rounded-md cursor-pointer transition-all duration-200 w-full hover:opacity-90 hover:shadow-lg"
        onClick={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? 'Initializing...' : 'Get Started'}
      </button>
      {error && <p className="text-red-500 text-center mt-4 text-sm">{error}</p>}
    </div>
  );
}

export default LoginCard;
