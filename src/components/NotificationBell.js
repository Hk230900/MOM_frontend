"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Clock, Trash2, Calendar, BellOff } from "lucide-react";
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

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      const url = `${process.env.NEXT_PUBLIC_REMINDERS}${id}/`;
      await api.delete(url);
      // Remove from state
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete reminder:", err);
    }
  };

  // Filter reminders for "active today or upcoming"
  const todayStr = new Date().toISOString().split("T")[0];
  const activeReminders = reminders.filter((r) => {
    // Show unsent reminders or reminders set for today/future
    return !r.is_sent || r.date >= todayStr;
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
                const isPastDue = reminder.date < todayStr && !reminder.is_sent;
                
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
                      onClick={(e) => handleDelete(reminder.id, e)}
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
    </div>
  );
}
