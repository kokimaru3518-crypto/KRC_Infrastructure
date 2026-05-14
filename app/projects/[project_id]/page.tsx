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
};

type Project = {
  project_id: string;
  project_name: string;
  text: string | null;
  created_at: string | null;
};

export default function ProjectDetailPage({ params }: { params: Promise<{ project_id: string }> }) {
  const { project_id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // プロジェクト情報の取得
    const { data: pData, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('project_id', project_id)
      .single();

    if (pError) {
      setError('プロジェクトの読み込みに失敗しました');
    } else {
      setProject(pData);
    }

    // タスク一覧の取得
    const { data: tData, error: tError } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });

    if (!tError) {
      setTasks(tData || []);
    }

    setLoading(false);
  }, [project_id, supabase]);

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      void fetchData();
    });
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-8 text-slate-500 flex justify-center items-center h-full min-h-[50vh]">
        読み込み中...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">プロジェクトが見つかりませんでした。</p>
        <Link href="/projects" className="text-indigo-600 hover:underline mt-4 inline-block">
          プロジェクト一覧へ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/projects" className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-4 transition-colors">
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

      {/* Task Board (Simple List for now) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-700">タスク一覧 ({tasks.length})</h2>
        </div>
        
        {tasks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400">タスクがまだありません。</p>
            <p className="text-sm text-slate-400 mt-1">「タスクを追加」ボタンから最初のタスクを作成しましょう。</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <div key={task.task_id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${
                    task.situation === 'done' ? 'bg-green-400' : 
                    task.situation === 'working' ? 'bg-blue-400' : 'bg-slate-300'
                  }`} />
                  <div>
                    <h3 className="font-semibold text-slate-800">{task.task_name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        {task.situation || 'waiting'}
                      </span>
                      <span className="text-xs text-slate-400">
                        優先度: {task.priority ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="text-slate-300 group-hover:text-slate-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
