'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '../../supabase/client';
import { getSession, type Session } from '../../lib/session';
import Link from 'next/link';

type Project = {
  project_id: string;
  project_name: string;
  text: string | null;
  created_at: string | null;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const supabase = useMemo(() => createClient(), []);

  const fetchProjects = useCallback(async () => {
    const { data, error: sbError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (sbError) {
      setError(sbError.message);
    } else {
      setProjects(data || []);
    }
  }, [supabase]);

  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      getSession().then((s) => {
        if (s) {
          setSession(s);
          void fetchProjects();
        }
      });
    }
  }, [fetchProjects]);

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;

    const { error: sbError } = await supabase
      .from('projects')
      .delete()
      .eq('project_id', projectId);

    if (sbError) {
      setError('Failed to delete: ' + sbError.message);
    } else {
      fetchProjects();
    }
  };

  const handleJoinRequest = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) return;

    // session.user_id は UUID なのでそのまま挿入できる
    const { error: sbError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: session.user_id,
        role: 'pending',
      });

    if (sbError) {
      if (sbError.code === '23505') {
        alert('You have already joined or requested to join this project.');
      } else {
        setError('Request failed: ' + sbError.message);
      }
    } else {
      alert('Join request sent successfully!');
    }
  };

  if (!session) return null;

  return (
    <div className="p-8 max-w-[1200px] mx-auto mt-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Projects</h1>
        <Link
          href="/projects/new"
          className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Create project
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm text-sm shrink-0" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Projects List / Table Style */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-800">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-xs">
            <tr>
              <th className="font-semibold py-4 px-6 w-1/3">Name</th>
              <th className="font-semibold py-4 px-6 w-1/3">Description</th>
              <th className="font-semibold py-4 px-6">Created date</th>
              <th className="font-semibold py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-500 bg-white">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    <p className="text-base font-medium text-slate-600">No projects found</p>
                    <p className="mt-1">Create one to get started.</p>
                  </div>
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={project.project_id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-4 px-6 font-semibold text-indigo-600">
                    <Link href={`/projects/${project.project_id}`} className="hover:text-indigo-800 hover:underline">
                      {project.project_name}
                    </Link>
                  </td>
                  <td className="py-4 px-6 truncate max-w-[300px]">
                    {project.text || <span className="text-slate-400 italic">No description</span>}
                  </td>
                  <td className="py-4 px-6 text-slate-500">
                    {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleJoinRequest(project.project_id, e)}
                        className="text-slate-500 hover:bg-slate-200 hover:text-slate-800 p-2 rounded-lg transition-colors"
                        title="Join Project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                      </button>
                      <button
                        onClick={(e) => handleDelete(project.project_id, e)}
                        className="text-red-500 hover:bg-red-50 hover:text-red-700 p-2 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
