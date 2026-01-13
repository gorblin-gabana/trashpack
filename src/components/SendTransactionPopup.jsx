import { ArrowLeft, Loader, Check, Loader2, QrCode, ExternalLink, CheckCircle, Copy, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useTransactionStore, useWalletStore } from '../store';
import QRCodeWithIcon from './QRCodeWithIcon';
import toast from 'react-hot-toast';

function SendTransactionPopup({ isOpen, onClose, amount, token }) {
    const { isLoadingSend, txResult } = useTransactionStore();
    const { selectedNetwork } = useWalletStore();
    const [showQR, setShowQR] = useState(false);
    const [copiedTxHash, setCopiedTxHash] = useState(false);
    
    if (!isOpen) return null;

    const isComplete = txResult && !isLoadingSend;
    const isLoading = isLoadingSend;

    const explorerUrl = txResult ? selectedNetwork.explorerUrl(txResult) : '';
    
    // Get token display info
    const tokenSymbol = token ? token.symbol : selectedNetwork.symbol;
    const tokenIcon = token ? token.icon : selectedNetwork.icon;
    const tokenName = token ? token.name : selectedNetwork.name;

    const copyTxHash = async () => {
        if (txResult) {
            try {
                await navigator.clipboard.writeText(txResult);
                setCopiedTxHash(true);
                setTimeout(() => setCopiedTxHash(false), 2000);
                toast.success('Transaction ID copied!');
            } catch (error) {
                toast.error('Failed to copy');
            }
        }
    };

    const shareTransaction = async () => {
        if (navigator.share && explorerUrl) {
            try {
                await navigator.share({
                    title: 'Transaction Details',
                    text: `Check out this transaction: ${txResult}`,
                    url: explorerUrl,
                });
            } catch (error) {
                // Fallback to clipboard
                copyTxHash();
            }
        } else {
            copyTxHash();
        }
    };

    return (
        <div className="absolute inset-0 bg-neutral-900/95 backdrop-blur-sm z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
                <button
                    onClick={onClose}
                    className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800/50"
                    disabled={isLoading}
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-white font-semibold text-lg">
                    {isComplete ? 'Transaction Complete' : 'Sending Transaction'}
                </h2>
                <div className="w-10"></div> {/* Spacer for centering */}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                {/* Loading State */}
                {isLoading && (
                    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto text-center px-4">
                        {/* Animated Loading Circle */}
                        <div className="relative flex justify-center">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center border border-teal-500/30">
                                <Loader2 size={32} className="animate-spin text-teal-400" />
                            </div>
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-500/10 to-blue-500/10 animate-pulse"></div>
                        </div>

                        {/* Amount Display */}
                        <div className="flex items-center justify-center gap-3 mb-4">
                            {tokenIcon ? (
                                <img
                                    src={tokenIcon}
                                    alt={tokenName}
                                    className="w-8 h-8 object-cover rounded-full flex-shrink-0"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div 
                                className="w-8 h-8 bg-zinc-600 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                                style={{ display: tokenIcon ? 'none' : 'flex' }}
                            >
                                {tokenSymbol?.charAt(0) || '?'}
                            </div>
                            <span className="text-2xl font-bold text-white">{amount}</span>
                            <span className="text-2xl font-bold text-zinc-400">{tokenSymbol}</span>
                        </div>

                        <div className="space-y-2 text-center">
                            <p className="text-white text-lg font-medium">Processing transaction...</p>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                Please wait while your {token ? 'token' : 'transaction'} is being processed on the {selectedNetwork.name} network.
                            </p>
                        </div>

                        {/* Progress Dots */}
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                    </div>
                )}

                {/* Success State */}
                {isComplete && (
                    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto text-center px-4">
                        {/* Success Animation */}
                        <div className="relative flex justify-center">
                            {showQR ? (
                                <div className="bg-white rounded-2xl p-4 shadow-2xl">
                                    <QRCodeWithIcon 
                                        data={explorerUrl}
                                        size={160}
                                        iconSize={32}
                                        className="rounded-lg"
                                    />
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center border border-emerald-500/30 animate-in fade-in zoom-in duration-500">
                                    <CheckCircle size={40} className="text-emerald-400" />
                                </div>
                            )}
                            
                            {/* Toggle QR Button */}
                            <button
                                onClick={() => setShowQR(!showQR)}
                                className="absolute -bottom-2 -right-2 w-8 h-8 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                                title={showQR ? 'Hide QR Code' : 'Show QR Code'}
                            >
                                <QrCode size={16} className="text-zinc-400" />
                            </button>
                        </div>

                        {/* Success Message */}
                        <div className="space-y-3 w-full">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                {tokenIcon ? (
                                    <img
                                        src={tokenIcon}
                                        alt={tokenName}
                                        className="w-8 h-8 object-cover rounded-full flex-shrink-0"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div 
                                    className="w-8 h-8 bg-zinc-600 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                                    style={{ display: tokenIcon ? 'none' : 'flex' }}
                                >
                                    {tokenSymbol?.charAt(0) || '?'}
                                </div>
                                <span className="text-2xl font-bold text-white">{amount}</span>
                                <span className="text-2xl font-bold text-zinc-400">{tokenSymbol}</span>
                            </div>
                            
                            <div className="space-y-2 text-center">
                                <p className="text-white text-lg font-semibold">Transaction Successful!</p>
                                <p className="text-zinc-400 text-sm">
                                    Your {token ? `${tokenSymbol} token` : 'transaction'} has been confirmed on the {selectedNetwork.name} network.
                                </p>
                            </div>
                        </div>

                        {/* Transaction Details Card */}
                        {txResult && (
                            <div className="w-full bg-zinc-800/50 rounded-2xl p-4 border border-zinc-700/50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-400">Transaction ID</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={copyTxHash}
                                            className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-400 hover:text-white transition-colors"
                                            title="Copy Transaction ID"
                                        >
                                            {copiedTxHash ? (
                                                <Check size={14} className="text-emerald-400" />
                                            ) : (
                                                <Copy size={14} />
                                            )}
                                        </button>
                                        <button
                                            onClick={shareTransaction}
                                            className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-400 hover:text-white transition-colors"
                                            title="Share Transaction"
                                        >
                                            <Share2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-white font-mono break-all bg-zinc-900/50 p-3 rounded-lg">
                                    {txResult}
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="w-full space-y-3">
                            {explorerUrl && (
                                <button
                                    onClick={() => window.open(explorerUrl, '_blank')}
                                    className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02]"
                                >
                                    <ExternalLink size={18} />
                                    View on Explorer
                                </button>
                            )}
                            
                            <button
                                onClick={onClose}
                                className="w-full bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200"
                            >
                                Done
                            </button>
                        </div>

                        {showQR && (
                            <p className="text-xs text-zinc-500 text-center mt-2">
                                Scan QR code to view transaction details
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SendTransactionPopup;
