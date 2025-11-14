import { Award, BookOpen, Users, Feather, Trophy, Sparkles, Target, TrendingUp, Repeat, CheckCircle, Star } from 'lucide-react';

export const BADGE_ICONS: Record<string, typeof Award> = {
  FIRST_VOTE: Target,
  BOOKWORM: BookOpen,
  SOCIABLE: Users,
  LOYAL_MEMBER: Sparkles,
  HOST_STARTER: Users,
  COMMUNITY_ACTIVE: TrendingUp,
  DECISIVE: Trophy,
  AUTHOR_LAUNCH: Feather,
  FAN_FAVORITE: Trophy,
  SWAP_MASTER: Repeat,
  SWAP_VERIFIED: CheckCircle,
  BOOK_REVIEWER: Star,
  CRITIC: Award,
};

export const BADGE_COLORS: Record<string, string> = {
  FIRST_VOTE: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  BOOKWORM: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  SOCIABLE: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  LOYAL_MEMBER: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
  HOST_STARTER: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
  COMMUNITY_ACTIVE: 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30',
  DECISIVE: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
  AUTHOR_LAUNCH: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
  FAN_FAVORITE: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
  SWAP_MASTER: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30',
  SWAP_VERIFIED: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
  BOOK_REVIEWER: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
  CRITIC: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30',
};
