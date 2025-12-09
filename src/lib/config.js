// NOTE: For production deployment, API keys should be moved to environment variables
// or allow users to provide their own RPC endpoints via settings.
// The Helius API key below is for development only.

export const networks = [
    {
        id: 'gorbchain-mainnet',
        name: 'Gorbchain',
        symbol: 'GORB',
        icon: '/icons/gorbchain.png',
        color: 'bg-teal-600',
        rpcUrl: 'https://rpc.gorbchain.xyz',
        wsUrl: 'wss://rpc.gorbchain.xyz/ws',
        chain: 'gorbagana',
        environment: "mainnet",
        explorerUrl: (txHash) => `https://gorbscan.com/transactions?search=${txHash}`
    },
    {
        id: 'solana-devnet',
        name: 'Solana',
        symbol: 'SOL',
        icon: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png?1718769756',
        color: 'bg-purple-600',
        rpcUrl: 'https://api.devnet.solana.com',
        chain: 'solana',
        environment: "devnet",
        explorerUrl: (txHash) => `https://solscan.io/tx/${txHash}?cluster=devnet`
    },
    {
        id: 'gorbchain-devnet',
        name: 'Gorbchain',
        symbol: 'GORB',
        icon: '/icons/gorbchain.png',
        color: 'bg-teal-600',
        rpcUrl: 'https://devnet.gorbchain.xyz',
        wsUrl: 'wss://devnet.gorbchain.xyz/ws',
        chain: 'gorbagana',
        environment: "devnet",
        explorerUrl: (txHash) => `https://devnet.gorbscan.com/tx/${txHash}`
    },
    {
        id: 'solana-mainnet',
        name: 'Solana',
        symbol: 'SOL',
        icon: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png?1718769756',
        color: 'bg-purple-600',
        rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=a3b0010e-c4b9-407b-8cb2-ecce8a26d5c6',
        wsUrl: 'wss://mainnet.helius-rpc.com/?api-key=a3b0010e-c4b9-407b-8cb2-ecce8a26d5c6',
        chain: 'solana',
        environment: "mainnet",
        explorerUrl: (txHash) => `https://solscan.io/tx/${txHash}?cluster=mainnet`
    },
];
