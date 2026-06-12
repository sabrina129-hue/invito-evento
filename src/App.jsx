import BookInvitation from "./components/BookInvitation";
import CalendarButton from "./components/CalendarButton";
import RSVP from "./components/RSVP";
import { event } from "./data/event";
import Admin from "./pages/Admin.jsx";
import { HashRouter, Routes, Route } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin.jsx";
import { useState } from "react";

function Home() {
  const [firstSpouse, secondSpouse] = event.content.title.split(" & ");
  const [finalPageSignal, setFinalPageSignal] = useState(0);
  const bookConfig = {
    ...event.content.book,
    innerPage: {
      title: event.content.title,
      subtitle: event.content.subtitle,
      description: event.content.description,
      date: `${event.content.date} - ${event.content.time}`,
      ceremony: `${event.content.locations.ceremony.label}: ${event.content.locations.ceremony.name}`,
      reception: `${event.content.locations.reception.label}: ${event.content.locations.reception.name}`,
      location: event.content.calendar.location,
    },
  };

  return (
    <BookInvitation config={bookConfig} finalPageSignal={finalPageSignal}>
      <section className="book-detail-page" aria-label="Informazioni matrimonio">
        <h1 className="book-detail-title" aria-label={event.content.title}>
          <span>{firstSpouse}</span>
          {secondSpouse ? <span className="book-detail-ampersand">&</span> : null}
          {secondSpouse ? <span>{secondSpouse}</span> : null}
        </h1>
        <p className="book-detail-kicker">{event.content.subtitle}</p>
        <p className="book-detail-description">{event.content.description}</p>
        <div className="book-detail-date">
          <span>{event.content.date}</span>
          <span>{event.content.time}</span>
        </div>
        <div className="book-detail-locations">
          <a href={event.content.locations.ceremony.url} target="_blank" rel="noopener noreferrer">
            {event.content.locations.ceremony.label}: {event.content.locations.ceremony.name}
          </a>
          <a href={event.content.locations.reception.url} target="_blank" rel="noopener noreferrer">
            {event.content.locations.reception.label}: {event.content.locations.reception.name}
          </a>
        </div>
        <div className="book-detail-calendar">
          <CalendarButton event={event.content} />
        </div>
      </section>

      <section className="book-detail-page book-rsvp-page" aria-label="Conferma partecipazione">
        <RSVP config={event.rsvp} onSubmitted={() => setFinalPageSignal(signal => signal + 1)} />
      </section>

      <section className="book-detail-page book-thank-you-page" aria-label="Grazie per la risposta">
        <h1 className="book-detail-title book-thank-you-title">
          <span>Grazie</span>
          <span>per la risposta</span>
        </h1>
        <p className="book-detail-description">{event.rsvp.successMessage}</p>
        <p className="book-thank-you-note">Non vediamo l'ora di condividere questo giorno con te.</p>
      </section>
    </BookInvitation>
  );
}

function AdminProtected() {
  const [ok, setOk] = useState(() => !!localStorage.getItem("adminToken"));

  return ok ? (
    <Admin
      labels={event.admin}
      foodPreferenceOptions={event.rsvp.foodPreferencesOptions}
      onLogout={() => setOk(false)}
    />
  ) : (
    <AdminLogin labels={event.admin} onLogin={() => setOk(true)} />
  );
}

// Pagina web per mostrare all'organizzatore le risposte all'invito
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminProtected />} />
      </Routes>
    </HashRouter>
  );
}
