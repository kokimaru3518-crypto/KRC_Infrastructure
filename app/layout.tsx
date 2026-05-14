'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getSession, type Session } from '../lib/session';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // セッション状態の監視
  const refreshSession = async () => {
    const s = await getSession();
    setSession(s);
    setLoading(false);
  };

  useEffect(() => {
    void refreshSession();
  }, [pathname]);

  // ログアウト処理
  const handleLogout = async () => {
    try {
      // サーバー側のセッションを破棄
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // クライアント側の状態を即座にクリア
      setSession(null);
      
      // ログイン画面（トップ）へ強制的に移動し、ページをリフレッシュ
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      // エラー時でも強制移動
      window.location.href = '/';
    }
  };

  const navItems = [
    { name: 'ホーム', href: '/', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg> },
    { name: 'プロジェクト一覧', href: '/projects', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg> },
    { name: '新規プロジェクト', href: '/projects/new', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg> },
  ];

  return (
    <html lang="ja">
      <body className="antialiased">
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
          {/* Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex flex-row items-center justify-between px-6 shrink-0 z-40 w-full fixed top-0">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">K</div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900">KRC Software</span>
            </Link>
            {session && (
              <div className="flex items-center gap-4">
                <div className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">{session.user_name}</div>
                <button 
                  onClick={handleLogout} 
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-2 font-bold text-xs"
                  title="ログアウト"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                </button>
              </div>
            )}
          </header>

          <div className="flex flex-1 pt-16">
            {/* Sidebar */}
            {session && (
              <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col fixed h-[calc(100vh-4rem)] z-30 transition-all shadow-sm">
                <div className="p-4 space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                        pathname === item.href ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  ))}
                </div>
              </aside>
            )}

            {/* Page Content */}
            <main className={`flex-1 w-full overflow-y-auto ${session ? 'md:ml-64' : ''}`}>
              {loading ? (
                <div className="p-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Authenticating...</div>
              ) : children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
