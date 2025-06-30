import { Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWalletStore, useUIStore } from '../store';
import { copyToClipboard } from '../util';

const truncateString = (str) => {
  if (str.length <= 8) return str;
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

function WalletAddressBox() {
  const { walletAddress } = useWalletStore();

  const handleCopy = async () => {
    const result = await copyToClipboard(walletAddress, 'Wallet address');
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <button className="bg-neutral-700 border border-zinc-600 rounded-md p-3" onClick={handleCopy}>
      <span className="block text-xs text-zinc-400 mb-2 uppercase tracking-wide w-fit">Wallet Address</span>
      <div className="flex items-center justify-between cursor-pointer font-mono text-sm text-white">
        <span>{truncateString(walletAddress)}</span>
        <div className="opacity-60 transition-opacity duration-200 hover:opacity-100">
          <Copy size={14} />
        </div>
      </div>
    </button>
  );
}

export default WalletAddressBox;
