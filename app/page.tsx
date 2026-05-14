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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFBFC] font-sans text-[#172B4D] px-4 sm:px-8">
      <div className="mb-12 flex items-center justify-center gap-3">
        <div className="w-14 h-14 bg-[#0052CC] rounded-xl flex items-center justify-center text-white font-bold text-3xl leading-none shadow-md">
          K
        </div>
        <span className="font-extrabold text-4xl tracking-tight text-[#172B4D]">KRC Software</span>
      </div>

      <div className="bg-white py-14 px-10 sm:px-16 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] border border-[#DFE1E6] w-full max-w-[600px]">
        <h1 className="text-3xl font-bold text-center text-[#172B4D] mb-10">
          {isLogin ? 'Log in to your account' : 'Sign up for your account'}
        </h1>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-5 mb-8 rounded-md text-base" role="alert">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-base font-bold text-[#5E6C84] mb-3">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-6 py-4 border-2 border-[#DFE1E6] rounded-xl bg-[#FAFBFC] focus:bg-white focus:border-[#4C9AFF] focus:ring-4 focus:ring-[#4C9AFF]/20 transition-all outline-none text-lg text-[#172B4D] shadow-sm hover:bg-gray-50"
              placeholder="Enter your user ID"
              required
            />
          </div>

          <div>
            <label className="block text-base font-bold text-[#5E6C84] mb-3">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 border-2 border-[#DFE1E6] rounded-xl bg-[#FAFBFC] focus:bg-white focus:border-[#4C9AFF] focus:ring-4 focus:ring-[#4C9AFF]/20 transition-all outline-none text-lg text-[#172B4D] shadow-sm hover:bg-gray-50"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#0052CC] hover:bg-[#0047b3] active:bg-[#003d99] text-white font-bold py-4 px-6 rounded-xl transition-all text-lg shadow-sm hover:shadow-md mt-6"
          >
            {isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-[#DFE1E6] text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[#0052CC] hover:underline text-lg font-semibold transition-colors"
          >
            {isLogin ? "Sign up for an account" : "Log in to an existing account"}
          </button>
        </div>
      </div>
    </div>
  );
}
