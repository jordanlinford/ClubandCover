import type { ApiResponse, Book, CreateBook, Club, CreateClub, Swap, GenerateBlurbRequest, MatchRequest, MatchResult, IndexOneRequest } from '@repo/types';
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
}

export const api = new ApiClient();
