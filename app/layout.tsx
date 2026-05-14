'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '../supabase/client';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }

      const expireStr = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
      ['session', 'sb-access-token', 'sb-refresh-token'].forEach(name => {
        document.cookie = `${name}=; path=/; ${expireStr}; SameSite=Lax`;
        document.cookie = `${name}=; path=/; domain=${window.location.hostname}; ${expireStr}; SameSite=Lax`;
      });

      await supabase.auth.signOut();
      window.location.href = '/?loggedout=true';
    } catch (err) {
      window.location.href = '/';
    }
  };

  const isLoginPage = pathname === '/';

  if (!mounted) return (
    <html lang="ja">
      <body className={inter.className}></body>
    </html>
  );

  return (
    <html lang="ja">
      <body className={`${inter.className} bg-white text-slate-900`}>
        {!isLoginPage ? (
          <div className="flex min-h-screen relative">
            {/* Jira Sidebar */}
            <aside className="w-64 bg-[#0747A6] text-white flex flex-col fixed inset-y-0 left-0 z-[100] shadow-xl">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                    <div className="w-5 h-5 bg-[#0747A6] rounded-sm transform rotate-45"></div>
                  </div>
                  <span className="text-lg font-bold tracking-tight">KRC Infra</span>
                </div>

                <nav className="space-y-1">
                  <Link href="/projects" className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${pathname.startsWith('/projects') ? 'bg-white/20 text-white font-bold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    プロジェクト
                  </Link>

                  <Link href="/mytasks" className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${pathname === '/mytasks' ? 'bg-white/20 text-white font-bold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10 a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    マイタスク
                  </Link>
                </nav>
              </div>

              <div className="mt-auto p-6 border-t border-white/10">
                <button 
                  onClick={handleLogout} 
                  type="button"
                  className="flex items-center gap-3 px-3 py-2 rounded text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full text-left"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                  ログアウト
                </button>
              </div>
            </aside>

            <main className="flex-1 ml-64 min-h-screen">
              {children}
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
