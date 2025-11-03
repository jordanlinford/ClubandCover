import type { ApiResponse, Book, CreateBook, Club, CreateClub, Swap } from '@repo/types';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

class ApiClient {
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.getAuthToken() && {
          Authorization: `Bearer ${this.getAuthToken()}`,
        }),
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const json = await response.json() as ApiResponse<T>;

    if (!json.success) {
      throw new Error(json.error || 'Request failed');
    }

    return json.data as T;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('supabase_token');
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
}

export const api = new ApiClient();
