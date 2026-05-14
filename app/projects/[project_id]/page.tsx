'use client';

import { useEffect, useState, use, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../supabase/client';
import { getSession, type Session } from '../../../lib/session';
import Link from 'next/link';

type Task = {
  task_id: string;
  task_name: string;
  user_id: string | null;
  priority: number | null;
  situation: string | null;
  created_at: string | null;
};

type Member = {
  user_id: string;
  role: string | null;
};

export default function ProjectDetailsPage({ params }: { params: Promise<{ project_id: string }> }) {
  const { project_id } = use(params);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [project, setProject] = useState<{ project_id: string, project_name: string, text: string | null, created_at: string | null } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchProjectData = useCallback(async (currentSession: Session) => {
    const isAdmin = currentSession.user_name === 'admin';
    const currentUUID = currentSession.user_id;

    // まずメンバーかどうかを確認する
    const { data: mData, error: mError } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', project_id);
    if (mError) {
      setError(mError.message);
      return;
    }

    if (isAdmin) {
      // admin は全プロジェクトにフルアクセス（リーダー権限）
      setMembers(mData || []);
      setIsLeader(true);
    } else {
      // UUID でメンバーシップを確認
      const currentUserRole = mData?.find(m => m.user_id === currentUUID)?.role;
      const isMember = !!currentUserRole && currentUserRole !== 'pending';

      // 参加していない（または申請中）ユーザーはプロジェクト一覧へ戻す
      if (!isMember) {
        router.push('/projects');
        return;
      }

      setMembers(mData || []);
      setIsLeader(currentUserRole === 'leader');
    }

    // メンバーであることが確認できた場合のみプロジェクト情報とタスクを取得
    const { data: pData, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('project_id', project_id)
      .single();
    if (pError) setError(pError.message);
    else setProject(pData);

    const { data: tData, error: tError } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });
    if (tError) setError(tError.message);
    else setTasks(tData || []);
  }, [project_id, supabase, router]);

  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      getSession().then((s) => {
        if (!s) {
          router.push('/');
        } else {
          setSession(s);
          void fetchProjectData(s);
        }
      });
    }
  }, [router, fetchProjectData]);

  const handleApprove = async (memberId: string) => {
    const { error } = await supabase
      .from('project_members')
      .update({ role: 'member' })
      .eq('project_id', project_id)
      .eq('user_id', memberId);
    if (error) setError('承認に失敗しました: ' + error.message);
    else fetchProjectData(session!);
  };

  const handleReject = async (memberId: string) => {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', project_id)
      .eq('user_id', memberId);
    if (error) setError('拒否に失敗しました: ' + error.message);
    else fetchProjectData(session!);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ situation: newStatus })
      .eq('task_id', taskId);
    if (error) setError('ステータスの更新に失敗しました: ' + error.message);
    else {
      setTasks(tasks.map(t => t.task_id === taskId ? { ...t, situation: newStatus } : t));
    }
  };

  if (!session || !project) return <div className="p-8 text-slate-500 flex justify-center items-center h-full min-h-[50vh]">プロジェクトを読み込み中...</div>;

  const todoTasks = tasks.filter(t => !t.situation || t.situation === 'waiting' || t.situation === 'TO DO');
  const inProgressTasks = tasks.filter(t => t.situation === 'in_progress' || t.situation === 'IN PROGRESS');
  const doneTasks = tasks.filter(t => t.situation === 'done' || t.situation === 'DONE');

  const renderTaskCard = (task: Task) => (
    <div key={task.task_id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col gap-3">
      <div className="text-sm font-semibold text-slate-800 leading-snug break-words group-hover:text-indigo-600 transition-colors">
        {task.task_name}
      </div>
      <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-50">
        <select
          value={task.situation || 'waiting'}
          onChange={(e) => handleStatusChange(task.task_id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-600 py-1 px-2 font-medium cursor-pointer hover:bg-slate-100 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all"
        >
          <option value="waiting">TO DO</option>
          <option value="in_progress">IN PROGRESS</option>
          <option value="done">DONE</option>
        </select>

        <div className="flex gap-2 items-center">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-extrabold text-white shrink-0 shadow-sm ${task.priority === 2 ? 'bg-gradient-to-br from-red-500 to-rose-600' : task.priority === 1 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-blue-600'}`} title={`優先度: ${task.priority}`}>
            P{task.priority || 0}
          </div>
          {task.user_id && (
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0 border border-slate-200 shadow-sm" title={`担当者: ${task.user_id}`}>
              {task.user_id.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Project Header */}
      <div className="px-8 py-8 pb-6 shrink-0 border-b border-slate-200 bg-white">
        <nav className="text-sm text-slate-500 mb-4 flex items-center gap-2 font-medium">
          <Link href="/projects" className="hover:text-slate-800 transition-colors">プロジェクト</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold">{project.project_name}</span>
        </nav>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">{project.project_name}</h1>
            <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">{project.text}</p>
          </div>
          <div className="flex gap-4 items-center">
            {/* Team Members Avatar Group */}
            <div className="flex -space-x-3 mr-2">
              {members.filter(m => m.role !== 'pending').map(m => (
                <div key={m.user_id} className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-700 shadow-sm relative group hover:z-10 transition-transform hover:scale-110 cursor-default" title={`${m.user_id} (${m.role})`}>
                  {m.user_id.charAt(0).toUpperCase()}
                  {m.role === 'leader' && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-yellow-400 rounded-full border-2 border-white shadow-sm"></div>}
                </div>
              ))}
            </div>
            {isLeader && (
              <Link
                href={`/projects/${project_id}/tasks/new`}
                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                タスクを作成
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="m-8 mb-0 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded text-sm shrink-0">
          <p>{error}</p>
        </div>
      )}

      {isLeader && members.some(m => m.role === 'pending') && (
        <div className="m-8 mb-0 bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded text-sm shrink-0 flex items-center justify-between">
          <div className="font-semibold text-orange-900">保留中の参加申請 ({members.filter(m => m.role === 'pending').length})</div>
          <div className="flex gap-4">
            {members.filter(m => m.role === 'pending').map(m => (
              <div key={m.user_id} className="flex items-center gap-3">
                <span className="font-medium text-orange-900">{m.user_id}</span>
                <button onClick={() => handleApprove(m.user_id)} className="bg-white border border-green-500 text-green-600 hover:bg-green-50 px-2 py-1 rounded text-xs font-bold">承認</button>
                <button onClick={() => handleReject(m.user_id)} className="bg-white border border-red-500 text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-bold">拒否</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-8 pt-8">
        <div className="flex gap-6 h-full items-start min-w-[950px]">

          {/* TO DO Column */}
          <div className="flex flex-col w-[300px] bg-slate-100/80 rounded-xl shrink-0 border border-slate-200/60 shadow-sm">
            <div className="p-4 pb-3 flex justify-between items-center border-b border-slate-200/60">
              <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                TO DO <span className="bg-slate-200 text-slate-700 rounded-md px-2 py-0.5 text-[10px] shadow-inner">{todoTasks.length}</span>
              </div>
            </div>
            <div className="p-3 flex flex-col gap-3 min-h-[150px]">
              {todoTasks.map(renderTaskCard)}
            </div>
          </div>

          {/* IN PROGRESS Column */}
          <div className="flex flex-col w-[300px] bg-slate-100/80 rounded-xl shrink-0 border border-slate-200/60 shadow-sm">
            <div className="p-4 pb-3 flex justify-between items-center border-b border-slate-200/60">
              <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                IN PROGRESS <span className="bg-blue-100 text-blue-700 rounded-md px-2 py-0.5 text-[10px] shadow-inner">{inProgressTasks.length}</span>
              </div>
            </div>
            <div className="p-3 flex flex-col gap-3 min-h-[150px]">
              {inProgressTasks.map(renderTaskCard)}
            </div>
          </div>

          {/* DONE Column */}
          <div className="flex flex-col w-[300px] bg-slate-100/80 rounded-xl shrink-0 border border-slate-200/60 shadow-sm">
            <div className="p-4 pb-3 flex justify-between items-center border-b border-slate-200/60">
              <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                DONE <span className="bg-green-100 text-green-700 rounded-md px-2 py-0.5 text-[10px] shadow-inner">{doneTasks.length}</span>
              </div>
            </div>
            <div className="p-3 flex flex-col gap-3 min-h-[150px]">
              {doneTasks.map(renderTaskCard)}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
