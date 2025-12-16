import { address, createSolanaRpc, devnet } from "@solana/kit";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import CROSS_IDL from "./cross_idl.json";
import crypto from "crypto";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  PROGRAM_ID,
} from "@solana/web3.js";
import BN from "bn.js";
import {  getAssociatedTokenAddress,
  createSyncNativeInstruction,
  createAssociatedTokenAccountInstruction,
  NATIVE_MINT,
 } from "@solana/spl-token";

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
    return txs.map((tx) => {
      tx.sign(this.payer);
      return tx;
    });
  }
}

// Program ID (matches deployed program)

// Hardcoded vault address for bridge locking
const BRIDGE_VAULT_ADDRESS = address(
  "5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP"
);

class BridgeService {
  constructor() {
    this.connection = createSolanaRpc(devnet);
  }

  async initializeBridge(userKeypair) {
    const wallet = new SimpleWallet(userKeypair);
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    // Use the actual IDL from the JSON file
    const program = new Program(CROSS_IDL, provider);
    return { program, provider };
  }

  async getBridgeStatus() {
    try {
      const vaultBalance = await this.connection.getBalance(
        BRIDGE_VAULT_ADDRESS
      );
      return {
        isActive: true,
        vaultBalance: vaultBalance / 1e9,
        vaultAddress: BRIDGE_VAULT_ADDRESS.toString(),
      };
    } catch (error) {
      return {
        isActive: false,
        error: error.message,
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
      totalFees: baseFee + bridgeFee,
    };
  }

  async initiatebridge(userKeypair, amountSOL, destinationAddress) {
    try {
      // Check user balance
      const userBalance = await this.connection.getBalance(
        userKeypair.publicKey
      );
      const amountLamports = amountSOL * 1e9;
      const requiredBalance = amountLamports + 10000000; // Amount + 0.01 SOL for fees

      if (userBalance < requiredBalance) {
        throw new Error(
          `Insufficient balance. Need ${requiredBalance / 1e9} SOL, have ${
            userBalance / 1e9
          } SOL`
        );
      }

      // Initialize bridge program
      const { program } = await this.initializeBridge(userKeypair);

      // Get vault balance before
      const vaultBalanceBefore = await this.connection.getBalance(
        BRIDGE_VAULT_ADDRESS
      );

      // Execute lock transaction
      const tx = await program.methods
        .lockFunds(new BN(amountLamports))
        .accounts({
          user: userKeypair.publicKey,
          receiver: address(destinationAddress),
          vault: BRIDGE_VAULT_ADDRESS,
          system_program: address("11111111111111111111111111111111"),
        })
        .rpc();

      // Wait for confirmation
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify lock success
      const vaultBalanceAfter = await this.connection.getBalance(
        BRIDGE_VAULT_ADDRESS
      );
      const lockedAmount = vaultBalanceAfter - vaultBalanceBefore;

      if (lockedAmount <= 0) {
        throw new Error("Funds were not locked successfully");
      }

      // Simulate bridge processing (in real bridge, this would trigger cross-chain process)

      return {
        success: true,
        txSignature: tx,
        lockedAmount: lockedAmount / 1e9,
        vaultAddress: BRIDGE_VAULT_ADDRESS.toString(),
        destinationChain: "Gorbchain",
        destinationAddress: destinationAddress,
        estimatedArrival: "2-5 minutes",
        bridgeId: `SOL-GORB-${Date.now()}`,
      };
    } catch (error) {
      console.error("❌ Bridge failed:", error);
      throw error;
    }
  }

  async trackBridgeProgress(bridgeId) {
    // Simulate bridge progress tracking
    const stages = [
      {
        step: 1,
        status: "completed",
        description: "Funds locked on Solana",
        timestamp: Date.now() - 30000,
      },
      {
        step: 2,
        status: "processing",
        description: "Cross-chain verification",
        timestamp: Date.now() - 15000,
      },
      {
        step: 3,
        status: "pending",
        description: "Minting on Gorbagana",
        timestamp: null,
      },
      {
        step: 4,
        status: "pending",
        description: "Transfer complete",
        timestamp: null,
      },
    ];

    return {
      bridgeId,
      currentStep: 2,
      totalSteps: 4,
      stages,
      estimatedCompletion: Date.now() + 120000, // 2 minutes from now
    };
  }

  async getBridgeHistory(userAddress) {
    // Mock bridge history - in production this would come from API/indexer
    return [
      {
        id: "SOL-GORB-1704067200000",
        from: "Solana",
        to: "Gorbagana",
        amount: 1.5,
        status: "completed",
        timestamp: Date.now() - 86400000, // 1 day ago
        txHash: "4k8jH2...9xPm",
      },
      {
        id: "SOL-GORB-1704153600000",
        from: "Solana",
        to: "Gorbagana",
        amount: 0.5,
        status: "processing",
        timestamp: Date.now() - 1800000, // 30 minutes ago
        txHash: "7n3mK5...2wQr",
      },
    ];
  }

  getInstructionDiscriminator(name) {
    return crypto
      .createHash("sha256")
      .update(`global:${name}`)
      .digest()
      .slice(0, 8);
  }

  /** Lock PDA */
  deriveLockPda(user, mint, programId) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("lock"), user.toBuffer(), mint.toBuffer()],
      programId
    )[0];
  }

  async buildLockTokensInstruction(params) {
    const discriminator = getInstructionDiscriminator("lock_tokens");
    const amount = new BN(params.amountLamports);

    const data = Buffer.alloc(8 + 8 + 32);
    discriminator.copy(data, 0);
    amount.toArrayLike(Buffer, "le", 8).copy(data, 8);
    params.destination.toBuffer().copy(data, 16);
    const ADMIN_ADDRESS = new PublicKey(
      "HnHsrxJwRfDs1wNS61bvkfNRGExGEJ7nvRu9F5TAviFY"
    );

    const adminTokenAccount = await getAssociatedTokenAddress(
      params.mint,
      ADMIN_ADDRESS
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      params.mint,
      params.user.publicKey
    );

    const lockPda = deriveLockPda(params.user, params.mint, PROGRAM_ID);

    return new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: params.user, isSigner: true, isWritable: true },
        { pubkey: ADMIN_ADDRESS, isSigner: false, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: adminTokenAccount, isSigner: false, isWritable: true },
        { pubkey: lockPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data,
    });
  }

  // main lock function
  async lock_token() {
    const { connection, wallet, programId, admin, destination, solAmount } =
    params;

  const user = wallet.publicKey;
  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

  // ATAs
  const userAta = await getAssociatedTokenAddress(NATIVE_MINT, user);
  const adminAta = await getAssociatedTokenAddress(NATIVE_MINT, admin);

  const tx = new Transaction();

  // Create ATAs if needed
  const userAtaInfo = await connection.getAccountInfo(userAta);
  if (!userAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        userAta,
        user,
        NATIVE_MINT
      )
    );
  }

  const adminAtaInfo = await connection.getAccountInfo(adminAta);
  if (!adminAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        adminAta,
        admin,
        NATIVE_MINT
      )
    );
  }

  // Wrap SOL
  tx.add(
    SystemProgram.transfer({
      fromPubkey: user,
      toPubkey: userAta,
      lamports,
    }),
    createSyncNativeInstruction(userAta)
  );

  // PDA
  const lockPda = deriveLockPda(user, NATIVE_MINT, programId);

  // Init lock account
  tx.add(
    this.buildInitLockInstruction({
      user,
      admin,
      userTokenAccount: userAta,
      lockPda,
      programId,
    })
  );

  // Lock
  tx.add(
    buildLockTokensInstruction({
      user,
      admin,
      userTokenAccount: userAta,
      adminTokenAccount: adminAta,
      lockPda,
      amountLamports: lamports,
      destination,
      programId,
    })
  );

  tx.feePayer = user;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const signedTx = await wallet.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signedTx.serialize());

  return sig;
  }
}

export const bridgeService = new BridgeService();
export default bridgeService;
