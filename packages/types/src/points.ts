export type PointEventType = 'SWAP_VERIFIED' | 'PITCH_SELECTED' | 'VOTE_PARTICIPATION';

export interface PointLedger {
  id: string;
  userId: string;
  amount: number;
  eventType: PointEventType;
  refType: string | null;
  refId: string | null;
  createdAt: Date;
}

export interface UserPoints {
  points: number;
  reputation: number;
}

export interface ChooseBookRequest {
  pitchId: string;
}

export interface ChooseBookResponse {
  pitch: any;
  pointsAwarded: number;
}
