
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Role, User } from '../types';
import Logo from './Logo';

interface SidebarProps {
  role: Role;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  user: User;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  quickStats: {
    booksBorrowed: number;
    dueSoon: number;
    reservations: number;
    fineDue: number;
  };
}

const Sidebar: React.FC<SidebarProps> = ({
  role, activeTab, setActiveTab, onLogout, user, isMobileOpen, onCloseMobile, theme, onToggleTheme, quickStats
}) => {
  const navItems = role === 'ADMIN' ? [
    { id: 'dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'books', label: 'Books', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'users', label: 'Members', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'requests', label: 'Approvals', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'fines', label: 'Fines', icon: 'M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z M12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z' },
    { id: 'about', label: 'About', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ] : [
    { id: 'dashboard', label: 'My Hub', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'catalog', label: 'Catalog', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'my-requests', label: 'Requests', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'my-fines', label: 'Fines', icon: 'M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z M12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z' },
    { id: 'about', label: 'About', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-[70] md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-[80]
        w-72 lg:h-screen bg-white/10 backdrop-blur-2xl border-r border-white/20 flex flex-col shrink-0
        transition-all duration-500 ease-in-out shadow-[0_8px_32px_rgba(0,0,0,0.03)]
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full py-10">
          <div className="px-8 flex-1 overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4 group cursor-pointer">
                <div className="p-3 glass-card rounded-2xl border-white/20 shadow-sm group-hover:scale-105 transition-all duration-500">
                  <Logo className="w-8 h-8" />
                </div>
                <div>
                  <span className="block font-black tracking-tight text-xl leading-none">BAYANUL</span>
                  <span className="block font-black tracking-tight text-xl mt-1">ULOOM</span>
                </div>
              </div>
              {/* Mobile Close Button */}
              <button onClick={onCloseMobile} className="md:hidden p-2 text-gray-400 hover:text-gray-800 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="space-y-3 pb-10">
              {navItems.map((item) => {
                return (
                  <NavLink
                    key={item.id}
                    to={`/${item.id}`}
                    onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                    className={({ isActive }) => `w-full flex items-center gap-4 py-3.5 px-6 transition-all duration-300 group relative
                      ${isActive
                        ? 'bg-teal-500/10 rounded-2xl border border-teal-500/20'
                        : 'text-gray-500 dark:text-zinc-400 hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:rounded-2xl'}`}
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`transition-all duration-300 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'opacity-40 group-hover:opacity-100'}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2 : 1.5} d={item.icon} />
                          </svg>
                        </div>
                        <span className={`text-[11px] font-black tracking-[0.15em] uppercase transition-all duration-300
                          ${isActive ? 'text-teal-750 dark:text-teal-300' : 'opacity-60 group-hover:opacity-100 text-gray-600 dark:text-zinc-300'}`}>
                          {item.label}
                        </span>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-teal-500 rounded-full" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* QUICK STATS */}
            <div className="pt-8 border-t border-white/10 mt-4 mb-8">
              <h4 className="text-[10px] font-black tracking-widest uppercase opacity-40 mb-4 px-2 text-gray-900 dark:text-white">Quick Stats</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between glass-card p-3 rounded-xl border-white/5 group hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Books Borrowed</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{quickStats.booksBorrowed}</span>
                </div>
                
                <div className="flex items-center justify-between glass-card p-3 rounded-xl border-white/5 group hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Due Soon</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{quickStats.dueSoon}</span>
                </div>

                <div className="flex items-center justify-between glass-card p-3 rounded-xl border-white/5 group hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Reservations</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{quickStats.reservations}</span>
                </div>

                <div className="flex items-center justify-between glass-card p-3 rounded-xl border-white/5 group hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z M12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" /></svg>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Fine Due</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white">₹{quickStats.fineDue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 pt-8 border-t border-white/40 mt-auto bg-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold overflow-hidden shrink-0 shadow-sm">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm opacity-60 text-gray-900 dark:text-white">{user.name.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black truncate uppercase tracking-tight leading-none text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-2 opacity-65 text-gray-500 dark:text-zinc-400">{role}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {/* Theme Toggle */}
              <button
                onClick={onToggleTheme}
                className="w-full flex items-center justify-between py-3.5 px-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-zinc-400 hover:text-teal-500 dark:hover:text-teal-400 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {theme === 'dark' ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                    )}
                  </div>
                  Appearance
                </div>
                <span className="text-[8px] font-black opacity-60 text-gray-500 dark:text-zinc-400">{theme}</span>
              </button>

              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLogout(); }}
                type="button"
                className="w-full flex items-center gap-3 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 transition-all group"
              >
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log Out
              </button>

              <div className="flex items-center gap-5 pt-6 pb-2">
                <a href="https://www.instagram.com/muttichira_dars/" target="_blank" rel="noopener noreferrer" className="opacity-20 hover:opacity-100 hover:text-teal-500 transition-all hover:scale-110">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.981 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                </a>
                <a href="https://www.youtube.com/@muttichiradars" target="_blank" rel="noopener noreferrer" className="opacity-20 hover:opacity-100 hover:text-rose-500 transition-all hover:scale-110">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                </a>
                <a href="https://sites.google.com/view/bayanululoomdars-usthad/home" target="_blank" rel="noopener noreferrer" className="opacity-20 hover:opacity-100 hover:text-teal-500 transition-all hover:scale-110">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
