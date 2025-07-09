/**
 * Parse Solana transaction errors and return user-friendly messages
 */
export function parseTransactionError(error) {
  console.error("Raw transaction error:", error);

  // Default fallback message
  let userFriendlyError = "Transaction failed. Please try again";

  if (!error?.message) {
    return userFriendlyError;
  }

  const errorMsg = error.message.toLowerCase();

  // Handle insufficient funds
  if (errorMsg.includes("insufficient lamports") || errorMsg.includes("insufficient funds")) {
    const match = error.message.match(/insufficient lamports (\d+), need (\d+)/);
    if (match) {
      const available = parseInt(match[1]) / 1000000000;
      const needed = parseInt(match[2]) / 1000000000;
      return `Insufficient balance. Available: ${available.toFixed(4)} SOL, Required: ${needed.toFixed(4)} SOL`;
    } else {
      return "Insufficient balance to complete this transaction";
    }
  }

  // Handle blockhash expired
  if (errorMsg.includes("blockhash") && (errorMsg.includes("expired") || errorMsg.includes("not found"))) {
    return "Transaction expired. Please try again";
  }

  // Handle network/RPC errors
  if (errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("rpc")) {
    return "Network connection error. Please check your connection and try again";
  }

  // Handle simulation failed errors
  if (errorMsg.includes("simulation failed")) {
    // Try to extract specific simulation error details
    if (errorMsg.includes("insufficient lamports")) {
      return "Insufficient balance for this transaction";
    } else if (errorMsg.includes("programaccountnotfound")) {
      return "System program error. This may be due to incorrect transaction format. Please try again";
    } else if (errorMsg.includes("custom program error")) {
      return "Program error during transaction simulation. Please check your inputs";
    } else if (errorMsg.includes("instruction error")) {
      return "Invalid transaction instruction. Please verify the transaction details";
    } else if (errorMsg.includes("already in use")) {
      return "Account already in use. Please try again later";
    } else if (errorMsg.includes("account not found")) {
      return "Account not found. Please verify the addresses";
    } else {
      // Extract JSON error details if available
      try {
        const jsonMatch = error.message.match(/\{[^}]+\}/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[0]);
          if (errorData.InstructionError) {
            return `Transaction instruction error: ${JSON.stringify(errorData.InstructionError)}`;
          }
          if (errorData.Custom) {
            return `Custom program error: ${errorData.Custom}`;
          }
        }
      } catch (parseErr) {
        console.warn("Could not parse error JSON:", parseErr);
      }
      return "Transaction validation failed during simulation. Please check your inputs";
    }
  }

  // Handle preflight/simulation specific errors
  if (errorMsg.includes("preflight") || errorMsg.includes("simulate")) {
    if (errorMsg.includes("insufficient funds") || errorMsg.includes("insufficient lamports")) {
      return "Insufficient balance detected during preflight check";
    } else if (errorMsg.includes("blockhash")) {
      return "Blockhash issue detected during preflight. Please try again";
    } else {
      return "Transaction preflight check failed. Please verify your transaction details";
    }
  }

  // Handle timeout errors
  if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
    return "Transaction timeout. Please try again";
  }

  // Handle invalid address errors
  if (errorMsg.includes("invalid") && errorMsg.includes("address")) {
    return "Invalid wallet address. Please check the recipient address";
  }

  // Handle transaction too large
  if (errorMsg.includes("transaction too large")) {
    return "Transaction size too large. Please try a smaller amount";
  }

  // Handle confirmation errors
  if (errorMsg.includes("confirmation")) {
    return "Transaction confirmation failed. Please try again";
  }

  // Handle signature errors
  if (errorMsg.includes("signature")) {
    return "Transaction signing failed. Please try again";
  }

  // Return the fallback message
  return userFriendlyError;
}

/**
 * Handle transaction errors with toast notifications
 */
export function handleTransactionError(error, toast) {
  const friendlyMessage = parseTransactionError(error);

  if (toast) {
    toast.error(friendlyMessage);
  }

  return friendlyMessage;
}
