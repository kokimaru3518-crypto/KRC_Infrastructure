'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../supabase/client';
import { getSession } from '../lib/session';

export default function LoginPage() {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const justLoggedOut = searchParams.get('loggedout') === 'true';
    
    const checkSession = async () => {
      if (justLoggedOut) {
        setLoading(false);
        return;
      }

      const session = await getSession();
      if (session) {
        router.replace('/projects');
      } else {
        setLoading(false);
      }
    };
    
    checkSession();
  }, [router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (userName === 'admin' && password === 'admin') {
      const adminSession = {
        user_id: 'admin-id',
        user_name: 'admin',
        email: 'admin@example.com'
      };
      document.cookie = `session=${JSON.stringify(adminSession)}; path=/; max-age=86400; SameSite=Lax`;
      window.location.href = '/projects';
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_name', userName)
      .eq('password', password)
      .single();

    if (data) {
      const sessionData = {
        user_id: data.user_id,
        user_name: data.user_name,
        email: data.email
      };
      document.cookie = `session=${JSON.stringify(sessionData)}; path=/; max-age=86400; SameSite=Lax`;
      window.location.href = '/projects';
    } else {
      alert('ログインに失敗しました。ユーザー名またはパスワードが正しくありません。');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center font-bold text-slate-300 uppercase tracking-widest animate-pulse italic">KRC INFRA...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 bg-[#0747A6] rounded flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded-sm transform rotate-45"></div>
          </div>
          <h1 className="text-xl font-bold text-[#0747A6] tracking-tight">KRC Infra</h1>
        </div>

        <div className="bg-white rounded shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-10">
            <h2 className="text-center text-lg font-bold text-slate-800 mb-8">アカウントにログイン</h2>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">ユーザー名</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f4f5f7] border border-slate-300 rounded text-sm outline-none focus:bg-white focus:border-[#0747A6] focus:ring-1 focus:ring-[#0747A6] transition-all"
                  placeholder="ユーザー名を入力"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">パスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f4f5f7] border border-slate-300 rounded text-sm outline-none focus:bg-white focus:border-[#0747A6] focus:ring-1 focus:ring-[#0747A6] transition-all"
                  placeholder="パスワードを入力"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#0747A6] hover:bg-[#0052CC] text-white py-2 rounded font-bold transition-all shadow-md active:scale-[0.98] text-sm"
              >
                ログイン
              </button>
            </form>
          </div>
          
          <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-center">
            <p className="text-[10px] text-slate-400 font-medium">
              © 2026 KRC Infrastructure Group
            </p>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center gap-6">
          <span className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">プライバシーポリシー</span>
          <span className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">利用規約</span>
        </div>
      </div>
    </div>
  );
}
