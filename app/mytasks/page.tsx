'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '../../supabase/client';
import { getSession } from '../../lib/session';
import Link from 'next/link';

type Task = {
  task_id: string;
  task_name: string;
  situation: string | null;
  priority: number | null;
  due_date: string | null;
  project_id: string;
  projects: {
    project_name: string;
  } | null;
};

const priorityMap: { [key: number]: { label: string, color: string } } = {
  2: { label: '高', color: 'text-red-700 bg-red-50' },
  1: { label: '中', color: 'text-amber-700 bg-amber-50' },
  0: { label: '低', color: 'text-blue-700 bg-blue-50' },
};

const situationMap: { [key: string]: { label: string, color: string } } = {
  'waiting': { label: '未着手', color: 'text-slate-500 bg-slate-50' },
  'working': { label: '進行中', color: 'text-indigo-600 bg-indigo-50' },
  'done': { label: '完了', color: 'text-green-600 bg-green-50' },
};

export default function MyTasksPage() {
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) return;
      setUserName(session.user_name);

      setUserName(session.user_name);

      const userId = session.user_id;
      // Ultra-strict UUID check + manual check for "admin-id"
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUser = userId && uuidRegex.test(userId) && userId !== 'admin-id';

      if (!isValidUser) {
        console.warn('Skipping fetch: user_id is not a valid UUID', userId);
        setTasks([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(project_name)')
        .eq('user_id', userId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setTasks(data as unknown as Task[]);
    } catch (err) {
      console.error('Fetch my tasks failed:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { if (mounted) void fetchData(); }, [mounted, fetchData]);

  if (!mounted || loading) return <div className="p-20 text-center font-medium text-slate-400 tracking-widest">読み込み中...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">マイタスク</h1>
        <p className="text-sm text-slate-500 font-medium">{userName}さんに割り当てられたタスクの一覧です。</p>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 p-20 text-center">
          <p className="text-slate-400 font-medium">現在、あなたに割り当てられたタスクはありません。</p>
          <Link href="/projects" className="mt-4 inline-block text-indigo-600 font-bold hover:underline">プロジェクト一覧へ</Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="col-span-5">タスク名 / プロジェクト</div>
            <div className="col-span-2">ステータス</div>
            <div className="col-span-2">優先度</div>
            <div className="col-span-3 text-right">期限</div>
          </div>
          <div className="space-y-1.5">
            {tasks.map((task) => (
              <Link
                key={task.task_id}
                href={`/projects/${task.project_id}?task=${task.task_id}`}
                className="grid grid-cols-12 items-center px-4 py-3 bg-white border border-slate-200 rounded hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="col-span-5">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors mb-0.5">{task.task_name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{task.projects?.project_name}</p>
                </div>
                <div className="col-span-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${situationMap[task.situation || 'waiting']?.color}`}>
                    {situationMap[task.situation || 'waiting']?.label}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${priorityMap[task.priority ?? 0]?.color}`}>
                    {priorityMap[task.priority ?? 0]?.label}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <p className={`text-xs font-bold ${task.due_date && new Date(task.due_date) < new Date() ? 'text-red-500' : 'text-slate-500'}`}>
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('ja-JP') : '-'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
//baka