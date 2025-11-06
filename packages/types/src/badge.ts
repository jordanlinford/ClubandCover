export type BadgeCategory = 'READER' | 'HOST' | 'AUTHOR';

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string; // lucide-react icon name
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  badge?: Badge;
}
