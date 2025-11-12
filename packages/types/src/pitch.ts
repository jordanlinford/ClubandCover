export interface Pitch {
  id: string;
  title: string;
  blurb: string;
  authorId: string;
  targetClubId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePitch {
  title: string;
  blurb: string;
  targetClubId?: string;
  genres?: string[];
  theme?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface UpdatePitch {
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}
