"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SidebarLayout from "@/components/SidebarLayout";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/utils";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Users, 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Edit2, 
  X, 
  Copy, 
  Check, 
  AlertCircle, 
  ArrowLeft,
  CheckCircle2,
  ListTodo
} from "lucide-react";

export default function MeetingDetailPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  
  // Data lists
  const [meeting, setMeeting] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  
  // State modes
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form states
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [organizerId, setOrganizerId] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [agenda, setAgenda] = useState("");
  const [minutes, setMinutes] = useState("");
  
  // Action Items states (for both editing and toggling)
  const [actionItems, setActionItems] = useState([]);
  const [newActionText, setNewActionText] = useState("");
  const [newActionAssignee, setNewActionAssignee] = useState("");

  const setActionItemsSafe = (items) => {
    const safeItems = (items || []).map((item, index) => ({
      id: item.id || `action-${Date.now()}-${index}-${Math.random()}`,
      ...item
    }));
    setActionItems(safeItems);
  };

  const meetingsUrl = process.env.NEXT_PUBLIC_MEETINGS || 'http://localhost:8000/api/meetings/';
  const projectsUrl = process.env.NEXT_PUBLIC_PROJECTS || 'http://localhost:8000/api/projects/';
  const usersUrl = process.env.NEXT_PUBLIC_USERS || 'http://localhost:8000/api/users/';

  async function loadMeetingDetails() {
    try {
      setError("");
      const [meetingData, projectsData, usersData] = await Promise.all([
        api.get(`${meetingsUrl}${id}/`),
        api.get(projectsUrl),
        api.get(usersUrl),
      ]);
      
      setMeeting(meetingData);
      setProjects(projectsData);
      setUsers(usersData);

      // Populate edit states
      setProjectId(meetingData.project?.id || "");
      setTitle(meetingData.title || "");
      setDate(meetingData.date || "");
      
      // Ensure HH:MM format for HTML time input
      const formattedTime = meetingData.time ? meetingData.time.slice(0, 5) : "";
      setTime(formattedTime);
      
      setOrganizerId(meetingData.organizer?.id || "");
      setSelectedAttendees(meetingData.attendees ? meetingData.attendees.map(u => u.id) : []);
      setAgenda(meetingData.agenda || "");
      setMinutes(meetingData.minutes || "");
      setActionItemsSafe(meetingData.action_items);
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve meeting details from the backend server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (api.isAuthenticated()) {
      loadMeetingDetails();
    }
  }, [id]);

  const handleAttendeeToggle = (userId) => {
    if (selectedAttendees.includes(userId)) {
      setSelectedAttendees(selectedAttendees.filter(id => id !== userId));
    } else {
      setSelectedAttendees([...selectedAttendees, userId]);
    }
  };

  const addActionItem = () => {
    if (!newActionText.trim()) return;
    
    const assigneeUser = users.find(u => u.id === parseInt(newActionAssignee));
    const newItem = {
      id: Date.now(), // Local key (temp)
      text: newActionText.trim(),
      assignee_id: assigneeUser ? assigneeUser.id : null,
      assignee_name: assigneeUser ? (assigneeUser.first_name || assigneeUser.last_name ? `${assigneeUser.first_name || ""} ${assigneeUser.last_name || ""}`.trim() : (assigneeUser.emailid || assigneeUser.username)) : "Unassigned",
      completed: false
    };

    setActionItems([...actionItems, newItem]);
    setNewActionText("");
    setNewActionAssignee("");
  };

  const removeActionItem = (itemId) => {
    setActionItems(actionItems.filter(item => item.id !== itemId));
  };

  // Toggle completed status of action item in view mode
  const handleToggleActionComplete = async (itemId) => {
    if (!meeting) return;

    // Optimistic update locally
    const updatedActions = actionItems.map(item => {
      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });
    
    setActionItems(updatedActions);

    // Format action items for payload
    const formattedActionItems = updatedActions.map(({ id, text, assignee_id, assignee_name, completed }) => ({
      id,
      text,
      assignee_id,
      assignee_name,
      completed
    }));

    const payload = {
      project: parseInt(projectId),
      title: title.trim(),
      date,
      time: time.length === 5 ? `${time}:00` : time,
      organizer: parseInt(organizerId),
      attendees: selectedAttendees.map(uid => parseInt(uid)),
      agenda: agenda.trim() || "",
      minutes: minutes.trim() || "",
      action_items: formattedActionItems
    };

    try {
      const res = await api.put(`${meetingsUrl}${id}/`, payload);
      setMeeting(res);
      setActionItemsSafe(res.action_items);
    } catch (err) {
      console.error("Failed to update action item status:", err);
      setError("Failed to sync action item status with backend.");
      // Rollback
      loadMeetingDetails();
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!projectId) {
      setError("Please select a project category.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a meeting title.");
      return;
    }

    setSubmitLoading(true);
    setError("");
    setSuccess("");

    // Format action items
    const formattedActionItems = actionItems.map(({ id, text, assignee_id, assignee_name, completed }) => ({
      id,
      text,
      assignee_id,
      assignee_name,
      completed
    }));

    const payload = {
      project: parseInt(projectId),
      title: title.trim(),
      date,
      time: time.length === 5 ? `${time}:00` : time,
      organizer: parseInt(organizerId),
      attendees: selectedAttendees.map(uid => parseInt(uid)),
      agenda: agenda.trim() || "",
      minutes: minutes.trim() || "",
      action_items: formattedActionItems
    };

    try {
      const updatedMeeting = await api.put(`${meetingsUrl}${id}/`, payload);
      setMeeting(updatedMeeting);
      setActionItemsSafe(updatedMeeting.action_items);
      setIsEditing(false);
      setSuccess("Meeting report updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update meeting. Check your input fields.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const triggerDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      setError("");
      await api.delete(`${meetingsUrl}${id}/`);
      router.push("/dashboard/meetings");
    } catch (err) {
      console.error(err);
      setError("Failed to delete the meeting report.");
    }
  };

  const copyToClipboard = () => {
    if (!meeting) return;

    const attendeeNames = meeting.attendees?.map(u => u.first_name || u.username).join(", ") || "None";
    const actionsMarkdown = actionItems.length > 0 
      ? actionItems.map(item => `- [${item.completed ? "x" : " "}] ${item.text} (Assignee: ${item.assignee_name || "Unassigned"})`).join("\n")
      : "No action items assigned.";

    const mdString = `# Minutes of Meeting: ${meeting.title}

**Project Category:** ${meeting.project?.name || "Uncategorized"}
**Date:** ${meeting.date}
**Time:** ${formatTime(meeting.time)}
**Organizer:** ${meeting.organizer?.first_name || meeting.organizer?.username}

## Attendees
${attendeeNames}

## Agenda / Objective
${meeting.agenda || "No agenda specified."}

## Discussion & Detailed Minutes
\`\`\`text
${meeting.minutes || "No minutes recorded."}
\`\`\`

## Action Items
${actionsMarkdown}
`;

    navigator.clipboard.writeText(mdString)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error("Could not copy MOM markdown:", err);
      });
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <p className="text-slate-400 font-medium">Fetching meeting report details...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (!meeting && error) {
    return (
      <SidebarLayout>
        <div className="max-w-xl mx-auto mt-8 bg-rose-500/10 border border-rose-500/20 p-6 rounded-xl text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h3 className="font-bold text-white text-lg">Failed to Load Report</h3>
          <p className="text-slate-300 text-sm">{error}</p>
          <Link href="/dashboard/meetings" className="inline-block px-5 py-2.5 bg-slate-900 text-white rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors text-sm font-semibold">
            Return to Logbook
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      {/* Top Breadcrumb Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4 border-b border-slate-850">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Link href="/dashboard/meetings" className="hover:text-indigo-400 flex items-center space-x-1.5 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Logbook</span>
            </Link>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">
            {isEditing ? "Modify Meeting Report" : meeting.title}
          </h2>
        </div>

        {/* Top Actions in View Mode */}
        {!isEditing && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={copyToClipboard}
              className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/10"
            >
              <Edit2 className="h-4 w-4" />
              <span>Edit Details</span>
            </button>

            <button
              onClick={triggerDelete}
              className="flex items-center space-x-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Report</span>
            </button>
          </div>
        )}
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
          <span>{success}</span>
        </div>
      )}

      {isEditing ? (
        /* Edit Mode Form */
        <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Edit Fields */}
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

              {/* Agenda */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Agenda / Objective
                </label>
                <textarea
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all resize-none"
                />
              </div>

              {/* Minutes of Meeting */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Minutes of Meeting (MOM Content)
                </label>
                <textarea
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  rows="10"
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* Action Items List Editor */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm space-y-4">
              <h3 className="font-bold text-base text-white border-b border-slate-850 pb-3 flex items-center space-x-2.5">
                <ListTodo className="h-5 w-5 text-indigo-400" />
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
                        <option key={u.id} value={u.id}>
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
                          {item.completed && <span className="ml-2 text-emerald-400 font-semibold">[Completed]</span>}
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

          {/* Right Side Options */}
          <div className="space-y-6">
            {/* Attendees Selection */}
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
                    <option key={u.id} value={u.id}>
                      {u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : (u.emailid || u.username || "User")} ({u.emailid || u.username || "User"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Attendees list */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Attendees</span>
                </label>
                <div className="border border-slate-800 bg-slate-950/60 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2.5">
                  {users.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center space-x-3.5 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAttendees.includes(u.id)}
                        onChange={() => handleAttendeeToggle(u.id)}
                        className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>{u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : (u.emailid || u.username || "User")}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Save / Cancel Form card */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm space-y-3">
              <button
                type="submit"
                disabled={submitLoading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/25 active:transform active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
              >
                {submitLoading ? (
                  <>
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4.5 w-4.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  loadMeetingDetails(); // Reset form changes
                }}
                className="w-full py-2.5 px-4 bg-slate-950/80 border border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white font-semibold rounded-lg active:transform active:scale-[0.98] transition-all duration-200 text-sm flex items-center justify-center space-x-1.5"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* View Mode UI Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Content (Left 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info Card */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-850 pb-4 gap-4">
                <div className="flex items-center space-x-2.5">
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded uppercase tracking-wider">
                    {meeting.project?.name || "Uncategorized"}
                  </span>
                  <span className="text-slate-500 text-sm">•</span>
                  <span className="text-xs text-slate-400 font-medium flex items-center space-x-1">
                    <CalendarIcon className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{meeting.date}</span>
                  </span>
                  <span className="text-slate-500 text-sm">•</span>
                  <span className="text-xs text-slate-400 font-medium flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{formatTime(meeting.time)}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/40 px-3 py-1.5 border border-slate-850 rounded-md">
                  <User className="h-4 w-4 text-indigo-400" />
                  <span>Organizer: <strong className="text-white font-medium">{meeting.organizer?.first_name || meeting.organizer?.username}</strong></span>
                </div>
              </div>

              {/* Agenda Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agenda / Objective</h4>
                <p className="text-slate-200 text-sm leading-relaxed bg-slate-950/30 p-4 border border-slate-850 rounded-lg whitespace-pre-wrap">
                  {meeting.agenda || "No agenda provided for this meeting."}
                </p>
              </div>

              {/* Discussion & Detailed Minutes Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discussion Notes & Detailed Minutes</h4>
                <div className="text-slate-200 text-sm leading-relaxed bg-slate-950/30 p-5 border border-slate-850 rounded-lg font-mono whitespace-pre-wrap min-h-[250px]">
                  {meeting.minutes || "No discussions recorded."}
                </div>
              </div>
            </div>

            {/* Action Items Panel */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm space-y-4">
              <h3 className="font-bold text-base text-white border-b border-slate-850 pb-3 flex items-center space-x-2.5">
                <ListTodo className="h-5 w-5 text-indigo-400" />
                <span>Action Items checklist ({actionItems.filter(i => i.completed).length}/{actionItems.length})</span>
              </h3>
              
              <div className="space-y-2.5">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start space-x-3.5 p-4 rounded-lg border transition-all ${
                      item.completed 
                        ? "bg-slate-950/20 border-slate-900 opacity-65 text-slate-400" 
                        : "bg-slate-950/40 border-slate-850 text-white hover:border-slate-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleActionComplete(item.id)}
                      className="mt-0.5 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-relaxed ${item.completed ? "line-through" : ""}`}>
                        {item.text}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                          Assignee: {item.assignee_name || "Unassigned"}
                        </span>
                        {item.completed && (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            Done
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {actionItems.length === 0 && (
                  <p className="text-slate-500 text-xs text-center py-6 border border-dashed border-slate-850 rounded-lg">
                    No action items were assigned in this meeting.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Attendance panel */}
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm space-y-4">
              <h3 className="font-bold text-base text-white border-b border-slate-850 pb-3 flex items-center space-x-2.5">
                <Users className="h-5 w-5 text-indigo-400" />
                <span>Attendees ({meeting.attendees?.length || 0})</span>
              </h3>

              <div className="space-y-2">
                {meeting.attendees?.map((u) => {
                  const isOrganizer = u.id === meeting.organizer?.id;
                  return (
                    <div 
                      key={u.id}
                      className="flex items-center space-x-3 bg-slate-950/40 border border-slate-850 p-2.5 rounded-lg hover:bg-slate-950/60 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-indigo-400 border border-slate-700">
                        {u.first_name ? u.first_name[0].toUpperCase() : (u.username ? u.username[0].toUpperCase() : "U")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {u.first_name ? `${u.first_name} ${u.last_name || ""}` : (u.username || "User")}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{u.email || (u.username ? `@${u.username}` : "")}</p>
                      </div>
                      {isOrganizer && (
                        <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          Organizer
                        </span>
                      )}
                    </div>
                  );
                })}

                {(!meeting.attendees || meeting.attendees.length === 0) && (
                  <p className="text-slate-500 text-xs text-center">No attendees registered.</p>
                )}
              </div>
            </div>

            {/* Quick Summary Metadata card */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm space-y-3.5 text-xs text-slate-400">
              <h4 className="font-bold text-white text-sm">Report Information</h4>
              <div className="space-y-2 border-t border-slate-850 pt-3">
                <div className="flex justify-between">
                  <span>Report ID</span>
                  <span className="text-white font-medium">#{meeting.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created At</span>
                  <span className="text-white font-medium">{meeting.created_at ? new Date(meeting.created_at).toLocaleDateString() : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated</span>
                  <span className="text-white font-medium">{meeting.updated_at ? new Date(meeting.updated_at).toLocaleDateString() : "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative animate-scale-up mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-lg">Delete MOM Report</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Are you sure you want to delete this meeting report? This action is permanent and cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-950/80 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-rose-500/15"
              >
                Delete Report
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
