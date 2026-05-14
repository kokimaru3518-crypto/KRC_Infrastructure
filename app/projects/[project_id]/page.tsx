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
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null);
  
  // Filter States
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: pData } = await supabase.from('projects').select('*').eq('project_id', project_id).single();
    if (pData) setProject(pData);

    const { data: tData } = await supabase.from('tasks').select('*, users(user_name)').eq('project_id', project_id).order('created_at', { ascending: false });
    if (tData) setAllTasks(tData);
    setLoading(false);
  }, [project_id, supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Unique assignees for filter
  const assignees = useMemo(() => {
    const names = new Set<string>();
    allTasks.forEach(t => { if (t.users?.user_name) names.add(t.users.user_name); });
    return Array.from(names);
  }, [allTasks]);

  // Filter Logic
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      const matchAssignee = filterAssignee === 'all' || (filterAssignee === 'none' && !t.users) || t.users?.user_name === filterAssignee;
      const matchPriority = filterPriority === 'all' || t.priority?.toString() === filterPriority;
      return matchAssignee && matchPriority;
    });
  }, [allTasks, filterAssignee, filterPriority]);

  const parentTasks = useMemo(() => filteredTasks.filter(t => !t.parent_task_id), [filteredTasks]);
  const getSubtasks = (parentId: string) => allTasks.filter(t => t.parent_task_id === parentId);

  // ステータス更新
  const updateTaskStatus = async (taskId: string, nextStatus: string) => {
    const { error } = await supabase.from('tasks').update({ situation: nextStatus }).eq('task_id', taskId);
    if (!error) {
      setAllTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, situation: nextStatus } : t));
      if (selectedTask?.task_id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, situation: nextStatus } : null);
      }
    }
  };

  // 優先度更新
  const updateTaskPriority = async (taskId: string, nextPriority: number) => {
    const { error } = await supabase.from('tasks').update({ priority: nextPriority }).eq('task_id', taskId);
    if (!error) {
      setAllTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, priority: nextPriority } : t));
      if (selectedTask?.task_id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, priority: nextPriority } : null);
      }
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newSubtaskName.trim()) return;
    const newId = crypto.randomUUID();
    const { error } = await supabase.from('tasks').insert({
      task_id: newId, task_name: newSubtaskName, project_id: project_id, parent_task_id: selectedTask.task_id, situation: 'waiting', priority: selectedTask.priority
    });
    if (!error) { setNewSubtaskName(''); void fetchData(); }
  };

  const onDragStart = (taskId: string) => setDraggedTaskId(taskId);
  const onDragOver = (e: React.DragEvent, colId: string) => { e.preventDefault(); setDropTargetColumn(colId); };
  const onDrop = async (colId: string) => {
    if (draggedTaskId) await updateTaskStatus(draggedTaskId, colId);
    setDraggedTaskId(null); setDropTargetColumn(null);
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold tracking-widest animate-pulse uppercase">Syncing...</div>;
  if (!project) return null;

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-full">
      {/* Header */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">{project.project_name}</h1>
          <p className="text-slate-500 text-lg mt-1">{project.text}</p>
        </div>
        <Link href={`/projects/${project_id}/tasks/new`} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95">
          新規タスク
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="mb-8 p-4 bg-white border border-slate-200 rounded-2xl flex flex-wrap gap-6 items-center shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Assignee:</label>
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="text-sm font-bold bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-100 transition-all">
            <option value="all">All Members</option><option value="none">Unassigned</option>
            {assignees.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Priority:</label>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="text-sm font-bold bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-100 transition-all">
            <option value="all">All Levels</option><option value="2">High</option><option value="1">Middle</option><option value="0">Low</option>
          </select>
        </div>
        {(filterAssignee !== 'all' || filterPriority !== 'all') && <button onClick={() => { setFilterAssignee('all'); setFilterPriority('all'); }} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline">Reset Filters</button>}
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {columns.map((col) => (
          <div key={col.id} className="flex flex-col min-h-[600px]" onDragOver={(e) => onDragOver(e, col.id)} onDrop={() => onDrop(col.id)}>
            <div className={`p-4 rounded-t-2xl border-x border-t flex justify-between items-center transition-all ${dropTargetColumn === col.id ? 'bg-indigo-100 border-indigo-200' : col.color}`}>
              <h2 className="font-black text-sm uppercase tracking-widest">{col.name}</h2>
              <span className="bg-white/50 px-2 py-0.5 rounded text-[10px] font-black">{parentTasks.filter(t => (t.situation || 'waiting') === col.id).length}</span>
            </div>
            <div className={`flex-1 p-4 border-x border-b border-slate-200 rounded-b-2xl space-y-4 transition-all ${dropTargetColumn === col.id ? 'bg-indigo-50/30' : 'bg-slate-50/50'}`}>
              {parentTasks.filter(t => (t.situation || 'waiting') === col.id).map((task) => (
                <div key={task.task_id} draggable onDragStart={() => onDragStart(task.task_id)} onClick={() => setSelectedTask(task)} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase transition-colors ${priorityMap[task.priority ?? 0]?.color}`}>{priorityMap[task.priority ?? 0]?.label}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">{task.task_name}</h3>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold border border-slate-200 text-slate-500">{task.users?.user_name?.charAt(0).toUpperCase() || '?'}</div>
                    <span className="text-xs font-bold text-slate-500">{task.users?.user_name || 'Unassigned'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</label>
                    <select 
                      value={selectedTask.priority ?? 0} 
                      onChange={(e) => updateTaskPriority(selectedTask.task_id, parseInt(e.target.value))}
                      className={`text-[10px] font-black px-2 py-1 rounded border uppercase outline-none focus:ring-2 focus:ring-indigo-100 transition-all ${priorityMap[selectedTask.priority ?? 0]?.color}`}
                    >
                      <option value="2">High</option>
                      <option value="1">Middle</option>
                      <option value="0">Low</option>
                    </select>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedTask.task_name}</h2>
                </div>
                <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Subtasks</h3>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{getSubtasks(selectedTask.task_id).length}</span>
                </div>
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                  {getSubtasks(selectedTask.task_id).map(sub => (
                    <div key={sub.task_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group transition-all hover:bg-white hover:border-slate-200 hover:shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${sub.situation === 'done' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : sub.situation === 'working' ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]' : 'bg-slate-300'}`} />
                        <span className="font-bold text-slate-700">{sub.task_name}</span>
                      </div>
                      <select value={sub.situation || 'waiting'} onChange={(e) => updateTaskStatus(sub.task_id, e.target.value)} className="text-[10px] font-bold bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-100 transition-all">
                        <option value="waiting">Waiting</option><option value="working">In Progress</option><option value="done">Done</option>
                      </select>
                    </div>
                  ))}
                  {getSubtasks(selectedTask.task_id).length === 0 && <div className="text-slate-400 italic text-sm py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">子タスクがまだありません</div>}
                </div>
                <form onSubmit={handleAddSubtask} className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                  <input type="text" value={newSubtaskName} onChange={e => setNewSubtaskName(e.target.value)} placeholder="新しい子タスクを追加..." className="flex-1 px-4 py-3 bg-transparent border-none text-sm font-bold outline-none placeholder:text-slate-400" />
                  <button type="submit" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md active:scale-95">追加</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
