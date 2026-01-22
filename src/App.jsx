import Hero from "./components/Hero";
import EventInfo from "./components/EventInfo";
import RSVP from "./components/RSVP";
import { event } from "./data/event";
import Admin from "./pages/Admin.jsx";
import { HashRouter, Routes, Route } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin.jsx";
import { useEffect, useState } from "react";

function Home() {
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

function AdminProtected() {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setOk(!!localStorage.getItem("adminToken"));
  }, []);

  return ok ? <Admin /> : <AdminLogin onLogin={() => setOk(true)} />;
}

//Pagina web pre mostrare all'organizzatore le risposte all'invito
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
