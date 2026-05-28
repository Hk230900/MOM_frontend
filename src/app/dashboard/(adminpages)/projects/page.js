"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/SidebarLayout";
import { api } from "@/lib/api";
import { FolderKanban, Plus, Calendar, FileText, CheckCircle2, AlertCircle } from "lucide-react";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadProjects() {
    try {
      const projectsUrl = process.env.NEXT_PUBLIC_PROJECTS || 'http://localhost:8000/api/projects/';
      const data = await api.get(projectsUrl);
      setProjects(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch projects from backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (api.isAuthenticated()) {
      if (!api.isAdmin()) {
        router.push("/dashboard/employee"); // Only Admins can view this page
      } else {
        loadProjects();
      }
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitLoading(true);
    setError("");
    setSuccess("");

    try {
      const projectsUrl = process.env.NEXT_PUBLIC_PROJECTS || 'http://localhost:8000/api/projects/';
      const newProj = await api.post(projectsUrl, {
        name: name.trim(),
        description: description.trim() || "",
      });
      setProjects([newProj, ...projects]);
      setName("");
      setDescription("");
      setSuccess(`Project "${newProj.name}" created successfully!`);
      
      // Auto clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      console.error(err);
      if (err.details && err.details.name) {
        setError(`Error: A project with this name already exists.`);
      } else {
        setError("Failed to save project. Please try again.");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-wide">Project Categories</h2>
        <p className="text-slate-400 text-sm">Create and organize project categories for grouping meeting minutes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Create Form */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm">
          <h3 className="font-bold text-lg text-white mb-5 flex items-center space-x-2">
            <Plus className="h-5 w-5 text-indigo-400" />
            <span>Add New Project</span>
          </h3>

          {error && (
            <div className="mb-4 flex items-start space-x-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-300 text-xs">
              <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start space-x-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-300 text-xs">
              <CheckCircle2 className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website Redesign"
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a brief summary of the project scope..."
                rows="4"
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all duration-200 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/25 active:transform active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
            >
              {submitLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <span>Save Project</span>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Projects List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-white">Active Projects ({projects.length})</h3>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center border border-slate-800 rounded-xl bg-slate-900/10">
              <div className="flex flex-col items-center space-y-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                <p className="text-slate-400 text-xs font-medium">Loading project catalog...</p>
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-800 rounded-xl bg-slate-900/20 text-center px-4">
              <FolderKanban className="h-10 w-10 text-slate-600 mb-3" />
              <h4 className="text-sm font-semibold text-white">No projects categories found</h4>
              <p className="text-slate-400 text-xs mt-1 max-w-sm">
                Create your first project category using the form on the left to start organizing your meetings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl hover:border-indigo-500/30 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-base truncate" title={project.name}>
                      {project.name}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-3 min-h-[48px]">
                      {project.description || "No description provided."}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-indigo-400">
                      <FileText className="h-3.5 w-3.5" />
                      <span>MOM Category</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
