'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '../../../supabase/client';
import { getSession, type Session } from '../../../lib/session';
import Link from 'next/link';

// --- エラーを解消するための型定義 ---
type ProjectMember = {
  role: string; // ★ここが最重要！null を許容するように修正
  users: {
    user_name: string;
  } | null;
};

type Project = {
  project_id: string;
  project_name: string;
  text: string | null;
  created_at: string | null;
  project_members: ProjectMember[]; // 上で定義した型を使用
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchProjects = useCallback(async () => {
    // データの取得
    const { data, error } = await supabase
      .from('projects')
      .select(`
        project_id,
        project_name,
        text,
        created_at,
        project_members (
          role,
          users (
            user_name
          )
        )
      `);

    if (error) {
      console.error('Fetch error:', error.message);
    } else {
      // ★ data を Project[] 型として強制的に認識させる (as unknown as Project[])
      setProjects((data || []) as unknown as Project[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      void fetchProjects();
    });
  }, [fetchProjects]);

  if (loading) {
    return (
      <div className="p-8 text-slate-500 flex justify-center items-center h-full min-h-[50vh]">
        プロジェクトを読み込み中...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">プロジェクト一覧</h1>
          <p className="text-slate-500 mt-1">進行中のプロジェクトを管理します</p>
        </div>
        <Link
          href="/projects/new"
          className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md transition-all transform hover:-translate-y-0.5"
        >
          新規作成
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <p className="text-slate-500 font-medium">プロジェクトがまだありません</p>
          <Link href="/projects/new" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">
            最初のプロジェクトを作成しましょう
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.project_id}
              href={`/projects/${project.project_id}`}
              className="block p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 mb-2 transition-colors">
                {project.project_name}
              </h2>
              <p className="text-slate-500 text-sm line-clamp-2 mb-6 min-h-[40px]">
                {project.text || '説明はありません'}
              </p>

              <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">メンバー</span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {project.project_members?.length || 0}
                  </span>
                </div>
                
                <div className="flex -space-x-2">
                  {project.project_members?.slice(0, 3).map((m, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm"
                      title={m.users?.user_name || '不明なユーザー'}
                    >
                      {m.users?.user_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
