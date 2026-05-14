'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getSession, type Session } from '../../lib/session';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        getSession().then((s) => {
            if (!s) {
                router.push('/');
            } else {
                setSession(s);
            }
        });
    }, [router]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
    };

    if (!session) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {/* Top Navigation Bar - Modern style */}
            <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex flex-row items-center justify-between px-6 shrink-0 shadow-sm z-20 w-full fixed top-0">
                <div className="flex items-center gap-8">
                    <Link href="/projects" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm leading-none shadow-md">
                            K
                        </div>
                        <span className="font-extrabold text-lg tracking-tight text-slate-900">KRC Software</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-2">
                        <Link href="/projects" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${pathname === '/projects' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>プロジェクト</Link>
                        <Link href="/projects/new" className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${pathname === '/projects/new' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>作成</Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                        {session.user_name}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="ログアウト"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </header>

            {/* Main Content Layout */}
            <div className="flex flex-1 pt-16 h-full">
                {/* Page Content */}
                <main className="flex-1 w-full max-w-full overflow-y-auto min-h-[calc(100vh-4rem)]">
                    {children}
                </main>
            </div>
        </div>
    );
}
