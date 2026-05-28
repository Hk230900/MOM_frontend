/**
 * Converts a 24-hour time string (HH:MM or HH:MM:SS) to 12-hour AM/PM format.
 * @param {string} timeString - e.g. "14:30" or "14:30:00"
 * @returns {string} - e.g. "02:30 PM"
 */
export function formatTime(timeString) {
  if (!timeString) return "";
  const [hourStr, minuteStr] = timeString.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const paddedHour = String(hour12).padStart(2, "0");
  return `${paddedHour}:${minute} ${period}`;
}
