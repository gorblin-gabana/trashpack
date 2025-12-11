import { useState, useEffect } from 'react';
import {
  Lock, Unlock, Clock, Calendar, TrendingUp,
  ChevronRight, Loader2, AlertCircle, CheckCircle,
  Coins, Timer
} from 'lucide-react';
import { useWalletStore } from '../store';
import BackBtn from '../components/BackBtn';
import { toast } from 'react-hot-toast';

// Mock vesting data - will be replaced with contract integration
const MOCK_VESTING_SCHEDULES = [
  {
    id: '1',
    tokenName: 'GORB',
    tokenSymbol: 'GORB',
    tokenIcon: '/gorbchain.png',
    totalAmount: 10000,
    claimedAmount: 2500,
    cliffEndDate: new Date('2025-01-15'),
    vestingEndDate: new Date('2025-06-15'),
    vestingType: 'linear', // 'linear' or 'cliff'
    unlockSchedule: 'monthly', // 'daily', 'weekly', 'monthly'
    nextUnlockAmount: 1500,
    nextUnlockDate: new Date('2025-01-15'),
    status: 'active', // 'active', 'cliffPending', 'completed', 'claimable'
  },
  {
    id: '2',
    tokenName: 'TrashCoin',
    tokenSymbol: 'TRASH',
    tokenIcon: null,
    totalAmount: 50000,
    claimedAmount: 0,
    cliffEndDate: new Date('2025-03-01'),
    vestingEndDate: new Date('2025-12-01'),
    vestingType: 'cliff',
    unlockSchedule: 'cliff',
    nextUnlockAmount: 50000,
    nextUnlockDate: new Date('2025-03-01'),
    status: 'cliffPending',
  },
];

function TokenUnlocksPage() {
  const { walletAddress } = useWalletStore();
  const [vestingSchedules, setVestingSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);

  // Fetch vesting schedules
  useEffect(() => {
    const fetchVestingData = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual contract call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setVestingSchedules(MOCK_VESTING_SCHEDULES);
      } catch (error) {
        console.error('Error fetching vesting data:', error);
        toast.error('Failed to load vesting schedules');
      } finally {
        setIsLoading(false);
      }
    };

    if (walletAddress) {
      fetchVestingData();
    }
  }, [walletAddress]);

  // Calculate progress percentage
  const calculateProgress = (claimed, total) => {
    return Math.min(100, (claimed / total) * 100);
  };

  // Calculate time remaining
  const calculateTimeRemaining = (endDate) => {
    const now = new Date();
    const diff = endDate - now;

    if (diff <= 0) return 'Ready to claim';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 30) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? 's' : ''} remaining`;
    }
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`;
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  };

  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num.toLocaleString('en-US');
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Active
          </span>
        );
      case 'cliffPending':
        return (
          <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-400 flex items-center gap-1">
            <Clock size={10} />
            Cliff Pending
          </span>
        );
      case 'claimable':
        return (
          <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-xs text-cyan-400 flex items-center gap-1">
            <CheckCircle size={10} />
            Claimable
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-0.5 bg-zinc-500/20 border border-zinc-500/30 rounded text-xs text-zinc-400 flex items-center gap-1">
            <CheckCircle size={10} />
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  // Handle claim
  const handleClaim = async (schedule) => {
    setIsClaiming(true);
    try {
      // TODO: Implement actual contract call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Successfully claimed ${formatNumber(schedule.nextUnlockAmount)} ${schedule.tokenSymbol}!`);

      // Update local state
      setVestingSchedules(prev => prev.map(s =>
        s.id === schedule.id
          ? { ...s, claimedAmount: s.claimedAmount + schedule.nextUnlockAmount }
          : s
      ));
    } catch (error) {
      console.error('Error claiming tokens:', error);
      toast.error('Failed to claim tokens');
    } finally {
      setIsClaiming(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center mb-6">
          <BackBtn />
          <h2 className="text-xl font-bold text-white mx-auto pr-7">Token Unlocks</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  // Empty state
  if (vestingSchedules.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center mb-6">
          <BackBtn />
          <h2 className="text-xl font-bold text-white mx-auto pr-7">Token Unlocks</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-zinc-600" />
            </div>
            <h3 className="text-white font-medium mb-2">No Vesting Schedules</h3>
            <p className="text-sm text-zinc-400 max-w-[240px]">
              You don't have any active token vesting schedules at the moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalLocked = vestingSchedules.reduce((acc, s) => acc + (s.totalAmount - s.claimedAmount), 0);
  const totalClaimable = vestingSchedules.filter(s => s.status === 'claimable').reduce((acc, s) => acc + s.nextUnlockAmount, 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center mb-4">
        <BackBtn />
        <h2 className="text-xl font-bold text-white mx-auto pr-7">Token Unlocks</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Lock size={14} className="text-amber-400" />
            <span className="text-xs text-zinc-400">Total Locked</span>
          </div>
          <div className="text-lg font-bold text-white">{formatNumber(totalLocked)}</div>
          <div className="text-xs text-zinc-500">across {vestingSchedules.length} schedule{vestingSchedules.length > 1 ? 's' : ''}</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 border border-emerald-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Unlock size={14} className="text-emerald-400" />
            <span className="text-xs text-zinc-400">Claimable Now</span>
          </div>
          <div className="text-lg font-bold text-white">{formatNumber(totalClaimable)}</div>
          <div className="text-xs text-zinc-500">ready to claim</div>
        </div>
      </div>

      {/* Vesting Schedules List */}
      <div className="space-y-3">
        {vestingSchedules.map((schedule) => {
          const progress = calculateProgress(schedule.claimedAmount, schedule.totalAmount);
          const remaining = schedule.totalAmount - schedule.claimedAmount;
          const isClaimable = schedule.status === 'claimable' || new Date() >= schedule.nextUnlockDate;

          return (
            <div
              key={schedule.id}
              className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div
                className="p-4 cursor-pointer hover:bg-zinc-700/30 transition-colors"
                onClick={() => setSelectedSchedule(selectedSchedule === schedule.id ? null : schedule.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden">
                      {schedule.tokenIcon ? (
                        <img src={schedule.tokenIcon} alt={schedule.tokenSymbol} className="w-full h-full object-cover" />
                      ) : (
                        <Coins size={20} className="text-zinc-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{schedule.tokenName}</span>
                        {getStatusBadge(schedule.status)}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {formatNumber(remaining)} {schedule.tokenSymbol} remaining
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className={`text-zinc-400 transition-transform ${selectedSchedule === schedule.id ? 'rotate-90' : ''}`}
                  />
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-xs">
                  <span className="text-zinc-400">{formatNumber(schedule.claimedAmount)} claimed</span>
                  <span className="text-zinc-400">{progress.toFixed(1)}%</span>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedSchedule === schedule.id && (
                <div className="px-4 pb-4 border-t border-zinc-700/50 pt-3 space-y-3">
                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900/50 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                        <Coins size={12} />
                        Total Allocation
                      </div>
                      <div className="text-sm font-medium text-white">
                        {formatNumber(schedule.totalAmount)} {schedule.tokenSymbol}
                      </div>
                    </div>

                    <div className="bg-zinc-900/50 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                        <TrendingUp size={12} />
                        Vesting Type
                      </div>
                      <div className="text-sm font-medium text-white capitalize">
                        {schedule.vestingType} ({schedule.unlockSchedule})
                      </div>
                    </div>

                    <div className="bg-zinc-900/50 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                        <Calendar size={12} />
                        Cliff End
                      </div>
                      <div className="text-sm font-medium text-white">
                        {formatDate(schedule.cliffEndDate)}
                      </div>
                    </div>

                    <div className="bg-zinc-900/50 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                        <Timer size={12} />
                        Vesting End
                      </div>
                      <div className="text-sm font-medium text-white">
                        {formatDate(schedule.vestingEndDate)}
                      </div>
                    </div>
                  </div>

                  {/* Next Unlock Info */}
                  <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-400">Next Unlock</span>
                      <span className="text-xs text-amber-400">
                        {calculateTimeRemaining(schedule.nextUnlockDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-white">
                          {formatNumber(schedule.nextUnlockAmount)}
                        </span>
                        <span className="text-sm text-zinc-400 ml-1">{schedule.tokenSymbol}</span>
                      </div>
                      <span className="text-xs text-zinc-500">
                        {formatDate(schedule.nextUnlockDate)}
                      </span>
                    </div>
                  </div>

                  {/* Claim Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClaim(schedule);
                    }}
                    disabled={!isClaimable || isClaiming}
                    className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                      isClaimable
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                        : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                    }`}
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Claiming...
                      </>
                    ) : isClaimable ? (
                      <>
                        <Unlock size={18} />
                        Claim {formatNumber(schedule.nextUnlockAmount)} {schedule.tokenSymbol}
                      </>
                    ) : (
                      <>
                        <Lock size={18} />
                        Locked until {formatDate(schedule.nextUnlockDate)}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="mt-4 p-3 bg-zinc-800/40 border border-zinc-700/30 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-zinc-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-400">
            Token unlocks are managed by smart contracts. Claim transactions require network fees.
            Vesting schedules cannot be modified once created.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TokenUnlocksPage;
