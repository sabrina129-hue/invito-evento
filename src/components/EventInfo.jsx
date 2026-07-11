import LocationLinks from "./LocationLinks";
import WeddingCountdown from "./WeddingCountdown";

export default function EventInfo({ event }) {
  return (
    <div className="section">
      <p className="h3">{event.subtitle}</p>
      {event.description && <p className="text-body">{event.description}</p>}
      <p className="text-body">{event.date} · {event.time}</p>
      <WeddingCountdown event={event} />
      <LocationLinks locations={event.locations} />
    </div>
  );
}
