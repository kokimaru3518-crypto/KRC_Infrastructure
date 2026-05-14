'use client';

import { useState, useEffect, use, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../../../supabase/client';
import { getSession } from '../../../../../lib/session';
import Link from 'next/link';

export default function NewTaskPage({ params }: { params: Promise<{ project_id: string }> }) {
  const { project_id } = use(params);
  const searchParams = useSearchParams();
  const preSelectedParentId = searchParams.get('parent_id');

  const [taskName, setTaskName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<number>(1);
  const [parentTaskId, setParentTaskId] = useState<string>(preSelectedParentId || '');
  const [members, setMembers] = useState<{ user_id: string , users: { user_name: string } | null}[]>([]);
  const [parentTasks, setParentTasks] = useState<{ task_id: string, task_name: string }[]>([]);
  const [error, setError] = useState('');
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    const session = await getSession();
    if (!session) { router.push('/'); return; }

    const isAdmin = session.user_name === 'admin';
    const currentUUID = session.user_id;

    // メンバーと親タスク候補を同時に取得
    const [membersRes, parentsRes] = await Promise.all([
      supabase.from('project_members').select('user_id, role, users(user_name)').eq('project_id', project_id).neq('role', 'pending'),
      supabase.from('tasks').select('task_id, task_name').eq('project_id', project_id).is('parent_task_id', null)
    ]);

    if (membersRes.data) {
      const isLeader = isAdmin || membersRes.data.some(m => m.user_id === currentUUID && m.role === 'leader');
      if (!isLeader) { router.push(`/projects/${project_id}`); return; }
      setMembers(membersRes.data);
    }

    if (parentsRes.data) {
      setParentTasks(parentsRes.data);
    }

    setIsCheckingUser(false);
  }, [project_id, supabase, router]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTaskId = crypto.randomUUID();

    const { error: sbError } = await supabase.from('tasks').insert({
      task_id: newTaskId,
      task_name: taskName,
      user_id: assignee || null,
      project_id: project_id,
      priority: priority,
      parent_task_id: parentTaskId || null,
      situation: 'waiting',
    });

    if (sbError) {
      setError('タスクの作成に失敗しました: ' + sbError.message);
    } else {
      router.push(`/projects/${project_id}`);
    }
  };

  if (isCheckingUser) return <div className="p-20 text-center font-black text-slate-300 animate-pulse">Initializing...</div>;

  const selectedParentTask = parentTasks.find(t => t.task_id === parentTaskId);

  return (
    <div className="p-8 max-w-2xl mx-auto mt-10">
      <Link href={`/projects/${project_id}`} className="text-sm font-bold text-slate-400 hover:text-slate-900 mb-8 flex items-center gap-2 w-fit transition-all">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        プロジェクトに戻る
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${parentTaskId ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {parentTaskId ? 'Subtask' : 'Main Task'}
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">
            {parentTaskId ? '子タスクを作成' : '新しいタスクを作成'}
          </h1>
          {selectedParentTask && (
            <p className="text-sm font-bold text-slate-500 mt-2">
              親タスク: <span className="text-indigo-600 font-black">"{selectedParentTask.task_name}"</span>
            </p>
          )}
        </div>

        <div className="p-8">
          {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-xl font-bold text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Task Name */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Task Description</label>
              <input 
                type="text" value={taskName} onChange={e => setTaskName(e.target.value)} required 
                placeholder="タスクの内容を入力..."
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Assignee */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Assignee</label>
                <select value={assignee} onChange={e => setAssignee(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-200 transition-all">
                  <option value="">未割り当て</option>
                  {members.map(m => <option key={m.user_id} value={m.user_id}>{m.users?.user_name || m.user_id}</option>)}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Priority</label>
                <select value={priority} onChange={e => setPriority(parseInt(e.target.value))} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-200 transition-all">
                  <option value={2}>High (高)</option>
                  <option value={1}>Middle (中)</option>
                  <option value={0}>Low (低)</option>
                </select>
              </div>
            </div>

            {/* Parent Task Selection */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Parent Task (Optional)</label>
              <select value={parentTaskId} onChange={e => setParentTaskId(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-200 transition-all">
                <option value="">-- 親タスクなし (メインタスク) --</option>
                {parentTasks.map(t => <option key={t.task_id} value={t.task_id}>{t.task_name}</option>)}
              </select>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
              <button type="button" onClick={() => router.back()} className="px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-all uppercase text-sm">Cancel</button>
              <button type="submit" className="px-10 py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-all shadow-xl active:scale-95 uppercase text-sm">Create Task</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
