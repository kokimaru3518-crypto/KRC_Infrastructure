'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../supabase/client';
import Link from 'next/link';

type Task = {
  task_id: string;
  task_name: string;
  user_id: string | null;
  priority: number | null;
  situation: string | null;
  created_at: string;
};

type Member = {
  user_id: string;
  role: string | null;
};

export default function ProjectDetailsPage({ params }: { params: Promise<{ project_id: string }> }) {
  const { project_id } = use(params);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  // プロジェクトの型を簡易的に定義
  const [project, setProject] = useState<{project_id: string, project_name: string, text: string | null, created_at: string | null} | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const fetchProjectData = useCallback(async (currentUserId: string) => {
    // プロジェクト情報の取得
    const { data: pData, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('project_id', project_id)
      .single();
    if (pError) setError(pError.message);
    else setProject(pData);

    // メンバー情報の取得
    const { data: mData, error: mError } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', project_id);
    if (mError) setError(mError.message);
    else {
      setMembers(mData || []);
      const currentUserRole = mData?.find(m => m.user_id === currentUserId)?.role;
      setIsLeader(currentUserRole === 'leader');
    }

    // タスク情報の取得
    const { data: tData, error: tError } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });
    if (tError) setError(tError.message);
    else setTasks(tData || []);
  }, [project_id, supabase]);

  useEffect(() => {
    const uid = localStorage.getItem('krc_user_id');
    if (!uid) {
      router.push('/');
      return;
    }
    setUserId(uid);
    fetchProjectData(uid);
  }, [router, fetchProjectData]);

  const handleApprove = async (memberId: string) => {
    const { error } = await supabase
      .from('project_members')
      .update({ role: 'member' })
      .eq('project_id', project_id)
      .eq('user_id', memberId);
    if (error) setError('承認に失敗しました: ' + error.message);
    else fetchProjectData(userId!);
  };

  const handleReject = async (memberId: string) => {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', project_id)
      .eq('user_id', memberId);
    if (error) setError('否認に失敗しました: ' + error.message);
    else fetchProjectData(userId!);
  };

  if (!userId || !project) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
          <div>
            <Link href="/projects" className="text-sm font-bold text-indigo-500 hover:text-indigo-700 mb-2 inline-block">&larr; Back to Projects</Link>
            <h1 className="text-4xl font-extrabold text-slate-900">{project.project_name}</h1>
            <p className="text-slate-500 mt-2">{project.text}</p>
          </div>
          <Link 
            href={`/projects/${project_id}/tasks/new`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-transform transform hover:-translate-y-0.5"
          >
            + Create Task
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Tasks Area */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center">
              Tasks <span className="ml-3 bg-indigo-100 text-indigo-800 py-1 px-3 rounded-full text-sm">{tasks.length}</span>
            </h2>
            
            {tasks.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
                <p className="text-slate-500 font-medium text-lg">No tasks yet.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {tasks.map(task => (
                  <div key={task.task_id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {task.task_name}
                      </h3>
                      <div className="flex gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></span>
                          {task.situation || 'waiting'}
                        </span>
                        <span>Assignee: <span className="font-semibold text-slate-700">{task.user_id || 'Unassigned'}</span></span>
                        <span>Priority: <span className="font-semibold text-indigo-600">{task.priority || 0}</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">Team Members</h2>
              <div className="space-y-4">
                {members.filter(m => m.role !== 'pending').map(m => (
                  <div key={m.user_id} className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 truncate w-2/3" title={m.user_id}>{m.user_id}</span>
                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                      m.role === 'leader' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Requests - Only visible to Leader */}
            {isLeader && members.some(m => m.role === 'pending') && (
              <div className="bg-orange-50 rounded-3xl p-6 border border-orange-200">
                <h2 className="text-xl font-bold text-orange-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                  Pending Requests
                </h2>
                <div className="space-y-4">
                  {members.filter(m => m.role === 'pending').map(m => (
                    <div key={m.user_id} className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                      <p className="font-medium text-slate-800 truncate mb-3" title={m.user_id}>{m.user_id}</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApprove(m.user_id)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(m.user_id)}
                          className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
