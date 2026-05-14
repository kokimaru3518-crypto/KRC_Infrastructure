'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../supabase/client';
import Link from 'next/link';

export default function NewProjectPage() {
  const [projectName, setProjectName] = useState('');
  const [text, setText] = useState('');
  const [initialMembers, setInitialMembers] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const uid = localStorage.getItem('krc_user_id');
    if (!uid) {
      router.push('/');
      return;
    }
    setUserId(uid);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    // user_name から実際の UUID を取得する
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_name', userId)
      .single();

    if (userError || !userData) {
      setError('ユーザー情報の取得に失敗しました: ' + userError?.message);
      return;
    }
    const leaderUUID = userData.user_id;

    const newProjectId = crypto.randomUUID();

    const { error: projectError } = await supabase
      .from('projects')
      .insert({
        project_id: newProjectId,
        project_name: projectName,
        text: text,
      });

    if (projectError) {
      setError('Failed to create project: ' + projectError.message);
      return;
    }

    const membersToInsert: { project_id: string; user_id: string; role: string }[] = [
      { project_id: newProjectId, user_id: leaderUUID, role: 'leader' }
    ];

    if (initialMembers.trim()) {
      const memberNames = initialMembers.split(',').map(id => id.trim()).filter(id => id);
      for (const mName of memberNames) {
        // 追加メンバーも user_name → UUID に解決する
        const { data: mData } = await supabase
          .from('users')
          .select('user_id')
          .eq('user_name', mName)
          .single();
        // 自分自身（leader）と重複する場合はスキップ
        if (mData && mData.user_id !== leaderUUID) {
          membersToInsert.push({ project_id: newProjectId, user_id: mData.user_id, role: 'member' });
        }
      }
    }

    const { error: memberError } = await supabase
      .from('project_members')
      .insert(membersToInsert);

    if (memberError) {
      setError('Failed to add members: ' + memberError.message);
    } else {
      router.push('/projects');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto mt-10">
      <Link href="/projects" className="text-sm font-medium text-[#5E6C84] hover:underline mb-8 inline-block">
        &larr; Back to projects
      </Link>

      <div className="bg-white rounded border border-[#DFE1E6] shadow-sm">
        <div className="p-6 border-b border-[#DFE1E6]">
          <h1 className="text-2xl font-bold text-[#172B4D]">Create project</h1>
        </div>

        <div className="p-6 pt-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded text-sm" role="alert">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#172B4D] mb-1.5">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm border border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-1 focus:ring-[#4C9AFF] bg-[#FAFBFC] hover:bg-[#EBECF0] transition-colors outline-none"
                placeholder="Try a team name, project goal, milestone..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#172B4D] mb-1.5">Description</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm border border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-1 focus:ring-[#4C9AFF] bg-[#FAFBFC] hover:bg-[#EBECF0] transition-colors outline-none h-24 resize-y"
                placeholder="What is this project about?"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#172B4D] mb-1.5">Initial team members</label>
              <input
                type="text"
                value={initialMembers}
                onChange={(e) => setInitialMembers(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm border border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-1 focus:ring-[#4C9AFF] bg-[#FAFBFC] hover:bg-[#EBECF0] transition-colors outline-none"
                placeholder="e.g. alice, bob (comma separated IDs)"
              />
              <p className="text-xs text-[#5E6C84] mt-1.5">You will automatically be added as the Project Lead.</p>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push('/projects')}
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
