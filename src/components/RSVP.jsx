import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const MotionDiv = motion.div;

const emptyFoodPreferences = guests =>
  Array.from({ length: Math.max(1, Number(guests) || 1) }, () => []);

const resizeFoodPreferences = (preferences, guests) => {
  const nextLength = Math.max(1, Number(guests) || 1);
  return Array.from({ length: nextLength }, (_, index) =>
    Array.isArray(preferences[index]) ? preferences[index] : []
  );
};

const formatFoodPreferences = preferences => {
  if (preferences.length <= 1) {
    return (preferences[0] || []).join(", ");
  }

  return preferences
    .map((items, index) => `Persona ${index + 1}: ${items.length ? items.join(", ") : "-"}`)
    .join(" | ");
};

export default function RSVP({ config }) {
  const [form, setForm] = useState({ name: "", guests: 1, attending: true, foodPreferences: emptyFoodPreferences(1), notes: "" });
  const [foodMenuOpen, setFoodMenuOpen] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = e => {
    const { name, value, type, checked } = e.target;

    if (name === "attending" && !checked) {
      setFoodMenuOpen(null);
    }

    setForm(prev => {
      if (name === "attending" && !checked) {
        return { ...prev, attending: false, guests: 0, foodPreferences: emptyFoodPreferences(1) };
      }

      if (name === "attending" && checked) {
        return { ...prev, attending: true, guests: 1, foodPreferences: resizeFoodPreferences(prev.foodPreferences, 1) };
      }

      if (name === "guests") {
        const guests = Math.max(1, Number(value) || 1);
        setFoodMenuOpen(null);
        return { ...prev, guests, foodPreferences: resizeFoodPreferences(prev.foodPreferences, guests) };
      }

      return {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
    });
  };

  const toggleFoodPreference = (guestIndex, option) => {
    setForm(prev => {
      const foodPreferences = resizeFoodPreferences(prev.foodPreferences, prev.guests);
      const guestPreferences = foodPreferences[guestIndex] || [];
      const selected = guestPreferences.includes(option);

      foodPreferences[guestIndex] = selected
        ? guestPreferences.filter(item => item !== option)
        : [...guestPreferences, option];

      return { ...prev, foodPreferences };
    });
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
          food_preferences: formatFoodPreferences(resizeFoodPreferences(form.foodPreferences, form.guests)),
          message: form.notes,
        }),
      });

      if (!res.ok) {
        throw new Error("Invio non riuscito");
      }

      setShowSuccess(true);
      setForm({ name: "", guests: 1, attending: true, foodPreferences: emptyFoodPreferences(1), notes: "" });
      setFoodMenuOpen(null);
    } catch {
      setError(config.errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="section">
      <h2 className="h2">{config.title}</h2>

      <label className="block text-left text-sm font-body text-text">
        {config.nameLabel}
        <input
          className="mt-2 w-full border rounded-input px-4 py-2 text-body"
          placeholder={config.namePlaceholder}
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
      </label>

      <label className="flex items-center justify-center gap-2 text-body">
        <input type="checkbox" name="attending" checked={form.attending} onChange={handleChange} /> {config.attendingLabel}
      </label>

      <AnimatePresence initial={false}>
        {form.attending && (
          <MotionDiv
            className="space-y-4"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{ overflow: "visible" }}
          >
            <div className="space-y-2 text-left">
              <label className="block text-sm font-body text-text" htmlFor="guests">
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

            <div className="space-y-3 text-left">
              <label className="mb-2 block text-sm font-body text-text" htmlFor="food-preferences-button">
                {config.foodPreferencesLabel}
              </label>
              {resizeFoodPreferences(form.foodPreferences, form.guests).map((guestPreferences, guestIndex) => (
                <div key={guestIndex} className="relative">
                  {Number(form.guests) > 1 && (
                    <p className="mb-1 text-xs font-body text-muted">Persona {guestIndex + 1}</p>
                  )}
                  <button
                    id={guestIndex === 0 ? "food-preferences-button" : undefined}
                    type="button"
                    className="w-full border rounded-input px-4 py-2 text-body text-left bg-white flex items-center justify-between gap-3"
                    onClick={() => setFoodMenuOpen(prev => (prev === guestIndex ? null : guestIndex))}
                    aria-expanded={foodMenuOpen === guestIndex}
                  >
                    <span className={guestPreferences.length ? "" : "text-muted"}>
                      {guestPreferences.length
                        ? guestPreferences.join(", ")
                        : config.foodPreferencesPlaceholder}
                    </span>
                    <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-text" />
                  </button>

                  {foodMenuOpen === guestIndex && (
                    <div className="absolute z-20 mt-2 max-h-40 w-full overflow-y-auto rounded-input border bg-white p-3 shadow-lg">
                      <div className="space-y-2">
                        {config.foodPreferencesOptions.map(option => (
                          <label key={option} className="flex items-center gap-2 text-sm font-body text-text">
                            <input
                              type="checkbox"
                              checked={guestPreferences.includes(option)}
                              onChange={() => toggleFoodPreference(guestIndex, option)}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      <label className="block text-left text-sm font-body text-text">
        {config.notesLabel}
        <textarea
          className="mt-2 w-full border rounded-input px-4 py-2 text-body"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder={config.notesPlaceholder}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting} className="btn w-full mt-2 flex items-center justify-center disabled:opacity-60">
        {submitting ? config.submittingLabel : config.submitLabel}
      </button>

      {showSuccess && (
        <div
          className="success-modal-backdrop"
          onClick={() => setShowSuccess(false)}
        >
          <div
            className="success-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="success-modal-icon">{config.successIcon}</div>

            <h2 className="success-modal-title">
              {config.successTitle}
            </h2>

            <p className="success-modal-message">
              {config.successMessage}
            </p>

            <button
              onClick={() => setShowSuccess(false)}
              className="success-modal-button"
            >
              {config.successButton}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
