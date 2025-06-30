import { ExternalLink } from 'lucide-react';
import { useTransactionStore, useUIStore } from '../store';

function TransactionResult() {
  const { txResult } = useTransactionStore();
  const { error } = useUIStore();

  if (!txResult && !error) return null;

  return (
    <div className="text-center mt-4 p-3 bg-[rgba(57,255,20,0.1)] rounded-md border border-[#39FF14]">
      {txResult && (
        <div>
          <p className="mb-2 text-[#39FF14] text-sm">Transaction successful!</p>
          <a
            href={`https://gorbaganachain.xyz/#explorer/tx/${txResult}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#39FF14] no-underline flex items-center justify-center gap-1 text-xs hover:underline"
          >
            View on Explorer <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  );
}

export default TransactionResult;
