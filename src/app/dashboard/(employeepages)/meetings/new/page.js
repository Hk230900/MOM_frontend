"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  CheckCircle2,
  Handshake,
  FolderKanban,
  GitBranch
} from "lucide-react";
import Link from "next/link";

function NewMeetingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data lists
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Form states
  const [meetingType, setMeetingType] = useState("Internal");
  const [projectId, setProjectId] = useState("");
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [organizerId, setOrganizerId] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [agenda, setAgenda] = useState("");
  const [minutes, setMinutes] = useState("");
  const [followUpToId, setFollowUpToId] = useState("");

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
        const clientsUrl = process.env.NEXT_PUBLIC_CLIENTS || 'http://localhost:8000/api/clients/';
        const meetingsUrl = process.env.NEXT_PUBLIC_MEETINGS || 'http://localhost:8000/api/meetings/';

        const [projData, userData, clientData, meetingData] = await Promise.all([
          api.get(projectsUrl),
          api.get(usersUrl),
          api.get(clientsUrl),
          api.get(meetingsUrl)
        ]);

        setProjects(projData);
        setUsers(userData);
        setClients(clientData);
        setMeetings(meetingData);

        // Prepopulate date and time with current local values (overridden by query params later)
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);

        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        setTime(`${hh}:${min}`);

        // Default organizer
        const loggedInUsername = api.getUsername();
        const current = userData.find(u => u.emailid === loggedInUsername);

        if (current) {
          setCurrentUserId(current.user_id);
          setOrganizerId(current.user_id);
        } else if (userData.length > 0) {
          setOrganizerId(userData[0].user_id);
        }

        // Default project & client dropdown defaults
        if (projData.length > 0) setProjectId(projData[0].id);
        if (clientData.length > 0) setClientId(clientData[0].id);

      } catch (err) {
        console.error(err);
        setError("Failed to load project resources, client directories, or system users from backend.");
      } finally {
        setLoading(false);
      }
    }

    if (api.isAuthenticated()) {
      loadFormResources();
    }
  }, []);

  // Hook to handle query parameter pre-filling once resource loading is complete
  useEffect(() => {
    if (!loading) {
      const dateParam = searchParams.get("date");
      if (dateParam) setDate(dateParam);

      const typeParam = searchParams.get("meeting_type");
      if (typeParam && (typeParam === "Internal" || typeParam === "External")) {
        setMeetingType(typeParam);
      }

      const clientParam = searchParams.get("client_id");
      if (clientParam && clients.some(c => c.id === parseInt(clientParam))) {
        setClientId(clientParam);
      }

      const projectParam = searchParams.get("project_id");
      if (projectParam && projects.some(p => p.id === parseInt(projectParam))) {
        setProjectId(projectParam);
      }

      const followUpParam = searchParams.get("follow_up_to");
      if (followUpParam && meetings.some(m => m.id === parseInt(followUpParam))) {
        setFollowUpToId(followUpParam);
        
        // Pre-fill fields from parent meeting if setting follow-up
        const parentMeeting = meetings.find(m => m.id === parseInt(followUpParam));
        if (parentMeeting) {
          setTitle(`Follow-up: ${parentMeeting.title}`);
          setMeetingType(parentMeeting.meeting_type);
          if (parentMeeting.meeting_type === "Internal") {
            setProjectId(parentMeeting.project?.id || "");
          } else {
            setClientId(parentMeeting.client?.id || "");
          }
          if (parentMeeting.attendees) {
            setSelectedAttendees(parentMeeting.attendees.map(a => a.id));
          }
        }
      }
    }
  }, [loading, searchParams, clients, projects, meetings]);

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

    if (meetingType === "Internal" && !projectId) {
      setError("Please select a project category. If none exist, create one first.");
      return;
    }
    if (meetingType === "External" && !clientId) {
      setError("Please select a client partner. If none exist, register one first.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a meeting title.");
      return;
    }

    setSubmitLoading(true);
    setError("");
    setSuccess("");

    const formattedActionItems = actionItems.map(({ id, text, assignee_id, assignee_name, completed }) => ({
      id,
      text,
      assignee_id,
      assignee_name,
      completed
    }));

    const meetingPayload = {
      meeting_type: meetingType,
      project: meetingType === "Internal" ? parseInt(projectId) : null,
      client: meetingType === "External" ? parseInt(clientId) : null,
      title: title.trim(),
      date,
      time: time.length === 5 ? `${time}:00` : time, 
      organizer: parseInt(organizerId),
      attendees: selectedAttendees.map(id => parseInt(id)),
      agenda: agenda.trim() || "",
      minutes: minutes.trim() || "",
      action_items: formattedActionItems,
      follow_up_to: followUpToId ? parseInt(followUpToId) : null
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
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-slate-400 font-medium">Preparing meeting records console...</p>
        </div>
      </div>
    );
  }

  const selectableUsers = users.filter(u => u.emailid !== 'harshadabk2309@gmail.com');

  return (
    <div className="space-y-6">
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main fields (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm space-y-5">
            <h3 className="font-bold text-base text-white border-b border-slate-850 pb-3 flex items-center space-x-2.5">
              <FileText className="h-5 w-5 text-indigo-400" />
              <span>Meeting Context & Minutes</span>
            </h3>

            {/* Meeting Type Selection Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Meeting Category / Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMeetingType("Internal")}
                  className={`py-3 px-4 rounded-xl border flex items-center justify-center space-x-2 font-bold text-sm transition-all duration-200 ${
                    meetingType === "Internal"
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-md shadow-indigo-500/5"
                      : "bg-slate-950/20 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                  }`}
                >
                  <FolderKanban className="h-4 w-4" />
                  <span>Internal Meeting</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingType("External")}
                  className={`py-3 px-4 rounded-xl border flex items-center justify-center space-x-2 font-bold text-sm transition-all duration-200 ${
                    meetingType === "External"
                      ? "bg-emerald-600/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/5"
                      : "bg-slate-950/20 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                  }`}
                >
                  <Handshake className="h-4 w-4" />
                  <span>External Meeting</span>
                </button>
              </div>
            </div>

            {/* Context Select (Project vs. Client) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {meetingType === "Internal" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Project Category
                  </label>
                  {projects.length === 0 ? (
                    <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg flex items-center space-x-1.5">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>No projects. <Link href="/dashboard/projects" className="underline font-bold">Create one</Link>.</span>
                    </div>
                  ) : (
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
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Client Partner
                  </label>
                  {clients.length === 0 ? (
                    <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg flex items-center space-x-1.5">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>No clients. <Link href="/dashboard/clients" className="underline font-bold">Create one</Link> (Admin).</span>
                    </div>
                  ) : (
                    <select
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-sm transition-all"
                      required
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.company_name ? `(${c.company_name})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

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

            {/* Follow-up relation Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <GitBranch className="h-3.5 w-3.5 text-indigo-400" />
                <span>Follow-up To Previous Meeting (Optional)</span>
              </label>
              <select
                value={followUpToId}
                onChange={(e) => setFollowUpToId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm transition-all"
              >
                <option value="">-- No Follow-up (Independent Meeting) --</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.date} | {m.title} ({m.meeting_type})
                  </option>
                ))}
              </select>
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
                    {selectableUsers.map((u) => (
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
                {selectableUsers.map((u) => (
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
                {selectableUsers.length === 0 && (
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
    </div>
  );
}

export default function NewMeetingPage() {
  return (
    <SidebarLayout>
      <Suspense fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <p className="text-slate-400 font-medium">Preparing meeting records console...</p>
          </div>
        </div>
      }>
        <NewMeetingForm />
      </Suspense>
    </SidebarLayout>
  );
}
