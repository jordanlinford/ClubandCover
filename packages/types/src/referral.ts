export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string | null;
  code: string;
  status: 'ISSUED' | 'CLAIMED' | 'ACTIVATED' | 'EXPIRED';
  activatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferralWithReferee extends Referral {
  referee: {
    id: string;
    displayName: string;
    email: string;
  } | null;
}

export interface ReferralStats {
  issued: number;
  activated: number;
  pointsEarned: number;
}

export interface CreateReferralResponse {
  code: string;
  id: string;
}

export interface ActivateReferralResponse {
  success: boolean;
  referrerId?: string;
  refereeId?: string;
  alreadyActivated?: boolean;
  limitReached?: boolean;
}
