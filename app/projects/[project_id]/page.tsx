'use client';

import { useEffect, useState, useCallback, useMemo, use } from 'react';
import { createClient } from '../../../supabase/client';
import { getSession } from '../../../lib/session';
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

const priorityMap: { [key: number]: { label: string, color: string, icon: string } } = {
  2: { label: '高', color: 'text-red-700 bg-red-50', icon: '↑' },
  1: { label: '中', color: 'text-amber-700 bg-amber-50', icon: '=' },
  0: { label: '低', color: 'text-blue-700 bg-blue-50', icon: '↓' },
};

const columns = [
  { id: 'waiting', name: '未着手', color: 'bg-slate-100 text-slate-600' },
  { id: 'working', name: '進行中', color: 'bg-slate-100 text-slate-600' },
  { id: 'done', name: '完了', color: 'bg-slate-100 text-slate-600' },
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

  const handleDragStart = (taskId: string) => { if (isLeaderOrAdmin) setDraggedTaskId(taskId); };
  const handleDragOver = (e: React.DragEvent, colId: string) => { if (isLeaderOrAdmin) { e.preventDefault(); setDropTargetColumn(colId); } };
  const handleDrop = async (colId: string) => {
    if (isLeaderOrAdmin && draggedTaskId) await updateTask(draggedTaskId, { situation: colId });
    setDraggedTaskId(null); setDropTargetColumn(null);
  };

  const jumpToTask = (taskId: string) => { setActiveTab('board'); setSelectedTaskId(taskId); };
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
  };

  const getRemainingDaysInfo = (dateStr: string | null) => {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { label: '今日まで', color: 'text-white bg-red-600' };
    if (diffDays < 0) return { label: '期限切れ', color: 'text-white bg-slate-400' };
    return { label: `あと ${diffDays} 日`, color: diffDays <= 3 ? 'text-amber-700 bg-amber-100' : 'text-slate-600 bg-slate-100' };
  };

  const stats = useMemo(() => {
    const total = allTasks.length;
    const done = allTasks.filter(t => t.situation === 'done').length;
    const working = allTasks.filter(t => t.situation === 'working').length;
    const waiting = allTasks.filter(t => t.situation === 'waiting' || !t.situation).length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const upcoming = allTasks.filter(t => t.due_date && t.situation !== 'done').sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()).slice(0, 5);
    const memberStats = members.map(m => ({ ...m, taskCount: allTasks.filter(t => t.user_id === m.user_id).length }));
    return { total, done, working, waiting, progress, upcoming, memberStats, doneP: (done/total)*100, workingP: (working/total)*100, waitingP: (waiting/total)*100 };
  }, [allTasks, members]);

  if (loading) return <div className="p-20 text-center font-medium text-slate-400 tracking-widest animate-pulse italic">読み込み中...</div>;
  if (!project) return null;

  return (
    <div className="max-w-full px-6 py-6">
      {/* Jira Style Breadcrumbs & Header */}
      <div className="mb-6">
        <nav className="text-xs text-slate-500 mb-2 flex items-center gap-2">
          <Link href="/projects" className="hover:underline">プロジェクト</Link>
          <span>/</span>
          <span>{project.project_name}</span>
        </nav>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-slate-900">{project.project_name}</h1>
          {isLeaderOrAdmin && (
            <Link href={`/projects/${project_id}/tasks/new`} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-medium text-sm transition-colors shadow-sm">
              課題を作成
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b border-slate-200">
        <button onClick={() => setActiveTab('board')} className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'board' ? 'text-indigo-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>カンバンボード</button>
        <button onClick={() => setActiveTab('summary')} className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'summary' ? 'text-indigo-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>概要</button>
      </div>

      {activeTab === 'board' ? (
        <div className="animate-in fade-in duration-300">
          {/* Filters Bar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center">
              <input type="text" placeholder="ボードを検索" className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64" />
            </div>
            <div className="flex -space-x-2 mr-2">
              {members.slice(0, 5).map(m => (
                <div key={m.user_id} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 cursor-help" title={m.users?.user_name || ''}>
                  {m.users?.user_name?.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-slate-100 border-none rounded px-3 py-1.5 text-sm font-medium text-slate-600 outline-none hover:bg-slate-200 cursor-pointer">
              <option value="all">すべての優先度</option><option value="2">高</option><option value="1">中</option><option value="0">低</option>
            </select>
          </div>

          {/* Kanban Board */}
          <div className="flex gap-4 items-start overflow-x-auto pb-4">
            {columns.map((col) => (
              <div key={col.id} className={`flex flex-col w-80 min-h-[70vh] bg-slate-50/80 rounded-md transition-colors ${dropTargetColumn === col.id ? 'bg-indigo-50' : ''}`} onDragOver={(e) => handleDragOver(e, col.id)} onDrop={() => handleDrop(col.id)}>
                <div className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  {col.name} <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{parentTasks.filter(t => (t.situation || 'waiting') === col.id).length}</span>
                </div>
                <div className="flex-1 p-2 space-y-2">
                  {parentTasks.filter(t => (t.situation || 'waiting') === col.id).map((task) => (
                    <div key={task.task_id} draggable={isLeaderOrAdmin} onDragStart={() => handleDragStart(task.task_id)} onClick={() => setSelectedTaskId(task.task_id)} className="bg-white p-3 rounded shadow-sm border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors group">
                      <h3 className="text-sm text-slate-800 mb-3 line-clamp-2">{task.task_name}</h3>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded ${priorityMap[task.priority ?? 0]?.color}`} title={priorityMap[task.priority ?? 0]?.label}>
                            {priorityMap[task.priority ?? 0]?.icon}
                          </span>
                          {task.due_date && <span className="text-[10px] text-slate-400 font-medium">{formatDate(task.due_date)}</span>}
                        </div>
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                          {task.users?.user_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-8 rounded-lg border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-6">ステータス概要</h3>
              <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4"></circle>
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#36B37E" strokeWidth="4" strokeDasharray={`${stats.doneP} ${100 - stats.doneP}`} strokeDashoffset="0"></circle>
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#0052CC" strokeWidth="4" strokeDasharray={`${stats.workingP} ${100 - stats.workingP}`} strokeDashoffset={`-${stats.doneP}`}></circle>
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#FFAB00" strokeWidth="4" strokeDasharray={`${stats.waitingP} ${100 - stats.waitingP}`} strokeDashoffset={`-${stats.doneP + stats.workingP}`}></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-slate-800">{stats.progress}%</span><span className="text-[10px] font-bold text-slate-400 uppercase">完了</span></div>
                </div>
                <div className="flex-1 max-w-xs space-y-3">
                  {columns.map(c => {
                    const count = allTasks.filter(t => (t.situation || 'waiting') === c.id).length;
                    return (
                      <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-200">
                        <span className="text-xs font-semibold text-slate-600">{c.name}</span>
                        <span className="text-lg font-bold text-slate-800">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="bg-slate-900 p-8 rounded-lg text-white">
              <h3 className="text-sm font-bold text-indigo-400 uppercase mb-6">直近の期限</h3>
              <div className="space-y-3">
                {stats.upcoming.map(t => {
                  const rem = getRemainingDaysInfo(t.due_date);
                  return (
                    <div key={t.task_id} onDoubleClick={() => jumpToTask(t.task_id)} className="p-4 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-all cursor-pointer flex justify-between items-center">
                      <div className="overflow-hidden mr-4"><p className="text-[10px] text-white/40 mb-1">{formatDate(t.due_date)}</p><p className="text-sm font-medium truncate">{t.task_name}</p></div>
                      <div className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold ${rem?.color}`}>
                        {rem?.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-6">チームメンバー</h3>
            <table className="w-full text-left">
              <thead><tr className="text-[11px] text-slate-400 uppercase border-b border-slate-100"><th className="px-4 py-3">メンバー</th><th className="px-4 py-3">役割</th><th className="px-4 py-3">担当課題数</th></tr></thead>
              <tbody className="divide-y divide-slate-50">{stats.memberStats.map(m => (
                <tr key={m.user_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">{m.users?.user_name?.charAt(0).toUpperCase()}</div><span className="text-sm font-medium">{m.users?.user_name}</span></td>
                  <td className="px-4 py-4"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${m.role === 'leader' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{m.role === 'leader' ? 'リーダー' : 'メンバー'}</span></td>
                  <td className="px-4 py-4 font-bold text-slate-700">{m.taskCount}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedTaskId && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-10" onClick={() => setSelectedTaskId(null)}>
          <div className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="bg-indigo-100 text-indigo-700 p-1 rounded font-bold">課題</span>
                <span>{project.project_name}</span> / <span>{selectedTask.task_id.slice(0, 8).toUpperCase()}</span>
              </div>
              <button onClick={() => setSelectedTaskId(null)} className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 p-8 overflow-y-auto">
                <h2 className="text-2xl font-semibold text-slate-900 mb-8">{selectedTask.task_name}</h2>
                <div className="mb-8">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">説明</label>
                  <textarea disabled={!isLeaderOrAdmin} value={selectedTask.text || ''} onChange={(e) => updateTask(selectedTask.task_id, { text: e.target.value || null })} placeholder={isLeaderOrAdmin ? "説明を追加..." : ""} rows={6} className={`w-full p-3 rounded border border-transparent text-sm transition-all resize-none ${isLeaderOrAdmin ? 'hover:bg-slate-50 focus:bg-white focus:border-indigo-500' : 'bg-transparent cursor-default'}`} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">子タスク</h3>
                  {isLeaderOrAdmin && (
                    <form onSubmit={handleAddSubtask} className="flex gap-2 mb-4">
                      <input type="text" value={newSubtaskName} onChange={e => setNewSubtaskName(e.target.value)} placeholder="何を行う必要がありますか？" className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm outline-none focus:border-indigo-500" />
                      <button type="submit" disabled={isAddingSubtask} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm font-bold transition-colors">追加</button>
                    </form>
                  )}
                  <div className="border border-slate-200 rounded overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr className="text-[10px] text-slate-500 uppercase font-bold"><th className="px-4 py-2">ステータス</th><th className="px-4 py-2">概要</th><th className="px-4 py-2">担当者</th></tr></thead><tbody className="divide-y divide-slate-100">{getSubtasks(selectedTask.task_id).map(sub => (<tr key={sub.task_id} className="hover:bg-slate-50"><td className="px-4 py-2"><select disabled={!isLeaderOrAdmin} value={sub.situation || 'waiting'} onChange={(e) => updateTask(sub.task_id, { situation: e.target.value })} className="bg-slate-100 text-[10px] font-bold px-2 py-1 rounded border-none outline-none"><option value="waiting">未着手</option><option value="working">進行中</option><option value="done">完了</option></select></td><td className="px-4 py-2 font-medium">{sub.task_name}</td><td className="px-4 py-2"><select disabled={!isLeaderOrAdmin} value={sub.user_id || ''} onChange={(e) => updateTask(sub.task_id, { user_id: e.target.value || null })} className="bg-transparent text-[10px] border-none outline-none">{members.map(m => <option key={m.user_id} value={m.user_id}>{m.users?.user_name}</option>)}<option value="">未割り当て</option></select></td></tr>))}</tbody></table></div>
                </div>
              </div>
              <div className="w-80 p-8 border-l border-slate-200 bg-slate-50/30 overflow-y-auto">
                <div className="space-y-6">
                  <div><label className="text-[11px] font-bold text-slate-500 uppercase block mb-2">ステータス</label><select disabled={!isLeaderOrAdmin} value={selectedTask.situation || 'waiting'} onChange={(e) => updateTask(selectedTask.task_id, { situation: e.target.value })} className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"><option value="waiting">未着手</option><option value="working">進行中</option><option value="done">完了</option></select></div>
                  <div><label className="text-[11px] font-bold text-slate-500 uppercase block mb-2">担当者</label><select disabled={!isLeaderOrAdmin} value={selectedTask.user_id || ''} onChange={(e) => updateTask(selectedTask.task_id, { user_id: e.target.value || null })} className="w-full bg-transparent hover:bg-slate-100 border-none rounded px-3 py-2 text-sm outline-none"><option value="">未割り当て</option>{members.map(m => <option key={m.user_id} value={m.user_id}>{m.users?.user_name}</option>)}</select></div>
                  <div><label className="text-[11px] font-bold text-slate-500 uppercase block mb-2">優先度</label><select disabled={!isLeaderOrAdmin} value={selectedTask.priority ?? 0} onChange={(e) => updateTask(selectedTask.task_id, { priority: parseInt(e.target.value) })} className="w-full bg-transparent hover:bg-slate-100 border-none rounded px-3 py-2 text-sm outline-none"><option value="2">高</option><option value="1">中</option><option value="0">低</option></select></div>
                  <div><label className="text-[11px] font-bold text-slate-500 uppercase block mb-2">期限日</label><input disabled={!isLeaderOrAdmin} type="date" value={selectedTask.due_date ? selectedTask.due_date.split('T')[0] : ''} onChange={(e) => updateTask(selectedTask.task_id, { due_date: e.target.value || null })} className="w-full bg-transparent hover:bg-slate-100 border-none rounded px-3 py-2 text-sm outline-none" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
