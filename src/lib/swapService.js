import { Connection, PublicKey, SystemProgram, Transaction, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

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
  NATIVE_SOL_POOL: "native_sol_pool",
  NATIVE_SOL_VAULT: "native_sol_vault",
};

// Helper functions
function isNativeSOL(tokenMint) {
  if (typeof tokenMint === 'string') {
    return tokenMint === NATIVE_SOL_MINT.toString() || tokenMint === 'native-gorb';
  }
  return tokenMint.equals(NATIVE_SOL_MINT);
}

function derivePoolPDA(tokenA, tokenB, isNativeSOLPool = false) {
  if (isNativeSOLPool) {
    const nonSOLToken = isNativeSOL(tokenA) ? tokenB : tokenA;
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.NATIVE_SOL_POOL), nonSOLToken.toBuffer()],
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
    // For native SOL, the vault is the pool itself
    return [poolPDA, 0];
  }
  if (isNativeSOLPool) {
    // For tokens in a native SOL pool
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.NATIVE_SOL_VAULT), poolPDA.toBuffer(), tokenMint.toBuffer()],
      AMM_PROGRAM_ID
    );
  }
  // For regular token-to-token pools
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
    const [poolPDA] = derivePoolPDA(solToken, otherToken, true);
    
    try {
      const poolInfo = await connection.getAccountInfo(poolPDA);
      if (poolInfo) {
        return {
          poolPDA,
          tokenA: solToken,
          tokenB: otherToken,
          directionAtoB: isNativeSOL(tokenX),
          isNativeSOLPool: true
        };
      }
    } catch (error) {
      console.log("Native SOL pool not found");
    }
    throw new Error(`No native SOL pool found for: ${tokenX.toString()} <-> ${tokenY.toString()}`);
  }

  // Try configuration 1: tokenX as tokenA, tokenY as tokenB
  const [poolPDA1] = derivePoolPDA(tokenX, tokenY, false);
  try {
    const poolInfo1 = await connection.getAccountInfo(poolPDA1);
    if (poolInfo1) {
      return {
        poolPDA: poolPDA1,
        tokenA: tokenX,
        tokenB: tokenY,
        directionAtoB: true,
        isNativeSOLPool: false
      };
    }
  } catch (error) {
    console.log("Pool configuration 1 not found");
  }

  // Try configuration 2: tokenY as tokenA, tokenX as tokenB
  const [poolPDA2] = derivePoolPDA(tokenY, tokenX, false);
  try {
    const poolInfo2 = await connection.getAccountInfo(poolPDA2);
    if (poolInfo2) {
      return {
        poolPDA: poolPDA2,
        tokenA: tokenY,
        tokenB: tokenX,
        directionAtoB: false,
        isNativeSOLPool: false
      };
    }
  } catch (error) {
    console.log("Pool configuration 2 not found");
  }

  throw new Error(`No pool found for token pair: ${tokenX.toString()} <-> ${tokenY.toString()}`);
}

/**
 * Swap Token X to Token Y (non-native tokens only)
 */
async function swapXToY(fromTokenAmount, fromToken, toToken, wallet, connection) {
  try {
    console.log("🚀 Starting Token → Token swap:", {
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      amount: fromTokenAmount
    });

    const FROM_TOKEN_MINT = new PublicKey(fromToken.mint);
    const TO_TOKEN_MINT = new PublicKey(toToken.mint);

    // Find pool configuration
    const { poolPDA, tokenA, tokenB, directionAtoB, isNativeSOLPool } = await findPoolConfiguration(
      FROM_TOKEN_MINT,
      TO_TOKEN_MINT,
      connection
    );

    console.log("✅ Found pool configuration:", {
      poolPDA: poolPDA.toString(),
      tokenA: tokenA.toString(),
      tokenB: tokenB.toString(),
      direction: directionAtoB ? "A to B" : "B to A",
      isNativeSOLPool
    });

    // Derive vaults
    const [vaultA] = deriveVaultPDA(poolPDA, tokenA, isNativeSOLPool);
    const [vaultB] = deriveVaultPDA(poolPDA, tokenB, isNativeSOLPool);

    console.log("📍 Derived vaults:", {
      vaultA: vaultA.toString(),
      vaultB: vaultB.toString()
    });

    // Get user token accounts
    const userFromToken = getAssociatedTokenAddressSync(
      FROM_TOKEN_MINT,
      wallet.publicKey,
      false,
      SPL_TOKEN_PROGRAM_ID,
      ATA_PROGRAM_ID
    );
    const userToToken = getAssociatedTokenAddressSync(
      TO_TOKEN_MINT,
      wallet.publicKey,
      false,
      SPL_TOKEN_PROGRAM_ID,
      ATA_PROGRAM_ID
    );

    console.log("👤 User token accounts:", {
      userFromToken: userFromToken.toString(),
      userToToken: userToToken.toString()
    });

    // Check if token accounts exist and create them if needed
    const fromTokenInfo = await connection.getAccountInfo(userFromToken);
    const toTokenInfo = await connection.getAccountInfo(userToToken);
    const instructions = [];

    if (!fromTokenInfo && !FROM_TOKEN_MINT.equals(NATIVE_SOL_MINT)) {
      console.log("⚠️ From token account not found, creating ATA for:", FROM_TOKEN_MINT.toString());
      instructions.push(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          userFromToken,
          wallet.publicKey,
          FROM_TOKEN_MINT,
          SPL_TOKEN_PROGRAM_ID,
          ATA_PROGRAM_ID
        )
      );
    }

    if (!toTokenInfo && !TO_TOKEN_MINT.equals(NATIVE_SOL_MINT)) {
      console.log("⚠️ To token account not found, creating ATA for:", TO_TOKEN_MINT.toString());
      instructions.push(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          userToToken,
          wallet.publicKey,
          TO_TOKEN_MINT,
          SPL_TOKEN_PROGRAM_ID,
          ATA_PROGRAM_ID
        )
      );
    }

    // If we need to create ATAs, send that transaction first
    if (instructions.length > 0) {
      console.log("📤 Creating associated token accounts...");
      const ataTransaction = new Transaction().add(...instructions);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      ataTransaction.feePayer = wallet.publicKey;
      ataTransaction.recentBlockhash = blockhash;
      ataTransaction.lastValidBlockHeight = lastValidBlockHeight;

      const signedAtaTx = await wallet.signTransaction(ataTransaction);
      const ataSig = await connection.sendRawTransaction(signedAtaTx.serialize());
      await connection.confirmTransaction(ataSig, 'confirmed');
      console.log("✅ Associated token accounts created:", ataSig);
    }

    // Convert amount to lamports
    const amountInLamports = tokenAmountToLamports(fromTokenAmount, fromToken.decimals);

    console.log("🔄 Swap parameters:", {
      amountIn: fromTokenAmount,
      amountInLamports: amountInLamports.toString(),
      direction: directionAtoB ? "A to B" : "B to A"
    });

    // Create swap transaction
    const transaction = new Transaction();
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Prepare accounts (matching Rust program order)
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
    console.log("📤 Sending swap transaction...");
    const signedTransaction = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());

    console.log("⏳ Confirming transaction:", signature);
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log("✅ Token → Token swap completed:", signature);
    return { success: true, signature };
  } catch (error) {
    console.error("❌ Error in Token → Token swap:", error);
    throw error;
  }
}

/**
 * Swap involving native SOL (either SOL to Token or Token to SOL)
 */
async function swapWithNativeSOL(fromTokenAmount, fromToken, toToken, wallet, connection) {
  try {
    const isFromSOL = isNativeSOL(fromToken.mint);
    const isToSOL = isNativeSOL(toToken.mint);

    if (!isFromSOL && !isToSOL) {
      throw new Error("This function is for native SOL swaps only");
    }

    console.log("🚀 Starting native SOL swap:", {
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      amount: fromTokenAmount,
      direction: isFromSOL ? "SOL → Token" : "Token → SOL"
    });

    const FROM_TOKEN_MINT = new PublicKey(fromToken.mint);
    const TO_TOKEN_MINT = new PublicKey(toToken.mint);

    // Find pool configuration
    const { poolPDA, tokenA, tokenB, directionAtoB, isNativeSOLPool } = await findPoolConfiguration(
      FROM_TOKEN_MINT,
      TO_TOKEN_MINT,
      connection
    );

    console.log("✅ Found pool configuration:", {
      poolPDA: poolPDA.toString(),
      tokenA: tokenA.toString(),
      tokenB: tokenB.toString(),
      direction: directionAtoB ? "A to B" : "B to A",
      isNativeSOLPool
    });

    // Derive vaults (handles native SOL automatically)
    const [vaultA] = deriveVaultPDA(poolPDA, tokenA, isNativeSOLPool);
    const [vaultB] = deriveVaultPDA(poolPDA, tokenB, isNativeSOLPool);

    console.log("📍 Derived vaults:", {
      vaultA: vaultA.toString(),
      vaultB: vaultB.toString()
    });

    // Get user token accounts (handles native SOL automatically)
    const userFromToken = getAssociatedTokenAddressSync(
      FROM_TOKEN_MINT,
      wallet.publicKey,
      false,
      SPL_TOKEN_PROGRAM_ID,
      ATA_PROGRAM_ID
    );
    const userToToken = getAssociatedTokenAddressSync(
      TO_TOKEN_MINT,
      wallet.publicKey,
      false,
      SPL_TOKEN_PROGRAM_ID,
      ATA_PROGRAM_ID
    );

    console.log("👤 User token accounts:", {
      userFromToken: userFromToken.toString(),
      userToToken: userToToken.toString()
    });

    // Check if token accounts exist and create them if needed
    const fromTokenInfo = await connection.getAccountInfo(userFromToken);
    const toTokenInfo = await connection.getAccountInfo(userToToken);
    const instructions = [];

    if (!fromTokenInfo && !FROM_TOKEN_MINT.equals(NATIVE_SOL_MINT)) {
      console.log("⚠️ From token account not found, creating ATA for:", FROM_TOKEN_MINT.toString());
      instructions.push(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          userFromToken,
          wallet.publicKey,
          FROM_TOKEN_MINT,
          SPL_TOKEN_PROGRAM_ID,
          ATA_PROGRAM_ID
        )
      );
    }

    if (!toTokenInfo && !TO_TOKEN_MINT.equals(NATIVE_SOL_MINT)) {
      console.log("⚠️ To token account not found, creating ATA for:", TO_TOKEN_MINT.toString());
      instructions.push(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          userToToken,
          wallet.publicKey,
          TO_TOKEN_MINT,
          SPL_TOKEN_PROGRAM_ID,
          ATA_PROGRAM_ID
        )
      );
    }

    // If we need to create ATAs, send that transaction first
    if (instructions.length > 0) {
      console.log("📤 Creating associated token accounts for native SOL swap...");
      const ataTransaction = new Transaction().add(...instructions);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      ataTransaction.feePayer = wallet.publicKey;
      ataTransaction.recentBlockhash = blockhash;
      ataTransaction.lastValidBlockHeight = lastValidBlockHeight;

      const signedAtaTx = await wallet.signTransaction(ataTransaction);
      const ataSig = await connection.sendRawTransaction(signedAtaTx.serialize());
      await connection.confirmTransaction(ataSig, 'confirmed');
      console.log("✅ Associated token accounts created:", ataSig);
    }

    // Convert amount to lamports
    const amountInLamports = isFromSOL
      ? BigInt(Math.floor(fromTokenAmount * LAMPORTS_PER_SOL))
      : tokenAmountToLamports(fromTokenAmount, fromToken.decimals);

    console.log("🔄 Native SOL swap parameters:", {
      amountIn: fromTokenAmount,
      amountInLamports: amountInLamports.toString(),
      direction: directionAtoB ? "A to B" : "B to A",
      isFromSOL,
      isToSOL
    });

    // Create swap transaction
    const transaction = new Transaction();
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Prepare accounts (same structure as regular swap)
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

    console.log("📝 Native SOL instruction data:", data.toString('hex'));

    // Add swap instruction
    transaction.add({
      keys: accounts,
      programId: AMM_PROGRAM_ID,
      data,
    });

    // Sign and send
    console.log("📤 Sending native SOL swap transaction...");
    const signedTransaction = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());

    console.log("⏳ Confirming transaction:", signature);
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log("✅ Native SOL swap completed:", signature);
    return { success: true, signature };
  } catch (error) {
    console.error("❌ Error in native SOL swap:", error);
    throw error;
  }
}

/**
 * Universal swap function that automatically detects if native SOL is involved
 * @param fromTokenAmount - Amount to swap (in token units, not lamports)
 * @param fromToken - Source token info with { mint, symbol, decimals }
 * @param toToken - Destination token info with { mint, symbol, decimals }
 * @param wallet - Wallet object with { publicKey, signTransaction }
 * @param connection - Solana connection
 * @returns Promise<{ success: boolean, signature?: string, error?: string }>
 */
export async function universalSwap(fromTokenAmount, fromToken, toToken, wallet, connection) {
  try {
    const isFromSOL = isNativeSOL(fromToken.mint);
    const isToSOL = isNativeSOL(toToken.mint);

    console.log("🔍 Swap type detection:", {
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      isFromSOL,
      isToSOL
    });

    if (isFromSOL || isToSOL) {
      return await swapWithNativeSOL(fromTokenAmount, fromToken, toToken, wallet, connection);
    } else {
      return await swapXToY(fromTokenAmount, fromToken, toToken, wallet, connection);
    }
  } catch (error) {
    console.error("❌ Error in universal swap:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
