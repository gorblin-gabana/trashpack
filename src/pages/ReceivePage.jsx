import { Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWalletStore, useUIStore } from '../store';
import BackBtn from '../components/BackBtn';
import QRCodeWithIcon from '../components/QRCodeWithIcon';
import { copyToClipboard } from '../util';

function ReceivePage() {
  const { walletAddress, selectedNetwork } = useWalletStore();

  const handleCopy = async () => {
    const result = await copyToClipboard(walletAddress, 'Wallet address');
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <>
      <div className="flex mb-2">
        <BackBtn />
        <h2 className="text-xl font-bold text-white mx-auto pr-7">Receive {selectedNetwork.symbol}</h2>
      </div>

      <div className="bg-neutral-700 border border-zinc-600 rounded-lg p-6 text-center">
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <QRCodeWithIcon 
              data={walletAddress}
              size={180}
              iconSize={36}
              className="bg-white p-2 rounded-lg"
            />
          </div>
          <p className="text-xs text-zinc-400 mb-2">
            Scan QR code to receive {selectedNetwork.symbol}
          </p>
          <p className="text-xs text-zinc-500">
            {selectedNetwork.name} Network
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wide">Your Wallet Address</label>
          <div className="bg-neutral-800 border border-zinc-600 rounded-md p-3 break-all font-mono text-sm text-white">
            {walletAddress}
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="w-full bg-gradient-to-r from-cyan-400 to-purple-600 text-white border-none py-3 px-6 text-sm font-semibold rounded-md cursor-pointer transition-all duration-200 hover:opacity-90 hover:shadow-lg flex items-center justify-center gap-2"
        >
          <Copy size={16} />
          Copy Address
        </button>
      </div>

      <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-xs text-yellow-400">
          ⚠️ Only send {selectedNetwork.symbol} tokens to this address on the {selectedNetwork.name} network. 
          Sending other tokens or using wrong network may result in loss of funds.
        </p>
      </div>
    </>
  );
}

export default ReceivePage;
