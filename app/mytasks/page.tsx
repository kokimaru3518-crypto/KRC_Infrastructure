'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '../../supabase/client';
import { getSession } from '../../lib/session';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

const priorityMap: { [key: number]: { label: string, color: string, icon: string } } = {
  2: { label: '高', color: 'text-red-700 bg-red-50', icon: '↑' },
  1: { label: '中', color: 'text-amber-700 bg-amber-50', icon: '=' },
  0: { label: '低', color: 'text-blue-700 bg-blue-50', icon: '↓' },
};

const situationMap: { [key: string]: { label: string, color: string } } = {
  'waiting': { label: '未着手', color: 'bg-slate-100 text-slate-500' },
  'working': { label: '進行中', color: 'bg-indigo-50 text-indigo-700' },
  'done': { label: '完了', color: 'bg-emerald-50 text-emerald-700' },
};

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const session = await getSession();
    if (!session) {
      router.push('/');
      return;
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*, projects(project_name)')
      .eq('user_id', session.user_id)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (data) {
      setTasks(data);
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
  };

  if (loading) return <div className="p-20 text-center font-medium text-slate-400 animate-pulse">読み込み中...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">マイタスク</h1>
        <p className="text-sm text-slate-500">すべてのプロジェクトにわたるあなたの課題を管理します</p>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-slate-50 rounded border border-dashed border-slate-300 p-20 text-center">
          <p className="text-slate-500 font-medium">現在、あなたに割り当てられた課題はありません。</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">種類</th>
                <th className="px-6 py-3">プロジェクト</th>
                <th className="px-6 py-3 w-1/2">要約</th>
                <th className="px-6 py-3">優先度</th>
                <th className="px-6 py-3">ステータス</th>
                <th className="px-6 py-3 text-right">期限</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <tr 
                  key={task.task_id} 
                  onClick={() => router.push(`/projects/${task.project_id}?task_id=${task.task_id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold p-1 rounded">課題</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-600">{task.projects?.project_name}</span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    <span className="hover:underline hover:text-indigo-600">{task.task_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded ${priorityMap[task.priority ?? 0]?.color}`}>
                        {priorityMap[task.priority ?? 0]?.icon}
                      </span>
                      <span className="text-xs text-slate-600">{priorityMap[task.priority ?? 0]?.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${situationMap[task.situation || 'waiting']?.color}`}>
                      {situationMap[task.situation || 'waiting']?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 whitespace-nowrap">
                    {formatDate(task.due_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
