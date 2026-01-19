import LocationLinks from "./LocationLinks";

export default function EventInfo({ event }) {
  return (
    <div className="section">
      <p className="h3">{event.subtitle}</p>
      <p className="text-body">{event.description}</p>
      <p className="text-body">{event.date} · {event.time}</p>
      <LocationLinks locations={event.locations} />
    </div>
  );
}
