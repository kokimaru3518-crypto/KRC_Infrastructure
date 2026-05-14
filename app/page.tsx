'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../supabase/client';
import { getSession, type Session } from '../lib/session';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const init = async () => {
      const s = await getSession();
      if (s) {
        setSession(s);
        // 参加中のプロジェクトを取得
        const { data } = await supabase
          .from('project_members')
          .select(`
            role,
            projects (
              project_id,
              project_name,
              text,
              created_at
            )
          `)
          .eq('user_id', s.user_id);
        
        if (data) {
          setProjects(data.map(item => item.projects).filter(Boolean));
        }
      }
      setLoading(false);
    };
    void init();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: userId, password }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'エラーが発生しました');
      setLoading(false);
    } else {
      window.location.reload(); // セッションを反映させるためリロード
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading...</div>;

  // ログイン済みの場合：ダッシュボード表示
  if (session) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 md:p-12">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">Welcome back, {session.user_name}</h1>
              <p className="text-slate-500 mt-2 font-medium">参加中のプロジェクトをチェックしましょう</p>
            </div>
            <Link href="/projects" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all">
              すべてのプロジェクトを見る
            </Link>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length > 0 ? (
              projects.map((project: any) => (
                <Link 
                  key={project.project_id} 
                  href={`/projects/${project.project_id}`}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xl mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {project.project_name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{project.project_name}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2 mb-6">{project.text || '説明がありません'}</p>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      {project.created_at ? new Date(project.created_at).toLocaleDateString() : ''}
                    </span>
                    <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">ボードを開く &rarr;</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center">
                <p className="text-slate-400 font-bold mb-4 text-lg">参加中のプロジェクトはまだありません</p>
                <Link href="/projects" className="text-indigo-600 font-black hover:underline">プロジェクトを探しに行く</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 未ログインの場合：ログインフォーム表示
  return (
    <div className={styles.container}>
      <div className={styles.logoWrapper}>
        <div className={styles.logoIcon}>K</div>
        <span className={styles.logoText}>KRC Software</span>
      </div>
      <div className={styles.card}>
        <h1 className={styles.title}>{isLogin ? 'アカウントにログイン' : 'アカウントを作成'}</h1>
        {error && <div className={styles.errorAlert} role="alert"><p>{error}</p></div>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label className={styles.label}>ユーザーID</label>
            <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} className={styles.input} placeholder="ユーザーIDを入力" required />
          </div>
          <div>
            <label className={styles.label}>パスワード</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} placeholder="パスワードを入力" required />
          </div>
          <button type="submit" disabled={loading} className={styles.submitButton}>{loading ? '処理中...' : (isLogin ? 'ログイン' : 'サインアップ')}</button>
        </form>
        <div className={styles.switchSection}>
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className={styles.switchButton}>
            {isLogin ? "新しくアカウントを作成する" : "既存のアカウントでログインする"}
          </button>
        </div>
      </div>
    </div>
  );
}
