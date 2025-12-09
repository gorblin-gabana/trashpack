import { X } from 'lucide-react';
import { useUIStore } from '../store';

function HelpModal() {
  const { isHelpModalOpen, setHelpModalOpen } = useUIStore();

  if (!isHelpModalOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 overflow-y-auto" onClick={() => setHelpModalOpen(false)}>
      <div className="bg-neutral-800 text-white border border-zinc-600 max-w-[360px] mx-3 my-3 rounded-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
                      <h2 className="text-lg font-bold">About TrashPack</h2>
          <button
            className="bg-zinc-600 border border-zinc-500 text-zinc-300 cursor-pointer p-1 rounded-md flex items-center justify-center transition-all duration-200 hover:bg-zinc-500 hover:text-white"
            onClick={() => setHelpModalOpen(false)}
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-zinc-300">Your secure Solana wallet extension with mnemonic phrase backup and restore functionality.</p>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-1">Wallet Address</h3>
            <p className="text-sm text-zinc-300">Your wallet address is generated from your mnemonic phrase using standard Solana derivation paths. It will always be the same for your specific mnemonic.</p>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-1">Mnemonic Phrase</h3>
            <p className="text-sm text-zinc-300">Your 12-word mnemonic phrase is the master key to your wallet. Store it securely and never share it with anyone.</p>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-1">Security</h3>
            <p className="text-sm text-zinc-300">Your private keys are stored locally in your browser. Always backup your mnemonic phrase before using the wallet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelpModal;
