import { Building2, ArrowDown, ArrowUp, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function WalletActions() {
    const navigate = useNavigate();

    const handleCash = () => {
        // Placeholder for cash/fiat functionality
        toast.error('coming soon!', {
            icon: <Building2 size={20} className="text-white" />,
        });
    };


    const handleReceive = () => {
        navigate('/receive');
    };

    const handleSend = () => {
        navigate('/send');
    };

    const handleBridge = () => {
        navigate('/bridge');
    };

    const actions = [
        {
            id: 'send',
            label: 'Send',
            icon: ArrowUp,
            onClick: handleSend,
        },
        {
            id: 'receive',
            label: 'Receive',
            icon: ArrowDown,
            onClick: handleReceive,
        },
        {
            id: 'bridge',
            label: 'Bridge',
            icon: ArrowRightLeft,
            onClick: handleBridge,
        },
        {
            id: 'stake',
            label: 'Stake',
            icon: Building2,
            onClick: handleCash,
        },
    ];

    return (
        <div className="flex items-center justify-center gap-4 mx-auto">
            {actions.map((action) => {
                const IconComponent = action.icon;
                return (
                    <button
                        key={action.id}


                        onClick={action.onClick}
                        className="flex flex-col items-center justify-center gap-2 p-1 transition-all duration-200 flex-1 min-w-0"
                    >
                        <div className="size-10 rounded-full bg-teal-600 hover:opacity-60 transition-all duration-200 flex items-center justify-center">
                            <IconComponent size={20} className="text-white" />
                        </div>
                        <span className="text-xs text-zinc-400 font-medium">{action.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default WalletActions;
