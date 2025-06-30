import { List, MoreHorizontal } from 'lucide-react';
import { useWalletStore } from '../store';
import { useEffect, useRef } from 'react';
import { useTransactionStore } from '../store/transactionStore';
import { truncateAddress } from '../util';
import toast from 'react-hot-toast';

function RecentActivity() {
  const { walletAddress, selectedNetwork, selectedEnvironment } = useWalletStore();
  const { transactions, getTransactions } = useTransactionStore();
  const intervalRef = useRef(null);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (walletAddress) {
      getTransactions(walletAddress, selectedNetwork.chain, selectedEnvironment);
      intervalRef.current = setInterval(() => {
        getTransactions(walletAddress, selectedNetwork.chain, selectedEnvironment);
      }, 10000);
    }
    return () => clearInterval(intervalRef.current);
  }, [walletAddress, selectedNetwork.chain, selectedEnvironment]);

  const formatAmount = (amount, type, symbol) => {
    const sign = type === 'sent' ? '-' : '+';
    const colorClass = type === 'sent' ? 'text-red-400' : 'text-green-400';
    return (
      <span className={colorClass}>
        {sign} {amount} {symbol}
      </span>
    );
  };

  const handleViewAllClick = () => {
    // TODO: Navigate to all transactions view or open modal
    console.log('View all transactions clicked');
  };

  return (
    <div className="bg-zinc-800 border flex-1 border-zinc-600 rounded-lg p-4 mt-8">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white/80 font-semibold text-sm">Recent Activity</h3>
        {/* <button
          onClick={handleViewAllClick}
          className="text-zinc-400 hover:text-white transition-colors duration-200 p-1"
          title="View All Transactions"
        >
          <List size={18} />
        </button> */}
      </div>

      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center py-6 my-auto">
            <div className="text-zinc-400 text-sm mb-1">No transactions yet</div>
            <div className="text-zinc-500 text-xs">Your transaction history will appear here</div>
          </div>
        ) : (
          transactions.map((transaction) => {
            const isSent = transaction.sender_address === walletAddress;
            return (
              <div key={transaction.id} className="flex justify-between items-start">
                <div className="flex flex-col">
                  <div className="text-white font-medium capitalize text-sm">
                    {isSent ? "Sent" : "Received"}
                  </div>
                  <button onClick={() => {
                    navigator.clipboard.writeText(isSent ? transaction.receiver_address : transaction.sender_address);
                    toast.success("Address copied!");
                  }}
                    className="text-zinc-400 text-xs">
                    {truncateAddress(isSent ? transaction.receiver_address : transaction.sender_address)}
                  </button>
                </div>

                <div className="flex flex-col items-end">
                  <div className="font-medium text-sm">
                    {formatAmount(isSent ? transaction.sent_amount : transaction.received_amount, isSent ? "sent" : "received", selectedNetwork.symbol)}
                  </div>
                  <div className="text-zinc-400 text-xs">
                    {new Date(transaction.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}

export default RecentActivity;
