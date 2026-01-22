import { useState } from "react";
import { event } from "../data/event";

export default function RSVP() {
  const [form, setForm] = useState({ name: "", guests: 1, attending: true, notes: "" });
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        partecipate: form.attending,
        guests: form.guests,
        message: form.notes,
      }),
    });
    setShowSuccess(true);
  };

  return (
    <form onSubmit={handleSubmit} className="section">
      <h2 className="h2">Conferma la tua presenza!</h2>

      <input className="w-full border rounded-lg px-4 py-2 text-body" placeholder={event.placeholder_name} name="name" value={form.name} onChange={handleChange} required />

      <label className="flex items-center justify-center gap-2 text-body">
        <input type="checkbox" name="attending" checked={form.attending} onChange={handleChange} /> Sarò presente
      </label>

      <textarea className="w-full border rounded-lg px-4 py-2 text-body" name="notes" value={form.notes} onChange={handleChange} placeholder={event.placeholder_textBox} />

      <button type="submit" className="btn w-full mt-2 flex items-center justify-center">Invia 💌</button>

      {showSuccess && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setShowSuccess(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-4xl">🎉</div>

            <h2 className="text-xl font-bold text-gray-900">
              Grazie per aver risposto! 💖
            </h2>

            <p className="text-gray-600">
              Abbiamo ricevuto la tua conferma di partecipazione.
            </p>

            <button
              onClick={() => setShowSuccess(false)}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </form>
  );
}
