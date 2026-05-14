'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '../../../supabase/client';
import { getSession, type Session } from '../../../lib/session';
import Link from 'next/link';

// --- 型定義の修正 ---
type Project = {
  project_id: string;
  project_name: string;
  text: string | null;
  created_at: string | null;
  project_members: {
    role: string | null; // ここを string | null に変更
    users: {
      user_name: string;
    } | null;
  }[];
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchProjects = useCallback(async () => {
    // ユーザーが参加しているプロジェクト、または全プロジェクトを取得
    // 構成に合わせてクエリは調整してください
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
      console.error('プロジェクトの取得に失敗:', error.message);
    } else {
      // 型アサーション (as Project[]) を使ってエラーを確実に回避
      setProjects((data || []) as Project[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      void fetchProjects();
    });
  }, [fetchProjects]);

  if (loading) return <div className="p-8 text-slate-500">読み込み中...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">プロジェクト一覧</h1>
        <Link
          href="/projects/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          新規作成
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link
            key={project.project_id}
            href={`/projects/${project.project_id}`}
            className="block p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
          >
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 mb-2">
              {project.project_name}
            </h2>
            <p className="text-slate-500 text-sm line-clamp-2 mb-4">
              {project.text || '説明はありません'}
            </p>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
              <span className="text-xs text-slate-400">
                メンバー: {project.project_members.length}名
              </span>
              <div className="flex -space-x-2">
                {project.project_members.slice(0, 3).map((m, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600"
                    title={m.users?.user_name}
                  >
                    {m.users?.user_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400">プロジェクトが見つかりません</p>
        </div>
      )}
    </div>
  );
}