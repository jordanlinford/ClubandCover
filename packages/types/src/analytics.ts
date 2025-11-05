export interface PitchAnalytics {
  pitchId: string;
  views: number;
  impressions: number;
  clickRate: number;
  pollId: string | null;
  voteCount: number;
  isWinner: boolean;
}

export interface AuthorAnalytics {
  totalPitches: number;
  acceptedPitches: number;
  rejectedPitches: number;
  pendingPitches: number;
  totalVotes: number;
  totalImpressions: number;
  averageClickRate: number;
}
