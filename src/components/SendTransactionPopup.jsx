import { ArrowLeft, Loader, Check, Loader2 } from 'lucide-react';
import { useTransactionStore, useWalletStore } from '../store';

function SendTransactionPopup({ isOpen, onClose, amount }) {
    const { isLoadingSend, txResult } = useTransactionStore();
    const { selectedNetwork } = useWalletStore();
    if (!isOpen) return null;

    const isComplete = txResult && !isLoadingSend;
    const isLoading = isLoadingSend;

    return (
        <div className="absolute inset-0 bg-neutral-800 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-700">
                <button
                    onClick={onClose}
                    className="text-zinc-400 hover:text-white transition-colors p-1"
                    disabled={isLoading}
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-white font-semibold">Sending Token</h2>
                <div className="w-8"></div> {/* Spacer for centering */}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                {/* Amount Display */}
                <div className="flex items-center gap-2 mb-8">
                    <img
                        src={selectedNetwork.icon}
                        alt={selectedNetwork.name}
                        className="w-8 h-8 object-cover"
                    />
                    <span className="text-2xl font-bold text-white">{amount}</span>
                    <span className="text-2xl font-bold text-zinc-400">{selectedNetwork.symbol}</span>
                </div>

                {/* Status Circle */}
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${isComplete
                    ? 'bg-green-600/20 border-2 border-green-700'
                    : 'bg-zinc-700/50 border-2 border-zinc-600'
                    }`}>
                    {isLoading ? (
                        <Loader2 size={48} className="text-green-500 animate-spin" />
                    ) : isComplete ? (
                        <Check size={48} className="text-green-400" />
                    ) : (
                        <div className="w-8 h-8 border-2 border-zinc-500 rounded-full"></div>
                    )}
                </div>

                {/* Status Text */}
                <div className="text-center">
                    {isLoading ? (
                        <p className="text-zinc-300 text-lg">Processing transaction...</p>
                    ) : isComplete ? (
                        <>
                            <p className="text-white text-lg font-semibold mb-2">Transaction Successful!</p>
                            <button
                                onClick={() => {
                                    if (txResult) {
                                        window.open(selectedNetwork.explorerUrl(txResult), '_blank');
                                    }
                                }}
                                className="text-blue-400 text-sm hover:underline"
                            >
                                View Explorer
                            </button>
                        </>
                    ) : null}
                </div>
            </div>

            {/* Footer Button */}
            {isComplete && (
                <div className="p-4">
                    <button
                        onClick={onClose}
                        className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition-colors"
                    >
                        Done
                    </button>
                </div>
            )}
        </div>
    );
}

export default SendTransactionPopup;
