import React, { useState, useMemo } from 'react';
import { User, Role } from '../types';
import Logo from './Logo';
import About from './About';

interface LoginProps {
  onLogin: (userData: User) => void;
  onIdentify: (identity: { id: string, name: string, avatarUrl?: string }) => void;
  initialIdentity: { id: string, name: string, avatarUrl?: string } | null;
  onClearIdentity: () => void;
  availableUsers: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin, onIdentify, initialIdentity, onClearIdentity, availableUsers }) => {
  const [step, setStep] = useState<'IDENTIFY' | 'PORTAL' | 'USER_PICK' | 'ADMIN_AUTH'>(initialIdentity ? 'PORTAL' : 'IDENTIFY');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');
  const storedAdminPass = localStorage.getItem('adminPassword') || 'admin@484';
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim()) {
      setError("Please enter your User ID or Name.");
      return;
    }
    setIsSyncing(true);
    setTimeout(() => {
      onIdentify({
        id: manualEmail,
        name: manualEmail.includes('@') ? manualEmail.split('@')[0] : manualEmail,
      });
      setIsSyncing(false);
      setStep('PORTAL');
      setError(null);
    }, 600);
  };

  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassInput === storedAdminPass) {
      setStep('USER_PICK');
      setError(null);
    } else {
      setError("Invalid password.");
    }
  };

  const handleRoleCardClick = (role: Role) => {
    setSelectedRole(role);
    if (role === 'ADMIN') {
      setStep('ADMIN_AUTH');
      setAdminPassInput('');
    } else {
      setStep('USER_PICK');
      setUserSearch('');
    }
    setError(null);
  };

  const filteredUsers = useMemo(() => {
    let list = [...availableUsers];

    if (selectedRole === 'ADMIN') {
      // Admin Directory flow: show ONLY Admins
      list = list.filter(u => u.role === 'ADMIN');
      if (!list.find(u => u.id === storedAdminPass)) {
        list.push({ id: storedAdminPass, name: 'Master Admin', role: 'ADMIN', class: 'System' });
      }
    } else {
      // Library Portal flow: show all users including Admins
      // No filter needed
    }

    return list.filter(u =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase())
    ).sort((a, b) => {
      // 1. Role priority: USTHAD first
      if (a.role === 'USTHAD' && b.role !== 'USTHAD') return -1;
      if (a.role !== 'USTHAD' && b.role === 'USTHAD') return 1;

      // 2. Numeric ID sorting
      const idA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const idB = parseInt(b.id.replace(/\D/g, '')) || 0;
      if (idA !== idB) return idA - idB;

      // 3. Fallback to name
      return a.name.localeCompare(b.name);
    });
  }, [availableUsers, selectedRole, userSearch]);

  // --- Components for Sub-steps ---

  const MinimalInput = ({ label, ...props }: any) => (
    <div className="group">
      <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mb-3 group-focus-within:text-teal-600 transition-colors px-1 opacity-70">{label}</label>
      <input
        {...props}
        className="glass-input w-full rounded-2xl text-sm py-4 px-6 outline-none transition-all placeholder:opacity-30 font-bold tracking-tight shadow-sm border-white/20"
      />
    </div>
  );

  const PrimaryButton = ({ children, isLoading, ...props }: any) => (
    <button
      {...props}
      disabled={isLoading}
      className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all active:scale-[0.97] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${props.className || 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-500/10'}`}
    >
      {isLoading ? "Synchronizing..." : children}
    </button>
  );

  // --- Renders ---

  if (step === 'IDENTIFY') {
    return (
      <div className="min-h-screen grid items-center justify-center p-6 bg-transparent relative overflow-hidden transition-colors duration-500">
        {/* Subtle background decorative elements */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-teal-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />

        <div className="w-full max-w-sm animate-in fade-in zoom-in duration-700 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex p-5 glass-card rounded-3xl mb-8 border-white/20 group hover:scale-105 transition-transform duration-500">
              <Logo className="w-14 h-14" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter mb-3 uppercase transition-colors">Identity</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Initialize Access Portal</p>
          </div>

          <form onSubmit={handleManualIdentify} className="glass-panel relative rounded-[3rem] p-10 space-y-10 overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.05)] border-white/60">
            <MinimalInput
              label="Identity Key"
              placeholder="User ID or Name"
              value={manualEmail}
              onChange={(e: any) => setManualEmail(e.target.value)}
              autoFocus
            />

            {error && <p className="text-rose-500 text-[10px] text-center font-black uppercase tracking-[0.2em]">{error}</p>}

            <PrimaryButton type="submit" isLoading={isSyncing}>
              Join Catalog
            </PrimaryButton>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'ADMIN_AUTH') {
    return (
      <div className="min-h-screen grid items-center justify-center p-6 bg-transparent relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-gray-500/5 rounded-full blur-[120px]" />

        <div className="w-full max-w-sm animate-in fade-in zoom-in duration-300 relative z-10">
          <button onClick={() => setStep('PORTAL')} className="mb-8 text-gray-400 hover:text-gray-900 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 transition-all group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Hub Terminal
          </button>

          <div className="glass-card relative rounded-[3rem] p-10 overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.08)] border-white/20">
            <div className="mb-12 text-center pt-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter transition-colors">Terminal Logic</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-3 opacity-40">Secure Authentication Required</p>
            </div>

            <form onSubmit={handleAdminVerify} className="space-y-10">
              <MinimalInput
                label="Master Access Code"
                type="password"
                placeholder="••••••••"
                value={adminPassInput}
                onChange={(e: any) => setAdminPassInput(e.target.value)}
                autoFocus
              />
              {error && <p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] text-center">{error}</p>}
              <PrimaryButton type="submit" className="bg-teal-600 text-white hover:bg-teal-700 transition-colors">Unlock Core</PrimaryButton>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'PORTAL' && initialIdentity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-in fade-in duration-700 bg-transparent">

        <header className="absolute top-0 left-0 right-0 p-10 flex justify-between items-center z-10 w-full max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4 group cursor-pointer transition-all">
            <div className="glass-card p-2 rounded-xl group-hover:scale-105 transition-all border-white/20 shadow-sm">
              <Logo className="w-8 h-8" />
            </div>
            <div>
              <span className="block font-black tracking-tighter text-xl leading-none">ALBAYAN</span>
              <span className="block text-teal-600 font-black tracking-[0.35em] text-[10px] mt-1 shrink-0 uppercase opacity-60">Library Systems</span>
            </div>
          </div>

          <button
            onClick={() => handleRoleCardClick('ADMIN')}
            className="glass-button text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-teal-600 transition-all px-8 py-4 border-white shadow-sm"
          >
            Management Terminal
          </button>
        </header>

        <main className="w-full max-w-xl text-center z-0">
          <div className="mb-20">
            <h2 className="text-7xl md:text-8xl font-black tracking-tighter mb-4 uppercase opacity-90 leading-none transition-colors">ALBAYAN <span className="text-teal-600/30">LMS</span></h2>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="h-[1px] w-12 bg-white/10 rounded-full"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.6em] whitespace-nowrap opacity-30">High Integrity Knowledge Hub</p>
              <div className="h-[1px] w-12 bg-white/10 rounded-full"></div>
            </div>
          </div>

          <button
            onClick={() => handleRoleCardClick('STUDENT')}
            className="group relative w-full glass-card rounded-[4rem] p-24 transition-all active:scale-[0.98] border-white/20 shadow-[0_48px_128px_rgba(0,0,0,0.06)] hover:shadow-[0_64px_160px_rgba(0,0,0,0.1)]"
          >
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 bg-white/5 backdrop-blur-md rounded-[3rem] flex items-center justify-center mb-12 group-hover:scale-110 transition-transform duration-700 border border-white/10 shadow-sm">
                <Logo className="w-16 h-16 opacity-80" />
              </div>
              <span className="text-3xl font-black mb-2 uppercase tracking-tight">Access Portal</span>
              <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.4em] group-hover:text-teal-600 transition-colors">Enter Digital Repository</span>
            </div>
          </button>

          <div className="mt-20">
            <button onClick={onClearIdentity} className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 hover:text-teal-600 transition-all">
              Not {initialIdentity.name}? <span className="text-teal-600 border-b border-teal-600/20 pb-0.5 ml-2 hover:border-teal-600/50 transition-all dark:text-teal-500 dark:border-teal-500/20">Switch Node</span>
            </button>
          </div>
        </main>

        <div className="fixed bottom-10 z-10 w-full flex justify-center px-6">
          <button onClick={() => document.getElementById('about-modal')?.classList.toggle('hidden')} className="glass-button text-[10px] font-black text-gray-400 hover:text-teal-600 uppercase tracking-[0.4em] px-12 py-5 transition-all flex items-center gap-4 border-white shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Library Manifesto
          </button>
        </div>

        <div id="about-modal" className="hidden fixed inset-0 bg-white/20 backdrop-blur-3xl z-[100] overflow-y-auto p-6 md:p-12 animate-in fade-in duration-500">
          <div className="max-w-4xl mx-auto glass-panel rounded-[3.5rem] p-8 md:p-16 relative border-white/80 shadow-2xl">
            <button onClick={() => document.getElementById('about-modal')?.classList.toggle('hidden')} className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center glass-button text-gray-400 hover:text-gray-900 transition-all rounded-2xl shadow-sm">✕</button>
            <About studentsCount={availableUsers.filter(u => u.role === 'STUDENT').length} />
          </div>
        </div>

      </div>
    );
  }

  if (step === 'USER_PICK' && selectedRole) {
    return (
      <div className="min-h-screen flex flex-col animate-in slide-in-from-bottom-6 duration-700 bg-gray-50/50">
        <div className="max-w-4xl w-full mx-auto p-8 md:p-20 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-16">
            <button onClick={() => setStep('PORTAL')} className="glass-button p-4 text-gray-400 hover:text-gray-900 transition-all group rounded-2xl shadow-sm border-white/60">
              <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <span className="text-[9px] font-black text-teal-600 uppercase tracking-[0.4em] bg-teal-500/10 px-8 py-3 rounded-full border border-teal-500/20 shadow-sm">
              Node Directory Hub
            </span>
          </div>

          <h2 className="text-5xl font-black mb-12 uppercase tracking-tight pr-10 leading-none">Access Registry</h2>

          <div className="mb-12 relative group">
            <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-teal-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              autoFocus
              placeholder="Query Node Name or ID..."
              className="w-full glass-input rounded-[2.5rem] py-7 pl-16 pr-8 text-lg outline-none transition-all font-black placeholder:opacity-20 border-white/10 shadow-sm"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto glass-card rounded-[3.5rem] overflow-hidden no-scrollbar border-white/20 shadow-[0_32px_128px_rgba(0,0,0,0.05)]">
            {filteredUsers.length > 0 ? (
              <div className="divide-y divide-white/5">
                {filteredUsers.map(user => {
                  const displayRole = (user.role === 'ADMIN' && selectedRole !== 'ADMIN') ? 'STUDENT' : user.role;
                  return (
                  <button
                    key={user.id}
                    onClick={() => onLogin({ ...user, portalMode: selectedRole })}
                    className="w-full flex items-center gap-8 p-10 hover:bg-white/5 transition-all text-left group active:scale-[0.99] border-b border-white/5 last:border-0"
                  >
                    <div className="w-16 h-16 rounded-[1.8rem] bg-white/10 group-hover:scale-110 transition-all flex items-center justify-center text-gray-400 group-hover:text-teal-600 shadow-sm border border-white/10 overflow-hidden shrink-0">
                      {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-xl font-black">{user.name.charAt(0)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-5">
                        <p className="text-xl font-black group-hover:text-teal-600 transition-colors uppercase tracking-tight leading-none">{user.name}</p>
                        <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border shadow-sm ${displayRole === 'ADMIN' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' : displayRole === 'USTHAD' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-teal-500/10 text-teal-600 border-teal-500/20'}`}>
                          {displayRole}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.25em] mt-3 leading-none opacity-60">{user.id === storedAdminPass ? 'PRIMARY SYSTEM NODE' : `NODE ID: ${user.id}`} • {user.class || 'General'}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <div className="w-12 h-12 rounded-2xl glass-button flex items-center justify-center text-teal-600 shadow-sm border-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-32 text-center">
                <div className="mb-8 text-gray-200 flex justify-center"><svg className="w-20 h-20 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                <p className="text-gray-300 text-[10px] font-black uppercase tracking-[0.5em] opacity-60">No matching logic nodes found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Login;
