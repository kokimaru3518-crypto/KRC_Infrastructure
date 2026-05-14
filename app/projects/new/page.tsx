'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../supabase/client';
import Link from 'next/link';

export default function NewProjectPage() {
  const [projectName, setProjectName] = useState('');
  const [text, setText] = useState('');
  const [initialMembers, setInitialMembers] = useState(''); // カンマ区切りのuser_idを想定
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserId(uid);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    // 1. projectsテーブルに登録 (project_idとcreated_atはDB側で自動生成を想定)
    // ただしschema定義を見ると project_id に DEFAULT が無い場合がある。UUID生成が必要かも。
    // supabase/client経由でuuidを生成して入れる。
    const newProjectId = crypto.randomUUID();

    const { error: projectError } = await supabase
      .from('projects')
      .insert({
        project_id: newProjectId,
        project_name: projectName,
        text: text,
      });

    if (projectError) {
      setError('プロジェクト作成に失敗しました: ' + projectError.message);
      return;
    }

    // 2. 作成者をproject_membersに登録 (role = 'leader')
    const membersToInsert = [
      { project_id: newProjectId, user_id: userId, role: 'leader' }
    ];

    // 初期メンバーが入力されている場合追加
    if (initialMembers.trim()) {
      const memberIds = initialMembers.split(',').map(id => id.trim()).filter(id => id);
      for (const mId of memberIds) {
        membersToInsert.push({ project_id: newProjectId, user_id: mId, role: 'member' });
      }
    }

    const { error: memberError } = await supabase
      .from('project_members')
      .insert(membersToInsert);

    if (memberError) {
      setError('メンバーの登録に失敗しました: ' + memberError.message);
    } else {
      router.push('/projects');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/projects" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-semibold mb-8 transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Projects
        </Link>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8">
            <h1 className="text-3xl font-extrabold text-white">Create New Project</h1>
            <p className="text-indigo-100 mt-2 opacity-90">Start a new initiative and invite your team</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg" role="alert">
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Project Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-slate-50 focus:bg-white"
                  placeholder="e.g. Website Redesign"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-slate-50 focus:bg-white h-32 resize-none"
                  placeholder="Describe the goals and scope of this project..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Initial Members (User IDs)</label>
                <input
                  type="text"
                  value={initialMembers}
                  onChange={(e) => setInitialMembers(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-slate-50 focus:bg-white"
                  placeholder="e.g. alice@gmail.com, bob@gmail.com (comma separated)"
                />
                <p className="text-xs text-slate-500 mt-2">You will automatically be added as the Project Leader.</p>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/projects')}
                  className="mr-4 px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
