import { useState } from "react";

export default function RSVP({ config }) {
  const [form, setForm] = useState({ name: "", guests: 1, attending: true, notes: "" });
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = e => {
    const { name, value, type, checked } = e.target;

    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "attending" && !checked ? { guests: 0 } : {}),
      ...(name === "attending" && checked ? { guests: 1 } : {}),
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          partecipa: form.attending,
          guests: form.attending ? Number(form.guests) : 0,
          message: form.notes,
        }),
      });

      if (!res.ok) {
        throw new Error("Invio non riuscito");
      }

      setShowSuccess(true);
      setForm({ name: "", guests: 1, attending: true, notes: "" });
    } catch {
      setError(config.errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="section">
      <h2 className="h2">{config.title}</h2>

      <input
        className="w-full border rounded-input px-4 py-2 text-body"
        placeholder={config.namePlaceholder}
        name="name"
        value={form.name}
        onChange={handleChange}
        required
      />

      <label className="flex items-center justify-center gap-2 text-body">
        <input type="checkbox" name="attending" checked={form.attending} onChange={handleChange} /> {config.attendingLabel}
      </label>

      {form.attending && (
        <div className="space-y-2 text-left">
          <label className="sr-only" htmlFor="guests">
            {config.guestsLabel}
          </label>
          <input
            id="guests"
            className="w-full border rounded-input px-4 py-2 text-body"
            type="number"
            min="1"
            name="guests"
            value={form.guests}
            onChange={handleChange}
            aria-describedby="guests-help"
          />
          <p id="guests-help" className="text-xs leading-relaxed text-muted">
            {config.guestsHelpText}
          </p>
        </div>
      )}

      <textarea
        className="w-full border rounded-input px-4 py-2 text-body"
        name="notes"
        value={form.notes}
        onChange={handleChange}
        placeholder={config.notesPlaceholder}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting} className="btn w-full mt-2 flex items-center justify-center disabled:opacity-60">
        {submitting ? config.submittingLabel : config.submitLabel}
      </button>

      {showSuccess && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setShowSuccess(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-4xl">{config.successIcon}</div>

            <h2 className="text-xl font-bold text-gray-900">
              {config.successTitle}
            </h2>

            <p className="text-gray-600">
              {config.successMessage}
            </p>

            <button
              onClick={() => setShowSuccess(false)}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              {config.successButton}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
