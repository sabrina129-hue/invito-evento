import Hero from "./components/Hero";
import EventInfo from "./components/EventInfo";
import RSVP from "./components/RSVP";
import { event } from "./data/event";
import Admin from "./pages/Admin.jsx";
import { HashRouter, Routes, Route } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin.jsx";
import { useState } from "react";

function getThemeVars(theme) {
  return {
    "--color-primary": theme.colors.primary,
    "--color-secondary": theme.colors.secondary,
    "--color-background": theme.colors.background,
    "--color-surface": theme.colors.surface,
    "--color-text": theme.colors.text,
    "--color-muted": theme.colors.muted,
    "--font-title": theme.fonts.title,
    "--font-body": theme.fonts.body,
    "--radius-card": theme.radius.card,
    "--radius-input": theme.radius.input,
    "--radius-button": theme.radius.button,
  };
}

function Home() {
  return (
    <div style={getThemeVars(event.theme)} className="min-h-screen bg-background flex justify-center p-4">
      <div className="w-full max-w-xl bg-surface rounded-card shadow-xl overflow-hidden">
        <Hero images={event.content.images}>
          <h1 className="h1">{event.content.title}</h1>
        </Hero>

        <div className="p-8 font-body text-center space-y-8">
          <EventInfo event={event.content} />
          <RSVP config={event.rsvp} />
        </div>
      </div>
    </div>
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
