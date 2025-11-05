export type PollType = 'PITCH' | 'BOOK';
export type PollStatus = 'DRAFT' | 'OPEN' | 'CLOSED';

export interface Poll {
  id: string;
  clubId: string;
  type: PollType;
  title: string;
  description: string | null;
  status: PollStatus;
  opensAt: Date;
  closesAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PollOption {
  id: string;
  pollId: string;
  text: string;
  refType: 'PITCH' | 'BOOK' | null;
  refId: string | null;
  createdAt: Date;
}

export interface Vote {
  id: string;
  pollId: string;
  userId: string;
  pollOptionId: string;
  createdAt: Date;
}

export interface CreatePoll {
  type: PollType;
  title: string;
  description?: string;
  opensAt: string;
  closesAt: string;
}

export interface CreatePollOption {
  text: string;
  refType?: 'PITCH' | 'BOOK';
  refId?: string;
}

export interface UpdatePoll {
  status?: PollStatus;
  opensAt?: string;
  closesAt?: string;
}

export interface CreateVote {
  pollOptionId: string;
}

export interface PollResults {
  poll: Poll;
  options: Array<{
    option: PollOption;
    count: number;
  }>;
  userVote?: Vote;
}
