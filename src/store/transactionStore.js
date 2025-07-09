import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { address, createSolanaRpc, devnet } from '@solana/kit';
import { Buffer } from 'buffer';
import { parseTransactionError } from '../util/errorHandling';
import secureStorage from '../util/secureStorage';
import { lamportsToTokens } from '../util';
import { SystemProgram, Transaction, PublicKey } from '@solana/web3.js';

export const useTransactionStore = create((set, get) => ({
  // State
  transactions: [],
  isLoadingSend: false,
  isLoadingTransactions: false,
  txResult: null,
  lastFetchTime: null, // Track when we last fetched from RPC
  lastFetchSignature: null, // Track the latest signature we've seen

  // Local storage transaction management
  saveTransactionLocally: async (transaction) => {
    try {
      const existingTxs = await secureStorage.getData('local_transactions') || {};
      const walletTxs = existingTxs[transaction.sender_address] || [];
      
      // Check if transaction already exists
      const existingIndex = walletTxs.findIndex(tx => tx.hash === transaction.hash);
      if (existingIndex !== -1) {
        // Update existing transaction
        walletTxs[existingIndex] = transaction;
      } else {
        // Add new transaction
        walletTxs.unshift(transaction);
      }
      
      // Keep only last 50 transactions per wallet
      if (walletTxs.length > 50) {
        walletTxs.splice(50);
      }
      
      existingTxs[transaction.sender_address] = walletTxs;
      await secureStorage.setData('local_transactions', existingTxs);
      
    } catch (error) {
      console.error('Error saving transaction locally:', error);
    }
  },

  getLocalTransactions: async (address, chain, environment) => {
    try {
      const existingTxs = await secureStorage.getData('local_transactions') || {};
      const walletTxs = existingTxs[address] || [];
      
      // Filter by chain and environment
      return walletTxs.filter(tx => 
        tx.chain === chain && tx.environment === environment
      ).slice(0, 10); // Return only last 10
    } catch (error) {
      console.error('Error getting local transactions:', error);
      return [];
    }
  },

  // Optimized RPC fetch with caching
  getTransactionsFromRPC: async (walletAddress, rpcUrl, limit = 10) => {
    try {
      const { lastFetchTime, lastFetchSignature } = get();
      const now = Date.now();
      
      // Don't fetch if we fetched recently (within last 30 seconds) unless forced
      if (lastFetchTime && (now - lastFetchTime) < 30000) {
        return null; // Return null to indicate no new fetch needed
      }

      const connection = createSolanaRpc(rpcUrl);
      
      // Test if RPC is responding first
      try {
        const health = await connection.getHealth();
      } catch (healthError) {
        console.warn('RPC Health Check failed:', healthError.message);
      }
      
      // Get signatures for the address
      const signatures = await connection.getSignaturesForAddress(walletAddress, {
        limit: limit
      });
      
      if (!signatures || signatures.length === 0) {
        set({ lastFetchTime: now });
        return [];
      }

      // Check if we have new transactions (compare with last known signature)
      const latestSignature = signatures[0]?.signature;
      
      if (lastFetchSignature === latestSignature) {
        set({ lastFetchTime: now });
        return null; // No new transactions
      }
      
      // Get transaction details for each signature (limit concurrent requests)
      const transactions = [];
      const batchSize = 3; // Process 3 transactions at a time to avoid overwhelming RPC
      
      for (let i = 0; i < signatures.length; i += batchSize) {
        const batch = signatures.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (sigInfo, batchIndex) => {
          try {
            const tx = await connection.getTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0
            });
            
            if (tx && tx.meta && !tx.meta.err) {
              // Parse transaction to extract relevant information
              const parsedTx = get().parseTransaction(tx, walletAddress, sigInfo.signature);
              if (parsedTx) {
                return parsedTx;
              }
            }
          } catch (txError) {
            console.error('Error fetching transaction details:', txError);
          }
          return null;
        });
        
        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(tx => tx !== null);
        transactions.push(...validResults);
        
        // Small delay between batches to be nice to the RPC
        if (i + batchSize < signatures.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Update fetch tracking
      set({ 
        lastFetchTime: now,
        lastFetchSignature: latestSignature 
      });
      
      return transactions;
    } catch (error) {
      console.error('💥 ERROR in getTransactionsFromRPC:', error);
      console.error('💥 Error stack:', error.stack);
      console.error('💥 Error details:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      set({ lastFetchTime: now }); // Still update time to avoid rapid retries
      return [];
    }
  },

  // Parse a transaction object to extract relevant information
  parseTransaction: (tx, walletAddress, signature) => {
    try {
      if (!tx || !tx.transaction || !tx.meta) return null;

      const { transaction, meta, blockTime } = tx;
      const accountKeys = transaction.message.accountKeys || [];
      
      // Find pre and post balances
      const preBalances = meta.preBalances || [];
      const postBalances = meta.postBalances || [];
      
      // Find the wallet's account index
      const walletIndex = accountKeys.findIndex(key => key.toString() === walletAddress);
      if (walletIndex === -1) return null;
      
      // Calculate balance change
      const preBalance = preBalances[walletIndex] || 0;
      const postBalance = postBalances[walletIndex] || 0;
      const balanceChange = postBalance - preBalance;
      
      // Determine if this is a send or receive
      const isSent = balanceChange < 0;
      const amount = Math.abs(lamportsToTokens(balanceChange));
      
      // Find the other party (recipient or sender)
      let otherAddress = null;
      if (accountKeys.length > 1) {
        // Find the account with the opposite balance change
        for (let i = 0; i < accountKeys.length; i++) {
          if (i !== walletIndex && accountKeys[i].toString() !== walletAddress) {
            const otherBalanceChange = (postBalances[i] || 0) - (preBalances[i] || 0);
            if ((isSent && otherBalanceChange > 0) || (!isSent && otherBalanceChange < 0)) {
              otherAddress = accountKeys[i].toString();
              break;
            }
          }
        }
      }
      
      // If we couldn't find the other address, use the first non-wallet address
      if (!otherAddress && accountKeys.length > 1) {
        otherAddress = accountKeys.find(key => key.toString() !== walletAddress)?.toString();
      }
      
      return {
        id: signature,
        hash: signature,
        sender_address: isSent ? walletAddress : (otherAddress || 'Unknown'),
        receiver_address: isSent ? (otherAddress || 'Unknown') : walletAddress,
        sent_amount: amount,
        received_amount: amount,
        status: 'success',
        created_at: blockTime ? new Date(blockTime * 1000).toISOString() : new Date().toISOString(),
        source: 'rpc'
      };
    } catch (error) {
      console.error('Error parsing transaction:', error);
      return null;
    }
  },

  // Actions
  getTransactions: async (address, chain, environment, selectedNetwork, getCurrentRpcUrl) => {
    if (!address) return;

    set({ isLoadingTransactions: true });

    try {
      let transactions = [];
      let hasNewRpcData = false;
      
      // Try RPC first (with smart caching)
      if (selectedNetwork && getCurrentRpcUrl) {
        try {
          const rpcUrl = getCurrentRpcUrl();
          // Check if the chain supports getSignaturesForAddress
          if (chain === 'solana') {
            // Use full Solana RPC transaction fetching
            const rpcTransactions = await get().getTransactionsFromRPC(address, rpcUrl, 10);
            
            if (rpcTransactions === null) {
              // No new data, use existing local transactions
              transactions = await get().getLocalTransactions(address, chain, environment);
            } else if (rpcTransactions && rpcTransactions.length > 0) {
              // New RPC data available
              hasNewRpcData = true;
              transactions = rpcTransactions.map(tx => ({
                ...tx,
                chain: chain,
                environment: environment
              }));
              
              // Save RPC transactions locally for future use
              for (const tx of transactions) {
                await get().saveTransactionLocally(tx);
              }
            } else {
              // RPC returned empty array (no transactions)
              transactions = [];
            }
          } else if (chain === 'gorbagana') {
            // Use direct fetch for Gorbagana to avoid CORS issues with @solana/kit
            
                          try {
                // Step 1: Get signatures for the address using direct fetch
                const signaturesResponse = await fetch(rpcUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'getSignaturesForAddress',
                    params: [address, { limit: 10 }],
                    id: 1
                  })
                });

                const signaturesData = await signaturesResponse.json();

                if (signaturesData.error) {
                  throw new Error(`Gorbagana RPC error: ${signaturesData.error.message}`);
                }

                const signatures = signaturesData.result || [];

                if (signatures.length === 0) {
                  transactions = await get().getLocalTransactions(address, chain, environment);
                } else {
                  // Step 2: Get transaction details for each signature
                
                const fetchedTransactions = [];
                
                                  // Process in batches to avoid overwhelming the RPC
                  const batchSize = 3;
                  for (let i = 0; i < signatures.length; i += batchSize) {
                    const batch = signatures.slice(i, i + batchSize);
                    
                    const batchPromises = batch.map(async (sigInfo, batchIndex) => {
                      try {
                        const txResponse = await fetch(rpcUrl, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'getTransaction',
                            params: [sigInfo.signature, { maxSupportedTransactionVersion: 0 }],
                            id: 1
                          })
                        });

                        const txData = await txResponse.json();
                        
                        if (txData.error) {
                          return null;
                        }

                        const tx = txData.result;
                        if (tx && tx.meta && !tx.meta.err) {
                          // Parse transaction using existing parser
                          const parsedTx = get().parseTransaction(tx, address, sigInfo.signature);
                          if (parsedTx) {
                            return {
                              ...parsedTx,
                              chain,
                              environment
                            };
                          }
                        }
                      } catch (txError) {
                        console.error('Error fetching transaction:', txError.message);
                      }
                      return null;
                    });

                    const batchResults = await Promise.all(batchPromises);
                    const validResults = batchResults.filter(tx => tx !== null);
                    fetchedTransactions.push(...validResults);
                    
                    // Small delay between batches
                    if (i + batchSize < signatures.length) {
                      await new Promise(resolve => setTimeout(resolve, 100));
                    }
                  }

                if (fetchedTransactions.length > 0) {
                  hasNewRpcData = true;
                  transactions = fetchedTransactions;
                  
                  // Save to local storage
                  for (const tx of transactions) {
                    await get().saveTransactionLocally(tx);
                  }
                } else {
                  transactions = await get().getLocalTransactions(address, chain, environment);
                }
              }
            } catch (gorbaganaError) {
              console.error('Gorbagana direct fetch failed:', gorbaganaError);
              transactions = await get().getLocalTransactions(address, chain, environment);
            }
          } else {
            // Other chains - try the standard method
            const rpcTransactions = await get().getTransactionsFromRPC(address, rpcUrl, 10);
            
            if (rpcTransactions === null) {
              transactions = await get().getLocalTransactions(address, chain, environment);
            } else if (rpcTransactions && rpcTransactions.length > 0) {
              hasNewRpcData = true;
              transactions = rpcTransactions.map(tx => ({
                ...tx,
                chain: chain,
                environment: environment
              }));
              
              for (const tx of transactions) {
                await get().saveTransactionLocally(tx);
              }
            } else {
              transactions = [];
            }
          }
        } catch (rpcError) {
          console.warn('Overall RPC fetch failed, using local storage:', rpcError);
        }
      }

      // If RPC fails or returns no data and we have no cached data, try local storage
      if (!hasNewRpcData && transactions.length === 0) {
        transactions = await get().getLocalTransactions(address, chain, environment);
      }

      set({
        transactions: transactions || [],
        isLoadingTransactions: false
      });
    } catch (err) {
      console.error('Error fetching transactions:', err);
      
      // Fallback to local storage
      try {
        const localTxs = await get().getLocalTransactions(address, chain, environment);
        set({
          transactions: localTxs,
          isLoadingTransactions: false
        });
      } catch (localErr) {
        set({ 
          transactions: [],
          isLoadingTransactions: false 
        });
      }
    }
  },

  // Clear cache and force fresh RPC fetch
  forceRefreshTransactions: async (address, chain, environment, selectedNetwork, getCurrentRpcUrl) => {
    set({ lastFetchTime: null, lastFetchSignature: null }); // Reset cache
    await get().getTransactions(address, chain, environment, selectedNetwork, getCurrentRpcUrl);
  },

  sendTransaction: async ({ toAddress, amount, walletAddress, getKeypair, selectedNetwork, getCurrentRpcUrl, selectedEnvironment }) => {
    if (!toAddress || !amount || !walletAddress || !getKeypair || !selectedNetwork) {
      throw new Error('Missing required parameters for transaction');
    }

    const keypair = getKeypair();
    if (!keypair) {
      throw new Error('Please unlock your wallet to send transactions');
    }

    set({ isLoadingSend: true, txResult: null });

    try {
      // Connect to the network using custom RPC URL if available, otherwise default
      const rpcUrl = getCurrentRpcUrl ? getCurrentRpcUrl() : selectedNetwork.rpcUrl;
      const connection = createSolanaRpc(rpcUrl);

      // Create transaction manually
      const toPublicKey = address(toAddress);
      const fromPublicKey = address(walletAddress);
      const lamports = amount * 1000000000; // Convert to lamports

            try {
        // Create a proper Solana transfer instruction and send it via RPC
        // Get recent blockhash
        let blockhash;
        
        try {
          const blockhashResponse = await connection.getLatestBlockhash();
          
          if (blockhashResponse && typeof blockhashResponse === 'object') {
            // Handle different response formats
            blockhash = blockhashResponse.blockhash || blockhashResponse.value?.blockhash || blockhashResponse.result?.value?.blockhash;
          } else if (typeof blockhashResponse === 'string') {
            blockhash = blockhashResponse;
          }
        } catch (err) {
          console.warn('Failed to get blockhash via @solana/kit, trying direct RPC:', err.message);
        }
        
        // Fallback to direct RPC call if @solana/kit method failed
        if (!blockhash) {
          try {
            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getLatestBlockhash',
                params: []
              })
            });
            
            const data = await response.json();
            
            if (data.result && data.result.value && data.result.value.blockhash) {
              blockhash = data.result.value.blockhash;
            } else if (data.result && data.result.blockhash) {
              blockhash = data.result.blockhash;
            }
          } catch (directErr) {
            console.error('Direct RPC blockhash call also failed:', directErr);
          }
        }
        
        if (!blockhash) {
          throw new Error('Failed to get recent blockhash from both @solana/kit and direct RPC');
        }
        
        // Create proper transfer instruction using SystemProgram
        const transferInstruction = SystemProgram.transfer({
          fromPubkey: new PublicKey(fromPublicKey.toString()),
          toPubkey: new PublicKey(toPublicKey.toString()),
          lamports: lamports,
        });
        
        // Create a transaction and add the transfer instruction
        const transaction = new Transaction().add(transferInstruction);
        transaction.feePayer = new PublicKey(fromPublicKey.toString());
        transaction.recentBlockhash = blockhash;
        
        // Serialize the transaction message for signing
        const messageBytes = transaction.serializeMessage();
        
        // Sign the message
        const nacl = await import('tweetnacl');
        const signature = nacl.default.sign.detached(messageBytes, keypair.secretKey);
        
        // Create the final transaction in wire format
        const wireTransaction = Buffer.concat([
          Buffer.from([1]), // Number of signatures
          Buffer.from(signature), // The signature (64 bytes)
          messageBytes // The message
        ]);
        
        // Send the transaction using chain-specific methods
        let signature_result;
        
        if (selectedNetwork.chain === 'gorbagana') {
          // For Gorbagana, use the same transfer logic as Solana since it's Solana-based
          try {
            const gorbBase64 = wireTransaction.toString('base64');
            
            // First simulate the transaction to check for potential issues
            const simResponse = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'simulateTransaction',
                params: [gorbBase64, { encoding: 'base64', sigVerify: false, commitment: 'confirmed' }]
              })
            });
            
            const simData = await simResponse.json();
            
            if (simData.error) {
              throw new Error(`Gorbagana simulation failed: ${simData.error.message} - ${JSON.stringify(simData.error.data)}`);
            }
            
            if (simData.result && simData.result.value && simData.result.value.err) {
              throw new Error(`Gorbagana transaction simulation failed: ${JSON.stringify(simData.result.value.err)}`);
            }
            
            // Now send the actual transaction with preflight enabled
            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'sendTransaction',
                params: [gorbBase64, { encoding: 'base64', skipPreflight: false, preflightCommitment: 'confirmed' }]
              })
            });
            
            const data = await response.json();
            
            if (data.error) {
              throw new Error(`Gorbagana RPC error: ${data.error.message} - ${JSON.stringify(data.error.data)}`);
            }
            
            signature_result = data.result;
          } catch (gorbErr) {
            console.error('Gorbagana transaction failed:', gorbErr);
            throw new Error('Failed to send Gorbagana transaction: ' + gorbErr.message);
          }
        } else {
          // For Solana, use @solana/kit
          
          // First simulate the transaction to check for potential issues
          try {
            const simRequest = await connection.simulateTransaction(wireTransaction, {
              sigVerify: false,
              commitment: 'confirmed'
            });
            
            // Handle different simulation response formats
            let simResult;
            if (simRequest && typeof simRequest.send === 'function') {
              simResult = await simRequest.send();
            } else {
              simResult = simRequest;
            }
            
            if (simResult && simResult.value && simResult.value.err) {
              throw new Error(`Solana transaction simulation failed: ${JSON.stringify(simResult.value.err)}`);
            } else if (simResult && simResult.err) {
              throw new Error(`Solana transaction simulation failed: ${JSON.stringify(simResult.err)}`);
            }
            
          } catch (simError) {
            console.error('Solana simulation failed:', simError);
            throw new Error(`Solana transaction simulation failed: ${simError.message}`);
          }
          
          const sendRequest = await connection.sendRawTransaction(wireTransaction, {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          });
          
          // Check if we need to call .send() method
          if (sendRequest && typeof sendRequest.send === 'function') {
            signature_result = await sendRequest.send();
          } else if (typeof sendRequest === 'string') {
            signature_result = sendRequest;
          } else {
            throw new Error('Unexpected sendRawTransaction response format');
          }
        }
        
        // Wait for confirmation using chain-specific methods
        if (selectedNetwork.chain === 'gorbagana') {
          // For Gorbagana, if we got a signature, the transaction was accepted
          // Try to check if the transaction exists using getTransaction
          try {
            // Wait a bit for the transaction to propagate
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTransaction',
                params: [signature_result]
              })
            });
            
            const data = await response.json();
          } catch (checkErr) {
            // Transaction check failed, but we have signature so we continue
          }
        } else {
          // For Solana, use @solana/kit confirmation
          const confirmRequest = await connection.confirmTransaction(signature_result, 'confirmed');
          
          // Handle different confirmation response formats
          let confirmation;
          if (confirmRequest && typeof confirmRequest.send === 'function') {
            confirmation = await confirmRequest.send();
          } else {
            confirmation = confirmRequest;
          }
          
          if (confirmation && confirmation.value && confirmation.value.err) {
            throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
          } else if (confirmation && confirmation.err) {
            throw new Error('Transaction failed: ' + JSON.stringify(confirmation.err));
          }
        }
        
        set({
          txResult: signature_result,
          isLoadingSend: false
        });

        toast.success('Transaction sent successfully!');
        
        // Create transaction record for local storage
        const transactionRecord = {
          id: signature_result,
          hash: signature_result,
          sender_address: walletAddress,
          receiver_address: toAddress,
          sent_amount: parseFloat(amount),
          received_amount: parseFloat(amount),
          chain: selectedNetwork.chain,
          status: "success",
          created_at: new Date().toISOString(),
          environment: selectedEnvironment || "testnet",
          source: 'local'
        };

        // Save locally
        await get().saveTransactionLocally(transactionRecord);

        return signature_result;

      } catch (error) {
        const userFriendlyError = parseTransactionError(error);
        throw new Error(userFriendlyError);
      }
    } catch (err) {
      console.error('Transaction error:', err);
      set({ 
        isLoadingSend: false,
        txResult: null 
      });
      throw new Error('Transaction failed: ' + err.message);
    }
  },

  clearTransactionResult: () => {
    set({ txResult: null });
  },

  setLoadingSend: (loading) => {
    set({ isLoadingSend: loading });
  },

  // Clear local transaction data (for debugging/reset)
  clearLocalTransactions: async () => {
    try {
      await secureStorage.removeData('local_transactions');
    } catch (error) {
      console.error('Error clearing local transactions:', error);
    }
  },
}));
