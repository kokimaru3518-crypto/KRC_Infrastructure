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

const situationMap: { [key: string]: { label: string, color: string } } = {
  'waiting': { label: '未着手', color: 'text-slate-500 bg-slate-50' },
  'working': { label: '進行中', color: 'text-indigo-600 bg-indigo-50' },
  'done': { label: '完了', color: 'text-green-600 bg-green-50' },
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
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'summary'>('board');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLeaderOrAdmin, setIsLeaderOrAdmin] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [taskDescription, setTaskDescription] = useState('');
  const [activeDragOverCol, setActiveDragOverCol] = useState<string | null>(null);

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
        supabase.from('project_members').select('user_id, role, users(user_name)').eq('project_id', project_id)
      ]);

      if (pRes.data) setProject(pRes.data as unknown as Project);
      if (tRes.data) setAllTasks(tRes.data as unknown as Task[]);
      if (mRes.data) {
        const allMembers = mRes.data as unknown as Member[];
        setMembers(allMembers.filter(m => m.role !== 'pending'));
        setPendingMembers(allMembers.filter(m => m.role === 'pending'));
        const isAdmin = session.user_name === 'admin';
        const isLeader = allMembers.some(m => m.user_id === session.user_id && m.role === 'leader');
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

  useEffect(() => {
    if (selectedTask) {
      setTaskDescription(selectedTask.text || '');
    } else {
      setTaskDescription('');
    }
  }, [selectedTask]);

  const isProjectMember = useMemo(() => {
    if (!currentUserId) return false;
    return isLeaderOrAdmin || members.some(m => m.user_id === currentUserId);
  }, [isLeaderOrAdmin, members, currentUserId]);

  const getSubtasks = (parentId: string) => allTasks.filter(t => t.parent_task_id === parentId);

  const handleApproveMember = async (userId: string) => {
    if (!isLeaderOrAdmin) return;
    const { error } = await supabase
      .from('project_members')
      .update({ role: 'member' })
      .eq('project_id', project_id)
      .eq('user_id', userId);

    if (error) {
      alert('承認に失敗しました: ' + error.message);
    } else {
      alert('メンバーを承認しました！');
      await fetchData();
    }
  };

  const handleRejectMember = async (userId: string) => {
    if (!isLeaderOrAdmin) return;
    if (!confirm('この申請を却下してもよろしいですか？')) return;
    
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', project_id)
      .eq('user_id', userId);

    if (error) {
      alert('却下に失敗しました: ' + error.message);
    } else {
      alert('申請を却下しました。');
      await fetchData();
    }
  };

  const updateTask = async (taskId: string, updates: any) => {
    if (!isLeaderOrAdmin) return;
    const { error } = await supabase.from('tasks').update(updates).eq('task_id', taskId);
    if (!error) await fetchData();
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (!isLeaderOrAdmin) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    if (!isLeaderOrAdmin) return;
    e.preventDefault();
    if (activeDragOverCol !== colId) {
      setActiveDragOverCol(colId);
    }
  };

  const handleDragLeave = () => {
    setActiveDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSituation: string) => {
    if (!isLeaderOrAdmin) return;
    e.preventDefault();
    setActiveDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = allTasks.find(t => t.task_id === taskId);
    if (task && (task.situation || 'waiting') !== targetSituation) {
      // 楽観的アップデートで操作感をサクサクにする
      setAllTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, situation: targetSituation } : t));
      await updateTask(taskId, { situation: targetSituation });
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProjectMember || !selectedTask || !newSubtaskName.trim() || isAddingSubtask) return;
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
    const waiting = total - done - working;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const memberStats = members.map(m => ({ ...m, taskCount: allTasks.filter(t => t.user_id === m.user_id).length }));
    
    const upcomingTasks = allTasks
      .filter(t => t.situation !== 'done' && t.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5);

    return { 
      total, done, working, waiting, progress, memberStats, upcomingTasks,
      doneP: total > 0 ? (done/total)*100 : 0,
      workingP: total > 0 ? (working/total)*100 : 0,
      waitingP: total > 0 ? (waiting/total)*100 : 0
    };
  }, [allTasks, members]);

  const getDaysRemaining = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = due.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: `${Math.abs(days)}日超過`, color: 'text-red-500' };
    if (days === 0) return { text: '本日', color: 'text-amber-600' };
    return { text: `残り${days}日`, color: 'text-slate-500' };
  };

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
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`w-72 shrink-0 bg-slate-50/50 rounded border p-2 transition-all duration-200 ${activeDragOverCol === col.id ? 'border-indigo-300 bg-indigo-50/20 shadow-sm' : 'border-slate-200'}`}
            >
              <div className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                {col.name} <span className="text-slate-400">{allTasks.filter(t => !t.parent_task_id && (t.situation || 'waiting') === col.id).length}</span>
              </div>
              <div className="space-y-2 min-h-[50vh]">
                {allTasks.filter(t => !t.parent_task_id && (t.situation || 'waiting') === col.id).map((task) => (
                  <div
                    key={task.task_id}
                    onClick={() => setSelectedTaskId(task.task_id)}
                    draggable={isLeaderOrAdmin}
                    onDragStart={(e) => handleDragStart(e, task.task_id)}
                    className={`bg-white p-3 rounded shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group select-none ${isLeaderOrAdmin ? 'cursor-grab active:cursor-grabbing hover:bg-slate-50/30' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <p className="text-sm font-medium text-slate-800 flex-1 leading-snug">{task.task_name}</p>
                      {task.due_date && (
                        <span className={`text-[9px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded shrink-0 ${new Date(task.due_date) < new Date() ? 'text-red-600 bg-red-50 border border-red-100' : 'text-slate-400 bg-slate-50 border border-slate-100'}`}>
                          {new Date(task.due_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${priorityMap[task.priority ?? 0]?.color}`}>
                        {priorityMap[task.priority ?? 0]?.label}
                      </span>
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 max-w-[150px]">
                        <div className="w-5 h-5 rounded bg-indigo-50 flex items-center justify-center text-[9px] font-bold text-indigo-600 border border-indigo-100 shrink-0">
                          {task.users?.user_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[80px]">
                          {task.users?.user_name || '未割り当て'}
                        </span>
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
            <div className="lg:col-span-2 bg-white p-8 rounded border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">進捗状況</h3>
              <div className="flex flex-col md:flex-row items-center justify-around gap-12">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="2.5"></circle>
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="2.5" strokeDasharray={`${stats.doneP} ${100 - stats.doneP}`} strokeDashoffset="0"></circle>
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#6366f1" strokeWidth="2.5" strokeDasharray={`${stats.workingP} ${100 - stats.workingP}`} strokeDashoffset={`-${stats.doneP}`}></circle>
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray={`${stats.waitingP} ${100 - stats.waitingP}`} strokeDashoffset={`-${stats.doneP + stats.workingP}`}></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-900">{stats.progress}%</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">完了</span>
                  </div>
                </div>
                <div className="flex-1 max-w-xs space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span><span className="text-slate-500 font-medium">完了</span></div>
                    <span className="font-bold">{stats.done}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span><span className="text-slate-500 font-medium">進行中</span></div>
                    <span className="font-bold">{stats.working}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-amber-500 rounded-full"></span><span className="text-slate-500 font-medium">未着手</span></div>
                    <span className="font-bold">{stats.waiting}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 p-6 rounded text-white shadow-lg flex flex-col">
               <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-6">期限間近のタスク</h3>
               {stats.upcomingTasks.length > 0 ? (
                 <div className="space-y-4 flex-1">
                   {stats.upcomingTasks.map(t => {
                     const remaining = getDaysRemaining(t.due_date!);
                     return (
                       <div key={t.task_id} onClick={() => setSelectedTaskId(t.task_id)} className="group cursor-pointer">
                         <div className="flex justify-between items-start mb-1">
                           <p className="text-xs font-semibold text-white/90 line-clamp-1 group-hover:text-indigo-400 transition-colors">{t.task_name}</p>
                           <span className={`text-[9px] font-bold shrink-0 ml-2 ${remaining.color}`}>{remaining.text}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${situationMap[t.situation || 'waiting']?.color.replace('text-', 'text-white/70 bg-').replace('bg-', 'bg-white/10')}`}>
                             {situationMap[t.situation || 'waiting']?.label}
                           </span>
                           <span className="text-[8px] text-white/30">{new Date(t.due_date!).toLocaleDateString('ja-JP')}</span>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-white/30 text-xs font-medium">
                   期限のある未完了タスクはありません
                 </div>
               )}
               <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                 <div><span className="text-[10px] font-bold text-white/40 uppercase block mb-1">合計</span><span className="text-xl font-bold">{stats.total}</span></div>
                 <div><span className="text-[10px] font-bold text-white/40 uppercase block mb-1">完了済</span><span className="text-xl font-bold text-green-400">{stats.done}</span></div>
               </div>
            </div>
          </div>

          {isLeaderOrAdmin && pendingMembers.length > 0 && (
            <div className="bg-white p-6 rounded border border-slate-200 shadow-sm overflow-hidden mb-6">
              <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-6">参加申請（承認待ち）</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
                      <th className="px-6 py-3">申請ユーザー</th>
                      <th className="px-6 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pendingMembers.map(m => (
                      <tr key={m.user_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-4">
                          <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center text-xs font-bold text-amber-600 border border-amber-100">
                            {m.users?.user_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-700">{m.users?.user_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveMember(m.user_id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold transition-all shadow-sm"
                            >
                              承認
                            </button>
                            <button
                              onClick={() => handleRejectMember(m.user_id)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded text-xs font-bold transition-all"
                            >
                              却下
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                  <textarea
                    disabled={!isLeaderOrAdmin}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    onBlur={() => {
                      if (selectedTask && taskDescription !== (selectedTask.text || '')) {
                        void updateTask(selectedTask.task_id, { text: taskDescription || null });
                      }
                    }}
                    placeholder={isLeaderOrAdmin ? "説明を追加..." : ""}
                    rows={6}
                    className={`w-full p-3 rounded border border-transparent text-sm transition-all resize-none ${isLeaderOrAdmin ? 'hover:bg-slate-50 focus:bg-white focus:border-slate-200' : 'bg-transparent cursor-default'}`}
                  />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">子タスク</h3>
                  {isProjectMember && (
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
