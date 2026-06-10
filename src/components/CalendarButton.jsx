import { CalendarPlus } from "lucide-react";

const pad = value => String(value).padStart(2, "0");

const formatIcsDate = value => {
  const date = new Date(value);

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
};

const escapeIcsText = value =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

export default function CalendarButton({ event }) {
  const calendar = event.calendar;

  if (!calendar?.start || !calendar?.end) {
    return null;
  }

  const handleDownload = () => {
    const now = formatIcsDate(new Date());
    const title = calendar.title || event.title;
    const description = calendar.description || event.subtitle;
    const location = calendar.location || event.locations?.ceremony?.label || "";
    const fileName = calendar.fileName || "invito-calendario.ics";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Invito Evento//Wedding Invite//IT",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${Date.now()}@invito-evento`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=Europe/Rome:${formatIcsDate(calendar.start)}`,
      `DTEND;TZID=Europe/Rome:${formatIcsDate(calendar.end)}`,
      `SUMMARY:${escapeIcsText(title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `LOCATION:${escapeIcsText(location)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <button type="button" className="btn mx-auto" onClick={handleDownload}>
      <CalendarPlus size={18} aria-hidden="true" />
      {calendar.buttonLabel || "Aggiungi al calendario"}
    </button>
  );
}
