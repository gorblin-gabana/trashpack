import { useState, useEffect } from 'react';
import {
  X, Trophy, Star, Gift, Send, AtSign, ArrowRightLeft,
  Users, Coins, Target, Crown, Medal, Award, Loader2,
  ChevronRight, ExternalLink, Zap
} from 'lucide-react';
import { useWalletStore } from '../store';
import { useProfileStore } from '../store/profileStore';
import { useNavigate } from 'react-router-dom';

// Mock leaderboard data - will be replaced with API
const MOCK_LEADERBOARD = [
  { rank: 1, username: 'gorbmaster', address: 'Gorb...x9k2', points: 125000, avatar: null },
  { rank: 2, username: 'cryptowhale', address: 'Cry1...8jk3', points: 98500, avatar: null },
  { rank: 3, username: 'defi_degen', address: 'DeFi...2m4n', points: 87200, avatar: null },
  { rank: 4, username: null, address: 'Anon...7y2x', points: 65400, avatar: null },
  { rank: 5, username: 'trader_joe', address: 'Trad...k9p1', points: 54300, avatar: null },
  { rank: 6, username: null, address: 'User...m3n4', points: 43200, avatar: null },
  { rank: 7, username: 'hodler', address: 'Hodl...p8q9', points: 32100, avatar: null },
  { rank: 8, username: 'moon_boy', address: 'Moon...r5s6', points: 28700, avatar: null },
  { rank: 9, username: null, address: 'Anon...t7u8', points: 21500, avatar: null },
  { rank: 10, username: 'satoshi_fan', address: 'Sato...v9w0', points: 18900, avatar: null },
];

// Ways to earn points
const EARN_METHODS = [
  {
    id: 'claim_username',
    icon: AtSign,
    title: 'Claim Username',
    description: 'Claim your unique @username on-chain',
    points: 500,
    oneTime: true,
    action: 'profile',
    completed: false,
  },
  {
    id: 'first_transaction',
    icon: Send,
    title: 'First Transaction',
    description: 'Send your first transaction',
    points: 100,
    oneTime: true,
    action: null,
    completed: false,
  },
  {
    id: 'swap_tokens',
    icon: ArrowRightLeft,
    title: 'Swap Tokens',
    description: 'Complete a token swap',
    points: 50,
    oneTime: false,
    action: 'bridge',
    completed: false,
  },
  {
    id: 'daily_login',
    icon: Star,
    title: 'Daily Check-in',
    description: 'Open your wallet daily',
    points: 10,
    oneTime: false,
    action: null,
    completed: true,
  },
  {
    id: 'invite_friends',
    icon: Users,
    title: 'Invite Friends',
    description: 'Invite friends to join TrashPack',
    points: 200,
    oneTime: false,
    action: null,
    completed: false,
  },
  {
    id: 'hold_tokens',
    icon: Coins,
    title: 'Hold GORB',
    description: 'Hold 100+ GORB for 7 days',
    points: 300,
    oneTime: true,
    action: null,
    completed: false,
  },
];

function PointsModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { walletAddress } = useWalletStore();
  const { username } = useProfileStore();
  const [activeTab, setActiveTab] = useState('earn'); // 'earn' or 'leaderboard'
  const [isLoading, setIsLoading] = useState(false);
  const [userPoints, setUserPoints] = useState(1250); // Mock user points
  const [userRank, setUserRank] = useState(156); // Mock user rank
  const [leaderboard, setLeaderboard] = useState(MOCK_LEADERBOARD);

  // Update earn methods based on user state
  const earnMethods = EARN_METHODS.map(method => ({
    ...method,
    completed: method.id === 'claim_username' ? !!username : method.completed,
  }));

  // Fetch leaderboard data
  useEffect(() => {
    if (isOpen && activeTab === 'leaderboard') {
      setIsLoading(true);
      // TODO: Replace with actual API call
      setTimeout(() => {
        setLeaderboard(MOCK_LEADERBOARD);
        setIsLoading(false);
      }, 500);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const handleEarnAction = (method) => {
    if (method.completed) return;

    if (method.action) {
      onClose();
      navigate(`/${method.action}`);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown size={16} className="text-yellow-400" />;
      case 2:
        return <Medal size={16} className="text-gray-300" />;
      case 3:
        return <Award size={16} className="text-amber-600" />;
      default:
        return <span className="text-xs text-zinc-400 font-mono w-4 text-center">{rank}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-[360px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center">
                <Zap size={22} className="text-white" fill="currentColor" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Gorb Points</h3>
                <p className="text-xs text-zinc-400">Earn rewards & climb the ranks</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 border border-yellow-500/20 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Star size={14} className="text-yellow-400" />
                <span className="text-xs text-zinc-400">Your Points</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatNumber(userPoints)}</div>
            </div>
            <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Trophy size={14} className="text-cyan-400" />
                <span className="text-xs text-zinc-400">Your Rank</span>
              </div>
              <div className="text-2xl font-bold text-white">#{userRank}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700/50">
          <button
            onClick={() => setActiveTab('earn')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'earn'
                ? 'text-yellow-400 border-b-2 border-yellow-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Gift size={16} />
              Ways to Earn
            </div>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'leaderboard'
                ? 'text-yellow-400 border-b-2 border-yellow-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy size={16} />
              Leaderboard
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === 'earn' ? (
            <div className="space-y-2">
              {earnMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <div
                    key={method.id}
                    onClick={() => handleEarnAction(method)}
                    className={`p-3 rounded-xl border transition-all ${
                      method.completed
                        ? 'bg-emerald-900/20 border-emerald-500/20'
                        : method.action
                        ? 'bg-zinc-800/60 border-zinc-700/50 hover:border-yellow-500/30 cursor-pointer'
                        : 'bg-zinc-800/60 border-zinc-700/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        method.completed
                          ? 'bg-emerald-500/20'
                          : 'bg-zinc-700/50'
                      }`}>
                        <IconComponent
                          size={20}
                          className={method.completed ? 'text-emerald-400' : 'text-zinc-400'}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            method.completed ? 'text-emerald-400' : 'text-white'
                          }`}>
                            {method.title}
                          </span>
                          {method.oneTime && (
                            <span className="px-1.5 py-0.5 bg-zinc-700 rounded text-[10px] text-zinc-400">
                              One-time
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">{method.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {method.completed ? (
                          <span className="text-xs text-emerald-400">Completed</span>
                        ) : (
                          <>
                            <span className="text-sm font-bold text-yellow-400">+{method.points}</span>
                            {method.action && <ChevronRight size={14} className="text-zinc-400" />}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-yellow-500" />
                </div>
              ) : (
                <>
                  {/* Top 3 Podium */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[leaderboard[1], leaderboard[0], leaderboard[2]].map((user, idx) => (
                      <div
                        key={user.rank}
                        className={`text-center p-2 rounded-xl ${
                          idx === 1 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-zinc-800/60'
                        }`}
                      >
                        <div className="mb-1">{getRankIcon(user.rank)}</div>
                        <div className="text-xs font-medium text-white truncate">
                          {user.username ? `@${user.username}` : user.address}
                        </div>
                        <div className="text-xs text-yellow-400 font-bold">
                          {formatNumber(user.points)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rest of leaderboard */}
                  {leaderboard.slice(3).map((user) => (
                    <div
                      key={user.rank}
                      className="flex items-center gap-3 p-2.5 bg-zinc-800/40 rounded-lg"
                    >
                      <div className="w-6 flex justify-center">
                        {getRankIcon(user.rank)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {user.username ? `@${user.username}` : user.address}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-yellow-400">
                        {formatNumber(user.points)}
                      </div>
                    </div>
                  ))}

                  {/* User's position if not in top 10 */}
                  {userRank > 10 && (
                    <div className="mt-3 pt-3 border-t border-zinc-700/50">
                      <div className="flex items-center gap-3 p-2.5 bg-cyan-900/20 border border-cyan-500/20 rounded-lg">
                        <div className="w-6 flex justify-center">
                          <span className="text-xs text-cyan-400 font-mono">#{userRank}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-cyan-400 truncate">
                            {username ? `@${username}` : `${walletAddress?.slice(0, 4)}...${walletAddress?.slice(-4)}`}
                          </div>
                          <div className="text-xs text-zinc-400">Your position</div>
                        </div>
                        <div className="text-sm font-medium text-yellow-400">
                          {formatNumber(userPoints)}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-700/50">
          <p className="text-xs text-zinc-500 text-center">
            Points are calculated based on on-chain activity. Rankings update hourly.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PointsModal;
