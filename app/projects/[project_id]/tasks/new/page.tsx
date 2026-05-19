'use client';

import { useState, useEffect, use, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../../supabase/client';
import { getSession } from '../../../../../lib/session';
import Link from 'next/link';

export default function NewTaskPage({ params }: { params: Promise<{ project_id: string }> }) {
  const { project_id } = use(params);
  const [taskName, setTaskName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<number>(0);
  const [members, setMembers] = useState<{
    user_id: string;
    role: string | null;
    users: { user_name: string } | null;
  }[]>([]);
  const [error, setError] = useState('');
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchMembers = useCallback(async () => {
    const session = await getSession();
    if (!session) {
      router.push('/');
      return;
    }

    // admin はリーダーチェックをバイパス
    const isAdmin = session.user_name === 'admin';
    const currentUUID = session.user_id;

    const { data } = await supabase
      .from('project_members')
      .select('user_id, role, users(user_name)')
      .eq('project_id', project_id)
      .neq('role', 'pending');

    if (data) {
      // UUID でリーダー判定
      const isLeader = isAdmin || data.some(m => m.user_id === currentUUID && m.role === 'leader');
      if (!isLeader) {
        router.push(`/projects/${project_id}`);
        return;
      }
      setMembers(data);
      setIsCheckingUser(false);
    }
  }, [project_id, supabase, router]);

  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void fetchMembers();
    }
  }, [fetchMembers]);

  if (isCheckingUser) return <div className="p-8 text-slate-500 flex justify-center items-center min-h-[50vh]">読み込み中...</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newTaskId = crypto.randomUUID();

    const { error: sbError } = await supabase
      .from('tasks')
      .insert({
        task_id: newTaskId,
        task_name: taskName,
        user_id: assignee || null,
        project_id: project_id,
        priority: priority,
        situation: 'waiting',
      });

    if (sbError) {
      setError('タスクの作成に失敗しました: ' + sbError.message);
    } else {
      router.push(`/projects/${project_id}`);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto mt-10">
      <Link href={`/projects/${project_id}`} className="text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline mb-8 flex items-center gap-1 w-fit transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        ボードへ戻る
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h1 className="text-2xl font-extrabold text-slate-900">新しいタスクを作成</h1>
          <p className="text-sm text-slate-500 mt-1">プロジェクトのボードに新しいタスクを追加します。</p>
        </div>

        <div className="p-6 pt-5">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm text-sm" role="alert">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">タスクの概要 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-slate-50 hover:bg-white transition-all outline-none"
                placeholder="何をする必要がありますか？"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">担当者</label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-slate-50 hover:bg-white transition-all outline-none"
                >
                  <option value="">未割り当て</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.users?.user_name || m.user_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">優先度</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-slate-50 hover:bg-white transition-all outline-none"
                >
                  <option value={0}>低 (0)</option>
                  <option value={1}>中 (1)</option>
                  <option value={2}>高 (2)</option>
                </select>
              </div>
            </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-8">
              <button
                type="button"
                onClick={() => router.push(`/projects/${project_id}`)}
                className="px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors text-sm"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                タスクを作成
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
