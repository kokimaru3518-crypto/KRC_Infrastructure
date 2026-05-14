'use client';

import { useEffect, useState, useCallback, useMemo, use } from 'react';
import { createClient } from '../../../supabase/client';
import { getSession, type Session } from '../../../lib/session';
import Link from 'next/link';

type Task = {
  task_id: string;
  task_name: string;
  situation: string | null;
  priority: number | null;
  user_id: string | null;
  created_at: string | null;
  users: {
    user_name: string;
  } | null;
};

type Project = {
  project_id: string;
  project_name: string;
  text: string | null;
  created_at: string | null;
};

const priorityMap: { [key: number]: { label: string, color: string } } = {
  2: { label: 'High', color: 'text-red-600 bg-red-50 border-red-100' },
  1: { label: 'Middle', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  0: { label: 'Low', color: 'text-slate-600 bg-slate-50 border-slate-100' },
};

export default function ProjectDetailPage({ params }: { params: Promise<{ project_id: string }> }) {
  const { project_id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // プロジェクト情報の取得
    const { data: pData } = await supabase
      .from('projects')
      .select('*')
      .eq('project_id', project_id)
      .single();

    if (pData) setProject(pData);

    // タスク一覧の取得（担当者名を含む）
    const { data: tData } = await supabase
      .from('tasks')
      .select(`
        *,
        users (
          user_name
        )
      `)
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });

    if (tData) setTasks(tData);
    setLoading(false);
  }, [project_id, supabase]);

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      void fetchData();
    });
  }, [fetchData]);

  // ステータス更新処理
  const updateTaskStatus = async (taskId: string, currentStatus: string | null) => {
    const statuses = ['waiting', 'working', 'done'];
    const nextStatus = statuses[(statuses.indexOf(currentStatus || 'waiting') + 1) % statuses.length];

    const { error } = await supabase
      .from('tasks')
      .update({ situation: nextStatus })
      .eq('task_id', taskId);

    if (error) {
      alert('ステータスの更新に失敗しました: ' + error.message);
    } else {
      // ローカル状態を更新して再描画
      setTasks(tasks.map(t => t.task_id === taskId ? { ...t, situation: nextStatus } : t));
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-slate-500 flex justify-center items-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
        読み込み中...
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/projects" className="text-sm font-medium text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-4 transition-colors">
          &larr; プロジェクト一覧
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{project.project_name}</h1>
            <p className="text-slate-500 mt-2 max-w-2xl">{project.text || '説明はありません'}</p>
          </div>
          <Link
            href={`/projects/${project_id}/tasks/new`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            タスクを追加
          </Link>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            タスク一覧
            <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{tasks.length}</span>
          </h2>
        </div>
        
        {tasks.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            </div>
            <p className="text-slate-500 font-medium">タスクがまだありません</p>
            <Link href={`/projects/${project_id}/tasks/new`} className="text-indigo-600 text-sm hover:underline mt-2 inline-block font-semibold">
              最初のタスクを作成しましょう
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-6 py-4">タスク名</th>
                  <th className="px-6 py-4">状態</th>
                  <th className="px-6 py-4">担当者</th>
                  <th className="px-6 py-4">優先度</th>
                  <th className="px-6 py-4">作成日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => {
                  const prio = priorityMap[task.priority ?? 0] || priorityMap[0];
                  return (
                    <tr key={task.task_id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-800">{task.task_name}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => updateTaskStatus(task.task_id, task.situation)}
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border transition-all hover:scale-105 active:scale-95 ${
                            task.situation === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            task.situation === 'working' ? 'bg-sky-50 text-sky-600 border-sky-100' : 
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          {task.situation || 'waiting'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                            {task.users?.user_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="text-sm text-slate-600 font-medium">{task.users?.user_name || '未割り当て'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${prio.color}`}>
                          {prio.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {task.created_at ? new Date(task.created_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
