'use client';

import { useEffect, useState, useCallback, useMemo, use } from 'react';
import { createClient } from '../../../supabase/client';
import { getSession, type Session } from '../../../lib/session';
import Link from 'next/link';

type Task = {
  task_id: string;
  task_name: string;
  situation: string | null;
  priority: number | null;
  user_id: string | null;
  parent_task_id: string | null;
  created_at: string | null;
  due_date: string | null;
  text: string | null;
  users: {
    user_name: string;
  } | null;
};

type Project = {
  project_id: string;
  project_name: string;
  text: string | null;
  created_at: string | null;
};

type Member = {
  user_id: string;
  role: string;
  users: {
    user_name: string;
  } | null;
};

const priorityMap: { [key: number]: { label: string, color: string } } = {
  2: { label: 'High', color: 'text-red-600 bg-red-50 border-red-100' },
  1: { label: 'Middle', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  0: { label: 'Low', color: 'text-slate-600 bg-slate-50 border-slate-100' },
};

const columns = [
  { id: 'waiting', name: 'Waiting', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { id: 'working', name: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { id: 'done', name: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
];

export default function ProjectDetailPage({ params }: { params: Promise<{ project_id: string }> }) {
  const { project_id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'board' | 'summary'>('board');
  const [isLeaderOrAdmin, setIsLeaderOrAdmin] = useState(false);

  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    const session = await getSession();
    if (!session) return;
    const [pRes, tRes, mRes] = await Promise.all([
      supabase.from('projects').select('*').eq('project_id', project_id).single(),
      supabase.from('tasks').select('*, users(user_name)').eq('project_id', project_id).order('created_at', { ascending: false }),
      supabase.from('project_members').select('user_id, role, users(user_name)').eq('project_id', project_id).neq('role', 'pending')
    ]);
    if (pRes.data) setProject(pRes.data);
    if (tRes.data) setAllTasks(tRes.data || []);
    if (mRes.data) {
      setMembers(mRes.data || []);
      const isAdmin = session.user_name === 'admin';
      const isLeader = mRes.data.some(m => m.user_id === session.user_id && m.role === 'leader');
      setIsLeaderOrAdmin(isAdmin || isLeader);
    }
    setLoading(false);
  }, [project_id, supabase]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return allTasks.find(t => t.task_id === selectedTaskId) || null;
  }, [allTasks, selectedTaskId]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      const matchAssignee = filterAssignee === 'all' || (filterAssignee === 'none' && !t.users) || t.users?.user_name === filterAssignee;
      const matchPriority = filterPriority === 'all' || t.priority?.toString() === filterPriority;
      return matchAssignee && matchPriority;
    });
  }, [allTasks, filterAssignee, filterPriority]);

  const parentTasks = useMemo(() => filteredTasks.filter(t => !t.parent_task_id), [filteredTasks]);
  const getSubtasks = (parentId: string) => allTasks.filter(t => t.parent_task_id === parentId);

  const updateTask = async (taskId: string, updates: { situation?: string, priority?: number, user_id?: string | null, due_date?: string | null, text?: string | null }) => {
    if (!isLeaderOrAdmin) return;
    const { error } = await supabase.from('tasks').update(updates).eq('task_id', taskId);
    if (!error) await fetchData();
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeaderOrAdmin || !selectedTask || !newSubtaskName.trim() || isAddingSubtask) return;
    setIsAddingSubtask(true);
    const { error } = await supabase.from('tasks').insert({
      task_id: crypto.randomUUID(), task_name: newSubtaskName, project_id, parent_task_id: selectedTask.task_id, situation: 'waiting', priority: 1
    });
    if (!error) { setNewSubtaskName(''); await fetchData(); }
    setIsAddingSubtask(false);
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (taskId: string) => {
    if (isLeaderOrAdmin) setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    if (isLeaderOrAdmin) {
      e.preventDefault();
      setDropTargetColumn(colId);
    }
  };

  const handleDrop = async (colId: string) => {
    if (isLeaderOrAdmin && draggedTaskId) {
      await updateTask(draggedTaskId, { situation: colId });
    }
    setDraggedTaskId(null);
    setDropTargetColumn(null);
  };
  // ------------------------------

  const jumpToTask = (taskId: string) => { setActiveTab('board'); setSelectedTaskId(taskId); };
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const getRemainingDaysInfo = (dateStr: string | null) => {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { label: 'Today', sub: 'Status', color: 'text-red-500', bg: 'bg-red-50' };
    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d`, sub: 'Expired', color: 'text-slate-400', bg: 'bg-slate-100' };
    return { label: `${diffDays}`, sub: 'Days', color: diffDays <= 3 ? 'text-orange-500' : 'text-indigo-400', bg: diffDays <= 3 ? 'bg-orange-50' : 'bg-indigo-50/10' };
  };

  const stats = useMemo(() => {
    const total = allTasks.length;
    const done = allTasks.filter(t => t.situation === 'done').length;
    const working = allTasks.filter(t => t.situation === 'working').length;
    const waiting = allTasks.filter(t => t.situation === 'waiting' || !t.situation).length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const doneP = total > 0 ? (done / total) * 100 : 0;
    const workingP = total > 0 ? (working / total) * 100 : 0;
    const waitingP = total > 0 ? (waiting / total) * 100 : 0;
    const upcoming = allTasks.filter(t => t.due_date && t.situation !== 'done').sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()).slice(0, 5);
    const memberStats = members.map(m => ({ ...m, taskCount: allTasks.filter(t => t.user_id === m.user_id).length }));
    return { total, done, working, waiting, progress, doneP, workingP, waitingP, upcoming, memberStats };
  }, [allTasks, members]);

  if (loading) return <div className="p-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-widest">Accessing...</div>;
  if (!project) return null;

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-full">
      {/* Header */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-4 mb-2"><h1 className="text-4xl font-black text-slate-900 tracking-tight italic">{project.project_name}</h1><div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Active</div></div>
          <p className="text-slate-500 font-medium">{project.text}</p>
        </div>
        {isLeaderOrAdmin && <Link href={`/projects/${project_id}/tasks/new`} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest">Add Task</Link>}
      </div>

      <div className="flex gap-1 mb-8 border-b border-slate-200">
        <button onClick={() => setActiveTab('board')} className={`px-8 py-4 text-sm font-black uppercase tracking-widest border-b-4 ${activeTab === 'board' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Board</button>
        <button onClick={() => setActiveTab('summary')} className={`px-8 py-4 text-sm font-black uppercase tracking-widest border-b-4 ${activeTab === 'summary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Summary</button>
      </div>

      {activeTab === 'board' ? (
        <>
          <div className="mb-8 p-5 bg-white border border-slate-200 rounded-3xl flex flex-wrap gap-8 items-center shadow-sm">
            <div className="flex items-center gap-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignee</label><select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="text-sm font-bold bg-slate-50 border-none rounded-xl px-4 py-2 outline-none">{members.map(m => <option key={m.user_id} value={m.users?.user_name || ''}>{m.users?.user_name}</option>)}<option value="all">All Members</option><option value="none">Unassigned</option></select></div>
            <div className="flex items-center gap-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</label><select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="text-sm font-bold bg-slate-50 border-none rounded-xl px-4 py-2 outline-none"><option value="all">All Levels</option><option value="2">High</option><option value="1">Middle</option><option value="0">Low</option></select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {columns.map((col) => (
              <div key={col.id} className="flex flex-col min-h-[600px]" onDragOver={(e) => handleDragOver(e, col.id)} onDrop={() => handleDrop(col.id)}>
                <div className={`p-5 rounded-t-3xl border-x border-t flex justify-between items-center ${dropTargetColumn === col.id ? 'bg-indigo-100' : col.color}`}><h2 className="font-black text-xs uppercase tracking-widest">{col.name}</h2><span className="bg-white/50 px-2.5 py-1 rounded-lg text-[10px] font-black">{parentTasks.filter(t => (t.situation || 'waiting') === col.id).length}</span></div>
                <div className={`flex-1 p-5 border-x border-b border-slate-200 rounded-b-3xl space-y-5 ${dropTargetColumn === col.id ? 'bg-indigo-50/30' : 'bg-slate-50/50'}`}>
                  {parentTasks.filter(t => (t.situation || 'waiting') === col.id).map((task) => (
                    <div key={task.task_id} draggable={isLeaderOrAdmin} onDragStart={() => handleDragStart(task.task_id)} onClick={() => setSelectedTaskId(task.task_id)} className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all group ${isLeaderOrAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}>
                      <div className="flex justify-between items-start mb-4"><span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase ${priorityMap[task.priority ?? 0]?.color}`}>{priorityMap[task.priority ?? 0]?.label}</span>{getSubtasks(task.task_id).length > 0 && <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">SUB: {getSubtasks(task.task_id).length}</span>}</div>
                      <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-lg mb-4">{task.task_name}</h3>
                      <div className="space-y-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-bold flex justify-between"><span>Due:</span><span className={task.due_date ? 'text-indigo-600' : 'text-slate-300'}>{formatDate(task.due_date)}</span></div>
                      <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black border border-slate-200 text-slate-500">{task.users?.user_name?.charAt(0).toUpperCase() || '?'}</div><span className="text-xs font-bold text-slate-500">{task.users?.user_name || 'Unassigned'}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-10 uppercase tracking-widest">Task Status Overview</h3>
              <div className="flex flex-col md:flex-row items-center justify-around gap-12">
                <div className="relative w-64 h-64"><svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90"><circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="3"></circle><circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="3.5" strokeDasharray={`${stats.doneP} ${100 - stats.doneP}`} strokeDashoffset="0"></circle><circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#0ea5e9" strokeWidth="3.5" strokeDasharray={`${stats.workingP} ${100 - stats.workingP}`} strokeDashoffset={`-${stats.doneP}`}></circle><circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#94a3b8" strokeWidth="3.5" strokeDasharray={`${stats.waitingP} ${100 - stats.waitingP}`} strokeDashoffset={`-${stats.doneP + stats.workingP}`}></circle></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-black text-slate-900 leading-none">{stats.progress}%</span><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Complete</span></div></div>
                <div className="flex-1 space-y-6 w-full max-w-xs"><div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-sm font-black text-emerald-800 uppercase">Completed</span></div><span className="text-2xl font-black text-emerald-600">{stats.done}</span></div><div className="flex items-center justify-between p-4 bg-sky-50 rounded-2xl border border-sky-100"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-sky-500" /><span className="text-sm font-black text-sky-800 uppercase">Working</span></div><span className="text-2xl font-black text-sky-600">{stats.working}</span></div><div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-slate-400" /><span className="text-sm font-black text-slate-600 uppercase">Waiting</span></div><span className="text-2xl font-black text-slate-600">{stats.waiting}</span></div></div>
              </div>
            </div>
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl overflow-hidden">
              <h3 className="text-xl font-black mb-8 uppercase tracking-widest text-indigo-400">Upcoming Deadlines</h3>
              <div className="space-y-4">
                {stats.upcoming.map(t => {
                  const rem = getRemainingDaysInfo(t.due_date);
                  return (
                    <div key={t.task_id} onDoubleClick={() => jumpToTask(t.task_id)} className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-indigo-500 transition-all cursor-pointer group flex justify-between items-center">
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-white/30 uppercase mb-2">{formatDate(t.due_date)}</p>
                        <p className="font-bold text-sm line-clamp-1 group-hover:text-indigo-400">{t.task_name}</p>
                      </div>
                      <div className={`ml-4 w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-center ${rem?.bg || 'bg-white/10'}`}>
                        <span className={`text-2xl font-black leading-none mb-1 ${rem?.color || 'text-white'}`}>{rem?.label || '-'}</span>
                        <span className="text-[8px] font-black uppercase tracking-[0.1em] opacity-60">{rem?.sub || ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm"><div className="flex items-center justify-between mb-10"><h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">Project Members</h3><span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">{members.length} Members</span></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100"><th className="px-6 py-5">Name</th><th className="px-6 py-5">Role</th><th className="px-6 py-5">Assigned Tasks</th></tr></thead><tbody className="divide-y divide-slate-50">{stats.memberStats.map((m) => (<tr key={m.user_id} className="group hover:bg-slate-50/50"><td className="px-6 py-6"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">{m.users?.user_name?.charAt(0).toUpperCase()}</div><span className="font-bold text-slate-900">{m.users?.user_name}</span></div></td><td className="px-6 py-6"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${m.role === 'leader' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{m.role}</span></td><td className="px-6 py-6"><div className="flex items-center gap-3"><span className="text-lg font-black text-slate-900">{m.taskCount}</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasks</span></div></td></tr>))}</tbody></table></div></div>
        </div>
      )}

      {/* Detailed Modal */}
      {selectedTaskId && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setSelectedTaskId(null)}>
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-12">
              <div className="flex justify-between items-start mb-8">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <select disabled={!isLeaderOrAdmin} value={selectedTask.priority ?? 0} onChange={(e) => updateTask(selectedTask.task_id, { priority: parseInt(e.target.value) })} className={`text-[11px] font-black px-3 py-1.5 rounded-xl border uppercase outline-none ${priorityMap[selectedTask.priority ?? 0]?.color}`}>
                      <option value="2">High</option><option value="1">Middle</option><option value="0">Low</option>
                    </select>
                    <select disabled={!isLeaderOrAdmin} value={selectedTask.situation || 'waiting'} onChange={(e) => updateTask(selectedTask.task_id, { situation: e.target.value })} className="text-[11px] font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 uppercase outline-none">
                      <option value="waiting">Waiting</option><option value="working">In Progress</option><option value="done">Done</option>
                    </select>
                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Due</span>
                      <input disabled={!isLeaderOrAdmin} type="date" value={selectedTask.due_date ? selectedTask.due_date.split('T')[0] : ''} onChange={(e) => updateTask(selectedTask.task_id, { due_date: e.target.value || null })} className="text-[11px] font-bold bg-transparent text-indigo-700 outline-none" />
                    </div>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">{selectedTask.task_name}</h2>
                  <div className="mt-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Description</label>
                    <textarea disabled={!isLeaderOrAdmin} value={selectedTask.text || ''} onChange={(e) => updateTask(selectedTask.task_id, { text: e.target.value || null })} placeholder={isLeaderOrAdmin ? "詳細な説明を入力..." : "説明はありません"} rows={3} className={`w-full p-4 border-none rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none ${isLeaderOrAdmin ? 'bg-slate-50 text-slate-700' : 'bg-transparent text-slate-500'}`} />
                  </div>
                </div>
                <button onClick={() => setSelectedTaskId(null)} className="p-4 hover:bg-slate-100 rounded-3xl text-slate-300 hover:text-slate-900 transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              </div>
              <div className="mt-10 bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden"><div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Subtasks</h3>{isLeaderOrAdmin && (<form onSubmit={handleAddSubtask} className="flex gap-2"><input type="text" value={newSubtaskName} onChange={e => setNewSubtaskName(e.target.value)} placeholder="Quick add..." className="px-4 py-2 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-100" /><button type="submit" disabled={isAddingSubtask} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-800">Add</button></form>)}</div><div className="max-h-60 overflow-y-auto"><table className="w-full text-left"><thead className="bg-slate-50/50 sticky top-0"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-6 py-4">Status</th><th className="px-6 py-4">Task Name</th><th className="px-6 py-4">Assignee</th><th className="px-6 py-4">Priority</th></tr></thead><tbody className="divide-y divide-slate-100">{getSubtasks(selectedTask.task_id).map(sub => (<tr key={sub.task_id} className="bg-white hover:bg-slate-50/30 transition-colors"><td className="px-6 py-3"><select disabled={!isLeaderOrAdmin} value={sub.situation || 'waiting'} onChange={(e) => updateTask(sub.task_id, { situation: e.target.value })} className="text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1 outline-none"><option value="waiting">Waiting</option><option value="working">In Progress</option><option value="done">Done</option></select></td><td className="px-6 py-3 font-bold text-slate-700 text-sm">{sub.task_name}</td><td className="px-6 py-3"><select disabled={!isLeaderOrAdmin} value={sub.user_id || ''} onChange={(e) => updateTask(sub.task_id, { user_id: e.target.value || null })} className="text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1 outline-none">{members.map(m => <option key={m.user_id} value={m.user_id}>{m.users?.user_name}</option>)}<option value="">Unassigned</option></select></td><td className="px-6 py-3"><select disabled={!isLeaderOrAdmin} value={sub.priority ?? 0} onChange={(e) => updateTask(sub.task_id, { priority: parseInt(e.target.value) })} className={`text-[10px] font-black border rounded-lg px-2 py-1 outline-none ${priorityMap[sub.priority ?? 0]?.color}`}><option value="2">High</option><option value="1">Middle</option><option value="0">Low</option></select></td></tr>))}</tbody></table></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
