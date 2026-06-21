
import { Book, User, BorrowRequest, HistoryRecord, Fine } from './types';

// Detect environment and set base URL
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL ||
  (isLocalhost ? 'http://localhost:5000/api' : '/api');

class ApiService {
  private useLocalStorageFallback = false;

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (this.useLocalStorageFallback) {
      return this.localStorageMock<T>(endpoint, options);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // If server is up but returns an error (404, 500, etc)
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON
        }
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (err: any) {
      // Catch network errors (server down, CORS, timeout)
      const isNetworkError = err.name === 'AbortError' ||
        err instanceof TypeError ||
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError');

      if (isNetworkError) {
        console.warn(`Backend unreachable at ${API_BASE_URL}. Switching to LocalStorage mode.`);
        this.useLocalStorageFallback = true;
        return this.localStorageMock<T>(endpoint, options);
      }

      // Re-throw if it's a legitimate server-side logic error
      throw err;
    }
  }

  private localStorageMock<T>(endpoint: string, options?: RequestInit): any {
    const segments = endpoint.split('/');
    const key = segments[1]; // e.g., 'books', 'users'
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.parse(options.body as string) : null;

    const getData = (k: string) => {
      const data = localStorage.getItem(`albayan_${k}`);
      return data ? JSON.parse(data) : [];
    };

    const setData = (k: string, data: any) => {
      localStorage.setItem(`albayan_${k}`, JSON.stringify(data));
    };

    switch (method) {
      case 'GET':
        return getData(key);

      case 'POST': {
        const data = getData(key);
        const bodies = Array.isArray(body) ? body : [body];

        bodies.forEach((item: any) => {
          const existingIndex = data.findIndex((existing: any) => existing.id === item.id);
          if (existingIndex > -1) {
            data[existingIndex] = item;
          } else {
            data.push(item);
          }
        });

        setData(key, data);
        return body;
      }

      case 'PATCH': {
        const id = segments[2];
        const data = getData(key);
        const index = data.findIndex((item: any) => item.id === id);
        if (index > -1) {
          data[index] = { ...data[index], ...body };
          setData(key, data);
          return data[index];
        }
        return null;
      }

      case 'DELETE': {
        const id = segments[2];
        const data = getData(key);
        if (id) {
          const filtered = data.filter((item: any) => item.id !== id);
          setData(key, filtered);
          return { message: 'Deleted successfully' };
        } else {
          setData(key, []);
          return { message: 'All deleted successfully' };
        }
      }

      default:
        return null;
    }
  }

  async getBooks(): Promise<Book[]> { return this.request<Book[]>('/books'); }
  async saveBook(book: Book): Promise<Book> { return this.request<Book>('/books', { method: 'POST', body: JSON.stringify(book) }); }
  async bulkSaveBooks(books: Book[]): Promise<Book[]> { return this.request<Book[]>('/books/bulk', { method: 'POST', body: JSON.stringify(books) }); }
  async deleteBook(id: string): Promise<void> { await this.request<void>(`/books/${id}`, { method: 'DELETE' }); }
  async getUsers(): Promise<User[]> { return this.request<User[]>('/users'); }
  async saveUser(user: User): Promise<User> { return this.request<User>('/users', { method: 'POST', body: JSON.stringify(user) }); }
  async bulkSaveUsers(users: User[]): Promise<User[]> { return this.request<User[]>('/users/bulk', { method: 'POST', body: JSON.stringify(users) }); }
  async deleteUser(id: string): Promise<void> { await this.request<void>(`/users/${id}`, { method: 'DELETE' }); }
  async getRequests(): Promise<BorrowRequest[]> { return this.request<BorrowRequest[]>('/requests'); }
  async createRequest(request: BorrowRequest): Promise<BorrowRequest> { return this.request<BorrowRequest>('/requests', { method: 'POST', body: JSON.stringify(request) }); }
  async updateRequestStatus(id: string, status: 'APPROVED' | 'DENIED'): Promise<void> { await this.request<void>(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); }
  async deleteAllRequests(): Promise<void> { await this.request<void>('/requests', { method: 'DELETE' }); }
  async getHistory(): Promise<HistoryRecord[]> { return this.request<HistoryRecord[]>('/history'); }
  async addHistoryRecord(record: HistoryRecord): Promise<void> { await this.request<void>('/history', { method: 'POST', body: JSON.stringify(record) }); }
  async updateHistoryRecord(id: string, updates: Partial<HistoryRecord>): Promise<void> { await this.request<void>(`/history/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }); }
  async deleteAllHistory(): Promise<void> { await this.request<void>('/history', { method: 'DELETE' }); }
  async getFines(): Promise<Fine[]> { return this.request<Fine[]>('/fines'); }
  async createFine(fine: Fine): Promise<Fine> { return this.request<Fine>('/fines', { method: 'POST', body: JSON.stringify(fine) }); }
  async updateFineStatus(id: string, status: 'PENDING' | 'PAID'): Promise<void> { await this.request<void>(`/fines/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); }
  async deleteAllFines(): Promise<void> { await this.request<void>('/fines', { method: 'DELETE' }); }
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      let errorText = 'Upload failed';
      try {
        const errorData = await response.json();
        errorText = errorData.error ? `Server Error: ${errorData.error}` : (errorData.message || errorText);
      } catch (e) {
        errorText = `Upload failed with status ${response.status}`;
      }
      throw new Error(errorText);
    }
    const data = await response.json();
    return data.url;
  }

  isUsingFallback(): boolean { return this.useLocalStorageFallback; }
}

export const api = new ApiService();
