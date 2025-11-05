import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Copy, Check, Users, Gift, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { Referral, ReferralStats } from '@repo/types';

interface ReferralWithUser extends Referral {
  referredUser: {
    name: string | null;
    email: string;
  };
}

interface ReferralResponse {
  referrals: ReferralWithUser[];
  stats: ReferralStats;
}

export default function ReferralDashboard() {
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const { data: referralCode } = useQuery<Referral>({
    queryKey: ['/api/referrals/code'],
    queryFn: () => api.getReferralCode(),
  });

  const { data: referralsData, isLoading } = useQuery<ReferralResponse>({
    queryKey: ['/api/referrals/stats'],
    queryFn: () => api.getReferralStats() as any,
  });

  const handleCopyCode = async () => {
    if (referralCode?.code) {
      await navigator.clipboard.writeText(referralCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const referralUrl = referralCode?.code 
    ? `${window.location.origin}/signup?ref=${referralCode.code}`
    : '';

  const handleCopyUrl = async () => {
    if (referralUrl) {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = referralsData?.stats || { issued: 0, activated: 0, pointsEarned: 0 };
  const referrals = referralsData?.referrals || [];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8" data-testid="page-referral-dashboard">
      {/* Page Header */}
      <div className="pb-8 border-b border-gray-200 dark:border-gray-700 mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Referral Dashboard
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Invite friends and earn rewards together
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6" data-testid="card-total-referrals">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Total Referrals
            </h3>
          </div>
          <p className="text-4xl font-semibold text-gray-900 dark:text-gray-100" data-testid="stat-total-referrals">
            {stats.issued}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6" data-testid="card-active-referrals">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Active Users
            </h3>
          </div>
          <p className="text-4xl font-semibold text-gray-900 dark:text-gray-100" data-testid="stat-active-referrals">
            {stats.activated}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6" data-testid="card-total-points">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Gift className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Points Earned
            </h3>
          </div>
          <p className="text-4xl font-semibold text-gray-900 dark:text-gray-100" data-testid="stat-total-points">
            {stats.pointsEarned}
          </p>
        </div>
      </div>

      {/* Referral Code Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Your Referral Code
          </h2>
          {referralCode?.code ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {referralCode.code}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  data-testid="button-copy-code"
                >
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Share this link:
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-700 dark:text-gray-300 truncate font-mono">
                    {referralUrl}
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    data-testid="button-copy-url"
                  >
                    {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Loading your referral code...
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            How It Works
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                1
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Share your referral code or link with friends
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                2
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                They sign up using your code and earn 25 points
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                3
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                You earn 50 points when they activate their account
              </p>
            </li>
          </ul>
        </div>
      </div>

      {/* Referred Users Table */}
      {referrals.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Your Referrals
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-referrals">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Points Earned
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {referrals.map((referral: ReferralWithUser) => (
                  <tr
                    key={referral.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    data-testid={`row-referral-${referral.id}`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {referral.referredUser.name || referral.referredUser.email}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          referral.status === 'ACTIVATED'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {referral.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(referral.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      +{referral.status === 'ACTIVATED' ? '50' : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
