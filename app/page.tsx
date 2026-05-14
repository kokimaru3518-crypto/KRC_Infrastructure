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
        setError('ログインに失敗しました。ユーザーIDまたはパスワードが間違っています。');
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
        } as any); // database.types.ts にない列が追加された場合のエラーを防ぐため any をキャスト（または無視）

      if (sbError) {
        setError('登録に失敗しました: ' + sbError.message);
      } else {
        localStorage.setItem('krc_user_id', userId);
        router.push('/projects');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-8 tracking-tight">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User ID (e.g. admin)</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Enter your user ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
