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
    role: string | null;
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
      // Leader を見つけてデータを整形
      setProjects((data || []) as unknown as Project[]);
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

    // session.user_id は UUID なのでそのまま挿入できる
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

  if (!session) return null;

  return (
    <div className="p-8 max-w-[1200px] mx-auto mt-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">プロジェクト</h1>
        <Link
          href="/projects/new"
          className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          プロジェクトを作成
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm text-sm shrink-0" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Projects Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-lg shadow-sm py-16 flex flex-col items-center justify-center text-slate-500">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <p className="text-lg font-semibold text-slate-700">プロジェクトが見つかりません</p>
            <p className="mt-1 text-sm text-slate-500">新しいプロジェクトを作成して始めましょう。</p>
            <Link
              href="/projects/new"
              className="mt-6 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 font-semibold py-2 px-5 rounded-md shadow-sm transition-all text-sm"
            >
              プロジェクトを作成
            </Link>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.project_id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 group flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 flex items-center justify-center font-bold text-xl shadow-inner border border-indigo-100/50">
                  {project.project_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleJoinRequest(project.project_id, e)}
                    className="text-slate-400 hover:bg-slate-100 hover:text-slate-800 p-1.5 rounded-lg transition-colors"
                    title="プロジェクトに参加申請"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                  </button>
                  <button
                    onClick={(e) => handleDelete(project.project_id, e)}
                    className="text-slate-400 hover:bg-red-50 hover:text-red-600 p-1.5 rounded-lg transition-colors"
                    title="削除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
              
              <Link href={`/projects/${project.project_id}`} className="block flex-1 focus:outline-none">
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors mb-2 line-clamp-1">
                  {project.project_name}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-6 min-h-[2.5rem]">
                  {project.text || <span className="italic opacity-70">説明がありません</span>}
                </p>
                
                {/* Author Display */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    作成者: <span className="text-slate-900">{project.project_members?.find(m => m.role === 'leader')?.users?.user_name || '不明'}</span>
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                  <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    {project.created_at ? new Date(project.created_at).toLocaleDateString() : '不明な日付'}
                  </div>
                  <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full group-hover:bg-indigo-100 transition-colors">
                    詳細を見る &rarr;
                  </div>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
