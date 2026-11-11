import { useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { event } from "./data/event";
import Admin from "./pages/Admin.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import ParchmentInvite from "./components/ParchmentInvite.jsx";

function AdminProtected() {
  const [ok, setOk] = useState(() => !!localStorage.getItem("adminToken"));

  return ok ? (
    <Admin labels={event.admin} onLogout={() => setOk(false)} />
  ) : (
    <AdminLogin labels={event.admin} onLogin={() => setOk(true)} />
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ParchmentInvite />} />
        <Route path="/admin" element={<AdminProtected />} />
      </Routes>
    </HashRouter>
  );
}