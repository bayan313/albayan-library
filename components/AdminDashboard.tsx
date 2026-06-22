import React, { useState, useMemo, useRef } from 'react';
import { Book, User, BorrowRequest, HistoryRecord, Fine } from '../types';
import BookForm from './BookForm';
import UserForm from './UserForm';
import AnalyticsDashboard from './AnalyticsDashboard';
import { downloadCatalogPDF } from '../utils/pdfGenerator';


// Retrieve stored admin password or default
const storedAdminPass = typeof window !== 'undefined' ? localStorage.getItem('adminPassword') || 'admin@484' : 'admin@484';

interface AdminDashboardProps {
    activeTab: string;
    books: Book[];
    users: User[];
    requests: BorrowRequest[];
    history: HistoryRecord[];
    fines: Fine[];
    onAddBook: (b: Book) => void;
    onUpdateBook: (b: Book) => void;
    onDeleteBook: (id: string) => void;
    onBulkAddBooks: (books: Book[]) => Promise<void>;
    onAddUser: (u: User) => void;
    onUpdateUser: (u: User) => void;
    onDeleteUser: (id: string) => void;
    onBulkAddUsers: (users: User[]) => Promise<void>;
    onHandleRequest: (id: string, action: 'APPROVE' | 'DENY') => void;
    onReturnBook: (bid: string, uid: string, fine?: { amount: number, reason: string }) => void;
    onPayFine: (id: string) => void;
    onBorrow: (bookId: string) => void;
    onIssueBook: (bookId: string, userId: string) => void;
    onRenew: (recordId: string) => void;
    onClearRequests: () => Promise<void>;
    onClearHistory: () => Promise<void>;
    onClearFines: () => Promise<void>;
    globalStatus: { msg: { text: string, type: 'success' | 'error' } | null, set: (text: string, type?: 'success' | 'error') => void };
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
    activeTab, books, users, requests, history, fines,
    onAddBook, onUpdateBook, onDeleteBook, onBulkAddBooks,
    onAddUser, onUpdateUser, onDeleteUser, onBulkAddUsers,
    onHandleRequest, onReturnBook, onPayFine, onBorrow, onIssueBook, onRenew,
    onClearRequests, onClearHistory, onClearFines,
    globalStatus
}) => {
    const [showBookForm, setShowBookForm] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [showUserForm, setShowUserForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const importBooksInputRef = useRef<HTMLInputElement>(null);
    const importUsersInputRef = useRef<HTMLInputElement>(null);

    // Return Search state
    const [returnSearch, setReturnSearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState('All');

    // Password Change State
    const [showPassModal, setShowPassModal] = useState(false);
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');

    const [selectedBookDetail, setSelectedBookDetail] = useState<Book | null>(null);

    // Fine Modal State
    const [showFineModal, setShowFineModal] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState<HistoryRecord | null>(null);
    const [fineAmount, setFineAmount] = useState<number>(0);
    const [fineReason, setFineReason] = useState<string>('');
    const [hasIssue, setHasIssue] = useState<boolean>(false);

    // Custom Confirm Modal State
    const [confirmDialog, setConfirmDialog] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        show: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // Analytics State
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [issuingToUserId, setIssuingToUserId] = useState('');
    const [issueSearch, setIssueSearch] = useState('');

    // Delete Panel State
    const [deleteSearchText, setDeleteSearchText] = useState('');
    const [deletePanelConfirmBook, setDeletePanelConfirmBook] = useState<Book | null>(null);
    const [deletePanelInput, setDeletePanelInput] = useState('');

    // Inline Status Message logic moved to App.tsx (globalStatus)
    const statusMsg = globalStatus.msg;
    const setStatusMsg = globalStatus.set;

    const filteredBooks = books.filter(b =>
        (filter === 'All' || b.category === filter) &&
        (b.title.toLowerCase().includes(search.toLowerCase()) ||
            b.author.toLowerCase().includes(search.toLowerCase()) ||
            b.id.toLowerCase().includes(search.toLowerCase()))
    ).sort((a, b) => {
        const idA = parseInt(a.id.replace(/\D/g, '')) || 0;
        const idB = parseInt(b.id.replace(/\D/g, '')) || 0;
        return idA - idB;
    });

    const filteredUsers = users.filter(u =>
        (filter === 'All' ? true : u.role === filter) &&
        (u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.id.toLowerCase().includes(search.toLowerCase()) ||
            u.class?.toLowerCase().includes(search.toLowerCase()))
    );

    const categories = useMemo(() => {
        const counts: Record<string, number> = {};
        books.forEach(b => {
            counts[b.category] = (counts[b.category] || 0) + 1;
        });
        const uniqueCats = Array.from(new Set(books.map(b => b.category)));
        return [
            { name: 'All', count: books.length },
            ...uniqueCats.map(c => ({ name: c, count: counts[c] }))
        ];
    }, [books]);

    // Bulk Book Import Handler
    const handleBulkBookImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                setStatusMsg('CSV file is empty or missing data!', 'error');
                return;
            }

            const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^\w\s]/gi, ''));
            const headerMap: Record<string, string> = {
                'id': 'id', 'book id': 'id', 'title': 'title', 'book title': 'title', 'name': 'title',
                'author': 'author', 'writer': 'author', 'category': 'category', 'genre': 'category', 'type': 'category',
                'year': 'year', 'published': 'year', 'isbn': 'isbn', 'isbn number': 'isbn',
                'coverurl': 'coverUrl', 'cover url': 'coverUrl', 'cover': 'coverUrl', 'image': 'coverUrl',
                'price': 'price', 'cost': 'price', 'amount': 'price', 'copies': 'copies', 'total copies': 'copies', 'stock': 'copies', 'count': 'copies'
            };

            const headers = rawHeaders.map(h => headerMap[h] || h);
            const booksToImport: Book[] = [];

            const splitCsvLine = (line: string) => {
                const result = [];
                let cur = '';
                let inQuote = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') inQuote = !inQuote;
                    else if (char === ',' && !inQuote) {
                        result.push(cur.trim());
                        cur = '';
                    } else cur += char;
                }
                result.push(cur.trim());
                return result;
            };

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const values = splitCsvLine(line);
                const bookData: any = {};
                headers.forEach((header, index) => {
                    if (header) {
                        let val = values[index] || '';
                        if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
                        bookData[header] = val;
                    }
                });

                if (bookData.title) {
                    booksToImport.push({
                        id: bookData.id || `B${Date.now()}-${i}`,
                        title: bookData.title,
                        author: bookData.author || 'Unknown',
                        category: bookData.category || 'General',
                        year: parseInt(bookData.year) || new Date().getFullYear(),
                        isbn: bookData.isbn || '---',
                        coverUrl: bookData.coverUrl || 'https://picsum.photos/seed/book/400/600',
                        price: parseFloat(bookData.price) || 0,
                        totalCopies: parseInt(bookData.copies) || 1,
                        availableCopies: parseInt(bookData.copies) || 1,
                        currentBorrowers: []
                    });
                }
            }

            if (booksToImport.length > 0) {
                try {
                    await onBulkAddBooks(booksToImport);
                    setStatusMsg(`${booksToImport.length} Books bulk import complete!`);
                } catch (err: any) {
                    setStatusMsg(`Import failed: ${err.message}`, 'error');
                }
            } else setStatusMsg('No valid books found in CSV!', 'error');
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    // Bulk User Import Handler
    const handleBulkUserImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n');
            const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^\w\s]/gi, ''));
            const headerMap: Record<string, string> = {
                'id': 'id', 'user id': 'id', 'student id': 'id', 'roll no': 'id',
                'name': 'name', 'user name': 'name', 'full name': 'name', 'role': 'role', 'type': 'role',
                'class': 'class', 'department': 'class', 'dept': 'class', 'grade': 'class',
                'avatarurl': 'avatarUrl', 'avatar': 'avatarUrl', 'profile': 'avatarUrl', 'image': 'avatarUrl'
            };

            const headers = rawHeaders.map(h => headerMap[h] || h);
            const usersToImport: User[] = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = line.split(',').map(v => v.trim());
                const userData: any = {};
                headers.forEach((header, index) => {
                    if (header) userData[header] = values[index];
                });

                if (userData.name && userData.id) {
                    usersToImport.push({
                        id: userData.id,
                        name: userData.name,
                        role: (userData.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'STUDENT'),
                        class: userData.class || '',
                        avatarUrl: userData.avatarUrl || ''
                    });
                }
            }

            if (usersToImport.length > 0) {
                try {
                    await onBulkAddUsers(usersToImport);
                    setStatusMsg(`${usersToImport.length} Users bulk import complete!`);
                } catch (err: any) {
                    setStatusMsg(`Import failed: ${err.message}`, 'error');
                }
            } else setStatusMsg('No valid users found in CSV!', 'error');
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    const handleDownloadCatalog = () => {
        downloadCatalogPDF(filteredBooks, setStatusMsg);
    };

    const totalVolume = books.reduce((acc, b) => acc + b.totalCopies, 0);

    const uniqueTitles = books.length;
    const issuedBooksCount = history.filter(h => !h.returnDate).length;
    const pendingRequestsCount = requests.filter(r => r.status === 'PENDING').length;

    const activeCirculation = useMemo(() => {
        return history.filter(h => !h.returnDate && (
            h.bookTitle.toLowerCase().includes(returnSearch.toLowerCase()) ||
            h.userName.toLowerCase().includes(returnSearch.toLowerCase())
        ));
    }, [history, returnSearch]);

    return (
        <div className="relative">
            {/* Status Message Banner */}
            {statusMsg && (
                <div className={`sticky top-6 z-[12000] mb-10 px-10 py-6 rounded-[2.5rem] border backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-6 flex items-center justify-between gap-6 ${statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    <div className="flex items-center gap-5">
                        <div className={`w-3.5 h-3.5 rounded-full ${statusMsg.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
                        <span className="text-sm font-black uppercase tracking-[0.25em]">{statusMsg.text}</span>
                    </div>
                    <button onClick={() => globalStatus.set('')} className="p-2 hover:bg-white/10 rounded-full transition-all group">
                        <svg className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {activeTab !== 'dashboard' && (
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-10 pb-8 border-b border-white/40">
                    <div className="flex gap-4 items-center w-full md:w-auto flex-1">
                        <div className="relative w-full md:w-80 lg:w-[28rem]">
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                placeholder={activeTab === 'users' ? "Search name, ID or class..." : activeTab === 'history' ? "Search circulation records..." : activeTab === 'books' ? "Search title, author or ISBN..." : "Search archives..."}
                                value={search} onChange={(e) => setSearch(e.target.value)}
                                className="glass-input rounded-2xl pl-12 pr-6 py-3.5 text-sm w-full shadow-sm"
                            />
                        </div>
                        {activeTab === 'books' && (
                            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="glass-input rounded-2xl px-6 py-3.5 text-sm outline-none cursor-pointer shadow-sm">
                                {categories.map(c => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
                            </select>
                        )}
                        {activeTab === 'users' && (
                            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="glass-input rounded-2xl px-6 py-3.5 text-sm outline-none cursor-pointer shadow-sm">
                                <option value="All">All Members</option>
                                <option value="STUDENT">Students</option>
                                <option value="USTHAD">Usthads</option>
                                <option value="ADMIN">Admins</option>
                            </select>
                        )}
                    </div>

                    <div className="flex gap-3 w-full md:w-auto items-center">
                        {activeTab === 'books' && (
                            <>
                                <input type="file" ref={importBooksInputRef} className="hidden" accept=".csv" onChange={handleBulkBookImport} />
                                <button onClick={() => importBooksInputRef.current?.click()} className="glass-button py-3 px-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group text-gray-400 hover:text-teal-600">
                                    <svg className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    Import
                                </button>
                                <button onClick={handleDownloadCatalog} className="glass-button py-3 px-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group text-gray-400 hover:text-teal-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Catalog
                                </button>
                                <button onClick={() => { setEditingBook(null); setShowBookForm(true); }} className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/10 hover:scale-[1.02] py-3.5 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 transition-all">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                    Add New
                                </button>
                            </>
                        )}
                        {activeTab === 'users' && (
                            <>
                                <input type="file" ref={importUsersInputRef} className="hidden" accept=".csv" onChange={handleBulkUserImport} />
                                <button onClick={() => importUsersInputRef.current?.click()} className="glass-button py-3 px-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group text-gray-400 hover:text-teal-600">
                                    <svg className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    Import
                                </button>
                                <button onClick={() => { setEditingUser(null); setShowUserForm(true); }} className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/10 hover:scale-[1.02] py-3.5 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 transition-all">
                                    Add Member
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'analytics' && (
                <AnalyticsDashboard books={books} history={history} users={users} fines={fines} />
            )}

            {activeTab === 'delete-panel' && (() => {
                const deletePanelBooks = deleteSearchText.trim() === '' ? [] : books.filter(b => b.title.toLowerCase().includes(deleteSearchText.toLowerCase()) || b.id.toLowerCase().includes(deleteSearchText.toLowerCase()));
                return (
                    <div className="space-y-6 animate-in fade-in duration-700">
                        <div className="glass-card rounded-[3rem] p-10 border-white/20">
                            <div className="mb-8">
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-rose-500">Delete Panel</h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-3 opacity-40">Secure Book Deletion</p>
                            </div>
                            
                            <div className="relative group mb-8">
                                <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-rose-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input
                                    type="text"
                                    placeholder="Search by Book Title or ID to reveal..."
                                    value={deleteSearchText}
                                    onChange={(e) => setDeleteSearchText(e.target.value)}
                                    className="w-full glass-input rounded-[2.5rem] py-5 pl-16 pr-8 text-sm outline-none transition-all font-black placeholder:opacity-40 border-white/10 focus:border-rose-500/30"
                                />
                            </div>

                            {deleteSearchText.trim() === '' ? (
                                <div className="p-20 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Awaiting search query</p>
                                </div>
                            ) : deletePanelBooks.length === 0 ? (
                                <div className="p-20 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">No matching books found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {deletePanelBooks.map(book => (
                                        <div key={book.id} className="glass-panel p-6 rounded-3xl flex items-center justify-between border-white/10 hover:bg-rose-500/5 transition-colors">
                                            <div>
                                                <p className="text-lg font-black tracking-tight">{book.title}</p>
                                                <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mt-1">ID: {book.id} • {book.author}</p>
                                            </div>
                                            <button 
                                                onClick={() => setDeletePanelConfirmBook(book)}
                                                className="px-6 py-3 rounded-xl bg-rose-500/10 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Dashboard Content */}
            {activeTab === 'dashboard' && (
                <div className="space-y-10 animate-in fade-in duration-700">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-black text-gray-400 uppercase tracking-widest">Library Overview</h2>
                            <button onClick={() => setShowPassModal(true)} className="p-2 glass-button rounded-xl transition-all" title="Change Admin Password">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <StatCard title="Total Inventory" value={totalVolume} subtitle={`${uniqueTitles} Titles`} icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" color="emerald" />
                        <StatCard title="Checked Out" value={issuedBooksCount} icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" color="blue" />
                        <StatCard title="Open Requests" value={pendingRequestsCount} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="amber" />
                        <StatCard title="Due Fines" value={fines.filter(f => f.status === 'PENDING').length} icon="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" color="red" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Confirmations and Returns panels */}
                        <div className="glass-card rounded-[2.5rem] overflow-hidden">
                            <div className="px-8 py-6 border-b border-white/20 flex justify-between items-center glass-panel uppercase tracking-[0.2em] text-[10px] font-black opacity-60">
                                <h3>Pending Actions</h3>
                                <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-3 py-1 rounded-full shadow-[0_2px_8px_rgba(245,158,11,0.15)]">{requests.filter(r => r.status === 'PENDING').length} To Do</span>
                            </div>
                            <div className="divide-y divide-white/5 max-h-[450px] overflow-y-auto no-scrollbar">
                                {requests.filter(r => r.status === 'PENDING').map(req => (
                                    <div key={req.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold tracking-tight">{req.userName}</p>
                                            <p className="text-[10px] opacity-40 mt-1 uppercase font-black tracking-widest leading-none">Wants: <span className="text-teal-500">{req.bookTitle} (#{req.bookId})</span></p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => onHandleRequest(req.id, 'APPROVE')} className="w-9 h-9 rounded-xl glass-button flex items-center justify-center text-teal-600 hover:bg-teal-500 hover:text-white transition-all">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            </button>
                                            <button onClick={() => onHandleRequest(req.id, 'DENY')} className="w-9 h-9 rounded-xl glass-button flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {requests.filter(r => r.status === 'PENDING').length === 0 && <div className="p-20 text-center text-gray-300 text-xs italic tracking-widest uppercase font-black opacity-40">Clear for now</div>}
                            </div>
                        </div>

                        <div className="glass-card rounded-[2.5rem] overflow-hidden">
                            <div className="px-8 py-6 border-b border-white/20 glass-panel flex items-center justify-between uppercase tracking-[0.2em] text-[10px] font-black opacity-60">
                                <h3>Active Returns</h3>
                                <div className="relative">
                                    <input type="text" placeholder="Scan or search..." value={returnSearch} onChange={(e) => setReturnSearch(e.target.value)} className="w-48 glass-input rounded-full px-5 py-2 text-[10px] pr-10 border-white/10" />
                                    <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                            </div>
                            <div className="divide-y divide-white/5 max-h-[450px] overflow-y-auto no-scrollbar">
                                {activeCirculation.map(h => {
                                    const isOverdue = Date.now() > h.dueDate;
                                    const daysLeft = Math.ceil((h.dueDate - Date.now()) / (1000 * 60 * 60 * 24));

                                    return (
                                        <div key={h.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                                            <div className="overflow-hidden pr-4">
                                                <p className="text-sm font-bold truncate tracking-tight">{h.bookTitle} <span className="text-[10px] opacity-50 uppercase tracking-widest ml-1">(#{h.bookId})</span></p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-[10px] opacity-40 font-black uppercase tracking-widest leading-none">By {h.userName}</p>
                                                    <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border ${isOverdue ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                                                        {isOverdue ? `Overdue ${Math.abs(daysLeft)}d` : `Due ${daysLeft}d`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => onRenew(h.id)}
                                                    disabled={(h.renewals || 0) >= 2}
                                                    className="glass-button p-2 text-gray-400 hover:text-teal-600 disabled:opacity-20"
                                                    title="Quick Renew (Admin)"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                </button>
                                                <button onClick={() => { setSelectedReturn(h); setShowFineModal(true); setHasIssue(false); setFineAmount(0); setFineReason(''); }} className="glass-button p-2 text-teal-600 hover:text-teal-700">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {activeCirculation.length === 0 && <div className="p-20 text-center text-gray-300 text-xs italic tracking-widest uppercase font-black opacity-40">All items returned</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Books Tab Content */}
            {activeTab === 'books' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {filteredBooks.map(book => (
                            <div key={book.id} className="glass-card rounded-[2rem] overflow-hidden group hover:glass-card-hover transition-all border-white/60">
                                <div className="flex h-48">
                                    <div className="w-[35%] overflow-hidden bg-black/5 relative border-r border-white/20">
                                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    </div>
                                    <div className="w-[65%] p-6 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[8px] font-black text-teal-600 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-full uppercase tracking-[0.15em]">{book.category}</span>
                                            <p className="text-[9px] text-gray-300 font-bold tracking-widest uppercase opacity-60">#{book.id}</p>
                                        </div>
                                        <h4 className="text-sm font-black leading-snug mb-1 line-clamp-2 pr-4">{book.title}</h4>
                                        <p className="text-[10px] opacity-40 font-bold tracking-[0.15em] uppercase">by {book.author}</p>
                                        <div className="mt-auto flex justify-between items-center pt-4 border-t border-white/40">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${book.availableCopies === 0 ? 'bg-rose-400' : 'bg-teal-400'}`}></div>
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-tighter opacity-80">{book.availableCopies} / {book.totalCopies} Available</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setSelectedBookDetail(book)} className="w-9 h-9 rounded-xl glass-button flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                <button onClick={() => { setEditingBook(book); setShowBookForm(true); }} className="w-9 h-9 rounded-xl glass-button flex items-center justify-center text-gray-400 hover:text-teal-600 transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Other Records Tabs */}
            {(activeTab === 'users' || activeTab === 'requests' || activeTab === 'history' || activeTab === 'fines') && (
                <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-sm">
                            {activeTab === 'users' && (
                                <>
                                    <thead className="glass-panel border-b border-zinc-500/10 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                        <tr><th className="px-6 py-4">Profile</th><th className="px-6 py-4">ID</th><th className="px-6 py-4">Name</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Class</th><th className="px-6 py-4 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-white/10 transition-all group zebra-row">
                                                <td className="px-6 py-4">
                                                    <div className="w-9 h-9 rounded-full bg-white/20 border border-white/40 overflow-hidden flex items-center justify-center text-[10px] font-black text-gray-400 shadow-sm ring-1 ring-white/10">
                                                        {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-[10px] opacity-40 uppercase tracking-widest">{user.id === '••••••••' ? '••••••••' : user.id}</td>
                                                <td className="px-6 py-4 font-black tracking-tight">{user.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${user.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20 shadow-[0_2px_8px_rgba(168,85,247,0.15)]' : user.role === 'USTHAD' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-[0_2px_8px_rgba(245,158,11,0.15)]' : 'bg-teal-500/10 text-teal-600 border-teal-500/20 shadow-[0_2px_8px_rgba(20,184,166,0.15)]'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase tracking-wide">{user.class || '---'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-1">
                                                        <button onClick={() => { setEditingUser(user); setShowUserForm(true); }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-teal-600 glass-button rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                        <button onClick={() => setConfirmDialog({ show: true, title: 'Remove Access', message: `Revoke access for ${user.name}?`, onConfirm: () => onDeleteUser(user.id) })} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 glass-button rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                            {activeTab === 'requests' && (
                                <>
                                    <thead className="glass-panel border-b border-zinc-500/10 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                        <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Book</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {requests.map(req => (
                                            <tr key={req.id} className="hover:bg-white/5 transition-all zebra-row">
                                                <td className="px-6 py-4 opacity-40 font-mono text-[10px]">{new Date(req.timestamp).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 font-medium">{req.userName}</td>
                                                <td className="px-6 py-4 opacity-60 text-xs">
                                                    {req.bookTitle}
                                                    <br />
                                                    <span className="text-[10px] opacity-50 uppercase tracking-widest">#{req.bookId}</span>
                                                </td>
                                                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${req.status === 'PENDING' ? 'accent-amber border-amber-100' : req.status === 'APPROVED' ? 'accent-emerald border-emerald-100' : 'accent-rose border-rose-100'}`}>{req.status}</span></td>
                                                <td className="px-6 py-4 text-right">
                                                    {req.status === 'PENDING' && (
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => onHandleRequest(req.id, 'APPROVE')} className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold uppercase transition-all">Approve</button>
                                                            <button onClick={() => onHandleRequest(req.id, 'DENY')} className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase transition-all">Deny</button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                            {activeTab === 'history' && (
                                <>
                                    <div className="glass-panel border-b border-zinc-500/10 p-4 flex gap-4">
                                        <button onClick={() => setHistoryFilter('All')} className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${historyFilter === 'All' ? 'bg-teal-500/20 text-teal-500 border border-teal-500/20' : 'text-gray-400 hover:bg-white/5 border border-transparent'}`}>All</button>
                                        <button onClick={() => setHistoryFilter('Returned')} className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${historyFilter === 'Returned' ? 'bg-teal-500/20 text-teal-500 border border-teal-500/20' : 'text-gray-400 hover:bg-white/5 border border-transparent'}`}>Returned</button>
                                        <button onClick={() => setHistoryFilter('In Use')} className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${historyFilter === 'In Use' ? 'bg-teal-500/20 text-teal-500 border border-teal-500/20' : 'text-gray-400 hover:bg-white/5 border border-transparent'}`}>In Use</button>
                                    </div>
                                    <thead className="glass-panel border-b border-zinc-500/10 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                        <tr><th className="px-6 py-4">Borrowed</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Book</th><th className="px-6 py-4">Due Date</th><th className="px-6 py-4">Returned</th><th className="px-6 py-4">Status</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {history.filter(record => {
                                            if (historyFilter === 'Returned') return !!record.returnDate;
                                            if (historyFilter === 'In Use') return !record.returnDate;
                                            return true;
                                        }).map(record => (
                                            <tr key={record.id} className="hover:bg-white/5 transition-all zebra-row">
                                                <td className="px-6 py-4 opacity-40 font-mono text-[10px]">{new Date(record.borrowDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 font-medium">{record.userName}</td>
                                                <td className="px-6 py-4 opacity-60 text-xs">
                                                    {record.bookTitle}
                                                    <br />
                                                    <span className="text-[10px] opacity-50 uppercase tracking-widest">#{record.bookId}</span>
                                                </td>
                                                <td className={`px-6 py-4 font-mono text-[10px] ${!record.returnDate && Date.now() > record.dueDate ? 'text-rose-500 font-bold' : 'opacity-40'}`}>
                                                    {record.dueDate ? new Date(record.dueDate).toLocaleDateString() : '---'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 font-mono text-[10px]">{record.returnDate ? new Date(record.returnDate).toLocaleDateString() : '---'}</td>
                                                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${record.returnDate ? 'bg-gray-50 text-gray-400 border-gray-100' : 'accent-blue border-blue-100'}`}>{record.returnDate ? 'Returned' : 'In Use'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                            {activeTab === 'fines' && (
                                <>
                                    <thead className="glass-panel border-b border-zinc-500/10 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                        <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Book</th><th className="px-6 py-4">Reason</th><th className="px-6 py-4 text-right">Amount</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {fines.map(fine => (
                                            <tr key={fine.id} className="hover:bg-white/5 transition-all zebra-row">
                                                <td className="px-6 py-4 opacity-40 font-mono text-[10px]">{new Date(fine.timestamp).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 font-medium">{fine.userName}</td>
                                                <td className="px-6 py-4 opacity-60 text-xs">
                                                    {fine.bookTitle}
                                                    <br />
                                                    <span className="text-[10px] opacity-50 uppercase tracking-widest">#{fine.bookId}</span>
                                                </td>
                                                <td className="px-6 py-4 opacity-40 text-xs">{fine.reason}</td>
                                                <td className="px-6 py-4 text-right font-mono text-xs text-emerald-600 font-bold">₹{fine.amount}</td>
                                                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${fine.status === 'PAID' ? 'accent-emerald border-emerald-100' : 'accent-rose border-rose-100'}`}>{fine.status}</span></td>
                                                <td className="px-6 py-4 text-right">{fine.status === 'PENDING' && <button onClick={() => onPayFine(fine.id)} className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 rounded text-[9px] font-bold text-emerald-600 uppercase tracking-wider border border-emerald-100 transition-all">Mark Paid</button>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {/* Global Modals */}
            {showBookForm && <BookForm onClose={() => setShowBookForm(false)} onSubmit={(b) => { editingBook ? onUpdateBook(b) : onAddBook(b); setShowBookForm(false); }} initialData={editingBook} />}
            {showUserForm && <UserForm onClose={() => setShowUserForm(false)} onSubmit={(u) => { editingUser ? onUpdateUser(u) : onAddUser(u); setShowUserForm(false); }} initialData={editingUser} />}
            {showPassModal && (
                <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
                    <div className="glass-card w-full max-w-lg rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-black text-2xl uppercase tracking-tighter">Advanced Terminal</h3>
                            <button onClick={() => setShowPassModal(false)} className="opacity-40 hover:opacity-100 transition-opacity">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Password Section */}
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Security Protocol</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="password" placeholder="Current" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} className="glass-input rounded-2xl px-5 py-4 text-sm" />
                                <input type="password" placeholder="New" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="glass-input rounded-2xl px-5 py-4 text-sm" />
                            </div>
                            <button onClick={() => { if (currentPass === storedAdminPass) { localStorage.setItem('adminPassword', newPass); setStatusMsg('Protocol Updated'); setShowPassModal(false); } else setStatusMsg('Auth Failed', 'error'); }} className="w-full bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">Update Access Key</button>
                        </div>

                        <div className="h-[1px] bg-white/10 rounded-full"></div>

                        {/* Maintenance Section */}
                        <div className="space-y-6">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-4">System Maintenance (IRREVERSIBLE)</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <button
                                    onClick={() => setConfirmDialog({ show: true, title: 'Wipe Requests', message: 'This will permanently delete ALL pending and processed borrow requests. Proceed?', onConfirm: async () => { await onClearRequests(); setStatusMsg('Requests Purged'); setShowPassModal(false); } })}
                                    className="glass-button py-4 px-2 rounded-2xl text-[8px] font-black uppercase tracking-widest text-rose-500 border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all"
                                >
                                    Clear Requests
                                </button>
                                <button
                                    onClick={() => setConfirmDialog({ show: true, title: 'Wipe History', message: 'This will permanently delete ALL circulation and return local records. Proceed?', onConfirm: async () => { await onClearHistory(); setStatusMsg('History Purged'); setShowPassModal(false); } })}
                                    className="glass-button py-4 px-2 rounded-2xl text-[8px] font-black uppercase tracking-widest text-rose-500 border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all"
                                >
                                    Clear History
                                </button>
                                <button
                                    onClick={() => setConfirmDialog({ show: true, title: 'Wipe Fines', message: 'This will permanently delete ALL fine records (Paid & Unpaid). Proceed?', onConfirm: async () => { await onClearFines(); setStatusMsg('Fines Purged'); setShowPassModal(false); } })}
                                    className="glass-button py-4 px-2 rounded-2xl text-[8px] font-black uppercase tracking-widest text-rose-500 border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all"
                                >
                                    Clear Fines
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-center pt-2">
                            <button onClick={() => setShowPassModal(false)} className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-gray-900 transition-colors">Terminate Session</button>
                        </div>
                    </div>
                </div>
            )}

            {showFineModal && selectedReturn && (
                <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
                    <div className="glass-card w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 duration-300 border-white/20 shadow-2xl">
                        <div className="text-center">
                            <h3 className="text-2xl font-black uppercase tracking-tight">Confirm Return</h3>
                            <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-2">{selectedReturn.bookTitle} • {selectedReturn.userName}</p>
                        </div>
                        <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100"><span className="text-sm font-black text-gray-700 uppercase tracking-tighter">Are there any issues?</span><button onClick={() => setHasIssue(!hasIssue)} className={`w-14 h-7 rounded-full relative transition-all duration-300 ${hasIssue ? 'bg-rose-600 shadow-lg shadow-rose-200' : 'bg-gray-200'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm ${hasIssue ? 'left-8' : 'left-1'}`}></div></button></div>
                        {hasIssue && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-2">
                                <input type="number" value={fineAmount} onChange={(e) => setFineAmount(Number(e.target.value))} className="glass-input rounded-xl px-4 py-3 text-sm w-full" placeholder="Fine Amount (₹)" />
                                <textarea value={fineReason} onChange={(e) => setFineReason(e.target.value)} className="glass-input rounded-xl px-4 py-3 text-sm w-full h-24 no-scrollbar" placeholder="Detailed reason..." />
                            </div>
                        )}
                        <div className="flex gap-4"><button onClick={() => setShowFineModal(false)} className="flex-1 py-4 text-xs font-black uppercase text-gray-400">Discard</button><button onClick={() => { onReturnBook(selectedReturn.bookId, selectedReturn.userId, hasIssue ? { amount: fineAmount, reason: fineReason } : undefined); setShowFineModal(false); }} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-200">Issue Return</button></div>
                    </div>
                </div>
            )}

            {confirmDialog.show && (
                <div className="fixed inset-0 bg-gray-900/10 backdrop-blur-xl flex items-center justify-center z-[11000] p-4">
                    <div className="glass-panel w-full max-w-sm rounded-[2.5rem] p-10 text-center animate-in zoom-in-95 duration-300 shadow-[0_32px_128px_rgba(0,0,0,0.1)] border-white/60">
                        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm">
                            <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight">{confirmDialog.title}</h3>
                        <p className="text-xs opacity-40 mt-4 leading-relaxed font-bold tracking-wide uppercase">{confirmDialog.message}</p>
                        <div className="mt-10 flex gap-4">
                            <button onClick={() => setConfirmDialog({ ...confirmDialog, show: false })} className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 transition-colors">Discard</button>
                            <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ ...confirmDialog, show: false }); }} className="flex-1 bg-gray-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-gray-200 hover:bg-black transition-all">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedBookDetail && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-white/20 backdrop-blur-2xl" onClick={() => setSelectedBookDetail(null)}></div>
                    <div className="relative w-full max-w-5xl glass-panel rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row max-h-[90vh] shadow-[0_32px_128px_rgba(0,0,0,0.08)] border-white/60">
                        <div className="w-full md:w-1/3 h-64 md:h-auto bg-gray-50/50 border-r border-gray-100/50">
                            <img src={selectedBookDetail.coverUrl} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 p-8 md:p-14 overflow-y-auto no-scrollbar relative">
                            <button onClick={() => setSelectedBookDetail(null)} className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center glass-button rounded-xl opacity-40 hover:opacity-100 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>

                            <span className="text-[10px] font-black text-teal-600 bg-teal-500/10 px-4 py-1.5 rounded-full border border-teal-500/20 uppercase tracking-widest">{selectedBookDetail.category}</span>
                            <h2 className="text-4xl font-black mt-6 uppercase tracking-tight leading-none">{selectedBookDetail.title}</h2>
                            <p className="opacity-40 text-lg mt-3 font-bold uppercase tracking-wide">by {selectedBookDetail.author}</p>

                            <div className="grid grid-cols-3 gap-10 my-10 py-8 border-y border-white/10">
                                <div><p className="text-[10px] font-black opacity-20 uppercase tracking-widest mb-3">Identity</p><p className="text-xs font-black tracking-widest">ISBN: {selectedBookDetail.isbn}</p><p className="text-[10px] opacity-40 font-bold tracking-widest mt-1 uppercase">ID: #{selectedBookDetail.id}</p></div>
                                <div><p className="text-[10px] font-black opacity-20 uppercase tracking-widest mb-3">Availability</p><p className="text-sm font-black tracking-tight">{selectedBookDetail.availableCopies} <span className="text-[10px] opacity-40 uppercase">/ {selectedBookDetail.totalCopies} Copies</span></p></div>
                                <div><p className="text-[10px] font-black opacity-20 uppercase tracking-widest mb-3">Inventory Value</p><p className="text-sm text-teal-600 font-black tracking-tight">₹{selectedBookDetail.price}</p></div>
                            </div>

                            <div className="space-y-8">
                                <div className="p-8 bg-white/40 border border-white/60 rounded-[2rem] shadow-sm">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6">Direct Issuance Terminal</p>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                placeholder="Enter Member Name or ID..."
                                                value={issueSearch}
                                                onChange={(e) => setIssueSearch(e.target.value)}
                                                className="w-full glass-input rounded-2xl px-6 py-4 text-sm outline-none transition-all font-black tracking-tight border-white/10"
                                            />
                                            {issueSearch && (
                                                <div className="absolute top-full left-0 right-0 mt-3 glass-panel rounded-2xl shadow-2xl z-[100] max-h-60 overflow-y-auto no-scrollbar border-white/80">
                                                    {users.filter(u => (u.name.toLowerCase().includes(issueSearch.toLowerCase()) || u.id.toLowerCase().includes(issueSearch.toLowerCase()))).map(u => (
                                                        <button
                                                            key={u.id}
                                                            onClick={() => { setIssuingToUserId(u.id); setIssueSearch(u.name); }}
                                                            className="w-full px-6 py-4 text-left hover:bg-teal-500/5 transition-all border-b border-white/5 last:border-0 group"
                                                        >
                                                            <div className="font-black text-sm group-hover:text-teal-600 transition-colors uppercase tracking-tight">{u.name}</div>
                                                            <div className="text-[9px] opacity-40 font-bold uppercase tracking-widest mt-1">ID: {u.id} • {u.role}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (!issuingToUserId) {
                                                    setStatusMsg('Please select a user first!', 'error');
                                                    return;
                                                }
                                                onIssueBook(selectedBookDetail.id, issuingToUserId);
                                                setSelectedBookDetail(null);
                                                setIssuingToUserId('');
                                                setIssueSearch('');
                                            }}
                                            disabled={!issuingToUserId}
                                            className={`px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl ${issuingToUserId ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-500/20' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'}`}
                                        >
                                            Process Issue
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4">
                                    <button
                                        onClick={() => { onIssueBook(selectedBookDetail.id, (localStorage.getItem('albayan_active_session') ? JSON.parse(localStorage.getItem('albayan_active_session')!).id : 'Admin')); setSelectedBookDetail(null); }}
                                        className="flex-1 py-5 glass-button font-black uppercase text-[10px] tracking-[0.25em] rounded-2xl hover:bg-teal-500/5 transition-all shadow-sm border-white/20"
                                    >
                                        Self Checkout
                                    </button>
                                    <button onClick={() => { setEditingBook(selectedBookDetail); setShowBookForm(true); setSelectedBookDetail(null); }} className="flex-1 py-5 glass-button text-gray-400 font-black uppercase text-[10px] tracking-[0.25em] rounded-2xl hover:text-teal-600 border-white/60">Modify Metadata</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deletePanelConfirmBook && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-rose-500" />
                        
                        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-6">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        
                        <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-2">Delete Confirmation</h3>
                        <p className="text-sm font-medium text-gray-500 mb-8">
                            Are you absolutely sure? This action cannot be undone. To proceed, please type <span className="font-black text-gray-900 bg-gray-100 px-2 py-1 rounded">{deletePanelConfirmBook.title}</span> below.
                        </p>
                        
                        <input
                            type="text"
                            placeholder="Type the exact book title here..."
                            value={deletePanelInput}
                            onChange={(e) => setDeletePanelInput(e.target.value)}
                            onPaste={(e) => e.preventDefault()}
                            autoFocus
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-rose-500 transition-colors mb-8"
                        />
                        
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setDeletePanelConfirmBook(null);
                                    setDeletePanelInput('');
                                }}
                                className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (deletePanelInput === deletePanelConfirmBook.title) {
                                        onDeleteBook(deletePanelConfirmBook.id);
                                        setStatusMsg(`Deleted: ${deletePanelConfirmBook.title}`, 'success');
                                        setDeletePanelConfirmBook(null);
                                        setDeletePanelInput('');
                                        setDeleteSearchText('');
                                    }
                                }}
                                disabled={deletePanelInput !== deletePanelConfirmBook.title}
                                className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
                                    deletePanelInput === deletePanelConfirmBook.title 
                                        ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20 hover:bg-rose-600' 
                                        : 'bg-rose-500/50 text-white/50 cursor-not-allowed'
                                }`}
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, value, subtitle, icon, color }: any) => {
    const colors: Record<string, string> = { emerald: 'teal', blue: 'blue', amber: 'amber', red: 'rose' };
    const colorClass = colors[color];
    const shadowColors: Record<string, string> = { emerald: 'rgba(20,184,166,0.2)', amber: 'rgba(245,158,11,0.2)', red: 'rgba(244,63,94,0.2)', blue: 'rgba(59,130,246,0.2)' };

    return (
        <div className="glass-card p-10 rounded-[3rem] transition-all hover:glass-card-hover group border-white">
            <div className="flex items-start justify-between mb-8">
                <div
                    className={`w-14 h-14 rounded-2xl bg-${colorClass}-500/10 border border-${colorClass}-500/20 text-${colorClass}-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm`}
                    style={{ boxShadow: `0 8px 24px ${shadowColors[color]}` }}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={icon} /></svg>
                </div>
                {subtitle && <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60 bg-white/50 px-3 py-1 rounded-full border border-white shadow-sm">{subtitle}</span>}
            </div>
            <div>
                <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em] leading-none mb-3">{title}</p>
                <p className="text-5xl font-black tracking-tighter leading-none">{value}</p>
            </div>
        </div>
    );
};

export default AdminDashboard;
