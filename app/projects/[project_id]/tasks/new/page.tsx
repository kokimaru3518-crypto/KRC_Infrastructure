'use client';

import { useState, useEffect, use, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../../supabase/client';
import Link from 'next/link';

export default function NewTaskPage({ params }: { params: Promise<{ project_id: string }> }) {
  const { project_id } = use(params);
  const [taskName, setTaskName] = useState('');
  const [assignee, setAssignee] = useState(''); // user_id (gmail)
  const [priority, setPriority] = useState<number>(0);
  const [members, setMembers] = useState<{ user_id: string }[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchMembers = useCallback(async () => {
    // 担当者のサジェスト用にプロジェクトメンバーを取得
    const { data } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', project_id)
      .neq('role', 'pending');
    if (data) setMembers(data);
  }, [project_id, supabase]);

  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void fetchMembers();
    }
  }, [fetchMembers]);

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
        situation: 'waiting', // デフォルト状態
      });

    if (sbError) {
      setError('タスク作成に失敗しました: ' + sbError.message);
    } else {
      router.push(`/projects/${project_id}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href={`/projects/${project_id}`} className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-semibold mb-8 transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Project
        </Link>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8">
            <h1 className="text-3xl font-extrabold text-white">Create New Task</h1>
            <p className="text-blue-100 mt-2 opacity-90">Add a new task to your project</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg" role="alert">
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Task Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-slate-50 focus:bg-white"
                  placeholder="e.g. Implement Login API"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Assignee</label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-slate-50 focus:bg-white"
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.user_id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Priority (0: Low, 1: Medium, 2: High)</label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push(`/projects/${project_id}`)}
                  className="mr-4 px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
