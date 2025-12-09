import { useState, useEffect } from 'react';
import { ArrowUpDown, ChevronDown, Loader, CheckCircle, Clock, AlertCircle, ExternalLink, X, Zap, TrendingUp, Settings, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import bridgeService from '../lib/bridgeService';
import tokenService from '../lib/tokenService';
import { useWalletStore } from '../store/walletStore';
import { truncateAddress, formatBalance } from '../util';

function CrossChainSwapPage({ requireUnlock }) {
    const navigate = useNavigate();
    const { getKeypair, balance, hasWallet, walletAddress } = useWalletStore();

    const [currentStep, setCurrentStep] = useState('form');
    const [swapData, setSwapData] = useState({
        fromChain: 'solana',
        fromToken: 'SOL',
        toChain: 'gorbagana', 
        toToken: 'GORB',
        amount: '',
        destinationAddress: walletAddress || '',
        fees: null,
        result: null,
        progress: null
    });

    const [loading, setLoading] = useState(false);
    const [bridgeStatus, setBridgeStatus] = useState(null);
    const [availableTokens, setAvailableTokens] = useState({});
    const [availableChains, setAvailableChains] = useState([]);
    const [bridgePairs, setBridgePairs] = useState([]);
    const [showTokenModal, setShowTokenModal] = useState(null);
    const [showChainModal, setShowChainModal] = useState(null);
    const [estimatedReceived, setEstimatedReceived] = useState(null);
    const [imageErrors, setImageErrors] = useState(new Set());
    // Removed showDetails state - details always shown
    const [isCalculating, setIsCalculating] = useState(false);
    const [isLoadingTokens, setIsLoadingTokens] = useState(true);

    useEffect(() => {
        initializeTokenData();
        loadBridgeStatus();
    }, []);

    useEffect(() => {
        if (walletAddress && !swapData.destinationAddress) {
            setSwapData(prev => ({ ...prev, destinationAddress: walletAddress }));
        }
    }, [walletAddress]);

    useEffect(() => {
        if (swapData.amount && !isNaN(parseFloat(swapData.amount)) && parseFloat(swapData.amount) > 0) {
            calculateEstimatedReceived();
        } else {
            setEstimatedReceived(null);
            setIsCalculating(false);
        }
    }, [swapData.amount, swapData.fromToken, swapData.toToken, swapData.fromChain, swapData.toChain]);

    const initializeTokenData = async () => {
        try {
            setIsLoadingTokens(true);
            
            const chains = await tokenService.getChains();
            setAvailableChains(chains);
            
            const tokensData = {};
            
            for (const chain of chains) {
                const tokens = await tokenService.getTokensForChain(chain.chainId.split('-')[0]);
                tokensData[chain.chainId.split('-')[0]] = tokens;
            }
            
            setAvailableTokens(tokensData);
            
            const pairs = await tokenService.getBridgePairs();
            setBridgePairs(pairs);
        } catch (error) {
            console.error('Failed to load token data:', error);
        } finally {
            setIsLoadingTokens(false);
        }
    };

    const loadBridgeStatus = async () => {
        try {
            const status = await bridgeService.getBridgeStatus();
            setBridgeStatus(status);
        } catch (error) {
            console.error('Failed to load bridge status:', error);
        }
    };

    const calculateEstimatedReceived = async () => {
        setIsCalculating(true);
        try {
            const pair = await tokenService.getBridgePair(
                swapData.fromChain, 
                swapData.fromToken, 
                swapData.toChain, 
                swapData.toToken
            );
            
            if (pair) {
                const amount = parseFloat(swapData.amount);
                const received = amount - pair.fee;
                setEstimatedReceived(Math.max(0, received));
                
                setSwapData(prev => ({ 
                    ...prev, 
                    fees: { 
                        bridgeFee: pair.fee, 
                        totalFees: pair.fee,
                        estimatedTime: pair.estimatedTime 
                    } 
                }));
            } else {
                // Fallback calculation if no pair found
                const amount = parseFloat(swapData.amount);
                const estimatedFee = 0.003; // Default fee
                setEstimatedReceived(Math.max(0, amount - estimatedFee));
                
                setSwapData(prev => ({ 
                    ...prev, 
                    fees: { 
                        bridgeFee: estimatedFee, 
                        totalFees: estimatedFee,
                        estimatedTime: '5-10 minutes'
                    } 
                }));
            }
        } catch (error) {
            console.error('Failed to calculate estimated received:', error);
            // Still provide fallback calculation
            const amount = parseFloat(swapData.amount);
            if (amount > 0) {
                const estimatedFee = 0.003;
                setEstimatedReceived(Math.max(0, amount - estimatedFee));
            }
        } finally {
            setIsCalculating(false);
        }
    };

    const handleAmountChange = (value) => {
        // Clean input - remove extra decimals
        if (value && !isNaN(parseFloat(value))) {
            const cleanValue = parseFloat(value).toString();
            setSwapData(prev => ({ ...prev, amount: cleanValue }));
        } else {
            setSwapData(prev => ({ ...prev, amount: value }));
        }
    };

    const handlePercentageAmount = (percentage) => {
        if (balance) {
            const estimatedFee = 0.003; // Account for transaction fee
            const maxAmount = Math.max(0, balance - estimatedFee);
            const amount = (maxAmount * percentage / 100);
            setSwapData(prev => ({ ...prev, amount: amount.toFixed(6) }));
        }
    };

    const handleTokenSelect = (type, chainId, tokenSymbol) => {
        if (type === 'from') {
            setSwapData(prev => ({ ...prev, fromChain: chainId, fromToken: tokenSymbol }));
            
            const availableTo = bridgePairs.filter(pair => 
                pair.fromChain === chainId && pair.fromToken === tokenSymbol
            );
            if (availableTo.length > 0) {
                setSwapData(prev => ({ 
                    ...prev, 
                    toChain: availableTo[0].toChain, 
                    toToken: availableTo[0].toToken 
                }));
            }
        } else {
            setSwapData(prev => ({ ...prev, toChain: chainId, toToken: tokenSymbol }));
        }
        setShowTokenModal(null);
    };

    const handleChainSelect = (type, chainId) => {
        if (type === 'from') {
            const tokens = availableTokens[chainId];
            if (tokens && tokens.length > 0) {
                setSwapData(prev => ({ 
                    ...prev, 
                    fromChain: chainId, 
                    fromToken: tokens[0].symbol 
                }));
                
                // Update destination based on available pairs
                const availableTo = bridgePairs.filter(pair => 
                    pair.fromChain === chainId && pair.fromToken === tokens[0].symbol
                );
                if (availableTo.length > 0) {
                    setSwapData(prev => ({ 
                        ...prev, 
                        toChain: availableTo[0].toChain, 
                        toToken: availableTo[0].toToken 
                    }));
                }
            }
        } else {
            const tokens = availableTokens[chainId];
            if (tokens && tokens.length > 0) {
                setSwapData(prev => ({ 
                    ...prev, 
                    toChain: chainId, 
                    toToken: tokens[0].symbol 
                }));
            }
        }
        setShowChainModal(null);
    };

    const handleSwapDirection = () => {
        const reversePair = bridgePairs.find(pair => 
            pair.fromChain === swapData.toChain && 
            pair.fromToken === swapData.toToken && 
            pair.toChain === swapData.fromChain && 
            pair.toToken === swapData.fromToken
        );
        
        if (reversePair) {
            setSwapData(prev => ({
                ...prev,
                fromChain: prev.toChain,
                fromToken: prev.toToken,
                toChain: prev.fromChain,
                toToken: prev.fromToken
            }));
        } else {
            toast.error('Reverse swap not available for this pair');
        }
    };

    const getAvailableDestinationTokens = () => {
        return bridgePairs
            .filter(pair => pair.fromChain === swapData.fromChain && pair.fromToken === swapData.fromToken)
            .map(pair => ({ chainId: pair.toChain, symbol: pair.toToken }));
    };

    const handleConfirmSwap = async () => {
        if (!hasWallet) {
            toast.error('Please connect your wallet first');
            return;
        }

        if (requireUnlock && requireUnlock()) {
            return;
        }

        if (!swapData.amount || !swapData.destinationAddress) {
            toast.error('Please fill all required fields');
            return;
        }

        const amount = parseFloat(swapData.amount);
        if (amount <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }

        if (swapData.fees && amount + swapData.fees.totalFees > balance) {
            toast.error('Insufficient balance including fees');
            return;
        }

        setCurrentStep('confirmation');
    };

    const executeSwap = async () => {
        setLoading(true);
        setCurrentStep('processing');

        try {
            const keypair = getKeypair();
            const result = await bridgeService.initiatebridge(
                keypair,
                parseFloat(swapData.amount),
                swapData.destinationAddress
            );

            setSwapData(prev => ({ ...prev, result }));
            trackProgress(result.bridgeId);
            setCurrentStep('success');
            toast.success('Cross-chain swap initiated successfully!');

        } catch (error) {
            console.error('Swap failed:', error);
            setSwapData(prev => ({ ...prev, error: error.message }));
            setCurrentStep('error');
            toast.error(error.message || 'Swap failed');
        } finally {
            setLoading(false);
        }
    };

    const trackProgress = async (bridgeId) => {
        try {
            const progress = await bridgeService.trackBridgeProgress(bridgeId);
            setSwapData(prev => ({ ...prev, progress }));

            const interval = setInterval(async () => {
                const updatedProgress = await bridgeService.trackBridgeProgress(bridgeId);
                setSwapData(prev => ({ ...prev, progress: updatedProgress }));

                if (updatedProgress.currentStep >= updatedProgress.totalSteps) {
                    clearInterval(interval);
                }
            }, 30000);

        } catch (error) {
            console.error('Failed to track progress:', error);
        }
    };

    const resetSwap = () => {
        setCurrentStep('form');
        setSwapData({
            fromChain: 'solana',
            fromToken: 'SOL',
            toChain: 'gorbagana',
            toToken: 'GORB',
            amount: '',
            destinationAddress: walletAddress || '',
            fees: null,
            result: null,
            progress: null
        });
        setEstimatedReceived(null);
    };

    const getTokenIcon = (chainId, tokenSymbol) => {
        const tokens = availableTokens[chainId] || [];
        const token = tokens.find(t => t.symbol === tokenSymbol);
        return tokenService.formatIconUrl(token?.icon);
    };

    const getChainName = (chainId) => {
        const chainNames = {
            solana: 'Solana',
            gorbagana: 'Gorbchain',
            ethereum: 'Ethereum',
            polygon: 'Polygon'
        };
        return chainNames[chainId] || chainId;
    };

    const handleImageError = (imageKey) => {
        setImageErrors(prev => new Set([...prev, imageKey]));
    };

    const getTokenPrice = (tokenSymbol) => {
        // Mock prices - in real app, get from API
        const prices = {
            'SOL': 229.45,
            'GORB': 225.32,
            'BTC': 45000,
            'ETH': 3200
        };
        return prices[tokenSymbol] || 0;
    };

    const formatCurrency = (amount, tokenSymbol) => {
        const price = getTokenPrice(tokenSymbol);
        const usdValue = amount * price;
        return `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const TokenIcon = ({ chainId, tokenSymbol, size = "w-6 h-6" }) => {
        const imageKey = `${chainId}-${tokenSymbol}`;
        const hasError = imageErrors.has(imageKey);
        
        if (hasError) {
            return (
                <div className={`${size} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center`}>
                    <span className="text-white font-bold text-xs">
                        {tokenSymbol.charAt(0)}
                    </span>
                </div>
            );
        }

        return (
            <img 
                src={getTokenIcon(chainId, tokenSymbol)} 
                alt={tokenSymbol}
                className={`${size} rounded-full`}
                onError={() => handleImageError(imageKey)}
            />
        );
    };

    const TokenModal = ({ type, isOpen, onClose }) => {
        if (!isOpen) return null;

        const tokens = type === 'to' ? getAvailableDestinationTokens() : 
            Object.entries(availableTokens).flatMap(([chain, tokens]) => 
                tokens.map(token => ({ chainId: chain, symbol: token.symbol, name: token.name }))
            );

        return (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 overflow-y-auto">
                <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl w-full max-w-[360px] max-h-[85%] overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
                        <h3 className="text-white font-bold text-base">
                            Select {type === 'from' ? 'Source' : 'Destination'} Token
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all duration-200"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="overflow-y-auto max-h-72 p-2">
                        {tokens.map((token) => (
                            <button
                                key={`${token.chainId}-${token.symbol}`}
                                onClick={() => handleTokenSelect(type, token.chainId, token.symbol)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-700/40 transition-all duration-200 rounded-2xl mb-1 group"
                            >
                                <TokenIcon chainId={token.chainId} tokenSymbol={token.symbol} size="w-10 h-10" />
                                <div className="flex flex-col items-start flex-1">
                                    <span className="text-white font-semibold group-hover:text-blue-300 transition-colors">
                                        {token.symbol}
                                    </span>
                                    <span className="text-gray-400 text-sm">{getChainName(token.chainId)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const ChainModal = ({ type, isOpen, onClose }) => {
        if (!isOpen) return null;

        const chains = type === 'to' ? 
            availableChains.filter(chain => {
                // Filter destination chains based on available bridge pairs
                return bridgePairs.some(pair => pair.toChain === chain.chainId.split('-')[0]);
            }) : 
            availableChains;

        return (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 overflow-y-auto">
                <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl w-full max-w-[360px] max-h-[85%] overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
                        <h3 className="text-white font-bold text-base">
                            Select {type === 'from' ? 'Source' : 'Destination'} Chain
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all duration-200"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="overflow-y-auto max-h-72 p-2">
                        {chains.map((chain) => (
                            <button
                                key={chain.chainId}
                                onClick={() => handleChainSelect(type, chain.chainId.split('-')[0])}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-700/40 transition-all duration-200 rounded-2xl mb-1 group"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                                    {chain.symbol}
                                </div>
                                <div className="flex flex-col items-start flex-1">
                                    <span className="text-white font-semibold group-hover:text-blue-300 transition-colors">
                                        {chain.name}
                                    </span>
                                    <span className="text-gray-400 text-sm">{chain.environment}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const TokenSelector = ({ type, chainId, tokenSymbol }) => {
        return (
            <button
                onClick={() => setShowTokenModal(type)}
                className="flex items-center gap-2 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600/40 hover:border-blue-500/50 rounded-xl px-3 py-2.5 transition-all duration-200 group"
            >
                <TokenIcon chainId={chainId} tokenSymbol={tokenSymbol} size="w-6 h-6" />
                <div className="flex flex-col items-start">
                    <span className="text-white font-medium text-sm">{tokenSymbol}</span>
                    <span className="text-gray-400 text-xs">{getChainName(chainId)}</span>
                </div>
                <ChevronDown size={14} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
            </button>
        );
    };

    const renderSwapForm = () => (
        <div className="w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl hover:bg-gray-700/40 text-gray-400 hover:text-white transition-all duration-200"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <h1 className="text-white font-bold text-xl">Swap</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-xl hover:bg-gray-700/40 text-gray-400 hover:text-white transition-all duration-200">
                        <Zap size={16} />
                    </button>
                    <button className="p-2 rounded-xl hover:bg-gray-700/40 text-gray-400 hover:text-white transition-all duration-200">
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* Main Swap Interface */}
            <div className="relative">
                {/* From Section */}
                <div className="bg-gray-900/70 backdrop-blur-xl border border-gray-700/30 rounded-3xl p-3 mb-1">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 font-medium text-xs">You send</span>
                            <button
                                onClick={() => setShowChainModal('from')}
                                disabled={isLoadingTokens}
                                className="flex items-center gap-1 bg-gray-700/40 hover:bg-gray-600/40 border border-gray-600/30 hover:border-blue-500/50 rounded-lg px-2 py-1 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Select source chain"
                            >
                                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                                    {swapData.fromChain === 'solana' ? 'S' : 'G'}
                                </div>
                                <span className="text-gray-300 text-xs font-medium">{getChainName(swapData.fromChain)}</span>
                                <ChevronDown size={10} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs ${
                                swapData.amount && parseFloat(swapData.amount) > (balance || 0) 
                                    ? 'text-red-400' 
                                    : 'text-gray-500'
                            }`}>
                                Balance: {formatBalance(balance, false) || '0'}
                            </span>
                            <button
                                onClick={() => handlePercentageAmount(100)}
                                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 text-xs px-2 py-0.5 rounded-md transition-all duration-200 font-medium"
                            >
                                Max
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1">
                            <input
                                type="number"
                                step="0.000001"
                                min="0"
                                max={balance || 1000}
                                value={swapData.amount}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                placeholder="0"
                                className="bg-transparent text-2xl font-bold text-white placeholder-gray-600 outline-none w-full"
                                onKeyDown={(e) => {
                                    // Prevent 'e', 'E', '+', '-' in number input
                                    if (['e', 'E', '+', '-'].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                            />
                            <div className="text-xs text-gray-500 mt-0.5">
                                {swapData.amount ? formatCurrency(parseFloat(swapData.amount) || 0, swapData.fromToken) : '$0.00'}
                            </div>
                        </div>
                        
                        <button
                            onClick={() => setShowTokenModal('from')}
                            disabled={isLoadingTokens}
                            className="flex items-center gap-2 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600/40 hover:border-blue-500/50 rounded-2xl px-3 py-2 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoadingTokens ? (
                                <>
                                    <Loader size={16} className="animate-spin" />
                                    <div className="flex flex-col items-start">
                                        <span className="text-gray-400 font-semibold text-sm">Loading...</span>
                                        <span className="text-gray-500 text-xs">Fetching tokens</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <TokenIcon chainId={swapData.fromChain} tokenSymbol={swapData.fromToken} size="w-6 h-6" />
                                    <div className="flex flex-col items-start">
                                        <span className="text-white font-semibold text-sm">{swapData.fromToken}</span>
                                        <span className="text-gray-400 text-xs">Select token</span>
                                    </div>
                                    <ChevronDown size={12} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
                                </>
                            )}
                        </button>
                    </div>

                    {/* Percentage Buttons - Ultra Compact */}
                    <div className="grid grid-cols-5 gap-0.5">
                        {[10, 25, 50, 75].map((percentage) => (
                            <button
                                key={percentage}
                                onClick={() => handlePercentageAmount(percentage)}
                                className="py-0.5 px-1 rounded text-xs font-medium transition-all duration-200 bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 hover:text-white"
                            >
                                {percentage}%
                            </button>
                        ))}
                        <button
                            onClick={() => handlePercentageAmount(100)}
                            className="py-0.5 px-1 rounded text-xs font-medium transition-all duration-200 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white shadow-md shadow-blue-500/20"
                        >
                            MAX
                        </button>
                    </div>
                </div>

                {/* Swap Direction Button - More Overlapping */}
                <div className="relative flex justify-center -my-5 z-10">
                    <button
                        onClick={handleSwapDirection}
                        className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 border-4 border-gray-900 rounded-2xl transition-all duration-300 group flex items-center justify-center shadow-xl shadow-blue-500/20 hover:shadow-blue-400/30 hover:scale-105 active:scale-95"
                    >
                        <ArrowUpDown size={18} className="text-white transition-transform duration-300 group-hover:rotate-180" />
                    </button>
                </div>

                {/* To Section */}
                <div className="bg-gray-900/70 backdrop-blur-xl border border-gray-700/30 rounded-3xl p-3 mt-1">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 font-medium text-xs">You receive</span>
                        <button
                            onClick={() => setShowChainModal('to')}
                            disabled={isLoadingTokens}
                            className="flex items-center gap-1 bg-gray-700/40 hover:bg-gray-600/40 border border-gray-600/30 hover:border-green-500/50 rounded-lg px-2 py-1 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Select destination chain"
                        >
                            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                                {swapData.toChain === 'solana' ? 'S' : 'G'}
                            </div>
                            <span className="text-gray-300 text-xs font-medium">{getChainName(swapData.toChain)}</span>
                            <ChevronDown size={10} className="text-gray-400 group-hover:text-green-400 transition-colors" />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <div className="text-2xl font-bold text-white flex items-center">
                                {isCalculating ? (
                                    <>
                                        <Loader size={20} className="animate-spin mr-2" />
                                        <span className="text-gray-400">Calculating...</span>
                                    </>
                                ) : estimatedReceived !== null && estimatedReceived > 0 ? (
                                    estimatedReceived.toFixed(4)
                                ) : swapData.amount && parseFloat(swapData.amount) > 0 ? (
                                    <span className="text-gray-500">-</span>
                                ) : (
                                    '0'
                                )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-between">
                                <span>
                                    {isCalculating ? (
                                        'Calculating price...'
                                    ) : estimatedReceived && estimatedReceived > 0 ? (
                                        formatCurrency(estimatedReceived, swapData.toToken)
                                    ) : (
                                        '$0.00'
                                    )}
                                </span>
                                {!isCalculating && estimatedReceived && estimatedReceived > 0 && (
                                    <span className="text-red-400 font-medium">
                                        -2.03% impact
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <button
                            onClick={() => setShowTokenModal('to')}
                            disabled={isLoadingTokens}
                            className="flex items-center gap-2 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-600/40 hover:border-green-500/50 rounded-2xl px-3 py-2 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoadingTokens ? (
                                <>
                                    <Loader size={16} className="animate-spin" />
                                    <div className="flex flex-col items-start">
                                        <span className="text-gray-400 font-semibold text-sm">Loading...</span>
                                        <span className="text-gray-500 text-xs">Fetching tokens</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <TokenIcon chainId={swapData.toChain} tokenSymbol={swapData.toToken} size="w-6 h-6" />
                                    <div className="flex flex-col items-start">
                                        <span className="text-white font-semibold text-sm">{swapData.toToken}</span>
                                        <span className="text-gray-400 text-xs">Select token</span>
                                    </div>
                                    <ChevronDown size={12} className="text-gray-400 group-hover:text-green-400 transition-colors" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Details - Always Visible */}
            <div className="bg-gray-800/30 border border-gray-700/20 rounded-2xl p-3 mt-3 mb-3">     
                <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Bridge Route</span>
                        <div className="flex items-center gap-2 text-gray-300 font-medium">
                            <span>{getChainName(swapData.fromChain)}</span>
                            <span className="text-blue-400">»»»</span>
                            <span>{getChainName(swapData.toChain)}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Estimated time</span>
                        <span className="text-gray-300 font-medium">
                            {swapData.fees?.estimatedTime || '~ 5 min'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Bridge Fee</span>
                        <span className="text-gray-300 font-medium">
                            {swapData.fees?.bridgeFee ? `${swapData.fees.bridgeFee} ${swapData.fromToken}` : '0.003 SOL'}
                        </span>
                    </div>
                    {swapData.fees?.totalFees && (
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-700/20">
                            <span className="text-gray-400 font-medium">Total Fees</span>
                            <span className="text-gray-200 font-semibold">
                                {swapData.fees.totalFees} {swapData.fromToken}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Swap Button */}
            <button
                onClick={handleConfirmSwap}
                disabled={
                    !swapData.amount || 
                    !swapData.destinationAddress || 
                    !bridgeStatus?.isActive || 
                    loading ||
                    isCalculating ||
                    (swapData.amount && parseFloat(swapData.amount) > (balance || 0)) ||
                    (swapData.amount && parseFloat(swapData.amount) <= 0)
                }
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 px-6 rounded-2xl font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-400/30"
            >
                {loading ? (
                    <div className="flex items-center justify-center gap-2">
                        <Loader size={18} className="animate-spin" />
                        Processing...
                    </div>
                ) : isCalculating ? (
                    <div className="flex items-center justify-center gap-2">
                        <Loader size={18} className="animate-spin" />
                        Calculating...
                    </div>
                ) : !swapData.amount || parseFloat(swapData.amount) <= 0 ? (
                    'Enter Amount'
                ) : swapData.amount && parseFloat(swapData.amount) > (balance || 0) ? (
                    'Insufficient Balance'
                ) : (
                    'Swap'
                )}
            </button>

            {/* Token Selection Modals */}
            <TokenModal 
                type="from" 
                isOpen={showTokenModal === 'from'} 
                onClose={() => setShowTokenModal(null)} 
            />
            <TokenModal 
                type="to" 
                isOpen={showTokenModal === 'to'} 
                onClose={() => setShowTokenModal(null)} 
            />
            
            {/* Chain Selection Modals */}
            <ChainModal 
                type="from" 
                isOpen={showChainModal === 'from'} 
                onClose={() => setShowChainModal(null)} 
            />
            <ChainModal 
                type="to" 
                isOpen={showChainModal === 'to'} 
                onClose={() => setShowChainModal(null)} 
            />
        </div>
    );

    const renderConfirmation = () => (
        <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 shadow-2xl">
            <div className="text-center mb-6">
                <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-white mb-2">Confirm Swap</h2>
                <p className="text-gray-400 text-sm">Review your transaction details</p>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-4 bg-gray-800/40 rounded-2xl">
                    <span className="text-gray-400 text-sm">You Pay</span>
                    <div className="flex items-center gap-2">
                        <TokenIcon chainId={swapData.fromChain} tokenSymbol={swapData.fromToken} size="w-5 h-5" />
                        <span className="text-white font-semibold">{swapData.amount} {swapData.fromToken}</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-800/40 rounded-2xl">
                    <span className="text-gray-400 text-sm">You Receive</span>
                    <div className="flex items-center gap-2">
                        <TokenIcon chainId={swapData.toChain} tokenSymbol={swapData.toToken} size="w-5 h-5" />
                        <span className="text-green-400 font-semibold">≈ {estimatedReceived?.toFixed(4)} {swapData.toToken}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setCurrentStep('form')}
                    className="bg-gray-700/60 hover:bg-gray-600/60 text-white py-3 rounded-2xl font-semibold transition-all duration-200"
                >
                    Back
                </button>
                <button
                    onClick={executeSwap}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50 text-white py-3 rounded-2xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25"
                >
                    {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm'}
                </button>
            </div>
        </div>
    );

    const renderProcessing = () => (
        <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl text-center">
            <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Processing Swap</h2>
            <p className="text-gray-400 text-sm">Your cross-chain swap is being processed</p>
        </div>
    );

    const renderSuccess = () => (
        <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Swap Successful!</h2>
            <p className="text-gray-400 text-sm mb-6">Your cross-chain swap completed successfully</p>
            <button
                onClick={resetSwap}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white py-3 rounded-2xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
                Make Another Swap
            </button>
        </div>
    );

    const renderError = () => (
        <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Swap Failed</h2>
            <p className="text-gray-400 text-sm mb-6">There was an error processing your swap</p>
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setCurrentStep('form')}
                    className="bg-gray-700/60 hover:bg-gray-600/60 text-white py-3 rounded-2xl font-semibold transition-all duration-200"
                >
                    Try Again
                </button>
                <button
                    onClick={() => navigate('/')}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white py-3 rounded-2xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25"
                >
                    Go Home
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex items-center justify-center h-full p-4">
            {currentStep === 'form' && renderSwapForm()}
            {currentStep === 'confirmation' && renderConfirmation()}
            {currentStep === 'processing' && renderProcessing()}
            {currentStep === 'success' && renderSuccess()}
            {currentStep === 'error' && renderError()}
        </div>
    );
}

export default CrossChainSwapPage;
