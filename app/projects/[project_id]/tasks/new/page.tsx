'use client';

import { useState, useEffect, use, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../../supabase/client';
import Link from 'next/link';

export default function NewTaskPage({ params }: { params: Promise<{ project_id: string }> }) {
  const { project_id } = use(params);
  const [taskName, setTaskName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<number>(0);
  const [members, setMembers] = useState<{ user_id: string }[]>([]);
  const [error, setError] = useState('');
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchMembers = useCallback(async () => {
    const currentUserId = localStorage.getItem('krc_user_id');
    if (!currentUserId) {
      router.push('/');
      return;
    }

    // admin はリーダーチェックをバイパス
    const isAdmin = currentUserId === 'admin';

    const { data } = await supabase
      .from('project_members')
      .select('user_id, role')
      .eq('project_id', project_id)
      .neq('role', 'pending');

    if (data) {
      const isLeader = isAdmin || data.some(m => m.user_id === currentUserId && m.role === 'leader');
      if (!isLeader) {
        router.push(`/projects/${project_id}`);
        return;
      }
      setMembers(data);
      setIsCheckingUser(false);
    }
  }, [project_id, supabase, router]);

  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void fetchMembers();
    }
  }, [fetchMembers]);

  if (isCheckingUser) return <div className="p-8 text-[#5E6C84]">Loading...</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newTaskId = crypto.randomUUID();

    const { error: sbError } = await supabase
      .from('tasks')
      .insert({
        task_id: newTaskId,
        task_name: taskName,
        user_id: assignee || null,
        project_id: project_id,
        priority: priority,
        situation: 'waiting',
      });

    if (sbError) {
      setError('Failed to create issue: ' + sbError.message);
    } else {
      router.push(`/projects/${project_id}`);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto mt-10">
      <Link href={`/projects/${project_id}`} className="text-sm font-medium text-[#5E6C84] hover:underline mb-8 inline-block">
        &larr; Back to board
      </Link>

      <div className="bg-white rounded border border-[#DFE1E6] shadow-sm">
        <div className="p-6 border-b border-[#DFE1E6]">
          <h1 className="text-2xl font-bold text-[#172B4D]">Create issue</h1>
        </div>

        <div className="p-6 pt-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded text-sm" role="alert">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#172B4D] mb-1.5">Summary <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm border border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-1 focus:ring-[#4C9AFF] bg-[#FAFBFC] hover:bg-[#EBECF0] transition-colors outline-none"
                placeholder="What needs to be done?"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-[#172B4D] mb-1.5">Assignee</label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm border border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-1 focus:ring-[#4C9AFF] bg-[#FAFBFC] hover:bg-[#EBECF0] transition-colors outline-none"
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.user_id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#172B4D] mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded text-sm border border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-1 focus:ring-[#4C9AFF] bg-[#FAFBFC] hover:bg-[#EBECF0] transition-colors outline-none"
                >
                  <option value={0}>Low (0)</option>
                  <option value={1}>Medium (1)</option>
                  <option value={2}>High (2)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push(`/projects/${project_id}`)}
                className="px-4 py-2 font-medium text-[#42526E] hover:bg-[#EBECF0] rounded transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#0052CC] hover:bg-[#0047b3] text-white font-medium py-2 px-4 rounded text-sm transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
