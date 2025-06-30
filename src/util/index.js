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
