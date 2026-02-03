
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Book, User, BorrowRequest, HistoryRecord, Fine } from './types';
import Splash from './components/Splash';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard';
import About from './components/About';
import Logo from './components/Logo';
import { api } from './api';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);

  const [cloudIdentity, setCloudIdentity] = useState<{ id: string, name: string, avatarUrl?: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('albayan_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from URL path
  const activeTab = location.pathname.split('/').filter(Boolean)[0] || 'dashboard';

  // Global Status Message
  const [statusMsg, setStatusMsgState] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const setStatusMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsgState({ text, type });
    setTimeout(() => setStatusMsgState(null), 4000);
  };

  const refreshAllData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [b, u, r, h, f] = await Promise.all([
        api.getBooks(),
        api.getUsers(),
        api.getRequests(),
        api.getHistory(),
        api.getFines()
      ]);
      setBooks(b || []);
      setUsers(u || []);
      setRequests(r || []);
      setHistory(h || []);
      setFines(f || []);

      setIsLocalMode(api.isUsingFallback());
    } catch (err: any) {
      console.warn("Cloud Sync Interaction:", err.message);
      setIsLocalMode(api.isUsingFallback());
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      // Apply theme
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('albayan_theme', theme);

      const savedIdentity = localStorage.getItem('albayan_cloud_identity');
      if (savedIdentity) {
        setCloudIdentity(JSON.parse(savedIdentity));
      }

      const savedSession = localStorage.getItem('albayan_active_session');
      if (savedSession) {
        const user = JSON.parse(savedSession);
        // Requirement: Admin must re-authenticate on refresh
        if (user.role === 'ADMIN') {
          localStorage.removeItem('albayan_active_session');
          setCurrentUser(null);
        } else {
          setCurrentUser(user);
        }
      }

      await refreshAllData();
      const interval = setInterval(refreshAllData, 5000);

      setTimeout(() => setLoading(false), 2000);
      return () => clearInterval(interval);
    };
    init();
  }, [refreshAllData]);

  const handleIdentify = (identity: { id: string, name: string, avatarUrl?: string }) => {
    setCloudIdentity(identity);
    localStorage.setItem('albayan_cloud_identity', JSON.stringify(identity));
  };

  const handleLogin = async (userData: User) => {
    setIsSyncing(true);
    try {
      setCurrentUser(userData);
      localStorage.setItem('albayan_active_session', JSON.stringify(userData));
      await refreshAllData();
      navigate('/dashboard');
    } catch (err) {
      setCurrentUser(userData);
      navigate('/dashboard');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSwitchPortal = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('albayan_active_session');
    navigate('/login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  const handleFullLogout = useCallback(() => {
    setCurrentUser(null);
    setCloudIdentity(null);
    localStorage.removeItem('albayan_active_session');
    localStorage.removeItem('albayan_cloud_identity');
    navigate('/login');
  }, [navigate]);

  const handleAddOrUpdateBook = async (book: Book) => {
    await api.saveBook(book);
    await refreshAllData();
  };

  const handleBulkAddBooks = async (books: Book[]) => {
    await api.bulkSaveBooks(books);
    await refreshAllData();
  };

  const handleDeleteBook = async (id: string) => {
    await api.deleteBook(id);
    await refreshAllData();
  };

  const handleAddOrUpdateUser = async (user: User) => {
    await api.saveUser(user);
    await refreshAllData();
  };

  const handleBulkAddUsers = async (users: User[]) => {
    await api.bulkSaveUsers(users);
    await refreshAllData();
  };

  const handleDeleteUser = async (id: string) => {
    await api.deleteUser(id);
    await refreshAllData();
  };

  const handleRequestAction = async (requestId: string, action: 'APPROVE' | 'DENY') => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    try {
      if (action === 'APPROVE') {
        const book = books.find(b => b.id === req.bookId);
        if (book && (book.availableCopies || 0) > 0) {
          const updatedBook = {
            ...book,
            availableCopies: Number(book.availableCopies || 0) - 1,
            currentBorrowers: [...(book.currentBorrowers || []), { userId: req.userId, userName: req.userName }]
          };
          await api.saveBook(updatedBook);
          await api.addHistoryRecord({
            id: `H${Date.now()}`,
            bookId: req.bookId,
            bookTitle: req.bookTitle,
            userId: req.userId,
            userName: req.userName,
            borrowDate: Date.now(),
            dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 Days
            issuedBy: currentUser?.name || 'Admin'
          });
        }
      }
      await api.updateRequestStatus(requestId, action === 'APPROVE' ? 'APPROVED' : 'DENIED');
      setStatusMsg(`Request ${action === 'APPROVE' ? 'Approved' : 'Denied'}`);
      await refreshAllData();
    } catch (err: any) {
      setStatusMsg("Action failed: " + err.message, 'error');
    }
  };

  const handleReturnBook = async (bookId: string, userId: string, fine?: { amount: number, reason: string }) => {
    const book = books.find(b => b.id === bookId);
    if (book) {
      const currentAvailable = Number(book.availableCopies || 0);
      const total = Number(book.totalCopies || 1);
      const updatedBook = {
        ...book,
        availableCopies: Math.min(total, currentAvailable + 1),
        currentBorrowers: (book.currentBorrowers || []).filter(cb => cb.userId !== userId)
      };
      await api.saveBook(updatedBook);
      const record = history.find(h => h.bookId === bookId && h.userId === userId && !h.returnDate);
      if (record) {
        const returnDate = Date.now();
        await api.updateHistoryRecord(record.id, { returnDate });

        // Auto-calculate fine if not provided manually but is overdue
        let finalFine = fine;
        if (!finalFine && returnDate > record.dueDate) {
          const overdueDays = Math.floor((returnDate - record.dueDate) / (1000 * 60 * 60 * 24));
          if (overdueDays > 0) {
            finalFine = {
              amount: overdueDays * 5, // 5 per day
              reason: `Overdue by ${overdueDays} days`
            };
          }
        }

        if (finalFine && finalFine.amount > 0) {
          await api.createFine({
            id: `F${Date.now()}`,
            userId,
            userName: record.userName,
            bookId,
            bookTitle: record.bookTitle,
            amount: finalFine.amount,
            reason: finalFine.reason,
            status: 'PENDING',
            timestamp: Date.now()
          });
        }
      }
    }
    await refreshAllData();
  };

  const handleIssueBook = async (bookId: string, userId: string) => {
    try {
      const book = books.find(b => b.id === bookId);
      const user = users.find(u => u.id === userId);

      if (!book || !user) throw new Error("Book or User not found");
      if ((book.availableCopies || 0) <= 0) throw new Error("No copies available");

      const updatedBook = {
        ...book,
        availableCopies: Number(book.availableCopies || 0) - 1,
        currentBorrowers: [...(book.currentBorrowers || []), { userId: user.id, userName: user.name }]
      };

      await api.saveBook(updatedBook);
      await api.addHistoryRecord({
        id: `H${Date.now()}`,
        bookId: book.id,
        bookTitle: book.title,
        userId: user.id,
        userName: user.name,
        borrowDate: Date.now(),
        dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 Days
        issuedBy: currentUser?.name || 'Admin'
      });

      setStatusMsg(`Book issued to ${user.name}`);
      await refreshAllData();
    } catch (err: any) {
      setStatusMsg("Issuance failed: " + err.message, 'error');
    }
  };

  const handleRenewBook = async (recordId: string) => {
    const record = history.find(h => h.id === recordId);
    if (!record) return;

    if ((record.renewals || 0) >= 2) {
      setStatusMsg("Maximum renewal limit reached", 'error');
      return;
    }

    try {
      const newDueDate = (record.dueDate || (record.borrowDate + 7 * 24 * 60 * 60 * 1000)) + (7 * 24 * 60 * 60 * 1000);
      await api.updateHistoryRecord(record.id, {
        dueDate: newDueDate,
        renewals: (record.renewals || 0) + 1
      });
      setStatusMsg("Book renewed for 7 more days");
      await refreshAllData();
    } catch (err: any) {
      setStatusMsg("Renewal failed: " + err.message, 'error');
    }
  };

  const handlePayFine = async (fineId: string) => {
    await api.updateFineStatus(fineId, 'PAID');
    await refreshAllData();
  };

  const handleClearRequests = async () => {
    await api.deleteAllRequests();
    await refreshAllData();
  };

  const handleClearHistory = async () => {
    await api.deleteAllHistory();
    await refreshAllData();
  };

  const handleClearFines = async () => {
    await api.deleteAllFines();
    await refreshAllData();
  };

  const handleBorrowRequest = async (bookId: string) => {
    if (!currentUser) return;
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    await api.createRequest({
      id: `R${Date.now()}`,
      bookId,
      bookTitle: book.title,
      userId: currentUser.id,
      userName: currentUser.name,
      status: 'PENDING',
      timestamp: Date.now()
    });
    await refreshAllData();
  };

  if (loading) return <Splash />;

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={
          <Login
            onLogin={handleLogin}
            onIdentify={handleIdentify}
            initialIdentity={cloudIdentity}
            onClearIdentity={handleFullLogout}
            availableUsers={users}
          />
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const studentsCount = users.filter(u => u.role === 'STUDENT').length;
  const booksCount = books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-transparent animate-in fade-in duration-500">
      <Sidebar
        role={currentUser.role}
        activeTab={activeTab}
        setActiveTab={(tab) => navigate(`/${tab}`)}
        onLogout={handleSwitchPortal}
        user={currentUser}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden glass-panel p-4 flex items-center justify-between shrink-0 sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-lg">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-500 hover:text-gray-900 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8 rounded-lg shadow-sm" />
            <span className="font-black text-gray-900 text-sm tracking-tighter uppercase">ALBAYAN</span>
          </div>
          <button onClick={handleSwitchPortal} className="p-1 glass-button rounded-xl transition-all shadow-sm">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
            </div>
          </button>
        </div>

        <div className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">

          {/* Top Bar (Desktop) */}
          <div className="hidden lg:flex justify-end mb-8 items-center gap-6">

            {statusMsg && (
              <div className={`flex items-center gap-3 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2 glass-panel border shadow-2xl ${statusMsg.type === 'success' ? 'accent-emerald border-emerald-200' : 'accent-rose border-rose-200'}`}>
                <span className={`w-2 h-2 rounded-full ${statusMsg.type === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}></span>
                {statusMsg.text}
              </div>
            )}

            <div className="h-6 w-[1.5px] bg-gray-200 mx-2"></div>

            <div className="flex flex-col items-end">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLocalMode ? 'text-amber-600' : 'text-emerald-600'}`}>
                {isLocalMode ? 'Offline Mode' : 'Cloud Synchronized'}
              </span>
              {isSyncing && <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 animate-pulse">Syncing...</span>}
            </div>

            <button onClick={handleFullLogout} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all px-4 py-2 glass-button rounded-xl" title="Switch User ID">
              Switch Identity
            </button>
          </div>

          <div className="w-full">
            <header className="mb-12">
              <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">
                {activeTab.replace('-', ' ')}
              </h1>
              <p className="text-gray-500 text-sm font-medium mt-1 uppercase tracking-wider">
                Manage your library hub and resources.
              </p>
            </header>

            <Routes>
              <Route path="/about" element={<About booksCount={booksCount} studentsCount={studentsCount} />} />
              <Route path="*" element={
                currentUser.role === 'ADMIN' ? (
                  <AdminDashboard
                    activeTab={activeTab} books={books} users={users} requests={requests} history={history} fines={fines}
                    onAddBook={handleAddOrUpdateBook} onUpdateBook={handleAddOrUpdateBook} onDeleteBook={handleDeleteBook}
                    onBulkAddBooks={handleBulkAddBooks}
                    onAddUser={handleAddOrUpdateUser} onUpdateUser={handleAddOrUpdateUser} onDeleteUser={handleDeleteUser}
                    onBulkAddUsers={handleBulkAddUsers}
                    onHandleRequest={handleRequestAction} onReturnBook={handleReturnBook} onPayFine={handlePayFine}
                    onBorrow={handleBorrowRequest}
                    onIssueBook={handleIssueBook}
                    onRenew={handleRenewBook}
                    onClearRequests={handleClearRequests}
                    onClearHistory={handleClearHistory}
                    onClearFines={handleClearFines}
                    globalStatus={{ msg: statusMsg, set: setStatusMsg }}
                  />
                ) : (
                  <StudentDashboard
                    activeTab={activeTab === 'dashboard' ? 'dashboard' : activeTab}
                    books={books} requests={requests} history={history} fines={fines} currentUser={currentUser}
                    onBorrow={handleBorrowRequest}
                    onRenew={handleRenewBook}
                    globalStatus={{ msg: statusMsg, set: setStatusMsg }}
                  />
                )
              } />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
