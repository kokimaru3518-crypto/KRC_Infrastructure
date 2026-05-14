'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../supabase/client';
import Link from 'next/link';

type Project = {
  project_id: string;
  project_name: string;
  text: string | null;
  created_at: string | null;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('krc_user_id');
  });
  const [error, setError] = useState('');
  const router = useRouter();
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
    if (!userId) {
      router.push('/');
      return;
    }
    if (!initialized.current) {
      initialized.current = true;
      void fetchProjects();
    }
  }, [userId, router, fetchProjects]);

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
    if (!userId) return;

    const { error: sbError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: userId,
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

  if (!userId) return null;

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#172B4D]">Projects</h1>
        <Link
          href="/projects/new"
          className="bg-[#0052CC] hover:bg-[#0047b3] text-white font-medium py-1.5 px-3 rounded shadow-sm text-sm transition-colors"
        >
          Create project
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded text-sm shrink-0" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Projects List / Table Style */}
      <div className="bg-white border border-[#DFE1E6] rounded-sm shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-[#091E42]">
          <thead className="bg-[#F4F5F7] text-[#5E6C84] border-b border-[#DFE1E6]">
            <tr>
              <th className="font-semibold py-3 px-6 w-1/3">Name</th>
              <th className="font-semibold py-3 px-6 w-1/3">Description</th>
              <th className="font-semibold py-3 px-6">Created date</th>
              <th className="font-semibold py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[#5E6C84]">
                  No projects found. Create one to get started.
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={project.project_id} className="border-b border-[#DFE1E6] hover:bg-[#FAFBFC] transition-colors group">
                  <td className="py-4 px-6 font-medium text-[#0052CC]">
                    <Link href={`/projects/${project.project_id}`} className="hover:underline">
                      {project.project_name}
                    </Link>
                  </td>
                  <td className="py-4 px-6 truncate max-w-[300px]">
                    {project.text || <span className="text-[#97A0AF] italic">No description</span>}
                  </td>
                  <td className="py-4 px-6 text-[#5E6C84]">
                    {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleJoinRequest(project.project_id, e)}
                        className="text-[#42526E] hover:bg-[#EBECF0] p-1.5 rounded transition-colors"
                        title="Join Project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                      </button>
                      <button
                        onClick={(e) => handleDelete(project.project_id, e)}
                        className="text-[#DE350B] hover:bg-[#FFEBE6] p-1.5 rounded transition-colors"
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
