"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/SidebarLayout";
import { api } from "@/lib/api";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  FileText,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

export default function NewMeetingPage() {
  const router = useRouter();

  // Data lists
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Form states
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [organizerId, setOrganizerId] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [agenda, setAgenda] = useState("");
  const [minutes, setMinutes] = useState("");

  // Action Items states
  const [actionItems, setActionItems] = useState([]);
  const [newActionText, setNewActionText] = useState("");
  const [newActionAssignee, setNewActionAssignee] = useState("");

  // Loading & feedback
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadFormResources() {
      try {
        const projectsUrl = process.env.NEXT_PUBLIC_PROJECTS || 'http://localhost:8000/api/projects/';
        const usersUrl = process.env.NEXT_PUBLIC_USERS || 'http://localhost:8000/api/users/';
        const [projData, userData] = await Promise.all([
          api.get(projectsUrl),
          api.get(usersUrl),
        ]);

        setProjects(projData);
        setUsers(userData);

        // Prepopulate date and time with current local values
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);

        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        setTime(`${hh}:${min}`);

        // Try to identify current logged in user to default organizer
        const loggedInUsername = api.getUsername();
        const current = userData.find(u => u.emailid === loggedInUsername);

        if (current) {
          setCurrentUserId(current.user_id);
          setOrganizerId(current.user_id);
        } else if (userData.length > 0) {
          setOrganizerId(userData[0].user_id);
        }

        if (projData.length > 0) {
          setProjectId(projData[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load project categories or system users from backend.");
      } finally {
        setLoading(false);
      }
    }

    if (api.isAuthenticated()) {
      loadFormResources();
    }
  }, []);

  const handleAttendeeToggle = (userId) => {
    if (selectedAttendees.includes(userId)) {
      setSelectedAttendees(selectedAttendees.filter(id => id !== userId));
    } else {
      setSelectedAttendees([...selectedAttendees, userId]);
    }
  };

  const addActionItem = () => {
    if (!newActionText.trim()) return;

    const assigneeUser = users.find(
      u => u.user_id === parseInt(newActionAssignee)
    );
    const newItem = {
      id: Date.now(), // Local key
      text: newActionText.trim(),
      assignee_id: assigneeUser ? assigneeUser.user_id : null,
      assignee_name: assigneeUser ? (assigneeUser.first_name || assigneeUser.last_name ? `${assigneeUser.first_name || ""} ${assigneeUser.last_name || ""}`.trim() : (assigneeUser.emailid || assigneeUser.username)) : "Unassigned",
      completed: false
    };

    setActionItems([...actionItems, newItem]);
    setNewActionText("");
    setNewActionAssignee("");
  };

  const removeActionItem = (id) => {
    setActionItems(actionItems.filter(item => item.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!projectId) {
      setError("Please select a project category. If none exist, create one first.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a meeting title.");
      return;
    }

    setSubmitLoading(true);
    setError("");
    setSuccess("");

    // Structure action items for Django backend
    const formattedActionItems = actionItems.map(({ id, text, assignee_id, assignee_name, completed }) => ({
      id,
      text,
      assignee_id,
      assignee_name,
      completed
    }));

    const meetingPayload = {
      project: parseInt(projectId),
      title: title.trim(),
      date,
      time: time.length === 5 ? `${time}:00` : time, // Ensure HH:MM:SS format
      organizer: parseInt(organizerId),
      attendees: selectedAttendees.map(id => parseInt(id)),
      agenda: agenda.trim() || "",
      minutes: minutes.trim() || "",
      action_items: formattedActionItems
    };

    try {
      const meetingsUrl = process.env.NEXT_PUBLIC_MEETINGS || 'http://localhost:8000/api/meetings/';
      await api.post(meetingsUrl, meetingPayload);
      setSuccess("Meeting minutes saved successfully!");

      setTimeout(() => {
        router.push("/dashboard/meetings");
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save meeting minutes. Check your form inputs.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <p className="text-slate-400 font-medium">Preparing meeting records console...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      {/* Header with back navigation */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4 border-b border-slate-850">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Link href="/dashboard/meetings" className="hover:text-indigo-400 flex items-center space-x-1.5 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Meetings</span>
            </Link>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Record Meeting Minutes</h2>
        </div>
      </div>

      {error && (
        <div className="flex items-start space-x-2.5 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-300 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start space-x-2.5 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-300 text-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{success} Redirecting to workspace...</span>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-800 rounded-xl bg-slate-900/20 text-center px-4">
          <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
          <h4 className="text-sm font-semibold text-white">No Project Categories Found</h4>
          <p className="text-slate-400 text-xs mt-1 max-w-sm">
            Before recording meeting minutes, you must define at least one project category to organize it under.
          </p>
          <Link
            href="/dashboard/projects"
            className="mt-4 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md transition-all"
          >
            Create a Project Category
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main fields (Left 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm space-y-5">
              <h3 className="font-bold text-base text-white border-b border-slate-850 pb-3 flex items-center space-x-2.5">
                <FileText className="h-5 w-5 text-indigo-400" />
                <span>Meeting Context & Minutes</span>
              </h3>

              {/* Title & Project Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Project Category
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm transition-all"
                    required
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Meeting Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sync-up / Sprint Planning"
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Date</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Time</span>
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* Agenda Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Agenda / Objective
                </label>
                <textarea
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  placeholder="Outline the main topics discussed..."
                  rows="3"
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all resize-none"
                />
              </div>

              {/* Minutes of Meeting Editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Minutes of Meeting (MOM Content)
                </label>
                <textarea
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="Detailed logs of discussions, conclusions, and key points..."
                  rows="8"
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* Action Items section */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm space-y-4">
              <h3 className="font-bold text-base text-white border-b border-slate-850 pb-3 flex items-center space-x-2.5">
                <Plus className="h-5 w-5 text-indigo-400" />
                <span>Action Items & Assignees</span>
              </h3>

              {/* Add Action Item Sub-form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-slate-950/40 p-4 border border-slate-850 rounded-lg">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Action Description
                  </label>
                  <input
                    type="text"
                    value={newActionText}
                    onChange={(e) => setNewActionText(e.target.value)}
                    placeholder="e.g. Design homepage layout mockup"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Assignee
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={newActionAssignee}
                      onChange={(e) => setNewActionAssignee(e.target.value)}
                      className="flex-1 px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-md text-white focus:outline-none focus:border-indigo-500 text-xs transition-all"
                    >
                      <option value="">Select...</option>
                      {users.map((u) => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : (u.emailid || u.username || "User")}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addActionItem}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-md shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Items List */}
              {actionItems.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-4 border border-dashed border-slate-850 rounded-lg">
                  No action items assigned to this meeting yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-slate-950/30 border border-slate-850 p-3 rounded-lg hover:border-slate-700/60 transition-all"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-white">{item.text}</p>
                        <p className="text-[10px] text-slate-400">
                          Assignee: <span className="text-indigo-400">{item.assignee_name}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeActionItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar components (Right 1 column) */}
          <div className="space-y-6">
            {/* Roles Selection (Organizer & Attendees) */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm space-y-5">
              <h3 className="font-bold text-base text-white border-b border-slate-850 pb-3 flex items-center space-x-2.5">
                <Users className="h-5 w-5 text-indigo-400" />
                <span>Attendance Roles</span>
              </h3>

              {/* Organizer Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Organizer</span>
                </label>
                <select
                  value={organizerId}
                  onChange={(e) => setOrganizerId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm transition-all"
                  required
                >
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : (u.emailid || u.username || "User")} ({u.emailid || u.username || "User"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Attendees List Checkbox */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Attendees</span>
                </label>
                <div className="border border-slate-800 bg-slate-950/60 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2.5">
                  {users.map((u) => (
                    <label
                      key={u.user_id}
                      className="flex items-center space-x-3.5 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAttendees.includes(u.user_id)}
                        onChange={() => handleAttendeeToggle(u.user_id)}
                        className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>{u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : (u.emailid || u.username || "User")}</span>
                    </label>
                  ))}
                  {users.length === 0 && (
                    <p className="text-slate-500 text-xs text-center">No attendees available.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Save Action Form Card */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm space-y-4">
              <h4 className="font-bold text-sm text-white">Ready to Save?</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Confirm your minutes and assigned action items. Saving will sync this record with the secure PostgreSQL server.
              </p>
              <button
                type="submit"
                disabled={submitLoading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/25 active:transform active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
              >
                {submitLoading ? (
                  <>
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Saving Minutes...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4.5 w-4.5" />
                    <span>Save MOM Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </SidebarLayout>
  );
}
