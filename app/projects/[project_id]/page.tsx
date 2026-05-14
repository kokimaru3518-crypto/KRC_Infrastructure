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
    if (error) setError('Approve failed: ' + error.message);
    else fetchProjectData(session!);
  };

  const handleReject = async (memberId: string) => {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', project_id)
      .eq('user_id', memberId);
    if (error) setError('Reject failed: ' + error.message);
    else fetchProjectData(session!);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ situation: newStatus })
      .eq('task_id', taskId);
    if (error) setError('Status update failed: ' + error.message);
    else {
      setTasks(tasks.map(t => t.task_id === taskId ? { ...t, situation: newStatus } : t));
    }
  };

  if (!session || !project) return <div className="p-8 text-[#5E6C84]">Loading project...</div>;

  const todoTasks = tasks.filter(t => !t.situation || t.situation === 'waiting' || t.situation === 'TO DO');
  const inProgressTasks = tasks.filter(t => t.situation === 'in_progress' || t.situation === 'IN PROGRESS');
  const doneTasks = tasks.filter(t => t.situation === 'done' || t.situation === 'DONE');

  const renderTaskCard = (task: Task) => (
    <div key={task.task_id} className="bg-white p-3 rounded shadow-sm border border-[#DFE1E6] hover:bg-[#FAFBFC] cursor-pointer group flex flex-col gap-3">
      <div className="text-sm font-medium text-[#172B4D] leading-snug break-words">
        {task.task_name}
      </div>
      <div className="flex justify-between items-center mt-auto">
        <select
          value={task.situation || 'waiting'}
          onChange={(e) => handleStatusChange(task.task_id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-xs border border-[#DFE1E6] rounded bg-[#F4F5F7] text-[#5E6C84] py-0.5 px-1 font-semibold cursor-pointer hover:bg-[#EBECF0]"
        >
          <option value="waiting">TO DO</option>
          <option value="in_progress">IN PROGRESS</option>
          <option value="done">DONE</option>
        </select>

        <div className="flex gap-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${task.priority === 2 ? 'bg-[#DE350B]' : task.priority === 1 ? 'bg-[#FF991F]' : 'bg-[#0052CC]'}`} title={`Priority: ${task.priority}`}>
            P{task.priority || 0}
          </div>
          {task.user_id && (
            <div className="w-5 h-5 rounded-full bg-[#DFE1E6] flex items-center justify-center text-[10px] font-bold text-[#172B4D] shrink-0" title={`Assignee: ${task.user_id}`}>
              {task.user_id.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#FAFBFC]">
      {/* Project Header */}
      <div className="px-8 py-6 pb-2 shrink-0 border-b border-[#DFE1E6] bg-white">
        <nav className="text-sm text-[#5E6C84] mb-2 flex items-center gap-2 font-medium">
          <Link href="/projects" className="hover:underline">Projects</Link>
          <span>/</span>
          <span className="text-[#172B4D]">{project.project_name}</span>
        </nav>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-[#172B4D] mb-1">{project.project_name}</h1>
            <p className="text-[#5E6C84] text-sm max-w-2xl">{project.text}</p>
          </div>
          <div className="flex gap-3">
            {/* Team Members Avatar Group */}
            <div className="flex -space-x-2 mr-4">
              {members.filter(m => m.role !== 'pending').map(m => (
                <div key={m.user_id} className="w-8 h-8 rounded-full bg-[#DFE1E6] border-2 border-white flex items-center justify-center text-xs font-bold text-[#172B4D] shadow-sm relative group" title={`${m.user_id} (${m.role})`}>
                  {m.user_id.charAt(0).toUpperCase()}
                  {m.role === 'leader' && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white"></div>}
                </div>
              ))}
            </div>
            {isLeader && (
              <Link
                href={`/projects/${project_id}/tasks/new`}
                className="bg-[#0052CC] hover:bg-[#0047b3] text-white font-medium py-1.5 px-4 rounded shadow-sm text-sm transition-colors flex items-center h-8"
              >
                Create Issue
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
          <div className="font-semibold text-orange-900">Pending join requests ({members.filter(m => m.role === 'pending').length})</div>
          <div className="flex gap-4">
            {members.filter(m => m.role === 'pending').map(m => (
              <div key={m.user_id} className="flex items-center gap-3">
                <span className="font-medium text-orange-900">{m.user_id}</span>
                <button onClick={() => handleApprove(m.user_id)} className="bg-white border border-green-500 text-green-600 hover:bg-green-50 px-2 py-1 rounded text-xs font-bold">Approve</button>
                <button onClick={() => handleReject(m.user_id)} className="bg-white border border-red-500 text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-bold">Reject</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-8 pt-6">
        <div className="flex gap-6 h-full items-start min-w-[900px]">

          {/* TO DO Column */}
          <div className="flex flex-col w-80 bg-[#F4F5F7] rounded-md shrink-0">
            <div className="p-3 pb-2 flex justify-between items-center text-xs font-bold text-[#5E6C84] uppercase">
              <div>TO DO <span className="ml-1 bg-[#DFE1E6] rounded-full px-1.5 py-0.5 text-[10px]">{todoTasks.length}</span></div>
            </div>
            <div className="p-2 pt-0 flex flex-col gap-2 min-h-[150px]">
              {todoTasks.map(renderTaskCard)}
            </div>
          </div>

          {/* IN PROGRESS Column */}
          <div className="flex flex-col w-80 bg-[#F4F5F7] rounded-md shrink-0">
            <div className="p-3 pb-2 flex justify-between items-center text-xs font-bold text-[#5E6C84] uppercase">
              <div>IN PROGRESS <span className="ml-1 bg-[#DFE1E6] rounded-full px-1.5 py-0.5 text-[10px]">{inProgressTasks.length}</span></div>
            </div>
            <div className="p-2 pt-0 flex flex-col gap-2 min-h-[150px]">
              {inProgressTasks.map(renderTaskCard)}
            </div>
          </div>

          {/* DONE Column */}
          <div className="flex flex-col w-80 bg-[#F4F5F7] rounded-md shrink-0">
            <div className="p-3 pb-2 flex justify-between items-center text-xs font-bold text-[#5E6C84] uppercase">
              <div>DONE <span className="ml-1 bg-[#DFE1E6] rounded-full px-1.5 py-0.5 text-[10px]">{doneTasks.length}</span></div>
            </div>
            <div className="p-2 pt-0 flex flex-col gap-2 min-h-[150px]">
              {doneTasks.map(renderTaskCard)}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
