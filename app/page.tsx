'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!userId || !password) {
      setError('ユーザーIDとパスワードを入力してください');
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: userId, password }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || 'エラーが発生しました');
    } else {
      router.push('/projects');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFBFC] font-sans text-[#172B4D] px-4 sm:px-8">
      <div className="mb-12 flex items-center justify-center gap-3">
        <div className="w-14 h-14 bg-[#0052CC] rounded-xl flex items-center justify-center text-white font-bold text-3xl leading-none shadow-md">
          K
        </div>
        <span className="font-extrabold text-4xl tracking-tight text-[#172B4D]">KRC Software</span>
      </div>

      <div className="bg-white py-20 px-10 sm:px-16 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] border border-[#DFE1E6] w-full max-w-[800px]">
        <h1 className="text-5xl font-bold text-center text-[#172B4D] mb-16">
          {isLogin ? 'Log in to your account' : 'Sign up for your account'}
        </h1>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-8 mb-12 rounded-md text-2xl" role="alert">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-16">
          <div>
            <label className="block text-2xl font-bold text-[#5E6C84] mb-6">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-10 py-16 border-2 border-[#DFE1E6] rounded-2xl bg-[#FAFBFC] focus:bg-white focus:border-[#4C9AFF] focus:ring-4 focus:ring-[#4C9AFF]/20 transition-all outline-none text-4xl text-[#172B4D] shadow-sm hover:bg-gray-50"
              placeholder="Enter your user ID"
              required
            />
          </div>

          <div>
            <label className="block text-2xl font-bold text-[#5E6C84] mb-6">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-10 py-16 border-2 border-[#DFE1E6] rounded-2xl bg-[#FAFBFC] focus:bg-white focus:border-[#4C9AFF] focus:ring-4 focus:ring-[#4C9AFF]/20 transition-all outline-none text-4xl text-[#172B4D] shadow-sm hover:bg-gray-50"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0052CC] hover:bg-[#0047b3] active:bg-[#003d99] text-white font-bold py-16 px-10 rounded-2xl transition-all text-4xl shadow-sm hover:shadow-md mt-16 disabled:opacity-60"
          >
            {loading ? '処理中...' : (isLogin ? 'Log in' : 'Sign up')}
          </button>
        </form>

        <div className="mt-16 pt-12 border-t border-[#DFE1E6] text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[#0052CC] hover:underline text-3xl font-semibold transition-colors py-8"
          >
            {isLogin ? "Sign up for an account" : "Log in to an existing account"}
          </button>
        </div>
      </div>
    </div>
  );
}
