import { Send, QrCode, ArrowRightLeft, Coins, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';

function WalletActions({ onReceiveClick }) {
    const navigate = useNavigate();
    const [hoveredAction, setHoveredAction] = useState(null);

    const handleStake = () => {
        toast('Staking coming soon! 🚀', {
            icon: <Sparkles size={20} className="text-yellow-400" />,
            style: {
                background: '#18181b',
                color: '#fafafa',
                border: '1px solid #27272a'
            }
        });
    };

    const handleReceive = () => {
        if (onReceiveClick) {
            onReceiveClick();
        } else {
            navigate('/receive');
        }
    };

    const handleSend = () => {
        navigate('/send');
    };

    const handleSwap = () => {
        navigate('/bridge');
    };

    const actions = [
        {
            id: 'send',
            label: 'Send',
            description: 'Transfer',
            icon: Send,
            onClick: handleSend,
            color: 'from-red-500 to-red-600',
            hoverColor: 'from-red-400 to-red-500',
        },
        {
            id: 'receive',
            label: 'Receive',
            description: 'Wallet QR code',
            icon: QrCode,
            onClick: handleReceive,
            color: 'from-emerald-500 to-emerald-600',
            hoverColor: 'from-emerald-400 to-emerald-500',
        },
        {
            id: 'swap',
            label: 'Swap',
            description: 'Swap tokens',
            icon: ArrowRightLeft,
            onClick: handleSwap,
            color: 'from-cyan-500 to-blue-600',
            hoverColor: 'from-cyan-400 to-blue-500',
        },
        {
            id: 'stake',
            label: 'Stake',
            description: 'Stake tokens',
            icon: Coins,
            onClick: handleStake,
            color: 'from-purple-500 to-purple-600',
            hoverColor: 'from-purple-400 to-purple-500',
        },
    ];

    return (
        <div className="bg-zinc-800/40 backdrop-blur-sm border border-zinc-700/30 rounded-xl p-3 mb-2">
            <div className="grid grid-cols-4 gap-1.5">
                {actions.map((action) => {
                    const IconComponent = action.icon;
                    const isHovered = hoveredAction === action.id;
                    
                    return (
                        <div key={action.id} className="relative group">
                            {/* Tooltip - positioned to stay within bounds */}
                            {isHovered && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-300">
                                    <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg px-2.5 py-1.5 whitespace-nowrap max-w-xs">
                                        <p className="text-white text-xs font-medium">{action.label}</p>
                                        <p className="text-zinc-400 text-xs">{action.description}</p>
                                    </div>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-zinc-900/95 border-r border-b border-zinc-700/50 rotate-45"></div>
                                </div>
                            )}

                            <button
                                onClick={action.onClick}
                                onMouseEnter={() => setHoveredAction(action.id)}
                                onMouseLeave={() => setHoveredAction(null)}
                                className="w-full flex flex-col items-center gap-1.5 p-2 group transition-all duration-200 hover:scale-105 active:scale-95"
                                aria-label={`${action.label}: ${action.description}`}
                            >
                                {/* Icon Container */}
                                <div 
                                    className={`relative w-10 h-10 rounded-lg bg-gradient-to-br ${
                                        isHovered ? action.hoverColor : action.color
                                    } flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200`}
                                >
                                    <IconComponent 
                                        size={16} 
                                        className="text-white group-hover:scale-110 transition-transform duration-200" 
                                    />
                                    
                                    {/* Subtle glow effect on hover */}
                                    <div className={`absolute inset-0 rounded-lg bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-20 blur-lg transition-opacity duration-200`} />
                                </div>
                                
                                {/* Label */}
                                <span className="text-white font-medium text-xs group-hover:text-cyan-300 transition-colors duration-200">
                                    {action.label}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default WalletActions;
