"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/SidebarLayout";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/utils";
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  Filter, 
  ChevronRight, 
  User,
  AlertCircle
} from "lucide-react";

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    async function loadMeetingsData() {
      try {
        const [meetingsData, projectsData] = await Promise.all([
          api.get(process.env.NEXT_PUBLIC_MEETINGS || "http://localhost:8000/api/meetings/"),
          api.get(process.env.NEXT_PUBLIC_PROJECTS || "http://localhost:8000/api/projects/"),
        ]);
        setMeetings(meetingsData);
        setProjects(projectsData);
      } catch (err) {
        console.error(err);
        setError("Failed to retrieve meeting reports from the backend server.");
      } finally {
        setLoading(false);
      }
    }

    if (api.isAuthenticated()) {
      loadMeetingsData();
    }
  }, []);

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch = 
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meeting.minutes && meeting.minutes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesProject = 
      !selectedProjectId || 
      (meeting.project && meeting.project.id === parseInt(selectedProjectId));
    
    const matchesDate = 
      !selectedDate || 
      meeting.date === selectedDate;

    return matchesSearch && matchesProject && matchesDate;
  });

  return (
    <SidebarLayout>
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Meeting Logbook</h2>
          <p className="text-slate-400 text-sm mt-1">Review discussion notes and action assignees from past meetings.</p>
        </div>
        <div>
          <Link
            href="/dashboard/meetings/new"
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-lg shadow-lg shadow-indigo-500/25 active:transform active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            <span>Record MOM</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter panel */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl shadow-md backdrop-blur-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings by title or content..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
          />
        </div>

        {/* Project category filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
            <Filter className="h-4 w-4" />
          </span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm transition-all appearance-none cursor-pointer"
          >
            <option value="">All Projects</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
            <Calendar className="h-4 w-4" />
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm transition-all cursor-pointer"
          />
        </div>
      </div>

      {/* Meetings Grid / Table */}
      {loading ? (
        <div className="flex h-60 items-center justify-center border border-slate-800 rounded-xl bg-slate-900/10">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
            <p className="text-slate-400 text-xs font-medium">Fetching minutes catalog...</p>
          </div>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-850 rounded-xl bg-slate-900/20 text-center px-4">
          <FileText className="h-12 w-12 text-slate-600 mb-3" />
          <h4 className="text-base font-semibold text-white">No meetings found</h4>
          <p className="text-slate-400 text-xs mt-1 max-w-sm">
            Try adjusting your search keywords, project filter, or record a new meeting.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="divide-y divide-slate-850">
            {filteredMeetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/dashboard/meetings/${meeting.id}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 hover:bg-slate-900/50 transition-all duration-200 group"
              >
                <div className="space-y-1.5 max-w-2xl pr-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                      {meeting.project?.name || "Uncategorized"}
                    </span>
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="text-xs text-slate-400 font-medium">
                      {meeting.date} at {formatTime(meeting.time)}
                    </span>
                  </div>
                  
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors duration-200">
                    {meeting.title}
                  </h3>

                  {meeting.agenda && (
                    <p className="text-xs text-slate-400 truncate line-clamp-1 max-w-xl">
                      <span className="font-semibold text-slate-300">Agenda:</span> {meeting.agenda}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-6 mt-4 sm:mt-0 flex-shrink-0">
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <User className="h-4 w-4 text-slate-500" />
                    <span>
                      Org: <strong className="text-slate-300">{meeting.organizer?.username}</strong>
                    </span>
                  </div>

                  {meeting.action_items && meeting.action_items.length > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-850 border border-slate-800 rounded-md text-indigo-300 flex-shrink-0">
                      {meeting.action_items.length} Action{meeting.action_items.length > 1 ? "s" : ""}
                    </span>
                  )}

                  <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-white transform group-hover:translate-x-0.5 transition-all duration-200 hidden sm:block" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
