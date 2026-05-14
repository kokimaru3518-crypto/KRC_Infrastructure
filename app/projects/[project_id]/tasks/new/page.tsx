'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../../../supabase/client';
import { getSession } from '../../../../../lib/session';
import Link from 'next/link';

export default function NewTaskPage({ params }: { params: Promise<{ project_id: string }> }) {
  const { project_id } = use(params);
  const searchParams = useSearchParams();
  const preSelectedParentId = searchParams.get('parent_id');

  const [taskName, setTaskName] = useState('');
  const [taskText, setTaskText] = useState(''); // 追加: タスク詳細テキスト
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<number>(1);
  const [parentTaskId, setParentTaskId] = useState<string>(preSelectedParentId || '');
  const [dueDate, setDueDate] = useState<string>('');
  const [members, setMembers] = useState<{ user_id: string , users: { user_name: string } | null}[]>([]);
  const [parentTasks, setParentTasks] = useState<{ task_id: string, task_name: string }[]>([]);
  const [error, setError] = useState('');
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    const session = await getSession();
    if (!session) { router.push('/'); return; }

    const [membersRes, parentsRes] = await Promise.all([
      supabase.from('project_members').select('user_id, role, users(user_name)').eq('project_id', project_id).neq('role', 'pending'),
      supabase.from('tasks').select('task_id, task_name').eq('project_id', project_id).is('parent_task_id', null)
    ]);

    if (membersRes.data) setMembers(membersRes.data);
    if (parentsRes.data) setParentTasks(parentsRes.data);

    setIsCheckingUser(false);
  }, [project_id, supabase, router]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTaskId = crypto.randomUUID();

    const { error: sbError } = await supabase.from('tasks').insert({
      task_id: newTaskId,
      task_name: taskName,
      text: taskText || null, // 保存
      user_id: assignee || null,
      project_id: project_id,
      priority: priority,
      parent_task_id: parentTaskId || null,
      situation: 'waiting',
      due_date: dueDate || null
    });

    if (sbError) {
      setError('タスクの作成に失敗しました: ' + sbError.message);
    } else {
      router.push(`/projects/${project_id}`);
    }
  };

  if (isCheckingUser) return <div className="p-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-widest">Initializing...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto mt-10">
      <Link href={`/projects/${project_id}`} className="text-sm font-bold text-slate-400 hover:text-slate-900 mb-8 flex items-center gap-2 transition-all">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Back to Board
      </Link>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-10 bg-slate-50 border-b border-slate-100">
          <h1 className="text-3xl font-black text-slate-900 leading-tight">
            {parentTaskId ? '子タスクを作成' : '新しいタスクを作成'}
          </h1>
        </div>

        <div className="p-10">
          {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded-2xl font-bold text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Task Name</label>
              <input 
                type="text" value={taskName} onChange={e => setTaskName(e.target.value)} required 
                placeholder="何をするタスクですか？"
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            {/* Added: Description Textarea */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Description</label>
              <textarea 
                value={taskText} onChange={e => setTaskText(e.target.value)}
                placeholder="タスクの詳細やメモを記入してください（任意）"
                rows={4}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Assignee</label>
                <select value={assignee} onChange={e => setAssignee(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all appearance-none">
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.user_id} value={m.user_id}>{m.users?.user_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Priority</label>
                <select value={priority} onChange={e => setPriority(parseInt(e.target.value))} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all appearance-none">
                  <option value={2}>High</option><option value={1}>Middle</option><option value={0}>Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Parent Task</label>
                <select value={parentTaskId} onChange={e => setParentTaskId(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none text-slate-900 font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all appearance-none">
                  <option value="">None (Master)</option>
                  {parentTasks.map(t => <option key={t.task_id} value={t.task_id}>{t.task_name}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-10 flex justify-end gap-6">
              <button type="button" onClick={() => router.back()} className="px-10 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-all uppercase text-xs tracking-widest">Cancel</button>
              <button type="submit" className="px-12 py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-all shadow-2xl active:scale-95 uppercase text-xs tracking-widest">Create Task</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
