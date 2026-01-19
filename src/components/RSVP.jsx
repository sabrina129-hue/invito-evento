import { useState } from "react";

export default function RSVP() {
  const [form, setForm] = useState({ name: "", guests: 1, attending: true, notes: "" });

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    alert("Grazie per aver confermato! 💖");
    console.log(form);
  };

  return (
    <form onSubmit={handleSubmit} className="section">
      <h2 className="h2">Conferma la tua presenza</h2>

      <input className="w-full border rounded-lg px-4 py-2 text-body" placeholder="Nome e Cognome" name="name" value={form.name} onChange={handleChange} required />
      <input className="w-full border rounded-lg px-4 py-2 text-body" type="number" min="1" name="guests" value={form.guests} onChange={handleChange} placeholder="Numero invitati" />
      
      <label className="flex items-center justify-center gap-2 text-body">
        <input type="checkbox" name="attending" checked={form.attending} onChange={handleChange} /> Sarò presente
      </label>

      <textarea className="w-full border rounded-lg px-4 py-2 text-body" name="notes" value={form.notes} onChange={handleChange} placeholder="Allergie o messaggio per noi" />

      <button type="submit" className="btn w-full mt-2">Invia 💌</button>
    </form>
  );
}
