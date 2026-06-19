
export type Role = 'ADMIN' | 'STUDENT' | 'USTHAD';

export interface User {
  id: string;
  name: string;
  role: Role;
  class?: string;
  avatarUrl?: string;
  portalMode?: Role; // The role selected during login
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  year: number;
  isbn: string;
  coverUrl: string;
  price: number;
  totalCopies: number;
  availableCopies: number;
  currentBorrowers: { userId: string; userName: string }[];
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'DENIED';

export interface BorrowRequest {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  userName: string;
  status: RequestStatus;
  timestamp: number;
}

export interface HistoryRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  userName: string;
  borrowDate: number;
  dueDate: number;
  returnDate?: number;
  issuedBy?: string;
  renewals?: number;
}

export type FineStatus = 'PENDING' | 'PAID';

export interface Fine {
  id: string;
  userId: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  amount: number;
  reason: string;
  status: FineStatus;
  timestamp: number;
}
