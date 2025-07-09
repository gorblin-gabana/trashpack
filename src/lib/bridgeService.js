import { address, createSolanaRpc, devnet } from '@solana/kit';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import CROSS_IDL from './cross_idl.json';

// Simple wallet implementation for browser environment
class SimpleWallet {
  constructor(keypair) {
    this.payer = keypair;
    this.publicKey = keypair.publicKey;
  }

  async signTransaction(tx) {
    tx.sign(this.payer);
    return tx;
  }

  async signAllTransactions(txs) {
    return txs.map(tx => {
      tx.sign(this.payer);
      return tx;
    });
  }
}

// Program ID (matches deployed program)
const PROGRAM_ID = address('FzzCqoaXXYWYhJ62xA1feEAsaYdBfRkyTy2zBgDkYjFs');

// Hardcoded vault address for bridge locking
const BRIDGE_VAULT_ADDRESS = address('5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP');

class BridgeService {
  constructor() {
    this.connection = createSolanaRpc(devnet);
  }

  async initializeBridge(userKeypair) {
    const wallet = new SimpleWallet(userKeypair);
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed'
    });

    // Use the actual IDL from the JSON file
    const program = new Program(CROSS_IDL, provider);
    return { program, provider };
  }

  async getBridgeStatus() {
    try {
      const vaultBalance = await this.connection.getBalance(BRIDGE_VAULT_ADDRESS);
      return {
        isActive: true,
        vaultBalance: vaultBalance / 1e9,
        vaultAddress: BRIDGE_VAULT_ADDRESS.toString()
      };
    } catch (error) {
      return {
        isActive: false,
        error: error.message
      };
    }
  }

  async estimateBridgeFee(amount) {
    // Estimate fees for bridge transaction
    const baseFee = 0.01; // 0.01 SOL for transaction
    const bridgeFee = amount * 0.001; // 0.1% bridge fee
    return {
      transactionFee: baseFee,
      bridgeFee: bridgeFee,
      totalFees: baseFee + bridgeFee
    };
  }

  async initiatebridge(userKeypair, amountSOL, destinationAddress) {
    try {
      // Check user balance
      const userBalance = await this.connection.getBalance(userKeypair.publicKey);
      const amountLamports = amountSOL * 1e9;
      const requiredBalance = amountLamports + 10000000; // Amount + 0.01 SOL for fees

      if (userBalance < requiredBalance) {
        throw new Error(`Insufficient balance. Need ${requiredBalance / 1e9} SOL, have ${userBalance / 1e9} SOL`);
      }

      // Initialize bridge program
      const { program } = await this.initializeBridge(userKeypair);

      // Get vault balance before
      const vaultBalanceBefore = await this.connection.getBalance(BRIDGE_VAULT_ADDRESS);

      // Execute lock transaction
      const tx = await program.methods
        .lockFunds(new BN(amountLamports))
        .accounts({
          user: userKeypair.publicKey,
          receiver: address(destinationAddress),
          vault: BRIDGE_VAULT_ADDRESS,
          system_program: address('11111111111111111111111111111111'),
        })
        .rpc();

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify lock success
      const vaultBalanceAfter = await this.connection.getBalance(BRIDGE_VAULT_ADDRESS);
      const lockedAmount = vaultBalanceAfter - vaultBalanceBefore;

      if (lockedAmount <= 0) {
        throw new Error('Funds were not locked successfully');
      }

      // Simulate bridge processing (in real bridge, this would trigger cross-chain process)

      return {
        success: true,
        txSignature: tx,
        lockedAmount: lockedAmount / 1e9,
        vaultAddress: BRIDGE_VAULT_ADDRESS.toString(),
        destinationChain: 'Gorbchain',
        destinationAddress: destinationAddress,
        estimatedArrival: '2-5 minutes',
        bridgeId: `SOL-GORB-${Date.now()}`
      };

    } catch (error) {
      console.error('❌ Bridge failed:', error);
      throw error;
    }
  }

  async trackBridgeProgress(bridgeId) {
    // Simulate bridge progress tracking
    const stages = [
      { step: 1, status: 'completed', description: 'Funds locked on Solana', timestamp: Date.now() - 30000 },
      { step: 2, status: 'processing', description: 'Cross-chain verification', timestamp: Date.now() - 15000 },
      { step: 3, status: 'pending', description: 'Minting on Gorbagana', timestamp: null },
      { step: 4, status: 'pending', description: 'Transfer complete', timestamp: null }
    ];

    return {
      bridgeId,
      currentStep: 2,
      totalSteps: 4,
      stages,
      estimatedCompletion: Date.now() + 120000 // 2 minutes from now
    };
  }

  async getBridgeHistory(userAddress) {
    // Mock bridge history - in production this would come from API/indexer
    return [
      {
        id: 'SOL-GORB-1704067200000',
        from: 'Solana',
        to: 'Gorbagana',
        amount: 1.5,
        status: 'completed',
        timestamp: Date.now() - 86400000, // 1 day ago
        txHash: '4k8jH2...9xPm'
      },
      {
        id: 'SOL-GORB-1704153600000',
        from: 'Solana',
        to: 'Gorbagana',
        amount: 0.5,
        status: 'processing',
        timestamp: Date.now() - 1800000, // 30 minutes ago
        txHash: '7n3mK5...2wQr'
      }
    ];
  }
}

export const bridgeService = new BridgeService();
export default bridgeService;
