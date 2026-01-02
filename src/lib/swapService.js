import { Connection, PublicKey, SystemProgram, Transaction, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

// Constants
const AMM_PROGRAM_ID = new PublicKey("EtGrXaRpEdozMtfd8tbkbrbDN8LqZNba3xWTdT3HtQWq");
const SPL_TOKEN_PROGRAM_ID = new PublicKey("G22oYgZ6LnVcy7v8eSNi2xpNk1NcZiPD8CVKSTut7oZ6");
const ATA_PROGRAM_ID = new PublicKey("GoATGVNeSXerFerPqTJ8hcED1msPWHHLxao2vwBYqowm");
const NATIVE_SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

const INSTRUCTION_DISCRIMINATORS = {
  SWAP: 3,
};

const INSTRUCTION_DATA_SIZES = {
  SWAP: 1 + 8 + 1, // discriminator + amount_in + direction_a_to_b
};

const SEEDS = {
  POOL: "pool",
  VAULT: "vault",
  MINT: "mint",
};

// Helper functions
function isNativeSOL(tokenMint) {
  return tokenMint.equals(NATIVE_SOL_MINT);
}

function derivePoolPDA(tokenA, tokenB) {
  if (isNativeSOL(tokenA) || isNativeSOL(tokenB)) {
    const nonSOLToken = isNativeSOL(tokenA) ? tokenB : tokenA;
    return PublicKey.findProgramAddressSync(
      [Buffer.from("native_sol_pool"), nonSOLToken.toBuffer()],
      AMM_PROGRAM_ID
    );
  }
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.POOL), tokenA.toBuffer(), tokenB.toBuffer()],
    AMM_PROGRAM_ID
  );
}

function deriveVaultPDA(poolPDA, tokenMint, isNativeSOLPool = false) {
  if (isNativeSOL(tokenMint)) {
    return [poolPDA, 0];
  }
  if (isNativeSOLPool) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("native_sol_vault"), poolPDA.toBuffer(), tokenMint.toBuffer()],
      AMM_PROGRAM_ID
    );
  }
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.VAULT), poolPDA.toBuffer(), tokenMint.toBuffer()],
    AMM_PROGRAM_ID
  );
}

function getUserTokenAccount(tokenMint, userPublicKey) {
  if (isNativeSOL(tokenMint)) {
    return userPublicKey;
  }
  return getAssociatedTokenAddressSync(
    tokenMint,
    userPublicKey,
    false,
    SPL_TOKEN_PROGRAM_ID,
    ATA_PROGRAM_ID
  );
}

function tokenAmountToLamports(amount, decimals) {
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
}

function getCommonAccounts() {
  return [
    { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: ATA_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
}

async function findPoolConfiguration(tokenX, tokenY, connection) {
  const isSOLPool = isNativeSOL(tokenX) || isNativeSOL(tokenY);
  
  if (isSOLPool) {
    const solToken = isNativeSOL(tokenX) ? tokenX : tokenY;
    const otherToken = isNativeSOL(tokenX) ? tokenY : tokenX;
    const [poolPDA] = derivePoolPDA(solToken, otherToken);
    
    try {
      const poolInfo = await connection.getAccountInfo(poolPDA);
      if (poolInfo) {
        return {
          poolPDA,
          tokenA: solToken,
          tokenB: otherToken,
          directionAtoB: isNativeSOL(tokenX)
        };
      }
    } catch (error) {
      console.log("Native SOL pool not found");
    }
    throw new Error(`No native SOL pool found for: ${tokenX.toString()} <-> ${tokenY.toString()}`);
  }

  // Try configuration 1
  const [poolPDA1] = derivePoolPDA(tokenX, tokenY);
  try {
    const poolInfo1 = await connection.getAccountInfo(poolPDA1);
    if (poolInfo1) {
      return {
        poolPDA: poolPDA1,
        tokenA: tokenX,
        tokenB: tokenY,
        directionAtoB: true
      };
    }
  } catch (error) {
    console.log("Pool configuration 1 not found");
  }

  // Try configuration 2
  const [poolPDA2] = derivePoolPDA(tokenY, tokenX);
  try {
    const poolInfo2 = await connection.getAccountInfo(poolPDA2);
    if (poolInfo2) {
      return {
        poolPDA: poolPDA2,
        tokenA: tokenY,
        tokenB: tokenX,
        directionAtoB: false
      };
    }
  } catch (error) {
    console.log("Pool configuration 2 not found");
  }

  throw new Error(`No pool found for token pair: ${tokenX.toString()} <-> ${tokenY.toString()}`);
}

// Main swap function
export async function universalSwap(fromTokenAmount, fromToken, toToken, wallet, connection) {
  try {
    console.log("🚀 Starting swap:", {
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      amount: fromTokenAmount
    });

    const FROM_TOKEN_MINT = new PublicKey(fromToken.mint);
    const TO_TOKEN_MINT = new PublicKey(toToken.mint);

    // Find pool configuration
    const { poolPDA, tokenA, tokenB, directionAtoB } = await findPoolConfiguration(
      FROM_TOKEN_MINT,
      TO_TOKEN_MINT,
      connection
    );

    console.log("✅ Found pool configuration:", {
      poolPDA: poolPDA.toString(),
      tokenA: tokenA.toString(),
      tokenB: tokenB.toString(),
      direction: directionAtoB ? "A to B" : "B to A"
    });

    // Check if native SOL pool
    const isNativeSOLPool = tokenA.equals(NATIVE_SOL_MINT) || tokenB.equals(NATIVE_SOL_MINT);

    // Derive vaults
    const [vaultA] = deriveVaultPDA(poolPDA, tokenA, isNativeSOLPool);
    const [vaultB] = deriveVaultPDA(poolPDA, tokenB, isNativeSOLPool);

    console.log("📍 Derived addresses:", {
      vaultA: vaultA.toString(),
      vaultB: vaultB.toString()
    });

    // Get user token accounts
    const userFromToken = getUserTokenAccount(FROM_TOKEN_MINT, wallet.publicKey);
    const userToToken = getUserTokenAccount(TO_TOKEN_MINT, wallet.publicKey);

    // Convert amount to lamports
    const isFromSOL = isNativeSOL(FROM_TOKEN_MINT);
    const amountInLamports = isFromSOL
      ? BigInt(fromTokenAmount * LAMPORTS_PER_SOL)
      : tokenAmountToLamports(fromTokenAmount, fromToken.decimals);

    console.log("🔄 Swap parameters:", {
      amountIn: fromTokenAmount,
      amountInLamports: amountInLamports.toString(),
      direction: directionAtoB ? "A to B" : "B to A"
    });

    // Create transaction
    const transaction = new Transaction();
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Prepare accounts
    const accounts = [
      { pubkey: poolPDA, isSigner: false, isWritable: true },
      { pubkey: tokenA, isSigner: false, isWritable: false },
      { pubkey: tokenB, isSigner: false, isWritable: false },
      { pubkey: vaultA, isSigner: false, isWritable: true },
      { pubkey: vaultB, isSigner: false, isWritable: true },
      { pubkey: userFromToken, isSigner: false, isWritable: true },
      { pubkey: userToToken, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      ...getCommonAccounts(),
    ];

    // Create instruction data
    const data = Buffer.alloc(INSTRUCTION_DATA_SIZES.SWAP);
    data.writeUInt8(INSTRUCTION_DISCRIMINATORS.SWAP, 0);
    data.writeBigUInt64LE(amountInLamports, 1);
    data.writeUInt8(directionAtoB ? 1 : 0, 9);

    console.log("📝 Instruction data:", data.toString('hex'));

    // Add swap instruction
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Sign and send
    console.log("📤 Sending transaction for signing...");
    const signedTransaction = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());

    console.log("⏳ Confirming transaction:", signature);
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    console.log("✅ Swap completed successfully:", signature);
    return {
      success: true,
      signature
    };
  } catch (error) {
    console.error("❌ Error swapping tokens:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
