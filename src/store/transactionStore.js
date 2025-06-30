import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { address, createSolanaRpc, devnet } from '@solana/kit';
import { Buffer } from 'buffer';
import { supabase } from '../lib/supabase';
import { parseTransactionError } from '../util/errorHandling';

export const useTransactionStore = create((set, get) => ({
  // State
  transactions: [],
  isLoadingSend: false,
  isLoadingTransactions: false,
  txResult: null,

  // Actions
  getTransactions: async (address, chain, environment) => {
    if (!address) return;

    set({ isLoadingTransactions: true });

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`sender_address.eq.${address},receiver_address.eq.${address}`)
        .eq("chain", chain)
        .eq("environment", environment || "testnet")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;

      set({
        transactions: data || [],
        isLoadingTransactions: false
      });
    } catch (err) {
      set({ isLoadingTransactions: false });
      console.error('Error fetching transactions:', err);
    }
  },

  sendTransaction: async ({ toAddress, amount, walletAddress, getKeypair, selectedNetwork, getCurrentRpcUrl }) => {
    if (!toAddress || !amount || !walletAddress || !getKeypair || !selectedNetwork) {
      throw new Error('Missing required parameters for transaction');
    }

    console.log("keypair", getKeypair().publicKey, getKeypair().publicKey.toString());

    const keypair = getKeypair();
    if (!keypair) {
      throw new Error('No wallet keypair available');
    }

    set({ isLoadingSend: true, txResult: null });

    try {
      // Connect to the network using custom RPC URL if available, otherwise default
      const rpcUrl = getCurrentRpcUrl ? getCurrentRpcUrl() : selectedNetwork.rpcUrl;
      const connection = createSolanaRpc(rpcUrl);

      // Create transaction
      const toPublicKey = address(toAddress);
      const fromPublicKey = address(walletAddress);
      const lamports = amount * 1000000000; // Convert to lamports

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Create transfer instruction
      const transferInstruction = {
        keys: [
          { pubkey: fromPublicKey, isSigner: true, isWritable: true },
          { pubkey: toPublicKey, isSigner: false, isWritable: true },
        ],
        programId: devnet.SystemProgram.programId,
        data: Buffer.alloc(0),
      };

      // Create and sign transaction using serialize message approach (like submitter.js)
      const transaction = {
        recentBlockhash: blockhash,
        feePayer: fromPublicKey,
        instructions: [transferInstruction],
      };

      console.log("=== USING SERIALIZE MESSAGE APPROACH ===");

      try {
        // Step 1: Serialize the message (what needs to be signed)
        const messageBytes = transaction.serializeMessage();
        console.log("Message serialized, length:", messageBytes.length);

        // Step 2: Sign the message bytes directly with keypair's secretKey
        console.log("Signing message bytes with keypair...");

        // Import tweetnacl for signing since Solana uses Ed25519
        const nacl = await import('tweetnacl');

        // Create signature using the secret key
        const signature = nacl.default.sign.detached(messageBytes, keypair.secretKey);
        console.log("Signature created, length:", signature.length);

        // Step 3: Create wire transaction format manually
        // Format: [num_signatures] + [signature] + [message]
        const wireTransaction = Buffer.concat([
          Buffer.from([1]), // 1 signature
          Buffer.from(signature), // the signature
          Buffer.from(messageBytes) // the message
        ]);

        console.log("Wire transaction created, total length:", wireTransaction.length);

        // Step 4: Send the raw wire transaction
        console.log("Sending wire transaction...");
        const signature_result = await connection.sendRawTransaction(wireTransaction, {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        });

                        console.log("✅ Transaction sent successfully with signature:", signature_result);

        // Simple confirmation check using new API
        console.log("Confirming transaction...");

        // Get the latest blockhash for confirmation strategy
        const latestBlockhash = await connection.getLatestBlockhash('confirmed');

        // Use the new TransactionConfirmationStrategy
        const confirmationStrategy = {
          signature: signature_result,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        };

        const confirmation = await connection.confirmTransaction(confirmationStrategy, 'confirmed');

        if (confirmation.value.err) {
          throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
        }

        console.log("✅ Transaction confirmed successfully:", signature_result);
        set({
          txResult: signature_result,
          isLoadingSend: false
        });

        toast.success('Transaction sent successfully!');

        // Store transaction in database
        try {
          const randomId = Math.floor(Math.random() * 9000000000) + 1000000000;
          await supabase.from("transactions").insert({
            id: randomId,
            hash: signature_result,
            sender_address: walletAddress,
            receiver_address: toAddress,
            sent_amount: amount,
            received_amount: amount,
            chain: selectedNetwork.chain,
            status: "success",
            created_at: new Date().toISOString(),
            environment: selectedEnvironment || "testnet"
          });
        } catch (dbErr) {
          console.warn('Failed to store transaction in database:', dbErr);
        }

        return signature_result;

            } catch (error) {
        const userFriendlyError = parseTransactionError(error);
        throw new Error(userFriendlyError);
      }
    } catch (err) {
      console.log("err", err);
      set({ isLoadingSend: false });
      throw new Error('Transaction failed: ' + err.message);
    }
  },

  clearTransactionResult: () => {
    set({ txResult: null });
  },

  setLoadingSend: (loading) => {
    set({ isLoadingSend: loading });
  },
}));
