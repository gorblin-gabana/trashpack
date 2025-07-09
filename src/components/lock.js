import { address, createSolanaRpc } from '@solana/kit';
import pkg from '@coral-xyz/anchor';
const { Program, AnchorProvider, Wallet, BN } = pkg;
import fs from 'fs';
import os from 'os';

// Program ID (matches your deployed program)
const PROGRAM_ID = address('FzzCqoaXXYWYhJ62xA1feEAsaYdBfRkyTy2zBgDkYjFs');

// Hardcoded vault address
const VAULT_ADDRESS = address('5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP');

// Load IDL
const IDL = JSON.parse(fs.readFileSync('./target/idl/secure_messenger.json', 'utf8'));

// Setup connection
const connection = createSolanaRpc({
  cluster: 'devnet',
  commitment: 'confirmed',
});

// Convert to Keypair type from @solana/kit
function toKeypair(secret) {
  return {
    publicKey: secret.slice(0, 32),
    secret: secret.slice(32),
  };
}

async function lockFunds() {
  try {

    // Step 1: Load user keypair
    const keypairPath = os.homedir() + '/.config/solana/id.json';
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    const userKeypair = toKeypair(new Uint8Array(keypairData));
    

    // Step 2: Check user balance
    const userBalance = await connection.getBalance(userKeypair.publicKey);

    if (userBalance < 1e9) { // Less than 1 SOL
      return;
    }

    // Step 3: Setup Anchor
    const wallet = new Wallet(userKeypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed'
    });

    const program = new Program(IDL, provider);
    
    const vaultBalanceBefore = await connection.getBalance(VAULT_ADDRESS);

    // Step 6: Specify amount to lock (in lamports)
    const amountToLock = 1000000000; // 1 SOL in lamports

    // Check if user has enough funds
    if (userBalance < amountToLock + 10000000) { // Amount + 0.01 SOL for fees
      return;
    }

    // Step 7: Call lock_funds function with hardcoded vault address
    const tx = await program.methods
      .lockFunds(new BN(amountToLock))
      .accounts({
        user: userKeypair.publicKey,
        vault: VAULT_ADDRESS, // Using hardcoded address
        systemProgram: address('11111111111111111111111111111111'), // System Program
      })
      .rpc();

    // Step 8: Wait for confirmation then check balances
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check final balances
    const finalUserBalance = await connection.getBalance(userKeypair.publicKey);
    const finalVaultBalance = await connection.getBalance(VAULT_ADDRESS);

    const userBalanceChange = finalUserBalance - userBalance;
    const vaultBalanceChange = finalVaultBalance - vaultBalanceBefore;
    

    // Step 9: Listen for events
    
    const eventListener = program.addEventListener('FundsLocked', (event, slot) => {
      
    });

    // Listen for a few seconds
    setTimeout(() => {
      program.removeEventListener(eventListener);
      
    }, 5000);

  } catch (error) {
    console.error('❌ Error locking funds:', error);
    
    if (error.message.includes('insufficient funds')) {
    } else if (error.logs) {
      console.error('📋 Program logs:', error.logs);
    }
  }
}

// Main execution


lockFunds().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});