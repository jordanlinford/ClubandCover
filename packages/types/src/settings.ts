export interface UserSetting {
  userId: string;
  emailOptIn: boolean;
  emailPollReminders: boolean;
  emailSwapUpdates: boolean;
  emailPointsUpdates: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserSettingRequest {
  emailOptIn?: boolean;
  emailPollReminders?: boolean;
  emailSwapUpdates?: boolean;
  emailPointsUpdates?: boolean;
}
