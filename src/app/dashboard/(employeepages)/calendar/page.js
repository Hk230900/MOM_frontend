"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SidebarLayout from "@/components/SidebarLayout";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/utils";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Users, 
  Plus, 
  Eye, 
  X, 
  Handshake, 
  FolderKanban,
  FileText,
  AlertCircle
} from "lucide-react";

export default function CalendarPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Calendar navigation states
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal Preview states
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  const meetingsUrl = process.env.NEXT_PUBLIC_MEETINGS || 'http://localhost:8000/api/meetings/';

  async function loadMeetings() {
    try {
      setLoading(true);
      const data = await api.get(meetingsUrl);
      setMeetings(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load meetings list.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (api.isAuthenticated()) {
      loadMeetings();
    }
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper calculations for calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week (0 = Sunday, etc.)

  const prevMonthDays = new Date(year, month, 0).getDate();

  // Create grid arrays
  const calendarCells = [];

  // Padding cells from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i)
    });
  }

  // Current month cells
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Padding cells for next month to fill grid (multiple of 7)
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  // Group meetings by date string 'YYYY-MM-DD'
  const meetingsByDate = {};
  meetings.forEach(meeting => {
    const dStr = meeting.date; // already YYYY-MM-DD
    if (!meetingsByDate[dStr]) {
      meetingsByDate[dStr] = [];
    }
    meetingsByDate[dStr].push(meeting);
  });

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const handleCellClick = (cellDate) => {
    // Navigate to new meeting with query param date
    const dStr = cellDate.toISOString().split("T")[0];
    router.push(`/dashboard/meetings/new?date=${dStr}`);
  };

  return (
    <SidebarLayout>
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 pb-4 border-b border-slate-850">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Schedule Calendar</h2>
          <p className="text-slate-400 text-sm">Visualize, browse, and coordinate team assemblies and client check-ins.</p>
        </div>
        <button
          onClick={today}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg border border-slate-800 hover:border-slate-700 text-sm font-semibold transition-all active:scale-[0.98]"
        >
          Today
        </button>
      </div>

      {error && (
        <div className="flex items-start space-x-2.5 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-300 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Calendar Controller */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl text-white flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-indigo-400" />
            <span>{monthNames[month]} {year}</span>
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={prevMonth}
              className="p-2 bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-850 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-850 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Days of the Week header */}
        <div className="grid grid-cols-7 gap-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Month Day Cells */}
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2.5 min-h-[480px]">
            {calendarCells.map((cell, idx) => {
              const formattedDate = cell.date.toISOString().split("T")[0];
              const cellMeetings = meetingsByDate[formattedDate] || [];
              const isToday = new Date().toDateString() === cell.date.toDateString();

              return (
                <div
                  key={idx}
                  className={`min-h-[90px] border p-2 rounded-xl flex flex-col justify-between group relative transition-all duration-200 ${
                    cell.isCurrentMonth
                      ? "bg-slate-950/20 hover:bg-slate-950/40"
                      : "bg-slate-950/5 opacity-40 hover:opacity-60"
                  } ${
                    isToday
                      ? "border-indigo-500 shadow-md shadow-indigo-500/5 bg-indigo-500/5 hover:bg-indigo-500/10"
                      : "border-slate-850/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday ? "text-indigo-400" : "text-slate-400 group-hover:text-white"
                      }`}
                    >
                      {cell.day}
                    </span>
                    <button
                      onClick={() => handleCellClick(cell.date)}
                      title="Schedule meeting on this day"
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-800 text-slate-500 hover:text-indigo-400 rounded transition-all text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Meetings Badges inside Day Cell */}
                  <div className="mt-2 space-y-1.5 flex-1 overflow-y-auto max-h-[85px] pr-0.5 scrollbar-thin">
                    {cellMeetings.slice(0, 3).map((meeting) => {
                      const isExternal = meeting.meeting_type === "External";
                      return (
                        <button
                          key={meeting.id}
                          onClick={(e) => {
                            e.stopPropagation(); // Avoid triggering cell click
                            setSelectedMeeting(meeting);
                          }}
                          className={`w-full text-left truncate text-[10px] px-2 py-1 rounded font-semibold border transition-all hover:scale-[1.02] flex items-center space-x-1 ${
                            isExternal
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/25"
                              : "bg-indigo-500/15 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/25"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                              isExternal ? "bg-emerald-400" : "bg-indigo-400"
                            }`}
                          ></span>
                          <span className="truncate">{meeting.title}</span>
                        </button>
                      );
                    })}
                    {cellMeetings.length > 3 && (
                      <div className="text-[9px] text-slate-500 font-semibold pl-1">
                        + {cellMeetings.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Meeting Detail Preview */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative animate-scale-up mx-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-850">
              <div className="space-y-1">
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    selectedMeeting.meeting_type === "External"
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
                  }`}
                >
                  {selectedMeeting.meeting_type || "Internal"} Meeting
                </span>
                <h3 className="font-bold text-white text-lg">{selectedMeeting.title}</h3>
              </div>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-850 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-sm text-slate-300">
              {/* DateTime Info */}
              <div className="grid grid-cols-2 gap-3.5 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                  <span className="text-xs truncate">{selectedMeeting.date}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                  <span className="text-xs truncate">{formatTime(selectedMeeting.time)}</span>
                </div>
              </div>

              {/* Context category */}
              <div className="flex items-center space-x-2 text-xs">
                {selectedMeeting.meeting_type === "External" ? (
                  <>
                    <Handshake className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      Client Partner: <strong className="text-white">{selectedMeeting.client?.name || "None"}</strong>
                      {selectedMeeting.client?.company_name && ` (${selectedMeeting.client.company_name})`}
                    </span>
                  </>
                ) : (
                  <>
                    <FolderKanban className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    <span>
                      Project Context: <strong className="text-white">{selectedMeeting.project?.name || "None"}</strong>
                    </span>
                  </>
                )}
              </div>

              {/* Attendees list */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Attendees ({selectedMeeting.attendees?.length || 0})</span>
                </p>
                <div className="text-xs text-white max-h-24 overflow-y-auto bg-slate-950/30 p-2.5 border border-slate-850 rounded-lg flex flex-wrap gap-1.5 pr-1">
                  {selectedMeeting.attendees?.map((att) => (
                    <span key={att.id} className="px-2 py-1 bg-slate-850 border border-slate-800 rounded">
                      {att.first_name || att.username}
                    </span>
                  ))}
                  {(!selectedMeeting.attendees || selectedMeeting.attendees.length === 0) && (
                    <span className="text-slate-500 italic">No attendees registered</span>
                  )}
                </div>
              </div>

              {/* Agenda Preview */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Agenda Objective</span>
                </p>
                <p className="text-xs bg-slate-950/30 p-3 border border-slate-850 rounded-lg whitespace-pre-wrap leading-relaxed">
                  {selectedMeeting.agenda || "No agenda specified."}
                </p>
              </div>

              {/* Follow-up relation */}
              {selectedMeeting.follow_up_to && (
                <div className="text-xs bg-indigo-500/5 border border-indigo-500/10 p-2.5 rounded-lg text-slate-400">
                  <span>This meeting is a follow-up to: </span>
                  <Link 
                    href={`/dashboard/meetings/${selectedMeeting.follow_up_to.id}`} 
                    className="text-indigo-400 font-semibold hover:underline"
                  >
                    {selectedMeeting.follow_up_to.title}
                  </Link>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-3 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="px-4 py-2 bg-slate-950/80 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg text-xs font-semibold transition-all"
              >
                Close Preview
              </button>
              <Link
                href={`/dashboard/meetings/${selectedMeeting.id}`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-lg shadow-indigo-500/10 flex items-center space-x-1.5"
              >
                <Eye className="h-4 w-4" />
                <span>Go to Log & write MOM</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
