'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../supabase/client';
import { getSession, type Session } from '../../../lib/session';
import Link from 'next/link';

export default function NewProjectPage() {
  const [projectName, setProjectName] = useState('');
  const [text, setText] = useState('');
  const [initialMembers, setInitialMembers] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    getSession().then((s) => {
      if (!s) router.push('/');
      else setSession(s);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    // session.user_id は既に UUID なので DB 変換不要
    const leaderUUID = session.user_id;
    const newProjectId = crypto.randomUUID();

    const { error: projectError } = await supabase
      .from('projects')
      .insert({
        project_id: newProjectId,
        project_name: projectName,
        text: text,
      });

    if (projectError) {
      setError('プロジェクトの作成に失敗しました: ' + projectError.message);
      return;
    }

    const membersToInsert: { project_id: string; user_id: string; role: string }[] = [
      { project_id: newProjectId, user_id: leaderUUID, role: 'leader' }
    ];

    if (initialMembers.trim()) {
      const memberNames = initialMembers.split(',').map(id => id.trim()).filter(id => id);
      for (const mName of memberNames) {
        // 追加メンバーは user_name → UUID に解決する
        const { data: mData } = await supabase
          .from('users')
          .select('user_id')
          .eq('user_name', mName)
          .single();
        // 自分自身（leader）と重複する場合はスキップ
        if (mData && mData.user_id !== leaderUUID) {
          membersToInsert.push({ project_id: newProjectId, user_id: mData.user_id, role: 'member' });
        }
      }
    }

    const { error: memberError } = await supabase
      .from('project_members')
      .insert(membersToInsert);

    if (memberError) {
      setError('メンバーの追加に失敗しました: ' + memberError.message);
    } else {
      router.push('/projects');
    }
  };

  if (!session) return null;

  return (
    <div className="p-8 max-w-2xl mx-auto mt-10">
      <Link href="/projects" className="text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline mb-8 flex items-center gap-1 w-fit transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        プロジェクト一覧へ戻る
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h1 className="text-2xl font-extrabold text-slate-900">新しいプロジェクトを作成</h1>
          <p className="text-sm text-slate-500 mt-1">新しいプロジェクトを設定して、共同作業を始めましょう。</p>
        </div>

        <div className="p-6 pt-5">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm text-sm" role="alert">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">プロジェクト名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-slate-50 hover:bg-white transition-all outline-none"
                placeholder="チーム名、プロジェクトの目標などを入力してください"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">説明</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-slate-50 hover:bg-white transition-all outline-none h-28 resize-y"
                placeholder="このプロジェクトについて説明してください"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">初期メンバー</label>
              <input
                type="text"
                value={initialMembers}
                onChange={(e) => setInitialMembers(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-slate-50 hover:bg-white transition-all outline-none"
                placeholder="例: alice, bob (ユーザーIDをカンマ区切りで入力)"
              />
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                あなたは自動的にプロジェクトリーダーとして追加されます。
              </p>
            </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-8">
              <button
                type="button"
                onClick={() => router.push('/projects')}
                className="px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors text-sm"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                プロジェクトを作成
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
