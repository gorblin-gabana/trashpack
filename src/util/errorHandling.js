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
    if (errorMsg.includes("insufficient lamports")) {
      return "Insufficient balance for this transaction";
    } else {
      return "Transaction validation failed. Please check your inputs";
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
  console.log("User-friendly error:", friendlyMessage);

  if (toast) {
    toast.error(friendlyMessage);
  }

  return friendlyMessage;
}
