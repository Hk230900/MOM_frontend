"use client";

import { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";

export default function ClockPicker({ value, onChange, label }) {
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState("AM");
  const [mode, setMode] = useState("hours"); // "hours" | "minutes"
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const dialRef = useRef(null);

  // Parse initial 24h format "HH:MM" or "HH:MM:SS" into 12h format
  useEffect(() => {
    if (value) {
      const parts = value.split(":");
      let hr = parseInt(parts[0], 10);
      let min = parseInt(parts[1], 10) || 0;
      
      let period = "AM";
      if (hr >= 12) {
        period = "PM";
        if (hr > 12) hr = hr - 12;
      }
      if (hr === 0) hr = 12;

      setHour(hr);
      setMinute(min);
      setAmpm(period);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsDragging(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Format 12h time back to 24h format for form state
  const handleSave = () => {
    let hr24 = hour;
    if (ampm === "PM" && hour !== 12) {
      hr24 = hour + 12;
    } else if (ampm === "AM" && hour === 12) {
      hr24 = 0;
    }
    const formattedHour = String(hr24).padStart(2, "0");
    const formattedMinute = String(minute).padStart(2, "0");
    onChange(`${formattedHour}:${formattedMinute}`);
    setIsOpen(false);
  };

  const updateTimeFromCoords = (clientX, clientY) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = clientX - centerX;
    const y = clientY - centerY;

    let angle = Math.atan2(x, -y) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    if (mode === "hours") {
      let selectedHour = Math.round(angle / 30);
      if (selectedHour === 0) selectedHour = 12;
      setHour(selectedHour);
    } else {
      let selectedMinute = Math.round(angle / 6);
      if (selectedMinute === 60) selectedMinute = 0;
      setMinute(selectedMinute);
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    updateTimeFromCoords(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      updateTimeFromCoords(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      if (mode === "hours") {
        setMode("minutes");
      }
    }
  };

  // Helper to format time text for button display
  const getDisplayTime = () => {
    if (!value) return "Select Time...";
    const parts = value.split(":");
    let hr = parseInt(parts[0], 10);
    const min = String(parts[1] || "00").slice(0, 2);
    let period = "AM";
    if (hr >= 12) {
      period = "PM";
      if (hr > 12) hr = hr - 12;
    }
    if (hr === 0) hr = 12;
    return `${String(hr).padStart(2, "0")}:${min} ${period}`;
  };

  // Calculate coordinates for numbers around the circular dial
  const getNumberCoords = (index, total, radius) => {
    const angle = (index * 360) / total;
    const rad = (angle - 90) * (Math.PI / 180);
    const x = Math.round(radius * Math.cos(rad));
    const y = Math.round(radius * Math.sin(rad));
    return { x, y };
  };

  // Render Hour Hand / Minute Hand rotation angle
  const getHandRotation = () => {
    if (mode === "hours") {
      const hr = hour === 12 ? 0 : hour;
      return hr * 30; // 30 degrees per hour
    } else {
      return minute * 6; // 6 degrees per minute
    }
  };

  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <span className="block text-[11px] text-slate-400 font-medium mb-1">{label}</span>
      )}
      
      {/* Target input display button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setMode("hours");
        }}
        className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-left focus:outline-none focus:border-indigo-500 text-sm transition-all flex items-center justify-between min-h-[42px] cursor-pointer"
      >
        <span>{getDisplayTime()}</span>
        <Clock className="h-4 w-4 text-indigo-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 p-4 bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md w-[260px] animate-fade-in-scale select-none">
          
          {/* Header Display */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-900 mb-4">
            <div className="flex items-center space-x-1 text-2xl font-bold">
              <span
                onClick={() => setMode("hours")}
                className={`cursor-pointer px-1 rounded transition-colors ${
                  mode === "hours" ? "text-indigo-400 bg-indigo-500/10" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {String(hour).padStart(2, "0")}
              </span>
              <span className="text-slate-500">:</span>
              <span
                onClick={() => setMode("minutes")}
                className={`cursor-pointer px-1 rounded transition-colors ${
                  mode === "minutes" ? "text-indigo-400 bg-indigo-500/10" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {String(minute).padStart(2, "0")}
              </span>
            </div>
            
            {/* AM / PM Selector */}
            <div className="flex space-x-1 bg-slate-900/60 p-1 border border-slate-800/80 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAmpm("AM")}
                className={`px-2 py-1 rounded transition-all ${
                  ampm === "AM"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setAmpm("PM")}
                className={`px-2 py-1 rounded transition-all ${
                  ampm === "PM"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Clock face Dial container */}
          <div
            ref={dialRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-[200px] h-[200px] bg-slate-900/40 border border-slate-800/80 rounded-full mx-auto relative cursor-pointer"
          >
            {/* Center Pivot Dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500 z-10"></div>

            {/* Hand Line representation */}
            <div
              className="absolute left-1/2 bottom-1/2 w-0.5 bg-indigo-500 origin-bottom"
              style={{
                height: "72px",
                transform: `translateX(-50%) rotate(${getHandRotation()}deg)`,
                transition: isDragging ? "none" : "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Selected Hand Bubble */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-indigo-600 border-2 border-indigo-400 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">
                  {mode === "hours" ? hour : String(minute).padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Clock Dial numbers */}
            {mode === "hours"
              ? hoursList.map((hr, idx) => {
                  const coords = getNumberCoords(idx, 12, 70);
                  const isSelected = hour === hr;
                  return (
                    <div
                      key={`hr-${hr}`}
                      className={`absolute w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full transition-colors`}
                      style={{
                        left: `calc(50% - 12px + ${coords.x}px)`,
                        top: `calc(50% - 12px + ${coords.y}px)`,
                        color: isSelected ? "#ffffff" : "#94a3b8",
                      }}
                    >
                      {hr}
                    </div>
                  );
                })
              : minutesList.map((min, idx) => {
                  const coords = getNumberCoords(idx, 12, 70);
                  const isSelected = minute === min;
                  return (
                    <div
                      key={`min-${min}`}
                      className={`absolute w-6 h-6 flex items-center justify-center text-[10px] font-semibold rounded-full transition-colors`}
                      style={{
                        left: `calc(50% - 12px + ${coords.x}px)`,
                        top: `calc(50% - 12px + ${coords.y}px)`,
                        color: isSelected ? "#ffffff" : "#64748b",
                      }}
                    >
                      {String(min).padStart(2, "0")}
                    </div>
                  );
                })}
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-900">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold shadow-md shadow-indigo-600/10"
            >
              Done
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
