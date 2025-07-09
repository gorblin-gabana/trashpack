import { address, createSolanaRpc, devnet } from '@solana/kit';
import { Buffer } from 'buffer';
import { SystemProgram, Transaction } from '@solana/web3.js';

/**
 * Create and prepare a transaction for signing
 */
export async function prepareTransaction(params) {
    const { senderPublicKeyString, receiverPublicKeyString, transferAmt, rpcUrl } = params;
    try {
        // Connect to Solana network
        const rpc = createSolanaRpc(devnet(rpcUrl));

        // Transaction parameters
        const sender = address(senderPublicKeyString);
        const receiver = address(receiverPublicKeyString);
        const transferAmount = transferAmt * 1000000000; // 0.0001 SOL in lamports

        // Get fresh blockhash
        const { blockhash, lastValidBlockHeight } = await rpc.getLatestBlockhash("finalized");

        // Get current block height to estimate time left
        const currentBlockHeight = await rpc.getBlockHeight();
        const blocksRemaining = lastValidBlockHeight - currentBlockHeight;
        const estimatedTimeRemaining = blocksRemaining * 0.4; // ~0.4 seconds per block

        // Create transfer instruction
        const transferInstruction = SystemProgram.transfer({
            fromPubkey: sender,
            toPubkey: receiver,
            lamports: transferAmount,
        });

        // Create a transaction and add the transfer instruction
        const transaction = new Transaction().add(transferInstruction);
        transaction.feePayer = sender;
        transaction.recentBlockhash = blockhash;

        // Serialize the message
        const messageBytes = transaction.serializeMessage();
        const base64Message = Buffer.from(messageBytes).toString('base64');

        return {
            rpc,
            blockhash,
            lastValidBlockHeight,
            base64Message,
            sender
        };
    } catch (error) {
        console.error("Error preparing transaction:", error);
        throw error;
    }
}

/**
 * Complete the transaction using the signature
 */
export async function completeTransaction(params) {
    try {
        const { rpc, base64Message, sender, blockhash, lastValidBlockHeight, signatureHex } = params;
        // const signatureHex = await question("\nEnter the signature in hex format: ");

        // Check current block height to see if blockhash is still valid
        const currentBlockHeight = await rpc.getBlockHeight();
        if (currentBlockHeight >= lastValidBlockHeight) {
            console.error(`ERROR: Blockhash has expired! Current height: ${currentBlockHeight}, Last valid height: ${lastValidBlockHeight}`);
            console.error("Please start over with a fresh blockhash.");
            return null;
        }

        // Convert signature to buffer
        const signatureBuffer = Buffer.from(signatureHex, "hex");

        // Convert message to buffer
        const messageBuffer = Buffer.from(base64Message, "base64");

        // Create wire transaction format
        const wireTransaction = Buffer.concat([
            Buffer.from([1]), // 1 signature
            signatureBuffer,
            messageBuffer
        ]);

        // Send transaction
        try {
            // First, simulate the transaction to check for potential issues
            const simResult = await rpc.simulateTransaction(wireTransaction, {
                sigVerify: false,
                commitment: "confirmed"
            });
            
            if (simResult.value.err) {
                console.error("Transaction simulation failed:", simResult.value.err);
                throw new Error(`Transaction simulation failed: ${JSON.stringify(simResult.value.err)}`);
            }

            // Method 1: Using sendRawTransaction with preflight enabled
            const txid1 = await rpc.sendRawTransaction(wireTransaction, {
                skipPreflight: false,
                preflightCommitment: "confirmed"
            });

            // Method 2: Using _rpcRequest with preflight enabled as backup
            const encodedTransaction = wireTransaction.toString("base64");
            const rpcResponse = await rpc._rpcRequest("sendTransaction", [
                encodedTransaction,
                { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed" }
            ]);

            if (rpcResponse.error) {
                console.error("RPC Error:", rpcResponse.error);
                throw new Error(`RPC Error: ${rpcResponse.error.message}`);
            }

            // Check transaction status after a short delay
            const txid = txid1 || rpcResponse.result;
            if (txid) {
                await new Promise(resolve => setTimeout(resolve, 5000));

                const status = await rpc.getSignatureStatus(txid);

                if (status.value === null) {
                    // Try to get more details
                    try {
                        const simResult = await rpc.simulateTransaction(wireTransaction);
                    } catch (simError) {
                        // Simulation also failed
                    }
                } else if (status.value.err) {
                    console.error("Transaction error:", status.value.err);
                }
            }

            return txid;
        } catch (sendError) {
            console.error("Error sending transaction:", sendError);
            
            // Since we already simulated upfront, if we get here it means the actual send failed
            // after successful simulation. This could be due to network issues, timing, etc.
            console.error("Note: Transaction passed simulation but failed during actual send");
            console.error("Possible causes: network congestion, timing issues, or RPC problems");
            
            throw new Error(`Transaction send failed: ${sendError.message}`);
        }
    } catch (error) {
        console.error("Error completing transaction:", error);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    try {
        const params = await prepareTransaction();
        await completeTransaction(params);
    } catch (error) {
        console.error("Error in main process:", error);
    }
}
