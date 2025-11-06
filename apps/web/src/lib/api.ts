import type { 
  ApiResponse, Book, CreateBook, Club, CreateClub, Swap, 
  GenerateBlurbRequest, MatchRequest, MatchResult, IndexOneRequest,
  Pitch, CreatePitch, UpdatePitch,
  Poll, PollOption, Vote, CreatePoll, CreatePollOption, UpdatePoll, CreateVote, PollResults,
  UserPoints, PointLedger, ChooseBookRequest, ChooseBookResponse,
  Referral, ReferralStats,
  Notification, UserSetting,
  SearchParams, SearchResult, TrendingQuery, TrendingItem,
  ChecklistCode, Checklist, CompleteStepRequest,
  PitchAnalytics, AuthorAnalytics,
  CreatePollFullRequest
} from '@repo/types';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  code?: string;
  status: number;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class ApiClient {
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    
    // Get token from Supabase session
    const token = await this.getAuthToken();
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && {
          Authorization: `Bearer ${token}`,
        }),
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const json = await response.json() as ApiResponse<T>;

    if (!json.success) {
      const error = json.error;
      
      // Handle structured error objects (e.g., AI rate limit errors)
      if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        throw new ApiError(
          errorObj.message || 'Request failed',
          response.status,
          errorObj.code,
          errorObj
        );
      }
      
      // Handle string errors
      throw new ApiError(
        typeof error === 'string' ? error : 'Request failed',
        response.status
      );
    }

    return json.data as T;
  }

  private async getAuthToken(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>('POST', endpoint, data);
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>('PATCH', endpoint, data);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }

  // Books API
  async getBooks(): Promise<Book[]> {
    return this.get<Book[]>('/books');
  }

  async getBook(id: string): Promise<Book> {
    return this.get<Book>(`/books/${id}`);
  }

  async createBook(data: CreateBook): Promise<Book> {
    return this.post<Book>('/books', data);
  }

  async updateBook(id: string, data: Partial<CreateBook>): Promise<Book> {
    return this.patch<Book>(`/books/${id}`, data);
  }

  async deleteBook(id: string): Promise<void> {
    return this.delete<void>(`/books/${id}`);
  }

  // Clubs API
  async getClubs(): Promise<Club[]> {
    return this.get<Club[]>('/clubs');
  }

  async getClub(id: string): Promise<Club> {
    return this.get<Club>(`/clubs/${id}`);
  }

  async createClub(data: CreateClub): Promise<Club> {
    return this.post<Club>('/clubs', data);
  }

  async updateClub(id: string, data: Partial<CreateClub>): Promise<Club> {
    return this.patch<Club>(`/clubs/${id}`, data);
  }

  async deleteClub(id: string): Promise<void> {
    return this.delete<void>(`/clubs/${id}`);
  }

  // Swaps API
  async getSwaps(): Promise<Swap[]> {
    return this.get<Swap[]>('/swaps');
  }

  async getSwap(id: string): Promise<Swap> {
    return this.get<Swap>(`/swaps/${id}`);
  }

  async updateSwap(id: string, status: string): Promise<Swap> {
    return this.patch<Swap>(`/swaps/${id}`, { status });
  }

  // AI API
  async generateBlurb(request: GenerateBlurbRequest): Promise<{ blurb: string }> {
    return this.post<{ blurb: string }>('/ai/generate-blurb', request);
  }

  async getMatches(request: MatchRequest): Promise<MatchResult[]> {
    return this.post<MatchResult[]>('/ai/match', request);
  }

  async indexEntity(request: IndexOneRequest): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>('/ai/index-one', request);
  }

  async getConfig(): Promise<{ supabaseBackend: boolean; openaiBackend: boolean }> {
    return this.get<{ supabaseBackend: boolean; openaiBackend: boolean }>('/debug/config');
  }

  // Pitches API
  async getPitches(params?: { authorId?: string; clubId?: string; status?: string }): Promise<Pitch[]> {
    const query = new URLSearchParams();
    if (params?.authorId) query.append('authorId', params.authorId);
    if (params?.clubId) query.append('clubId', params.clubId);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString();
    return this.get<Pitch[]>(`/pitches${queryString ? `?${queryString}` : ''}`);
  }

  async getPitch(id: string): Promise<Pitch> {
    return this.get<Pitch>(`/pitches/${id}`);
  }

  async createPitch(data: CreatePitch): Promise<Pitch> {
    return this.post<Pitch>('/pitches', data);
  }

  async updatePitch(id: string, data: UpdatePitch): Promise<Pitch> {
    return this.patch<Pitch>(`/pitches/${id}`, data);
  }

  // Polls API
  async createPoll(clubId: string, data: CreatePoll): Promise<Poll> {
    return this.post<Poll>(`/clubs/${clubId}/polls`, data);
  }

  async getPoll(id: string): Promise<Poll> {
    return this.get<Poll>(`/polls/${id}`);
  }

  async updatePoll(id: string, data: UpdatePoll): Promise<Poll> {
    return this.patch<Poll>(`/polls/${id}`, data);
  }

  async addPollOption(pollId: string, data: CreatePollOption): Promise<PollOption> {
    return this.post<PollOption>(`/polls/${pollId}/options`, data);
  }

  async vote(pollId: string, data: CreateVote): Promise<Vote> {
    return this.post<Vote>(`/polls/${pollId}/votes`, data);
  }

  async getPollResults(pollId: string): Promise<PollResults> {
    return this.get<PollResults>(`/polls/${pollId}/results`);
  }

  // Clubs - Choose Book
  async chooseBook(clubId: string, data: ChooseBookRequest): Promise<ChooseBookResponse> {
    return this.post<ChooseBookResponse>(`/clubs/${clubId}/choose-book`, data);
  }

  // Points API
  async getUserPoints(userId: string): Promise<UserPoints> {
    return this.get<UserPoints>(`/users/${userId}/points`);
  }

  async getUserLedger(userId: string): Promise<PointLedger[]> {
    return this.get<PointLedger[]>(`/users/${userId}/ledger`);
  }

  // Referrals API
  async getReferralCode(): Promise<Referral> {
    return this.get<Referral>('/referrals/code');
  }

  async activateReferral(request: { code: string }): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>('/referrals/activate', request);
  }

  async getReferralStats(): Promise<ReferralStats> {
    return this.get<ReferralStats>('/referrals/stats');
  }

  // Notifications API
  async getNotifications(): Promise<Notification[]> {
    return this.get<Notification[]>('/notifications');
  }

  async markNotificationRead(id: string): Promise<void> {
    return this.patch<void>(`/notifications/${id}/read`, {});
  }

  async markAllNotificationsRead(): Promise<void> {
    return this.post<void>('/notifications/read-all', {});
  }

  async getUnreadCount(): Promise<{ count: number }> {
    return this.get<{ count: number }>('/notifications/unread-count');
  }

  // Settings API
  async getUserSettings(): Promise<UserSetting> {
    return this.get<UserSetting>('/settings');
  }

  async updateUserSettings(settings: Partial<UserSetting>): Promise<UserSetting> {
    return this.patch<UserSetting>('/settings', settings);
  }

  // Discover API
  async search(query: SearchParams): Promise<SearchResult<Book | Club | Pitch>> {
    return this.post<SearchResult<Book | Club | Pitch>>('/discover/search', query);
  }

  async getTrending(query: TrendingQuery): Promise<TrendingItem[]> {
    return this.post<TrendingItem[]>('/discover/trending', query);
  }

  // Checklists API
  async getUserChecklists(userType: ChecklistCode): Promise<Checklist> {
    return this.get<Checklist>(`/checklists/${userType}`);
  }

  async completeChecklistStep(request: CompleteStepRequest): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>('/checklists/complete', request);
  }

  // Analytics API
  async getPitchAnalytics(pitchId: string): Promise<PitchAnalytics> {
    return this.get<PitchAnalytics>(`/analytics/pitches/${pitchId}`);
  }

  async getAuthorAnalytics(): Promise<AuthorAnalytics> {
    return this.get<AuthorAnalytics>('/analytics/authors/me');
  }

  // Polls Full API
  async createPollFull(request: CreatePollFullRequest): Promise<Poll> {
    return this.post<Poll>('/polls/full', request);
  }

  // Sprint-6: Onboarding API
  async setUserRole(role: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>('/onboarding/role', { role });
  }

  async updateUserProfile(data: { 
    genres: string[]; 
    booksPerMonth: number; 
    bio?: string 
  }): Promise<{ success: boolean }> {
    return this.patch<{ success: boolean }>('/onboarding/profile', data);
  }

  // Sprint-6: Club Search API
  async searchClubs(params: {
    q?: string;
    genres?: string[];
    frequency?: number;
    minPoints?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    clubs: Club[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.genres) params.genres.forEach(g => query.append('genres', g));
    if (params.frequency) query.append('frequency', params.frequency.toString());
    if (params.minPoints !== undefined) query.append('minPoints', params.minPoints.toString());
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    return this.get(`/clubs/search?${query.toString()}`);
  }

  // Sprint-6: Club Messages API
  async getClubMessages(clubId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    messages: Array<{
      id: string;
      clubId: string;
      userId: string;
      body: string;
      attachmentUrl: string | null;
      attachmentType: string | null;
      attachmentName: string | null;
      createdAt: Date;
      author: { id: string; name: string; avatarUrl: string | null };
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryString = query.toString();
    return this.get(`/clubs/${clubId}/messages${queryString ? `?${queryString}` : ''}`);
  }

  async postClubMessage(clubId: string, data: {
    body: string;
    attachmentUrl?: string;
    attachmentType?: string;
    attachmentName?: string;
  }): Promise<{
    id: string;
    clubId: string;
    userId: string;
    body: string;
    attachmentUrl: string | null;
    attachmentType: string | null;
    attachmentName: string | null;
    createdAt: Date;
    author: { id: string; name: string; avatarUrl: string | null };
  }> {
    return this.post(`/clubs/${clubId}/messages`, data);
  }
}

export const api = new ApiClient();
