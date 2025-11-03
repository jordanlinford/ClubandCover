import type { ApiResponse } from '@repo/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
}

export const api = new ApiClient();
