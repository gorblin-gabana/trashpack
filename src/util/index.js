export const truncateAddress = (str) => {
    if (str.length <= 8) return str;
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

export const copyToClipboard = async (text, label) => {
    try {
        await navigator.clipboard.writeText(text);
        // We'll use toast from react-hot-toast directly in components
        return { success: true, message: `${label} copied!` };
    } catch (err) {
        console.warn('Clipboard API failed, trying fallback.', err);
        return { success: false, message: 'Failed to copy.' };
    }
}

/**
 * Safely converts a value (including BigInt) to a number
 * @param {*} value - The value to convert (could be BigInt, number, string, etc.)
 * @returns {number} - The converted number, or 0 if conversion fails
 */
export const safeToNumber = (value) => {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
};

/**
 * Converts lamports to token amount with BigInt support
 * @param {bigint|number|string} lamports - The lamport amount
 * @returns {number} - The token amount
 */
export const lamportsToTokens = (lamports) => {
  const lamportNumber = safeToNumber(lamports);
  return lamportNumber / 1000000000; // 1 token = 1e9 lamports
};

/**
 * Formats a number into human-readable format (e.g., 1.5M, 2.3B, 450K)
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places to show (default: 2)
 * @returns {string} - Formatted number string
 */
export const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

  const absNum = Math.abs(num);
  
  if (absNum >= 1e9) {
    return (num / 1e9).toFixed(decimals).replace(/\.?0+$/, '') + 'B';
  } else if (absNum >= 1e6) {
    return (num / 1e6).toFixed(decimals).replace(/\.?0+$/, '') + 'M';
  } else if (absNum >= 1e3) {
    return (num / 1e3).toFixed(decimals).replace(/\.?0+$/, '') + 'K';
  } else if (absNum >= 1) {
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  } else if (absNum > 0) {
    // For very small numbers, show more decimal places
    return num.toFixed(6).replace(/\.?0+$/, '');
  } else {
    return '0';
  }
};

/**
 * Formats a balance amount for display with appropriate precision
 * @param {number} balance - The balance amount
 * @param {boolean} compact - Whether to use compact format (K, M, B)
 * @returns {string} - Formatted balance string
 */
export const formatBalance = (balance, compact = true) => {
  if (balance === null || balance === undefined || isNaN(balance)) {
    return '0';
  }

  if (compact && Math.abs(balance) >= 1000) {
    return formatNumber(balance, 2);
  }

  // For non-compact or smaller numbers, show appropriate decimal places
  if (Math.abs(balance) >= 1) {
    return balance.toFixed(4).replace(/\.?0+$/, '');
  } else if (balance > 0) {
    return balance.toFixed(6).replace(/\.?0+$/, '');
  } else {
    return '0';
  }
};
