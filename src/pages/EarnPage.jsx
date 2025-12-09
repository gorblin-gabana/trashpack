import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, Percent, ExternalLink } from 'lucide-react';
import { useWalletStore } from '../store';
import BackBtn from '../components/BackBtn';

// Mock portfolio data - will be replaced with backend
const generateMockPortfolioData = (days) => {
    const data = [];
    const now = Date.now();
    const baseValue = 1000 + Math.random() * 500;

    for (let i = days; i >= 0; i--) {
        const timestamp = now - (i * 24 * 60 * 60 * 1000);
        const volatility = Math.random() * 100 - 50;
        const trend = (days - i) * 2; // Slight upward trend
        const value = baseValue + trend + volatility;
        data.push({
            timestamp,
            value: Math.max(0, value),
            date: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
    }
    return data;
};

// Mock earning opportunities - will be replaced with backend endpoint
const mockEarningOpportunities = [
    {
        id: 1,
        name: 'GORB Staking',
        chain: 'Gorbchain',
        chainIcon: '/icons/gorbchain.png',
        apr: 12.5,
        tvl: '$2.4M',
        minStake: 100,
        token: 'GORB',
        status: 'active',
    },
    {
        id: 2,
        name: 'SOL Liquid Staking',
        chain: 'Solana',
        chainIcon: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png',
        apr: 7.2,
        tvl: '$156M',
        minStake: 0.1,
        token: 'SOL',
        status: 'active',
    },
    {
        id: 3,
        name: 'GORB-SOL LP',
        chain: 'Gorbchain',
        chainIcon: '/icons/gorbchain.png',
        apr: 45.8,
        tvl: '$890K',
        minStake: 50,
        token: 'LP',
        status: 'active',
    },
    {
        id: 4,
        name: 'PLASMA Farming',
        chain: 'Gorbchain',
        chainIcon: '/icons/gorbchain.png',
        apr: 28.3,
        tvl: '$1.2M',
        minStake: 500,
        token: 'PLASMA',
        status: 'coming_soon',
    },
];

// Simple line chart component
function PortfolioChart({ data, timeframe }) {
    const { minValue, maxValue, points, changePercent, isPositive } = useMemo(() => {
        if (!data || data.length === 0) return { minValue: 0, maxValue: 100, points: '', changePercent: 0, isPositive: true };

        const values = data.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.1;
        const minVal = min - padding;
        const maxVal = max + padding;

        const width = 360;
        const height = 120;

        const pts = data.map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((d.value - minVal) / (maxVal - minVal)) * height;
            return `${x},${y}`;
        }).join(' ');

        const firstValue = data[0]?.value || 0;
        const lastValue = data[data.length - 1]?.value || 0;
        const change = ((lastValue - firstValue) / firstValue) * 100;

        return {
            minValue: minVal,
            maxValue: maxVal,
            points: pts,
            changePercent: change.toFixed(2),
            isPositive: change >= 0
        };
    }, [data]);

    const currentValue = data[data.length - 1]?.value || 0;

    return (
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-zinc-400 text-xs mb-1">Portfolio Value</p>
                    <p className="text-white text-2xl font-bold">${currentValue.toFixed(2)}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span className="text-sm font-medium">{isPositive ? '+' : ''}{changePercent}%</span>
                </div>
            </div>

            <div className="relative h-[120px] w-full">
                <svg width="100%" height="120" viewBox="0 0 360 120" preserveAspectRatio="none">
                    {/* Gradient fill */}
                    <defs>
                        <linearGradient id={`chartGradient-${timeframe}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Area fill */}
                    <polygon
                        points={`0,120 ${points} 360,120`}
                        fill={`url(#chartGradient-${timeframe})`}
                    />

                    {/* Line */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke={isPositive ? '#22c55e' : '#ef4444'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            <div className="flex justify-between mt-2 text-xs text-zinc-500">
                <span>{data[0]?.date}</span>
                <span>{data[data.length - 1]?.date}</span>
            </div>
        </div>
    );
}

function EarnPage() {
    const [timeframe, setTimeframe] = useState('7d');
    const { balance } = useWalletStore();

    const portfolioData = useMemo(() => {
        const days = timeframe === '7d' ? 7 : 30;
        return generateMockPortfolioData(days);
    }, [timeframe]);

    const handleStake = (opportunity) => {
        // TODO: Implement staking flow
        console.log('Stake clicked for:', opportunity.name);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                <BackBtn />
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
                        <DollarSign size={18} className="text-white" />
                    </div>
                    <h1 className="text-white font-semibold text-lg">Earn</h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Portfolio Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-white font-medium text-sm">Portfolio Performance</h2>
                        <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
                            <button
                                onClick={() => setTimeframe('7d')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                    timeframe === '7d'
                                        ? 'bg-zinc-700 text-white'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                7D
                            </button>
                            <button
                                onClick={() => setTimeframe('30d')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                    timeframe === '30d'
                                        ? 'bg-zinc-700 text-white'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                30D
                            </button>
                        </div>
                    </div>

                    <PortfolioChart data={portfolioData} timeframe={timeframe} />
                </div>

                {/* Earning Opportunities */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-white font-medium text-sm">Earning Opportunities</h2>
                        <span className="text-zinc-500 text-xs">{mockEarningOpportunities.length} available</span>
                    </div>

                    <div className="space-y-2">
                        {mockEarningOpportunities.map((opportunity) => (
                            <div
                                key={opportunity.id}
                                className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={opportunity.chainIcon}
                                            alt={opportunity.chain}
                                            className="w-10 h-10 rounded-full bg-zinc-700"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                        <div>
                                            <p className="text-white font-medium text-sm">{opportunity.name}</p>
                                            <p className="text-zinc-500 text-xs">{opportunity.chain}</p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-green-400">
                                            <Percent size={12} />
                                            <span className="font-bold text-lg">{opportunity.apr}%</span>
                                        </div>
                                        <p className="text-zinc-500 text-xs">APR</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-700/50">
                                    <div className="flex gap-4">
                                        <div>
                                            <p className="text-zinc-500 text-xs">TVL</p>
                                            <p className="text-white text-sm font-medium">{opportunity.tvl}</p>
                                        </div>
                                        <div>
                                            <p className="text-zinc-500 text-xs">Min Stake</p>
                                            <p className="text-white text-sm font-medium">{opportunity.minStake} {opportunity.token}</p>
                                        </div>
                                    </div>

                                    {opportunity.status === 'active' ? (
                                        <button
                                            onClick={() => handleStake(opportunity)}
                                            className="px-4 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                                        >
                                            Stake
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-700/50 text-zinc-400 text-sm rounded-lg">
                                            <Clock size={14} />
                                            <span>Coming Soon</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info Banner */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-amber-400 text-xs text-center">
                        Earn rewards by staking your tokens. APR rates are variable and subject to change.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default EarnPage;
