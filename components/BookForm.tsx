import React, { useState, useEffect, useRef } from 'react';
import { Book } from '../types';

interface BookFormProps {
  onClose: () => void;
  onSubmit: (book: Book) => void;
  initialData?: Book | null;
}

const BookForm: React.FC<BookFormProps> = ({ onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<Partial<Book>>({
    id: '', title: '', author: '', category: 'General',
    year: 2024, isbn: '', totalCopies: 1, availableCopies: 1,
    coverUrl: 'https://picsum.photos/seed/book/400/600',
    price: 0,
    currentBorrowers: []
  });

  const [isFetching, setIsFetching] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const isbnInputRef = useRef<HTMLInputElement>(null);

  // local status logic for the modal
  const [statusMsg, setStatusMsgState] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const setStatusMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsgState({ text, type });
    setTimeout(() => setStatusMsgState(null), 5000);
  };

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(prev => ({ ...prev, id: `B${Math.floor(Math.random() * 9000) + 1000}` }));
      // Auto-focus ISBN field for laser scanner ready state if not editing
      setTimeout(() => isbnInputRef.current?.focus(), 500);
    }
  }, [initialData]);

  const fetchBookDetails = async (isbn: string) => {
    if (!isbn || isbn.length < 10) return;
    setIsFetching(true);
    setScanStatus('idle');
    try {
      const cleanIsbn = isbn.replace(/[-\s]/g, '');
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
      const data = await response.json();

      if (data.totalItems > 0) {
        const info = data.items[0].volumeInfo;
        const saleInfo = data.items[0].saleInfo;

        setFormData(prev => ({
          ...prev,
          title: info.title || prev.title,
          author: info.authors ? info.authors.join(', ') : prev.author,
          category: info.categories ? info.categories[0] : prev.category,
          year: info.publishedDate ? parseInt(info.publishedDate.split('-')[0]) : prev.year,
          isbn: isbn,
          coverUrl: info.imageLinks?.thumbnail || prev.coverUrl,
          price: saleInfo?.listPrice?.amount || prev.price || 0,
        }));
        setScanStatus('success');
      } else {
        setScanStatus('error');
        setStatusMsg("No metadata found for this ISBN. Enter details manually.", 'error');
      }
    } catch (error) {
      console.error("Error fetching book details:", error);
      setScanStatus('error');
    } finally {
      setIsFetching(false);
    }
  };

  const handleIsbnKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Stop form submission
      fetchBookDetails(formData.isbn || '');
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as Book);
  };

  return (
    <div className="fixed inset-0 bg-white/10 backdrop-blur-2xl flex items-center justify-center z-[9999] p-4">
      <div className="glass-card w-full max-w-lg rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] shadow-[0_32px_128px_rgba(0,0,0,0.1)] border-white/20">
        <div className="px-10 py-8 border-b border-white/10 glass-panel flex justify-between items-center shrink-0">
          <h3 className="font-black text-[11px] uppercase tracking-[0.25em] opacity-60">{initialData ? 'Update Resource Specifications' : 'Initialize New Resource Entry'}</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl glass-button flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all border-white/10 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {statusMsg && (
          <div className={`mx-10 mt-8 p-5 rounded-[1.8rem] bg-gray-50/50 border border-gray-100/50 flex items-center gap-4 animate-in slide-in-from-top-2 duration-300 ${statusMsg.type === 'success' ? 'text-teal-600' : 'text-rose-500'
            }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${statusMsg.type === 'success' ? 'bg-teal-500' : 'bg-rose-500'} animate-pulse shadow-sm`}></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{statusMsg.text}</span>
          </div>
        )}

        <div className="p-10 overflow-y-auto no-scrollbar">

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 px-1 opacity-60">Identity & Catalog Key (ISBN)</label>
              <div className="relative flex gap-4">
                <input
                  ref={isbnInputRef}
                  className="glass-input flex-1 rounded-2xl px-6 py-4 text-sm outline-none transition-all font-bold placeholder:opacity-30 border-white/10 shadow-sm"
                  value={formData.isbn}
                  onKeyDown={handleIsbnKeyDown}
                  onChange={e => setFormData({ ...formData, isbn: e.target.value })}
                  placeholder="Scan Resource Barcode..."
                />
                <button
                  type="button"
                  onClick={() => fetchBookDetails(formData.isbn || '')}
                  className="glass-button px-8 py-4 text-[10px] uppercase font-black tracking-[0.2em] text-teal-600 border-white shadow-sm hover:text-teal-700 transition-all"
                >
                  Retrieve
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 px-1 opacity-60">Primary Resource Title</label>
                <input
                  required
                  className="glass-input w-full rounded-2xl px-6 py-4 text-sm font-black tracking-tight border-white/10"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Engineering Mathematics..."
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 px-1 opacity-60">Intellectual Contributor (Author)</label>
                <input
                  required
                  className="glass-input w-full rounded-2xl px-6 py-4 text-sm font-black tracking-tight border-white/10"
                  value={formData.author}
                  onChange={e => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Name of Author or Agency"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 px-1 opacity-60">System ID</label>
                <input
                  required
                  className="glass-input w-full rounded-2xl px-6 py-4 font-black text-xs tracking-[0.2em] border-white/10"
                  value={formData.id}
                  onChange={e => setFormData({ ...formData, id: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 px-1 opacity-60">Taxonomy</label>
                <input
                  required
                  list="categories"
                  className="glass-input w-full rounded-2xl px-6 py-4 text-sm font-black border-white/10"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 px-1 opacity-60">Inventory</label>
                <input
                  type="number"
                  min="1"
                  className="glass-input w-full rounded-2xl px-6 py-4 text-sm font-black border-white/10"
                  value={formData.totalCopies}
                  onChange={e => {
                    const newVal = parseInt(e.target.value) || 0;
                    const oldTotal = formData.totalCopies || 0;
                    const diff = newVal - oldTotal;

                    setFormData({
                      ...formData,
                      totalCopies: newVal,
                      availableCopies: initialData ? Math.max(0, (formData.availableCopies || 0) + diff) : newVal
                    });
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3 px-1 opacity-60">Valuation (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="glass-input w-full rounded-2xl px-6 py-4 text-sm font-black text-teal-600 border-white/10"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4 px-1 opacity-60">Cover Artwork Profile</label>
              <div className="flex gap-8 items-center bg-white/5 p-5 rounded-3xl border border-white/10">
                <div className="w-16 h-24 bg-white/10 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-white/10">
                  <img src={formData.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onError={(e) => (e.currentTarget.src = 'https://picsum.photos/seed/book/400/600')} alt="Cover Preview" />
                </div>
                <div className="flex-1 space-y-4">
                  <input
                    type="text"
                    placeholder="Remote artwork URI..."
                    className="glass-input w-full rounded-2xl px-5 py-3 text-[10px] font-black tracking-[0.05em] shadow-sm border-gray-100/50"
                    value={formData.coverUrl}
                    onChange={e => setFormData({ ...formData, coverUrl: e.target.value })}
                  />
                  <div className="flex gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="coverUpload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setIsFetching(true);
                            const url = await import('../api').then(m => m.api.uploadImage(file));
                            setFormData({ ...formData, coverUrl: url });
                            setStatusMsg("Cover artwork updated successfully.");
                          } catch (err: any) {
                            setStatusMsg("Upload failed: " + err.message, 'error');
                          } finally {
                            setIsFetching(false);
                          }
                        }
                      }}
                    />
                    <label
                      htmlFor="coverUpload"
                      className="glass-button px-5 py-3 text-[9px] flex items-center justify-center gap-3 uppercase font-black text-gray-400 hover:text-teal-600 cursor-pointer w-full transition-all border-white shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      {isFetching ? 'SYNCING...' : 'LOCAL SOURCE'}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-10 flex justify-end gap-6 border-t border-gray-100/50">
              <button type="button" onClick={onClose} className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-colors tracking-[0.3em]">Discard Changes</button>
              <button type="submit" className="bg-teal-600 text-white hover:bg-teal-700 shadow-xl shadow-teal-500/10 px-12 py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all">
                {initialData ? 'Patch Specifications' : 'Initialize Resource'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookForm;
