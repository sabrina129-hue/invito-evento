import Hero from "./components/Hero";
import EventInfo from "./components/EventInfo";
import RSVP from "./components/RSVP";
import EnvelopeIntro from "./components/EnvelopeIntro";
import { event } from "./data/event";
import Admin from "./pages/Admin.jsx";
import TablePlanner from "./pages/TablePlanner.jsx";
import GiftPage from "./pages/GiftPage.jsx";
import PhotosPage from "./pages/PhotosPage.jsx";
import PhotosGalleryPage from "./pages/PhotosGalleryPage.jsx";
import { HashRouter, Link, Routes, Route } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin.jsx";
import { useEffect, useState } from "react";
import { Camera, Gift } from "lucide-react";

function Home() {
  useEffect(() => {
    event.content.images.forEach(src => {
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
          <section className="section invitation-action-strip" aria-label="Foto e regalo">
            <Link to="/foto" className="invitation-action-link">
              <Camera size={18} aria-hidden="true" />
              <span>{event.photos.inviteLinkLabel}</span>
            </Link>
            <Link to="/regalo" className="invitation-action-link">
              <Gift size={18} aria-hidden="true" />
              <span>{event.gift.inviteLinkLabel}</span>
            </Link>
          </section>
          <RSVP config={event.rsvp} />
        </div>
      </div>
    </EnvelopeIntro>
  );
}

function AdminProtected({ page = "list" }) {
  const [ok, setOk] = useState(() => !!localStorage.getItem("adminToken"));

  if (!ok) {
    return <AdminLogin labels={event.admin} onLogin={() => setOk(true)} />;
  }

  return page === "tables" ? (
    <TablePlanner />
  ) : (
    <Admin
      labels={event.admin}
      foodPreferenceOptions={event.rsvp.foodPreferencesOptions}
      onLogout={() => setOk(false)}
    />
  );
}

// Pagina web per mostrare all'organizzatore le risposte all'invito
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/regalo" element={<GiftPage config={event.gift} />} />
        <Route path="/foto" element={<PhotosPage config={event.photos} />} />
        <Route path="/foto/galleria" element={<PhotosGalleryPage config={event.photos} />} />
        <Route path="/admin" element={<AdminProtected />} />
        <Route path="/admin/tavoli" element={<AdminProtected page="tables" />} />
      </Routes>
    </HashRouter>
  );
}
