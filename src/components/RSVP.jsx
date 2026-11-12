import { useState } from "react";

export default function RSVP({ config }) {
  const [form, setForm] = useState({ name: "", attending: "si", notes: "" });
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = event => {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          partecipa: form.attending === "si",
          guests: form.attending === "si" ? 1 : 0,
          message: form.notes,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = result.code || `HTTP_${response.status}`;
        const requestId = result.requestId || response.headers.get("X-Request-Id");
        setError(`${config.errorMessage} Codice: ${code}${requestId ? ` · Riferimento: ${requestId}` : ""}`);
        return;
      }
      setShowSuccess(true);
      setForm({ name: "", attending: "si", notes: "" });
    } catch {
      setError(`${config.errorMessage} Verifica la connessione e riprova.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="section rsvp-form">
      <h2 className="h2">{config.title}</h2>

      <label className="form-field">
        <span>{config.nameLabel}</span>
        <input
          className="w-full border rounded-input px-4 py-2 text-body"
          placeholder={config.namePlaceholder}
          name="name"
          value={form.name}
          onChange={handleChange}
          autoComplete="name"
          required
        />
      </label>

      <fieldset className="attendance-fieldset">
        <legend>{config.attendanceQuestion}</legend>
        <div className="attendance-options">
          {[{ value: "si", label: config.attendingLabel }, { value: "no", label: config.notAttendingLabel }].map(option => (
            <label className={`attendance-option${form.attending === option.value ? " is-selected" : ""}`} key={option.value}>
              <input
                type="radio"
                name="attending"
                value={option.value}
                checked={form.attending === option.value}
                onChange={handleChange}
                required
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="form-field">
        <span>{config.notesLabel}</span>
        <textarea
          className="w-full border rounded-input px-4 py-3 text-body"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder={config.notesPlaceholder}
          rows="3"
        />
      </label>

      {error && <p role="alert" className="form-error">{error}</p>}

      <button type="submit" disabled={submitting} className="btn submit-rsvp">
        {submitting ? config.submittingLabel : config.submitLabel}
      </button>

      {showSuccess && (
        <div className="rsvp-success-backdrop" onClick={() => setShowSuccess(false)}>
          <div className="rsvp-success-card" role="dialog" aria-modal="true" aria-labelledby="rsvp-success-title" onClick={event => event.stopPropagation()}>
            <div className="rsvp-success-icon">{config.successIcon}</div>
            <h2 id="rsvp-success-title">{config.successTitle}</h2>
            <p>{config.successMessage}</p>
            <button type="button" onClick={() => setShowSuccess(false)}>{config.successButton}</button>
          </div>
        </div>
      )}
    </form>
  );
}
