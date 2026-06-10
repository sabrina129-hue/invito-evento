import LocationLinks from "./LocationLinks";
import CalendarButton from "./CalendarButton";

export default function EventInfo({ event }) {
  return (
    <div className="section">
      <p className="h3">{event.subtitle}</p>
      {event.description && <p className="text-body">{event.description}</p>}
      <p className="text-body">{event.date} · {event.time}</p>
      <CalendarButton event={event} />
      <LocationLinks locations={event.locations} />
    </div>
  );
}
