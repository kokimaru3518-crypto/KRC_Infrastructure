'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '../../supabase/client';
import { getSession, type Session } from '../../lib/session';
import Link from 'next/link';

type Project = {
  project_id: string;
  project_name: string;
  text: string | null;
  created_at: string | null;
  project_members?: {
    role: string;
    users: {
      user_name: string;
    };
  }[];
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const supabase = useMemo(() => createClient(), []);

  const fetchProjects = useCallback(async () => {
    const { data, error: sbError } = await supabase
      .from('projects')
      .select(`
        *,
        project_members(
          role,
          users(user_name)
        )
      `)
      .order('created_at', { ascending: false });

    if (sbError) {
      setError(sbError.message);
    } else {
      setProjects(data || []);
    }
  }, [supabase]);

  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      getSession().then((s) => {
        if (s) {
          setSession(s);
          void fetchProjects();
        }
      });
    }
  }, [fetchProjects]);

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('このプロジェクトを削除してもよろしいですか？')) return;

    const { error: sbError } = await supabase
      .from('projects')
      .delete()
      .eq('project_id', projectId);

    if (sbError) {
      setError('削除に失敗しました: ' + sbError.message);
    } else {
      fetchProjects();
    }
  };

  const handleJoinRequest = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) return;

    const { error: sbError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: session.user_id,
        role: 'pending',
      });

    if (sbError) {
      if (sbError.code === '23505') {
        alert('すでにこのプロジェクトに参加しているか、参加申請済みです。');
      } else {
        setError('申請に失敗しました: ' + sbError.message);
      }
    } else {
      alert('参加申請を送信しました！');
    }
  };

  if (!session) return <div className="p-20 text-center font-medium text-slate-400">読み込み中...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">プロジェクト</h1>
          <p className="text-sm text-slate-500">参加中のすべてのプロジェクトを管理します</p>
        </div>
        <Link
          href="/projects/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition-colors text-sm shadow-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          プロジェクトを作成
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded shadow-sm text-xs" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full bg-slate-50 border border-dashed border-slate-300 rounded-lg py-20 flex flex-col items-center justify-center text-slate-500">
            <p className="text-lg font-medium text-slate-700">プロジェクトが見つかりません</p>
            <p className="mt-2 text-sm text-slate-500">新しいプロジェクトを作成して始めましょう。</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.project_id} className="bg-white border border-slate-200 rounded shadow-sm hover:shadow-md transition-all group flex flex-col h-full overflow-hidden">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100">
                    {project.project_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleJoinRequest(project.project_id, e)}
                      className="text-slate-400 hover:bg-slate-100 hover:text-slate-800 p-1.5 rounded transition-colors"
                      title="参加申請"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(project.project_id, e)}
                      className="text-slate-400 hover:bg-red-50 hover:text-red-600 p-1.5 rounded transition-colors"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
                
                <Link href={`/projects/${project.project_id}`} className="block">
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
                    {project.project_name}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">
                    {project.text || <span className="italic opacity-50">説明がありません</span>}
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">作成者:</span>
                    <span className="text-xs text-slate-700 font-medium">{project.project_members?.find(m => m.role === 'leader')?.users?.user_name || '不明'}</span>
                  </div>
                </Link>
              </div>
              
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">{project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}</span>
                <Link href={`/projects/${project.project_id}`} className="text-[11px] font-bold text-indigo-600 hover:underline">
                  詳細を表示
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
