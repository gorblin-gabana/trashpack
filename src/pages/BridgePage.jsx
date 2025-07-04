import { useState, useEffect } from 'react';
import { ArrowRightLeft, Loader, CheckCircle, Clock, AlertCircle, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import bridgeService from '../lib/bridgeService';
import { useWalletStore } from '../store/walletStore';
import BackBtn from '../components/BackBtn';
import { truncateAddress } from '../util';

function BridgePage({ requireUnlock }) {
    const navigate = useNavigate();
    const { getKeypair, balance, hasWallet, walletAddress } = useWalletStore();

    const [currentStep, setCurrentStep] = useState('form'); // form, confirmation, processing, success, error
    const [bridgeData, setBridgeData] = useState({
        amount: '',
        destinationAddress: walletAddress || '',
        fees: null,
        result: null,
        progress: null
    });
    const [loading, setLoading] = useState(false);
    const [bridgeStatus, setBridgeStatus] = useState(null);

    useEffect(() => {
        loadBridgeStatus();
    }, []);

    // Update destination address when wallet address changes
    useEffect(() => {
        if (walletAddress && !bridgeData.destinationAddress) {
            setBridgeData(prev => ({ ...prev, destinationAddress: walletAddress }));
        }
    }, [walletAddress]);

    const loadBridgeStatus = async () => {
        try {
            const status = await bridgeService.getBridgeStatus();
            setBridgeStatus(status);
        } catch (error) {
            console.error('Failed to load bridge status:', error);
        }
    };



    const handleAmountChange = async (value) => {
        setBridgeData(prev => ({ ...prev, amount: value }));

        if (value && !isNaN(parseFloat(value))) {
            try {
                const fees = await bridgeService.estimateBridgeFee(parseFloat(value));
                setBridgeData(prev => ({ ...prev, fees }));
            } catch (error) {
                console.error('Failed to estimate fees:', error);
            }
        } else {
            setBridgeData(prev => ({ ...prev, fees: null }));
        }
    };

    const handleMaxAmount = () => {
        if (balance) {
            // Estimate fees for bridge transaction
            const estimatedFee = 0.01; // 0.01 SOL for transaction + bridge fees
            const maxAmount = Math.max(0, balance - estimatedFee);
            setBridgeData(prev => ({ ...prev, amount: maxAmount.toFixed(9) }));
            // Trigger fee estimation for max amount
            handleAmountChange(maxAmount.toFixed(9));
        }
    };

    const clearDestinationAddress = () => {
        setBridgeData(prev => ({ ...prev, destinationAddress: '' }));
    };

    const handleConfirmBridge = async () => {
        console.log("hasWallet", hasWallet);

        if (!hasWallet) {
            toast.error('Please connect your wallet first');
            return;
        }

        // Check if wallet needs to be unlocked first
        if (requireUnlock && requireUnlock()) {
            // Unlock prompt is shown, user needs to unlock first
            return;
        }

        if (!bridgeData.amount || !bridgeData.destinationAddress) {
            toast.error('Please fill all required fields');
            return;
        }

        const amount = parseFloat(bridgeData.amount);
        if (amount <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }

        if (bridgeData.fees && amount + bridgeData.fees.totalFees > balance) {
            toast.error('Insufficient balance including fees');
            return;
        }

        setCurrentStep('confirmation');
    };

    const executeBridge = async () => {
        setLoading(true);
        setCurrentStep('processing');

        try {
            const keypair = getKeypair(); // Get the keypair when needed
            const result = await bridgeService.initiatebridge(
                keypair,
                parseFloat(bridgeData.amount),
                bridgeData.destinationAddress
            );

            setBridgeData(prev => ({ ...prev, result }));

            // Start progress tracking
            trackProgress(result.bridgeId);

            setCurrentStep('success');
            toast.success('Bridge initiated successfully!');

        } catch (error) {
            console.error('Bridge failed:', error);
            setBridgeData(prev => ({ ...prev, error: error.message }));
            setCurrentStep('error');
            toast.error(error.message || 'Bridge failed');
        } finally {
            setLoading(false);
        }
    };

    const trackProgress = async (bridgeId) => {
        try {
            const progress = await bridgeService.trackBridgeProgress(bridgeId);
            setBridgeData(prev => ({ ...prev, progress }));

            // Simulate progress updates
            const interval = setInterval(async () => {
                const updatedProgress = await bridgeService.trackBridgeProgress(bridgeId);
                setBridgeData(prev => ({ ...prev, progress: updatedProgress }));

                if (updatedProgress.currentStep >= updatedProgress.totalSteps) {
                    clearInterval(interval);
                }
            }, 30000); // Update every 30 seconds

        } catch (error) {
            console.error('Failed to track progress:', error);
        }
    };

    const resetBridge = () => {
        setCurrentStep('form');
        setBridgeData({
            amount: '',
            destinationAddress: walletAddress || '',
            fees: null,
            result: null,
            progress: null
        });
    };

    const getStepIcon = (step, status) => {
        if (status === 'completed') return <CheckCircle className="w-5 h-5 text-green-500" />;
        if (status === 'processing') return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
        if (status === 'pending') return <Clock className="w-5 h-5 text-gray-400" />;
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Pending';
        return new Date(timestamp).toLocaleTimeString();
    };

    const renderBridgeForm = () => (
        <div className="w-full max-w-lg p-2">
            {/* Token Selection UI */}
            <div className="gap-3 mb-6 flex flex-col">
                {/* Send Section */}
                <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-zinc-400">Send</span>
                        <span className="text-sm text-zinc-400">Balance: {balance?.toFixed(4)} SOL</span>
                    </div>

                    <div className="flex items-center justify-between mb-4 gap-2">
                        <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={bridgeData.amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            placeholder="0"
                            className="bg-transparent text-white text-3xl font-bold outline-none flex-1 placeholder-zinc-500 w-1/2"
                        />
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-500 rounded-lg px-3 py-2 cursor-pointer transition-colors">
                                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-xs">≡</span>
                                </div>
                                <span className="text-white font-medium">SOL</span>
                                <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                                        <div className="flex items-center justify-between">
                        <div className="text-sm text-zinc-400">
                            ${(parseFloat(bridgeData.amount || 0) * 100).toFixed(2)}
                        </div>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => handleAmountChange((balance * 0.25).toString())}
                                className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-2 py-1 rounded transition-colors"
                            >
                                25%
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAmountChange((balance * 0.5).toString())}
                                className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-2 py-1 rounded transition-colors"
                            >
                                50%
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAmountChange((balance * 0.75).toString())}
                                className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-2 py-1 rounded transition-colors"
                            >
                                75%
                            </button>
                            <button
                                type="button"
                                onClick={handleMaxAmount}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-2 py-1 rounded transition-colors font-medium"
                            >
                                MAX
                            </button>
                        </div>
                    </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center -my-5 z-10">
                    <div className="size-9 bg-zinc-700 border border-zinc-500 rounded-full flex items-center justify-center">
                        <ArrowRightLeft className="w-4 h-4 text-zinc-300" />
                    </div>
                </div>

                {/* Receive Section */}
                <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-zinc-400">Receive</span>
                        <span className="text-sm text-zinc-400">Balance: 0.0</span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <div className="text-3xl text-white font-bold">
                            {bridgeData.amount || '0'}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-zinc-700 border border-zinc-500 rounded-lg px-3 py-2">
                                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold text-xs">G</span>
                                </div>
                                <span className="text-white font-medium">GORBAGANA</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-zinc-400">
                        ${(parseFloat(bridgeData.amount || 0) * 100).toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleConfirmBridge(); }} className="space-y-4">

                {/* Destination Address */}
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Gorbagana Destination Address
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={bridgeData.destinationAddress}
                            onChange={(e) => setBridgeData(prev => ({ ...prev, destinationAddress: e.target.value }))}
                            placeholder="gorb1xyz...address"
                            className="w-full bg-zinc-700 border border-zinc-500 text-white p-3 rounded-lg text-sm placeholder-zinc-400 focus:outline-none focus:border-cyan-400 pr-10"
                            required
                        />
                        {bridgeData.destinationAddress && (
                            <button
                                type="button"
                                onClick={clearDestinationAddress}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Fee Estimation */}
                {bridgeData.fees && (
                    <div className="bg-zinc-700 border border-zinc-500 rounded-lg p-3">
                        <h3 className="text-sm font-medium text-zinc-300 mb-2">Fee Breakdown</h3>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Transaction Fee:</span>
                                <span className="text-white">{bridgeData.fees.transactionFee} SOL</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Bridge Fee (0.1%):</span>
                                <span className="text-white">{bridgeData.fees.bridgeFee.toFixed(6)} SOL</span>
                            </div>
                            <div className="flex justify-between border-t border-zinc-500 pt-1">
                                <span className="text-zinc-300 font-medium">Total Fees:</span>
                                <span className="text-white font-medium">{bridgeData.fees.totalFees.toFixed(6)} SOL</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bridge Button */}
                <button
                    type="submit"
                    disabled={!bridgeData.amount || !bridgeData.destinationAddress || !bridgeStatus?.isActive}
                    className="w-full bg-gradient-to-r from-cyan-400 to-purple-600 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    <ArrowRightLeft size={20} />
                    {loading ? 'Processing...' : 'Bridge'}
                </button>
            </form>
        </div>
    );

    const renderConfirmation = () => (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-2">Confirm Bridge Transaction</h2>
                <p className="text-gray-400">Please review the details before proceeding</p>
            </div>

            <div className="bg-zinc-700 rounded-lg p-4 space-y-4">
                <div className="flex justify-between">
                    <span className="text-gray-400">From:</span>
                    <span className="text-white">Solana</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">To:</span>
                    <span className="text-white">Gorbagana</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white">{bridgeData.amount} SOL</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Destination:</span>
                    <span className="text-white break-all">{truncateAddress(bridgeData.destinationAddress)}</span>
                </div>
                {bridgeData.fees && (
                    <div className="flex justify-between border-t border-zinc-500 pt-2">
                        <span className="text-gray-400">Total Cost:</span>
                        <span className="text-white font-medium">
                            {(parseFloat(bridgeData.amount) + bridgeData.fees.totalFees).toFixed(6)} SOL
                        </span>
                    </div>
                )}
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => setCurrentStep('form')}
                    className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={executeBridge}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
                    Confirm Bridge
                </button>
            </div>
        </div>
    );

    const renderProcessing = () => (
        <div className="space-y-6 text-center flex-1">
            <div className="h-full flex flex-col justify-center">
                <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-16" />
                <h2 className="text-xl font-bold text-white mb-2">Processing Bridge</h2>
                <p className="text-gray-400">Your transaction is being processed...</p>
            </div>

            {bridgeData.progress && (
                <div className="bg-zinc-800 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-gray-400">Progress</span>
                        <span className="text-sm text-white">
                            Step {bridgeData.progress.currentStep} of {bridgeData.progress.totalSteps}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {bridgeData.progress.stages.map((stage, index) => (
                            <div key={index} className="flex items-center gap-3">
                                {getStepIcon(stage.step, stage.status)}
                                <div className="flex-1">
                                    <p className="text-sm text-white">{stage.description}</p>
                                    <p className="text-xs text-gray-500">{formatTimestamp(stage.timestamp)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderSuccess = () => (
        <div className="flex flex-col gap-6 text-center flex-1">
            <div>
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Bridge Initiated Successfully!</h2>
                <p className="text-gray-400">Your funds are being bridged to Gorbagana</p>
            </div>

            {bridgeData.result && (
                <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Bridge ID:</span>
                        <span className="text-white text-sm">{bridgeData.result.bridgeId}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Amount Locked:</span>
                        <span className="text-white">{bridgeData.result.lockedAmount} SOL</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Estimated Arrival:</span>
                        <span className="text-white">{bridgeData.result.estimatedArrival}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Transaction:</span>
                        <a
                            href={`https://explorer.solana.com/tx/${bridgeData.result.txSignature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                            View <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            )}

            <button
                onClick={resetBridge}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors mt-auto"
            >
                Bridge More Funds
            </button>
        </div>
    );

    const renderError = () => (
        <div className="flex gap-6 flex-col flex-1 text-center">
            <div>
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Bridge Failed</h2>
                <p className="text-gray-400">There was an error processing your bridge transaction</p>
            </div>

            {bridgeData.error && (
                <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-400 text-sm">{bridgeData.error}</p>
                </div>
            )}

            <div className="flex gap-3 mt-auto">
                <button
                    onClick={() => setCurrentStep('form')}
                    className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                    Try Again
                </button>
                <button
                    onClick={() => navigate('/')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                    Go Home
                </button>
            </div>
        </div>
    );



    return (
        <>
            {/* Header */}
            <div className="flex mb-6">
                <BackBtn />
                <h2 className="text-xl font-bold text-white mx-auto pr-7">Bridge</h2>
            </div>

            {/* Main Content */}
            {currentStep === 'form' && renderBridgeForm()}
            {currentStep === 'confirmation' && renderConfirmation()}
            {currentStep === 'processing' && renderProcessing()}
            {currentStep === 'success' && renderSuccess()}
            {currentStep === 'error' && renderError()}
        </>
    );
}

export default BridgePage;
