import Hero from "./components/Hero";
import EventInfo from "./components/EventInfo";
import RSVP from "./components/RSVP";
import EnvelopeIntro from "./components/EnvelopeIntro";
import { event } from "./data/event";
import GiftPage from "./pages/GiftPage.jsx";
import { HashRouter, Link, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

function Home() {
  useEffect(() => {
    [
      "/images/sfondo-stelle-natale-beige-sfoltito.png",
      ...event.content.images,
    ].forEach(src => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
    });
  }, []);

  return (
    <EnvelopeIntro config={event.content.envelope}>
      <div className="invitation-card w-full rounded-card shadow-xl overflow-hidden">
        <Hero images={event.content.images}>
          <h1 className="h1">{event.content.title}</h1>
        </Hero>

        <div className="invitation-body p-8 pt-6 font-body text-center space-y-8">
          <EventInfo event={event.content} />
          <section className="section gift-invite-section" aria-label="Prezent dla pary mlodej">
            <p className="text-body">{event.gift.inviteText}</p>
            <Link to="/regalo" className="btn gift-invite-link">
              {event.gift.inviteLinkLabel}
            </Link>
          </section>
          <RSVP config={event.rsvp} />
        </div>
      </div>
    </EnvelopeIntro>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/regalo" element={<GiftPage config={event.gift} />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </HashRouter>
  );
}
