'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const id = localStorage.getItem('krc_user_id');
        if (!id) {
            router.push('/');
        } else {
            setUserId(id);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('krc_user_id');
        router.push('/');
    };

    if (!userId) return null;

    return (
        <div className="min-h-screen bg-[#F4F5F7] flex flex-col font-sans text-[#172B4D]">
            {/* Top Navigation Bar - Jira style */}
            <header className="h-14 bg-white border-b border-[#DFE1E6] flex flex-row items-center justify-between px-4 shrink-0 shadow-[0_1px_1px_rgba(9,30,66,0.05)] z-20 w-full fixed top-0">
                <div className="flex items-center gap-6">
                    <Link href="/projects" className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-[#0052CC] rounded flex items-center justify-center text-white font-bold text-sm leading-none shadow-sm">
                            K
                        </div>
                        <span className="font-bold text-base tracking-tight text-[#172B4D]">KRC Software</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-1">
                        <Link href="/projects" className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${pathname === '/projects' ? 'bg-[#0052CC] text-white' : 'text-[#42526E] hover:bg-slate-100'}`}>Projects</Link>
                        <Link href="/projects/new" className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${pathname === '/projects/new' ? 'bg-[#0052CC] text-white' : 'text-[#42526E] hover:bg-slate-100'}`}>Create</Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-sm font-medium text-[#42526E]">
                        {userId}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-8 h-8 rounded-full bg-[#DFE1E6] hover:bg-[#C1C7D0] flex items-center justify-center text-[#42526E] transition-colors cursor-pointer"
                        title="Logout"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </header>

            {/* Main Content Layout */}
            <div className="flex flex-1 pt-14 h-full">
                {/* Page Content */}
                <main className="flex-1 w-full max-w-full overflow-y-auto min-h-[calc(100vh-3.5rem)]">
                    {children}
                </main>
            </div>
        </div>
    );
}
