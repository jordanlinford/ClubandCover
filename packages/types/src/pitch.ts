export enum BookFormat {
  PAPERBACK = 'PAPERBACK',
  HARDCOVER = 'HARDCOVER',
  EBOOK = 'EBOOK',
  AUDIOBOOK = 'AUDIOBOOK',
}

export interface Pitch {
  id: string;
  title: string;
  blurb: string;
  authorId: string;
  targetClubId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  availableFormats: BookFormat[];
  offerFreeIfChosen: boolean;
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
  availableFormats: BookFormat[];
  offerFreeIfChosen?: boolean;
}

export interface UpdatePitch {
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}
