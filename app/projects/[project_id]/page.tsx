'use client';

import { useEffect, useState, useCallback, useMemo, use } from 'react';
import { createClient } from '../../../supabase/client';
import { getSession } from '../../../lib/session';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Task = {
  task_id: string; task_name: string; situation: string | null; priority: number | null;
  user_id: string | null; parent_task_id: string | null; due_date: string | null;
  created_at: string | null;
  text: string | null; users: { user_name: string; } | null;
};

type Project = { project_id: string; project_name: string; };
type Member = { user_id: string; role: string | null; users: { user_name: string; } | null; };

const priorityMap: { [key: number]: { label: string, color: string, icon: string } } = {
  2: { label: '高', color: 'text-red-700 bg-red-50', icon: '↑' },
  1: { label: '中', color: 'text-amber-700 bg-amber-50', icon: '=' },
  0: { label: '低', color: 'text-blue-700 bg-blue-50', icon: '↓' },
};

const columns = [
  { id: 'waiting', name: '未着手' },
  { id: 'working', name: '進行中' },
  { id: 'done', name: '完了' },
];

export default function ProjectDetailPage({ params }: { params: Promise<{ project_id: string }> }) {
  const { project_id } = use(params);
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'summary'>('board');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLeaderOrAdmin, setIsLeaderOrAdmin] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) return;
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isProjectUuid = project_id && uuidRegex.test(project_id) && project_id !== 'admin-project';

      if (!isProjectUuid) {
        console.warn('Skipping fetch: project_id is not a valid UUID', project_id);
        setLoading(false);
        return;
      }

      const [pRes, tRes, mRes] = await Promise.all([
        supabase.from('projects').select('project_id, project_name').eq('project_id', project_id).single(),
        supabase.from('tasks').select('*, users(user_name)').eq('project_id', project_id).order('created_at', { ascending: false }),
        supabase.from('project_members').select('user_id, role, users(user_name)').eq('project_id', project_id).neq('role', 'pending')
      ]);

      if (pRes.data) setProject(pRes.data as unknown as Project);
      if (tRes.data) setAllTasks(tRes.data as unknown as Task[]);
      if (mRes.data) {
        setMembers(mRes.data as unknown as Member[]);
        const isAdmin = session.user_name === 'admin';
        const isLeader = mRes.data.some(m => m.user_id === session.user_id && m.role === 'leader');
        setIsLeaderOrAdmin(isAdmin || isLeader);
        setCurrentUserId(session.user_id);
        setCurrentUserName(session.user_name);
      }
    } catch (err) { console.error('Fetch failed:', err); }
    finally { setLoading(false); }
  }, [project_id, supabase]);

  useEffect(() => { if (mounted) void fetchData(); }, [mounted, fetchData]);

  // Handle auto-selection from query params
  useEffect(() => {
    if (mounted && !loading) {
      const taskId = searchParams.get('task');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (taskId && uuidRegex.test(taskId)) {
        setSelectedTaskId(taskId);
      }
    }
  }, [mounted, loading, searchParams]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return allTasks.find(t => t.task_id === selectedTaskId) || null;
  }, [allTasks, selectedTaskId]);

  const getSubtasks = (parentId: string) => allTasks.filter(t => t.parent_task_id === parentId);

  const updateTask = async (taskId: string, updates: any) => {
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

  const stats = useMemo(() => {
    const total = allTasks.length;
    const done = allTasks.filter(t => t.situation === 'done').length;
    const working = allTasks.filter(t => t.situation === 'working').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const memberStats = members.map(m => ({ ...m, taskCount: allTasks.filter(t => t.user_id === m.user_id).length }));
    return { total, done, working, progress, memberStats };
  }, [allTasks, members]);

  if (!mounted || loading) return <div className="p-20 text-center font-medium text-slate-400">読み込み中...</div>;
  if (!project) return <div className="p-20 text-center">プロジェクトが見つかりません。</div>;

  return (
    <div className="max-w-full px-6 py-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">{project.project_name}</h1>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            プロジェクト詳細
          </div>
        </div>
        {isLeaderOrAdmin && (
          <Link href={`/projects/${project_id}/tasks/new`} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-xs font-bold transition-all shadow-sm">
            課題を作成
          </Link>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-slate-50 p-1 rounded-md w-fit mb-6 border border-slate-200">
        <button onClick={() => setActiveTab('board')} className={`px-5 py-2 rounded text-xs font-bold transition-all ${activeTab === 'board' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>カンバンボード</button>
        <button onClick={() => setActiveTab('summary')} className={`px-5 py-2 rounded text-xs font-bold transition-all ${activeTab === 'summary' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>概要</button>
      </div>

      {activeTab === 'board' ? (
        <div className="flex gap-4 items-start overflow-x-auto pb-6">
          {columns.map((col) => (
            <div key={col.id} className="w-72 shrink-0 bg-slate-50/50 rounded border border-slate-200 p-2">
              <div className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                {col.name} <span className="text-slate-400">{allTasks.filter(t => !t.parent_task_id && (t.situation || 'waiting') === col.id).length}</span>
              </div>
              <div className="space-y-2 min-h-[50vh]">
                {allTasks.filter(t => !t.parent_task_id && (t.situation || 'waiting') === col.id).map((task) => (
                  <div key={task.task_id} onClick={() => setSelectedTaskId(task.task_id)} className="bg-white p-3 rounded shadow-sm border border-slate-200 hover:border-slate-300 transition-all cursor-pointer group">
                    <p className="text-sm font-medium text-slate-800 mb-3">{task.task_name}</p>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${priorityMap[task.priority ?? 0]?.color}`}>
                        {priorityMap[task.priority ?? 0]?.label}
                      </span>
                      <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                        {task.users?.user_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">進捗状況</h3>
              <div className="flex items-center gap-8">
                <div className="text-4xl font-bold text-slate-900">{stats.progress}%</div>
                <div className="flex-1 h-3 bg-slate-100 rounded-sm overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${stats.progress}%` }}></div>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 p-6 rounded text-white shadow-lg flex flex-col justify-center">
               <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4">タスク統計</h3>
               <div className="grid grid-cols-2 gap-4">
                 <div><span className="text-[10px] font-bold text-white/40 uppercase block mb-1">合計</span><span className="text-2xl font-bold">{stats.total}</span></div>
                 <div><span className="text-[10px] font-bold text-white/40 uppercase block mb-1">完了</span><span className="text-2xl font-bold text-green-400">{stats.done}</span></div>
               </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">チームメンバー</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100"><th className="px-6 py-3">メンバー</th><th className="px-6 py-3">役割</th><th className="px-6 py-3 text-center">ステータス</th></tr></thead>
                <tbody className="divide-y divide-slate-50">{stats.memberStats.map(m => {
                  const isMe = m.user_id === currentUserId || (m.users?.user_name?.toLowerCase().trim() === currentUserName?.toLowerCase().trim() && currentUserName !== null);
                  return (
                  <tr key={m.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-4">
                      <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-100">
                        {m.users?.user_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700">{m.users?.user_name}</span>
                        {isMe && <span className="text-[9px] font-medium text-indigo-500">自分</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${m.role === 'leader' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>
                        {m.role === 'leader' ? 'リーダー' : 'メンバー'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isMe ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-green-50 text-green-700 text-[10px] font-bold border border-green-100">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          ACTIVE
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300">OFFLINE</span>
                      )}
                    </td>
                  </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedTaskId && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-10" onClick={() => setSelectedTaskId(null)}>
          <div className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">説明</label>
                  <textarea disabled={!isLeaderOrAdmin} value={selectedTask.text || ''} onChange={(e) => updateTask(selectedTask.task_id, { text: e.target.value || null })} placeholder={isLeaderOrAdmin ? "説明を追加..." : ""} rows={6} className={`w-full p-3 rounded border border-transparent text-sm transition-all resize-none ${isLeaderOrAdmin ? 'hover:bg-slate-50 focus:bg-white focus:border-slate-200' : 'bg-transparent cursor-default'}`} />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">子タスク</h3>
                  {isLeaderOrAdmin && (
                    <form onSubmit={handleAddSubtask} className="flex gap-2 mb-4">
                      <input type="text" value={newSubtaskName} onChange={e => setNewSubtaskName(e.target.value)} placeholder="新しい子タスクを追加..." className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm outline-none focus:border-indigo-500 transition-all" />
                      <button type="submit" disabled={isAddingSubtask} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm font-bold transition-colors">追加</button>
                    </form>
                  )}
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[10px] text-slate-400 uppercase font-bold">
                          <th className="px-4 py-2">ステータス</th><th className="px-4 py-2">概要</th><th className="px-4 py-2">担当者</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {getSubtasks(selectedTask.task_id).map(sub => (
                          <tr key={sub.task_id} className="hover:bg-slate-50">
                            <td className="px-4 py-2">
                              <select disabled={!isLeaderOrAdmin} value={sub.situation || 'waiting'} onChange={(e) => updateTask(sub.task_id, { situation: e.target.value })} className="bg-slate-100 text-[10px] font-bold px-2 py-1 rounded border-none outline-none">
                                <option value="waiting">未着手</option><option value="working">進行中</option><option value="done">完了</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 font-medium">{sub.task_name}</td>
                            <td className="px-4 py-2 text-xs">
                              <select disabled={!isLeaderOrAdmin} value={sub.user_id || ''} onChange={(e) => updateTask(sub.task_id, { user_id: e.target.value || null })} className="bg-transparent border-none outline-none">
                                <option value="">未割り当て</option>
                                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.users?.user_name}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="w-72 p-8 border-l border-slate-200 bg-slate-50/30 overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">ステータス</label>
                    <select disabled={!isLeaderOrAdmin} value={selectedTask.situation || 'waiting'} onChange={(e) => updateTask(selectedTask.task_id, { situation: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500">
                      <option value="waiting">未着手</option><option value="working">進行中</option><option value="done">完了</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">担当者</label>
                    <select disabled={!isLeaderOrAdmin} value={selectedTask.user_id || ''} onChange={(e) => updateTask(selectedTask.task_id, { user_id: e.target.value || null })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm outline-none">
                      <option value="">未割り当て</option>
                      {members.map(m => <option key={m.user_id} value={m.user_id}>{m.users?.user_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">優先度</label>
                    <select disabled={!isLeaderOrAdmin} value={selectedTask.priority ?? 0} onChange={(e) => updateTask(selectedTask.task_id, { priority: parseInt(e.target.value) })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm outline-none">
                      <option value="2">高</option><option value="1">中</option><option value="0">低</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">期限日</label>
                    <input disabled={!isLeaderOrAdmin} type="date" value={selectedTask.due_date ? selectedTask.due_date.split('T')[0] : ''} onChange={(e) => updateTask(selectedTask.task_id, { due_date: e.target.value || null })} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm outline-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
