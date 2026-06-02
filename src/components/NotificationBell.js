"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Clock, Trash2, Calendar, BellOff, X, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/utils";

export default function NotificationBell() {
  const [reminders, setReminders] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const url = process.env.NEXT_PUBLIC_REMINDERS;
      if (!url) return;
      const data = await api.get(url);
      setReminders(data || []);
    } catch (err) {
      console.error("Failed to fetch reminders for notification bell:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchReminders();

    // Poll for new reminders every 60 seconds
    const interval = setInterval(fetchReminders, 60000);

    // Click outside handler to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [reminderToDelete, setReminderToDelete] = useState(null);
  const [deletingReminder, setDeletingReminder] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const initiateDelete = (reminder, e) => {
    e.stopPropagation();
    setReminderToDelete(reminder);
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!reminderToDelete) return;
    try {
      setDeletingReminder(true);
      const url = `${process.env.NEXT_PUBLIC_REMINDERS}${reminderToDelete.id}/`;
      await api.delete(url);
      setReminders((prev) => prev.filter((r) => r.id !== reminderToDelete.id));
      setReminderToDelete(null);
    } catch (err) {
      console.error("Failed to delete reminder:", err);
      setDeleteError("Failed to delete. Please try again.");
    } finally {
      setDeletingReminder(false);
    }
  };

  // Filter reminders that are currently due (i.e. scheduled date and time has been reached)
  const activeReminders = reminders.filter((r) => {
    const now = new Date();
    const [year, month, day] = r.date.split("-").map(Number);
    const [hour, minute] = r.time.split(":").map(Number);
    const reminderDateTime = new Date(year, month - 1, day, hour, minute);
    return now >= reminderDateTime;
  });

  const unreadCount = activeReminders.filter(r => !r.is_read).length;

  // Automatically mark all displayed unread reminders as read when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      const unreadReminders = activeReminders.filter(r => !r.is_read);
      if (unreadReminders.length > 0) {
        unreadReminders.forEach(async (reminder) => {
          try {
            const url = `${process.env.NEXT_PUBLIC_REMINDERS}${reminder.id}/`;
            await api.patch(url, { is_read: true });
            // Update local state
            setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, is_read: true } : r));
          } catch (err) {
            console.error("Failed to mark reminder as read:", err);
          }
        });
      }
    }
  }, [isOpen, reminders]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-750 text-slate-300 hover:text-white transition-all duration-200 shadow-md group"
        aria-label="Notification center"
      >
        <Bell className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-slate-900 shadow-lg animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/50">
            <div>
              <h3 className="font-bold text-sm text-white">Notifications</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {unreadCount > 0 
                  ? `You have ${unreadCount} unread reminder(s)` 
                  : "No unread alerts"}
              </p>
            </div>
            <button 
              onClick={fetchReminders}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors duration-150"
            >
              Refresh
            </button>
          </div>

          {/* List Section */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-850">
            {loading && reminders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Loading reminders...
              </div>
            ) : activeReminders.length === 0 ? (
              <div className="py-10 px-5 text-center flex flex-col items-center justify-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                  <BellOff className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-slate-400">No Reminders Found</p>
                <p className="text-[10px] text-slate-500 max-w-[200px]">
                  Set a reminder in the Calendar to receive alerts here, via email, or Web Push.
                </p>
              </div>
            ) : (
              activeReminders.map((reminder) => {
                return (
                  <div
                    key={reminder.id}
                    className={`p-4 flex items-start justify-between space-x-3 transition-colors duration-150 hover:bg-slate-850/50
                      ${reminder.is_read ? "opacity-60" : "bg-indigo-600/5 border-l-2 border-indigo-500"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-white truncate block">
                          {reminder.title}
                        </span>
                        {reminder.is_sent && (
                          <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-medium">
                            Sent
                          </span>
                        )}
                      </div>
                      
                      {reminder.description && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {reminder.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-3 mt-2.5 text-[10px] text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-indigo-400" />
                          <span>{reminder.date}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-indigo-400" />
                          <span>{formatTime(reminder.time)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Delete action */}
                    <button
                      onClick={(e) => initiateDelete(reminder, e)}
                      title="Delete reminder"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/30 text-center">
            <a
              href="/dashboard/calendar"
              onClick={() => setIsOpen(false)}
              className="inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors duration-150"
            >
              View Calendar
            </a>
          </div>

        </div>
      )}
      {/* Modal: Custom Delete Confirmation */}
      {reminderToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in text-left">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-2xl relative mx-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-3 pb-2 border-b border-slate-850">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <AlertCircle className="h-4.5 w-4.5 text-rose-500" />
                <span>Delete Alert Reminder</span>
              </h3>
              <button
                onClick={() => setReminderToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-850 hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3 text-xs text-slate-350 leading-relaxed">
              <p>Are you sure you want to delete <strong className="text-white">"{reminderToDelete.title}"</strong>?</p>
              
              {deleteError && (
                <div className="flex items-start space-x-2 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-rose-400 text-[10px]">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-2.5 mt-5 pt-2.5 border-t border-slate-850">
              <button
                type="button"
                disabled={deletingReminder}
                onClick={() => setReminderToDelete(null)}
                className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 hover:bg-slate-900 text-slate-350 rounded-lg text-[10px] font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingReminder}
                onClick={confirmDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white rounded-lg text-[10px] font-semibold transition-all"
              >
                {deletingReminder ? "Deleting..." : "Delete"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
