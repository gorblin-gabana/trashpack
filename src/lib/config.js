// NOTE: For production deployment, API keys should be moved to environment variables
// or allow users to provide their own RPC endpoints via settings.
// The Helius and Moralis API keys below are for development only.

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

// Temporary Moralis API key (development only)
// TODO: Move to environment variable before production
export const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImM0NzE4ZGUzLWU2ZGEtNDc4ZS1hMTYxLWY0ZmEwMDk1OWRiYyIsIm9yZ0lkIjoiMzg4NzA0IiwidXNlcklkIjoiMzk5NDE3IiwidHlwZUlkIjoiZGI3OTQ1NzQtOWVkZC00YWEzLWIzZGQtMjE0Mzk0YTA1OThjIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MTM1NDc5NDEsImV4cCI6NDg2OTMwNzk0MX0.jUKdjt9xIfazcn0Muo8fQiAyC19gpNl2qpCvR648cOM';
