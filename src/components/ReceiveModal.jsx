import { X, Copy, Check, QrCode, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useWalletStore } from '../store';
import QRCodeWithIcon from './QRCodeWithIcon';
import { copyToClipboard } from '../util';
import toast from 'react-hot-toast';

function ReceiveModal({ isOpen, onClose }) {
  const { walletAddress, selectedNetwork } = useWalletStore();
  const [justCopied, setJustCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyAddress = async () => {
    const result = await copyToClipboard(walletAddress, 'Wallet address');
    if (result.success) {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
      toast.success('Address copied! 📋', {
        style: {
          background: '#18181b',
          color: '#fafafa',
          border: '1px solid #27272a'
        }
      });
    } else {
      toast.error(result.message);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl w-full max-w-[360px] max-h-[90%] overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <QrCode size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Receive {selectedNetwork.symbol}</h2>
              <p className="text-zinc-400 text-xs">{selectedNetwork.name} Network</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* QR Code Section */}
          <div className="text-center">
            <div className="inline-flex p-3 bg-white rounded-xl mb-3 shadow-lg">
              <QRCodeWithIcon 
                data={walletAddress}
                size={160}
                iconSize={32}
                className="rounded-lg"
              />
            </div>
            <p className="text-zinc-400 text-xs">
              Scan this QR code to receive {selectedNetwork.symbol} tokens
            </p>
          </div>

          {/* Address Section */}
          <div className="space-y-2">
            <label className="block text-zinc-300 font-medium text-sm">
              Your Wallet Address
            </label>
            
            <div className="bg-zinc-800/60 border border-zinc-600/30 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-mono text-xs break-all leading-relaxed">
                    {walletAddress}
                  </p>
                </div>
                
                <button
                  onClick={handleCopyAddress}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-zinc-700/50 text-zinc-400 hover:text-emerald-400 transition-all duration-200"
                  title="Copy address"
                >
                  {justCopied ? (
                    <Check size={16} className="text-emerald-400" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
              <p className="text-yellow-300 text-xs">
                Do not send any tokens which are not Solana-based or Gorbchain-based
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceiveModal; 