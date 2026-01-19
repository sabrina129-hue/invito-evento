import Hero from "./components/Hero";
import EventInfo from "./components/EventInfo";
import RSVP from "./components/RSVP";
import { event } from "./data/event";

export default function App() {
  return (
    <div className="min-h-screen bg-background flex justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-card shadow-xl overflow-hidden">
        <Hero images={event.images}>
          <h1 className="h1">{event.title}</h1>
        </Hero>

        <div className="p-8 font-body text-center space-y-8">
          <EventInfo event={event} />
          <RSVP />
        </div>
      </div>
    </div>
  );
}
