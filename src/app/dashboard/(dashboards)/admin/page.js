"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/SidebarLayout";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/utils";
import { 
  FolderKanban, 
  FileText, 
  CheckSquare, 
  Clock, 
  ArrowRight, 
  Plus, 
  TrendingUp, 
  Calendar,
  Users
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    projectsCount: 0,
    meetingsCount: 0,
    actionItemsCount: 0,
    nextMeeting: "No upcoming meetings",
  });
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (api.isAuthenticated()) {
      if (!api.isAdmin()) {
        router.push("/dashboard/employee"); // Block non-admins
        return;
      }
      loadDashboardData();
    }
  }, [router]);

  async function loadDashboardData() {
    try {
      const projectsUrl = process.env.NEXT_PUBLIC_PROJECTS || "http://localhost:8000/api/projects/";
      const meetingsUrl = process.env.NEXT_PUBLIC_MEETINGS || "http://localhost:8000/api/meetings/";
      
      const [projects, meetings] = await Promise.all([
        api.get(projectsUrl),
        api.get(meetingsUrl),
      ]);

      // Count action items across all meetings
      let openActionsCount = 0;
      meetings.forEach(meeting => {
        if (meeting.action_items && Array.isArray(meeting.action_items)) {
          openActionsCount += meeting.action_items.filter(item => !item.completed).length;
        }
      });

      // Find next upcoming meeting (date is in the future relative to now)
      const todayStr = new Date().toISOString().split('T')[0];
      const upcoming = meetings
        .filter(m => m.date >= todayStr)
        .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

      let nextMeetingText = "No upcoming meetings";
      if (upcoming.length > 0) {
        const next = upcoming[0];
        nextMeetingText = `${next.title} on ${next.date}`;
      }

      setStats({
        projectsCount: projects.length,
        meetingsCount: meetings.length,
        actionItemsCount: openActionsCount,
        nextMeeting: nextMeetingText,
      });

      setRecentMeetings(meetings.slice(0, 5));
    } catch (err) {
      console.error(err);
      setError("Could not load dashboard metrics from backend.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <p className="text-slate-400 font-medium">Fetching admin workspace statistics...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      {/* Title section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Administrator Overview</h2>
          <p className="text-slate-400 text-sm mt-1">Real-time metrics for your projects and minutes of meetings.</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/dashboard/meetings/new"
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-lg shadow-lg shadow-indigo-500/25 active:transform active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            <span>Create MOM</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-sm">
          {error} Verify that your Django server is running at port 8000 and PostgreSQL is accessible.
        </div>
      )}

      {/* Grid of Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl shadow-xl flex items-center space-x-5 backdrop-blur-md">
          <div className="h-12 w-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Projects</span>
            <span className="block text-2xl font-bold text-white mt-1">{stats.projectsCount}</span>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl shadow-xl flex items-center space-x-5 backdrop-blur-md">
          <div className="h-12 w-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Meetings Tracked</span>
            <span className="block text-2xl font-bold text-white mt-1">{stats.meetingsCount}</span>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl shadow-xl flex items-center space-x-5 backdrop-blur-md">
          <div className="h-12 w-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <CheckSquare className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Actions</span>
            <span className="block text-2xl font-bold text-white mt-1">{stats.actionItemsCount}</span>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl shadow-xl flex items-center space-x-5 backdrop-blur-md">
          <div className="h-12 w-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Clock className="h-6 w-6" />
          </div>
          <div className="overflow-hidden">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">Next Up</span>
            <span className="block text-sm font-semibold text-white mt-1.5 truncate" title={stats.nextMeeting}>
              {stats.nextMeeting}
            </span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout splits: Recent Meetings & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Meetings (Cols 2) */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-white">Recent Meetings</h3>
            <Link
              href="/dashboard/meetings"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1.5 group transition-colors duration-200"
            >
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </div>

          {recentMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
              <Calendar className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">No meetings recorded yet.</p>
              <Link
                href="/dashboard/meetings/new"
                className="text-xs font-semibold text-indigo-400 hover:underline mt-2"
              >
                Log your first meeting minutes
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="group bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 p-5 rounded-lg transition-all duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0"
                >
                  <div className="space-y-1">
                    <span className="inline-block text-[10px] uppercase font-bold text-indigo-400 tracking-wider bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      {meeting.project?.name || "Uncategorized"}
                    </span>
                    <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors duration-200">
                      {meeting.title}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Organized by <span className="text-slate-300 font-medium">{meeting.organizer?.username}</span> • {meeting.date} at {formatTime(meeting.time)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    {meeting.action_items && meeting.action_items.length > 0 && (
                      <span className="text-xs text-slate-400 bg-slate-850 px-2.5 py-1 rounded-md">
                        {meeting.action_items.filter(i => !i.completed).length} open actions
                      </span>
                    )}
                    <Link
                      href={`/dashboard/meetings/${meeting.id}`}
                      className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-indigo-600 text-white rounded-md transition-colors duration-200"
                    >
                      View Minutes
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar panels on Dashboard: Productivity & Quick Info */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm flex flex-col">
            <h3 className="font-bold text-lg text-white mb-4">Workspace Navigation</h3>
            <div className="grid grid-cols-1 gap-3">
              <Link
                href="/dashboard/projects"
                className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-800 hover:border-indigo-500/30 rounded-lg hover:bg-slate-900/60 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <FolderKanban className="h-5 w-5 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">Project Categories</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 transform group-hover:translate-x-0.5 transition-all" />
              </Link>
              
              <Link
                href="/dashboard/users"
                className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-800 hover:border-indigo-500/30 rounded-lg hover:bg-slate-900/60 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">User Management</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 transform group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/dashboard/meetings/new"
                className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-800 hover:border-indigo-500/30 rounded-lg hover:bg-slate-900/60 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <Plus className="h-5 w-5 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">New Meeting Record</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 transform group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>

          <div className="bg-indigo-950/20 border border-indigo-850/40 rounded-xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"></div>
            <TrendingUp className="h-8 w-8 text-indigo-400 mb-4" />
            <h4 className="font-bold text-base text-white">Admin Controls Enabled</h4>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              As an administrator, you have full privileges to add users, configure project classifications, manage and delete minutes, and review team compliance action items.
            </p>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
