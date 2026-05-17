'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '../supabase/client';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { getSession } from '../lib/session';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setMounted(true);
    const fetchUser = async () => {
      try {
        const session = await getSession();
        if (session) {
          setUserName(session.user_name);
        }
      } catch (err) {
        console.error('Session fetch error in layout:', err);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
      const expireStr = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
      ['krc_session', 'session', 'sb-access-token', 'sb-refresh-token'].forEach(name => {
        document.cookie = `${name}=; path=/; ${expireStr}; SameSite=Lax`;
        document.cookie = `${name}=; path=/; domain=${window.location.hostname}; ${expireStr}; SameSite=Lax`;
      });
      await supabase.auth.signOut();
      window.location.href = '/?loggedout=true';
    } catch (err) {
      window.location.href = '/';
    }
  };

  // Prevent hydration mismatch by only rendering navigation on client
  const isLoginPage = mounted && pathname === '/';

  return (
    <html lang="ja">
      <body className={`${inter.className} bg-white text-slate-900`}>
        {mounted && !isLoginPage ? (
          <div className="flex min-h-screen relative">
            {/* Jira Sidebar */}
            <aside className="w-64 bg-[#0747A6] text-white flex flex-col fixed inset-y-0 left-0 z-50 shadow-xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                    <div className="w-5 h-5 bg-[#0747A6] rounded-sm transform rotate-45"></div>
                  </div>
                  <span className="text-lg font-bold tracking-tight text-white">KRC Infra</span>
                </div>

                <nav className="space-y-1">
                  <Link href="/projects" className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${pathname?.startsWith('/projects') ? 'bg-white/20 text-white font-bold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    プロジェクト
                  </Link>

                  <Link href="/mytasks" className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${pathname === '/mytasks' ? 'bg-white/20 text-white font-bold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10 a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    マイタスク
                  </Link>
                </nav>
              </div>

              <div className="mt-auto border-t border-white/10">
                {userName && (
                  <div className="px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                      {userName.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white/90 leading-none mb-1">{userName}</span>
                      <span className="text-[10px] text-white/40 leading-none">ログイン中</span>
                    </div>
                  </div>
                )}
                
                <div className="px-6 pb-6">
                  <button 
                    onClick={handleLogout} 
                    type="button"
                    className="flex items-center gap-3 px-3 py-2 rounded text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full text-left"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    ログアウト
                  </button>
                </div>
              </div>
            </aside>

            <main className="flex-1 ml-64 min-h-screen">
              {children}
            </main>
          </div>
        ) : (
          <div className="min-h-screen bg-slate-50">
            {children}
          </div>
        )}
      </body>
    </html>
  );
}
