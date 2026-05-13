'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../supabase/client';
import Link from 'next/link';

type Project = {
  project_id: string;
  project_name: string;
  text: string;
  created_at: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const fetchProjects = useCallback(async () => {
    const { data, error: sbError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (sbError) {
      setError(sbError.message);
    } else {
      setProjects(data || []);
    }
  }, [supabase]);

  useEffect(() => {
    const uid = localStorage.getItem('krc_user_id');
    if (!uid) {
      router.push('/');
      return;
    }
    setUserId(uid);
    fetchProjects();
  }, [router, fetchProjects]);

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('このプロジェクトを削除しますか？')) return;

    // Supabase側のCASCADE設定がどうなっているかによりますが、
    // まずはprojectsから削除を試みる
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
    if (!userId) return;

    // リクエストのモック。要件「メンバー側がリクエストを送る」に対応するため、
    // roleを'pending'などとしてproject_membersに登録するか、別途テーブルを作る。
    // 今回はproject_membersに 'pending' で登録してみる。
    const { error: sbError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: userId,
        role: 'pending',
      });

    if (sbError) {
      if (sbError.code === '23505') {
         alert('既に参加済みか、リクエスト済みです。');
      } else {
         setError('リクエストに失敗しました: ' + sbError.message);
      }
    } else {
      alert('参加リクエストを送信しました！');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('krc_user_id');
    router.push('/');
  };

  if (!userId) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Projects
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Manage your workspaces and teams</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
              {userId}
            </span>
            <button 
              onClick={handleLogout}
              className="text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-full transition-colors"
            >
              Logout
            </button>
            <Link 
              href="/projects/new"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-xl transform hover:-translate-y-0.5"
            >
              + New Project
            </Link>
          </div>
        </header>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded shadow-sm" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <Link href={`/projects/${project.project_id}`} key={project.project_id}>
              <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 group cursor-pointer relative overflow-hidden h-full flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                
                <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">
                  {project.project_name}
                </h2>
                
                <p className="text-slate-600 line-clamp-3 mb-6 flex-grow leading-relaxed">
                  {project.text || 'No description provided.'}
                </p>
                
                <div className="flex justify-between items-end mt-auto pt-4 border-t border-slate-100">
                  <div className="text-xs text-slate-400 font-medium">
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-2 relative z-10">
                    <button 
                      onClick={(e) => handleJoinRequest(project.project_id, e)}
                      className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                      title="参加リクエスト"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                    </button>
                    <button 
                      onClick={(e) => handleDelete(project.project_id, e)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="削除"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {projects.length === 0 && !error && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <h3 className="text-xl font-bold text-slate-700 mb-2">No projects found</h3>
            <p className="text-slate-500 mb-6">Create your first project to get started.</p>
            <Link 
              href="/projects/new"
              className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold py-3 px-6 rounded-xl transition-colors"
            >
              + Create Project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
