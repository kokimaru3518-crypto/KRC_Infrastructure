'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../supabase/client';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userId || !password) {
      setError('ユーザーIDとパスワードを入力してください');
      return;
    }

    if (isLogin) {
      // ログイン処理: usersテーブルの user_name で検索
      const { data, error: sbError } = await supabase
        .from('users')
        .select('*')
        .eq('user_name', userId)
        .eq('password', password)
        .single();

      if (sbError || !data) {
        console.error('Supabase Error:', sbError);
        setError('ログインに失敗しました。ユーザーIDまたはパスワードが間違っています。詳細: ' + (sbError?.message || 'データなし'));
      } else {
        // localStorageには user_name を保存（他の画面で表示やキーとして使うため）
        localStorage.setItem('krc_user_id', data.user_name);
        router.push('/projects');
      }
    } else {
      // 登録処理: user_idはUUIDを生成、user_nameに入力されたメール(またはID)を登録
      const newUserId = crypto.randomUUID();
      const { error: sbError } = await supabase
        .from('users')
        .insert({
          user_id: newUserId,
          password: password,
          user_name: userId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

      if (sbError) {
        setError('登録に失敗しました: ' + sbError.message);
      } else {
        localStorage.setItem('krc_user_id', userId);
        router.push('/projects');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFBFC] font-sans text-[#172B4D]">
      <div className="mb-8 flex items-center justify-center gap-2">
        <div className="w-10 h-10 bg-[#0052CC] rounded flex items-center justify-center text-white font-bold text-xl leading-none shadow-sm">
          K
        </div>
        <span className="font-bold text-2xl tracking-tight text-[#172B4D]">KRC Software</span>
      </div>

      <div className="bg-white p-10 rounded shadow-[0_0_10px_rgba(0,0,0,0.1)] w-full max-w-[400px]">
        <h1 className="text-xl font-bold text-center text-[#172B4D] mb-6">
          {isLogin ? 'Log in to your account' : 'Sign up for your account'}
        </h1>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-6 rounded text-sm" role="alert">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#5E6C84] mb-1.5">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-[#DFE1E6] rounded bg-[#FAFBFC] focus:bg-white focus:border-[#4C9AFF] focus:ring-1 focus:ring-[#4C9AFF] transition-colors outline-none text-sm"
              placeholder="Enter your user ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#5E6C84] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[#DFE1E6] rounded bg-[#FAFBFC] focus:bg-white focus:border-[#4C9AFF] focus:ring-1 focus:ring-[#4C9AFF] transition-colors outline-none text-sm"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#0052CC] hover:bg-[#0047b3] text-white font-bold py-2 px-4 rounded transition-colors text-sm"
          >
            {isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#DFE1E6] text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[#0052CC] hover:underline text-sm font-medium transition-colors"
          >
            {isLogin ? "Sign up for an account" : "Log in to an existing account"}
          </button>
        </div>
      </div>
    </div>
  );
}
