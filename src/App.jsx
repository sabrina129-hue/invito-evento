import Hero from "./components/Hero";
import EventInfo from "./components/EventInfo";
import RSVP from "./components/RSVP";
import EnvelopeIntro from "./components/EnvelopeIntro";
import { event } from "./data/event";
import Admin from "./pages/Admin.jsx";
import { HashRouter, Routes, Route } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin.jsx";
import { useState } from "react";

function Home() {
  return (
    <EnvelopeIntro config={event.content.envelope}>
      <div className="w-full bg-surface rounded-card shadow-xl overflow-hidden">
        <Hero images={event.content.images}>
          <h1 className="h1">{event.content.title}</h1>
        </Hero>

        <div className="bg-surface p-8 pt-10 font-body text-center space-y-8">
          <EventInfo event={event.content} />
          <RSVP config={event.rsvp} />
        </div>
      </div>
    </EnvelopeIntro>
  );
}

function AdminProtected() {
  const [ok, setOk] = useState(() => !!localStorage.getItem("adminToken"));

  return ok ? (
    <Admin labels={event.admin} onLogout={() => setOk(false)} />
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
