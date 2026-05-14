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
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    const [pRes, tRes, mRes] = await Promise.all([
      supabase.from('projects').select('*').eq('project_id', project_id).single(),
      supabase.from('tasks').select('*, users(user_name)').eq('project_id', project_id).order('created_at', { ascending: false }),
      supabase.from('project_members').select('user_id, users(user_name)').eq('project_id', project_id)
    ]);

    if (pRes.data) setProject(pRes.data);
    if (tRes.data) setAllTasks(tRes.data || []);
    if (mRes.data) setMembers(mRes.data || []);
    setLoading(false);
  }, [project_id, supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const selectedTask = useMemo(() => {
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

  const updateTask = async (taskId: string, updates: { situation?: string, priority?: number, user_id?: string | null, due_date?: string | null }) => {
    const { error } = await supabase.from('tasks').update(updates).eq('task_id', taskId);
    if (!error) {
      await fetchData();
    } else {
      alert('更新に失敗しました: ' + error.message);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newSubtaskName.trim() || isAddingSubtask) return;
    setIsAddingSubtask(true);
    const { error } = await supabase.from('tasks').insert({
      task_id: crypto.randomUUID(),
      task_name: newSubtaskName,
      project_id: project_id,
      parent_task_id: selectedTask.task_id,
      situation: 'waiting',
      priority: 1
    });
    if (!error) {
      setNewSubtaskName('');
      await fetchData();
    }
    setIsAddingSubtask(false);
  };

  const onDragStart = (taskId: string) => setDraggedTaskId(taskId);
  const onDragOver = (e: React.DragEvent, colId: string) => { e.preventDefault(); setDropTargetColumn(colId); };
  const onDrop = async (colId: string) => {
    if (draggedTaskId) await updateTask(draggedTaskId, { situation: colId });
    setDraggedTaskId(null); setDropTargetColumn(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-widest">Loading...</div>;
  if (!project) return null;

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-full">
      {/* Header */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">{project.project_name}</h1>
          <p className="text-slate-500 text-lg mt-2 font-medium">{project.text}</p>
        </div>
        <Link href={`/projects/${project_id}/tasks/new`} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest">
          Add Master Task
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="mb-8 p-5 bg-white border border-slate-200 rounded-3xl flex flex-wrap gap-8 items-center shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignee</label>
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="text-sm font-bold bg-slate-50 border-none rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-100 transition-all">
            <option value="all">All Members</option><option value="none">Unassigned</option>
            {members.map(m => <option key={m.user_id} value={m.users?.user_name || ''}>{m.users?.user_name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</label>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="text-sm font-bold bg-slate-50 border-none rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-100 transition-all">
            <option value="all">All Levels</option><option value="2">High</option><option value="1">Middle</option><option value="0">Low</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {columns.map((col) => (
          <div key={col.id} className="flex flex-col min-h-[600px]" onDragOver={(e) => onDragOver(e, col.id)} onDrop={() => onDrop(col.id)}>
            <div className={`p-5 rounded-t-3xl border-x border-t flex justify-between items-center ${dropTargetColumn === col.id ? 'bg-indigo-100 border-indigo-200' : col.color}`}>
              <h2 className="font-black text-xs uppercase tracking-[0.2em]">{col.name}</h2>
              <span className="bg-white/50 px-2 py-0.5 rounded text-[10px] font-black">{parentTasks.filter(t => (t.situation || 'waiting') === col.id).length}</span>
            </div>
            <div className={`flex-1 p-5 border-x border-b border-slate-200 rounded-b-3xl space-y-5 ${dropTargetColumn === col.id ? 'bg-indigo-50/30' : 'bg-slate-50/50'}`}>
              {parentTasks.filter(t => (t.situation || 'waiting') === col.id).map((task) => (
                <div key={task.task_id} draggable onDragStart={() => onDragStart(task.task_id)} onClick={() => setSelectedTaskId(task.task_id)} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-400 hover:shadow-xl transition-all group active:scale-[0.98]">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase ${priorityMap[task.priority ?? 0]?.color}`}>{priorityMap[task.priority ?? 0]?.label}</span>
                    {getSubtasks(task.task_id).length > 0 && <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">SUB: {getSubtasks(task.task_id).length}</span>}
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-lg mb-4">{task.task_name}</h3>
                  
                  {/* Dates for Parent Task */}
                  <div className="space-y-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-400">Created:</span>
                      <span className="text-slate-600">{formatDate(task.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-400">Due Date:</span>
                      <span className={task.due_date ? 'text-indigo-600' : 'text-slate-300'}>{formatDate(task.due_date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black border border-slate-200 text-slate-500">{task.users?.user_name?.charAt(0).toUpperCase() || '?'}</div>
                    <span className="text-xs font-bold text-slate-500">{task.users?.user_name || 'Unassigned'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setSelectedTaskId(null)}>
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-12">
              <div className="flex justify-between items-start mb-10">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <select value={selectedTask.priority ?? 0} onChange={(e) => updateTask(selectedTask.task_id, { priority: parseInt(e.target.value) })} className={`text-[11px] font-black px-3 py-1.5 rounded-xl border uppercase outline-none focus:ring-4 focus:ring-indigo-100 transition-all ${priorityMap[selectedTask.priority ?? 0]?.color}`}>
                      <option value="2">High</option><option value="1">Middle</option><option value="0">Low</option>
                    </select>
                    <select value={selectedTask.situation || 'waiting'} onChange={(e) => updateTask(selectedTask.task_id, { situation: e.target.value })} className="text-[11px] font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 uppercase outline-none">
                      <option value="waiting">Waiting</option><option value="working">In Progress</option><option value="done">Done</option>
                    </select>
                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Due</span>
                      <input 
                        type="date" 
                        value={selectedTask.due_date ? selectedTask.due_date.split('T')[0] : ''} 
                        onChange={(e) => updateTask(selectedTask.task_id, { due_date: e.target.value || null })}
                        className="text-[11px] font-bold bg-transparent text-indigo-700 outline-none"
                      />
                    </div>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">{selectedTask.task_name}</h2>
                </div>
                <button onClick={() => setSelectedTaskId(null)} className="p-4 hover:bg-slate-100 rounded-3xl text-slate-300 hover:text-slate-900 transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              </div>

              {/* Subtasks Management Table */}
              <div className="mt-12 bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden">
                <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Subtasks Management</h3>
                  <form onSubmit={handleAddSubtask} className="flex gap-2">
                    <input type="text" value={newSubtaskName} onChange={e => setNewSubtaskName(e.target.value)} placeholder="Quick add subtask..." className="px-4 py-2 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-100" />
                    <button type="submit" disabled={isAddingSubtask} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-800">Add</button>
                  </form>
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 sticky top-0">
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Task Name</th>
                        <th className="px-6 py-4">Assignee</th>
                        <th className="px-6 py-4">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getSubtasks(selectedTask.task_id).map(sub => (
                        <tr key={sub.task_id} className="bg-white hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-3">
                            <select value={sub.situation || 'waiting'} onChange={(e) => updateTask(sub.task_id, { situation: e.target.value })} className="text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1 outline-none">
                              <option value="waiting">Waiting</option><option value="working">In Progress</option><option value="done">Done</option>
                            </select>
                          </td>
                          <td className="px-6 py-3 font-bold text-slate-700 text-sm">{sub.task_name}</td>
                          <td className="px-6 py-3">
                            <select value={sub.user_id || ''} onChange={(e) => updateTask(sub.task_id, { user_id: e.target.value || null })} className="text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1 outline-none max-w-[120px]">
                              <option value="">Unassigned</option>
                              {members.map(m => <option key={m.user_id} value={m.user_id}>{m.users?.user_name}</option>)}
                            </select>
                          </td>
                          <td className="px-6 py-3">
                            <select value={sub.priority ?? 0} onChange={(e) => updateTask(sub.task_id, { priority: parseInt(e.target.value) })} className={`text-[10px] font-black border rounded-lg px-2 py-1 outline-none ${priorityMap[sub.priority ?? 0]?.color}`}>
                              <option value="2">High</option><option value="1">Middle</option><option value="0">Low</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                      {getSubtasks(selectedTask.task_id).length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">No Subtasks</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
