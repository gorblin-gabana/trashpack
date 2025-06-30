export const networks = [
    {
        id: 'gor',
        name: 'Gorbagana',
        symbol: 'GOR',
        icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/36883.png',
        color: 'bg-teal-600',
        rpcUrl: 'https://gorchain.wstf.io',
        chain: 'gorbagana',
        environment: "testnet",
        explorerUrl: (txHash) => `https://explorer.gorbagana.wtf/tx/${txHash}`
    },
    {
        id: 'solana',
        name: 'Solana',
        symbol: 'SOL',
        icon: 'https://assets.coingecko.com/coins/images/4128/standard/solana.png?1718769756',
        color: 'bg-purple-600',
        rpcUrl: 'https://api.devnet.solana.com',
        chain: 'solana',
        environment: "testnet",
        explorerUrl: (txHash) => `https://solscan.io/tx/${txHash}?cluster=devnet`
    },
    {
        id: 'gor',
        name: 'Gorbagana',
        symbol: 'GOR',
        icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/36883.png',
        color: 'bg-teal-600',
        rpcUrl: 'https://rpc.gorbchain.xyz',
        wsUrl: 'wss://rpc.gorbchain.xyz/ws',
        chain: 'gorbagana',
        environment: "mainnet",
        explorerUrl: (txHash) => `https://explorer.gorbagana.wtf/tx/${txHash}`
    },
    {
        id: 'solana',
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
