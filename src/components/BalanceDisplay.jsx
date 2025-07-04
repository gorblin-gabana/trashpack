import { RotateCcw } from 'lucide-react';
import { useWalletStore } from '../store';
import { useEffect, useRef } from 'react';

function BalanceDisplay() {
  const { balance, isLoadingBalance, fetchBalance, selectedNetwork, selectedEnvironment } = useWalletStore();
  const intervalRef = useRef(null);

  useEffect(() => {
    clearInterval(intervalRef.current);
    
    const safeFetchBalance = async () => {
      try {
        await fetchBalance();
      } catch (err) {
        console.error('Balance fetch error in useEffect:', err);
      }
    };
    
    safeFetchBalance();
    intervalRef.current = setInterval(safeFetchBalance, 10000);
    return () => clearInterval(intervalRef.current);
  }, [selectedNetwork, selectedEnvironment, fetchBalance]);

  const handleRefresh = async () => {
    try {
      await fetchBalance();
    } catch (err) {
      console.error('Balance refresh error:', err);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 py-2 my-4">
      <div className="flex flex-col">
        <div className="flex items-baseline gap-2">
          <h2 className="text-4xl font-bold m-0 text-white">
            {(balance ? Number(balance).toFixed(4) : '0.0000')}
          </h2>
          <span className="text-sm translate-y-[-0.08rem] text-zinc-400 font-medium">{selectedNetwork.symbol}</span>
        </div>
      </div>
      <button
        onClick={handleRefresh}
        disabled={isLoadingBalance}
        className={`${isLoadingBalance ? "animate-spin-reverse" : ""} text-zinc-400 p-2 rounded-full cursor-pointer flex items-center justify-center transition-all duration-200 hover:bg-zinc-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}

export default BalanceDisplay;
