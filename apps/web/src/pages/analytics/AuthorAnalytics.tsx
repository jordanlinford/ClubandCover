import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BarChart, TrendingUp, Users, Award, Lightbulb } from 'lucide-react';
import type { AuthorAnalytics } from '@repo/types';

export default function AuthorAnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<AuthorAnalytics>({
    queryKey: ['/api/analytics/author'],
    queryFn: () => api.getAuthorAnalytics(),
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <BarChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No analytics data available yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8" data-testid="page-author-analytics">
      {/* Page Header */}
      <div className="pb-8 border-b border-gray-200 dark:border-gray-700 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BarChart className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Author Analytics
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Track your performance across pitches and community engagement
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6" data-testid="card-total-pitches">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Lightbulb className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Total Pitches
            </h3>
          </div>
          <p className="text-4xl font-semibold text-gray-900 dark:text-gray-100" data-testid="stat-total-pitches">
            {analytics.totalPitches}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6" data-testid="card-accepted-pitches">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Accepted Pitches
            </h3>
          </div>
          <p className="text-4xl font-semibold text-gray-900 dark:text-gray-100" data-testid="stat-accepted-pitches">
            {analytics.acceptedPitches}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {analytics.totalPitches > 0
              ? `${Math.round((analytics.acceptedPitches / analytics.totalPitches) * 100)}% success rate`
              : 'No pitches yet'}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6" data-testid="card-pending-pitches">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Pending Pitches
            </h3>
          </div>
          <p className="text-4xl font-semibold text-gray-900 dark:text-gray-100" data-testid="stat-pending-pitches">
            {analytics.pendingPitches}
          </p>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6" data-testid="card-total-votes">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Total Votes
            </h3>
          </div>
          <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100" data-testid="stat-total-votes">
            {analytics.totalVotes}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6" data-testid="card-total-impressions">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Total Views
            </h3>
          </div>
          <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100" data-testid="stat-total-impressions">
            {analytics.totalImpressions}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6" data-testid="card-avg-click-rate">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <BarChart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Avg Click Rate
            </h3>
          </div>
          <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100" data-testid="stat-avg-click-rate">
            {analytics.averageClickRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Performance Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-medium mb-1">Pitch Status Breakdown:</p>
            <ul className="space-y-1 ml-4">
              <li>Accepted: {analytics.acceptedPitches}</li>
              <li>Rejected: {analytics.rejectedPitches}</li>
              <li>Pending: {analytics.pendingPitches}</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1">Engagement Metrics:</p>
            <ul className="space-y-1 ml-4">
              <li>Total Votes Received: {analytics.totalVotes}</li>
              <li>Total Impressions: {analytics.totalImpressions}</li>
              <li>Average Click Rate: {analytics.averageClickRate.toFixed(2)}%</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
