import { address, createSolanaRpc, devnet } from '@solana/kit';
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
    console.log('🔒 Starting Fund Lock Process...');
    console.log('=' .repeat(60));

    // Step 1: Load user keypair
    const keypairPath = os.homedir() + '/.config/solana/id.json';
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    const userKeypair = toKeypair(new Uint8Array(keypairData));
    
    console.log('👤 User Address:', userKeypair.publicKey.toString());

    // Step 2: Check user balance
    const userBalance = await connection.getBalance(userKeypair.publicKey);
    console.log('💰 User balance:', userBalance / 1e9, 'SOL');

    if (userBalance < 1e9) { // Less than 1 SOL
      console.log('⚠️  You need at least 1 SOL to lock funds (for transaction fees)');
      return;
    }

    // Step 3: Setup Anchor
    const wallet = new Wallet(userKeypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed'
    });

    const program = new Program(IDL, provider);
    console.log('📡 Program ID:', program.programId.toString());

    // Step 4: Use hardcoded vault address
    console.log('🏦 Hardcoded Vault Address:', VAULT_ADDRESS.toString());

    // Step 5: Check vault balance before locking
    const vaultBalanceBefore = await connection.getBalance(VAULT_ADDRESS);
    console.log('🏦 Vault balance before lock:', vaultBalanceBefore / 1e9, 'SOL');

    // Step 6: Specify amount to lock (in lamports)
    const amountToLock = 1000000000; // 1 SOL in lamports
    console.log('🔒 Amount to lock:', amountToLock, 'lamports (', amountToLock / 1e9, 'SOL)');

    // Check if user has enough funds
    if (userBalance < amountToLock + 10000000) { // Amount + 0.01 SOL for fees
      console.log(`⚠️  You need at least ${(amountToLock + 10000000) / 1e9} SOL (including fees)`);
      return;
    }

    console.log('🔒 Calling lock_funds function...');

    // Step 7: Call lock_funds function with hardcoded vault address
    const tx = await program.methods
      .lockFunds(new BN(amountToLock))
      .accounts({
        user: userKeypair.publicKey,
        vault: VAULT_ADDRESS, // Using hardcoded address
        systemProgram: address('11111111111111111111111111111111'), // System Program
      })
      .rpc();

    console.log('📝 Transaction signature:', tx);
    console.log('✅ Funds locked successfully!');

    // Step 8: Wait for confirmation then check balances
    console.log('⏳ Waiting for confirmation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check final balances
    const finalUserBalance = await connection.getBalance(userKeypair.publicKey);
    const finalVaultBalance = await connection.getBalance(VAULT_ADDRESS);

    console.log('=' .repeat(60));
    console.log('📊 FINAL RESULTS:');
    console.log('👤 User balance after lock:', finalUserBalance / 1e9, 'SOL');
    console.log('🏦 Vault balance after lock:', finalVaultBalance / 1e9, 'SOL');
    
    const userBalanceChange = finalUserBalance - userBalance;
    const vaultBalanceChange = finalVaultBalance - vaultBalanceBefore;
    
    console.log('📉 User balance change:', userBalanceChange / 1e9, 'SOL');
    console.log('📈 Vault balance change:', '+', vaultBalanceChange / 1e9, 'SOL');
    console.log('=' .repeat(60));

    // Step 9: Listen for events
    console.log('👂 Listening for FundsLocked events...');
    
    const eventListener = program.addEventListener('FundsLocked', (event, slot) => {
      console.log('🎉 FundsLocked Event Detected:');
      console.log('   User:', event.user.toString());
      console.log('   Amount:', event.amount.toString(), 'lamports');
      console.log('   Timestamp:', event.timestamp.toString());
      console.log('   Slot:', slot);
    });

    // Listen for a few seconds
    setTimeout(() => {
      program.removeEventListener(eventListener);
      console.log('🔇 Stopped listening for events');
      
      console.log('\n🎯 TRANSACTION SUMMARY:');
      console.log(`   Signature: ${tx}`);
      console.log(`   Amount Locked: ${amountToLock / 1e9} SOL`);
      console.log(`   Vault Address: ${VAULT_ADDRESS.toString()}`);
      console.log('   Status: ✅ SUCCESS');
      console.log('\n💡 Funds are now locked in the hardcoded vault address!');
      
    }, 5000);

  } catch (error) {
    console.error('❌ Error locking funds:', error);
    
    if (error.message.includes('insufficient funds')) {
      console.log('💡 Hint: You might not have enough SOL for the transaction');
    } else if (error.logs) {
      console.error('📋 Program logs:', error.logs);
    }
  }
}

// Main execution
console.log('🔒 SOLANA FUND LOCK SCRIPT');
console.log('✅ Uses hardcoded vault address: 5rYp2nNjSYxqVDnGAqyjRozXmPxStjpdzjvHng7eVZjP');
console.log('=' .repeat(60));

lockFunds().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});