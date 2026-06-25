import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";

const MotionDiv = motion.div;
const foodPreferenceMenuOptions = ["Menu bambino", "Menu vegetariano", "Menu vegano"];

const normalizeGuests = guests => Math.max(1, Number(guests) || 1);

const emptyFoodPreferences = guests =>
  Array.from({ length: normalizeGuests(guests) }, () => []);

const resizeGuestNames = (names, guests) =>
  Array.from({ length: normalizeGuests(guests) }, (_, index) =>
    index === 0 ? "" : String(names[index] || "")
  );

const getGuestDisplayName = (form, guestIndex) => {
  if (guestIndex === 0) {
    return form.name.trim() || "Persona 1";
  }

  return String(form.guestNames[guestIndex] || "").trim() || `Persona ${guestIndex + 1}`;
};

const resizeFoodPreferences = (preferences, guests) => {
  const nextLength = normalizeGuests(guests);
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
  const [form, setForm] = useState({ name: "", guests: 1, attending: true, foodPreferences: emptyFoodPreferences(1), guestNames: resizeGuestNames([], 1), notes: "" });
  const [foodMenuOpen, setFoodMenuOpen] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (foodMenuOpen === null) return undefined;

    const closeMenuOnOutsidePointerDown = event => {
      if (!event.target.closest("[data-rsvp-food-menu]")) {
        setFoodMenuOpen(null);
      }
    };

    document.addEventListener("pointerdown", closeMenuOnOutsidePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsidePointerDown, true);
    };
  }, [foodMenuOpen]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;

    if (name === "attending" && !checked) {
      setFoodMenuOpen(null);
    }

    setForm(prev => {
      if (name === "attending" && !checked) {
        return { ...prev, attending: false, guests: 0, foodPreferences: emptyFoodPreferences(1), guestNames: resizeGuestNames([], 1) };
      }

      if (name === "attending" && checked) {
        return { ...prev, attending: true, guests: 1, foodPreferences: resizeFoodPreferences(prev.foodPreferences, 1), guestNames: resizeGuestNames(prev.guestNames, 1) };
      }

      if (name === "guests") {
        setFoodMenuOpen(null);
        return { ...prev, guests: value.replace(/\D/g, "") };
      }

      return {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
    });
  };

  const handleGuestsBlur = () => {
    setForm(prev => {
      const guests = normalizeGuests(prev.guests);
      return {
        ...prev,
        guests,
        foodPreferences: resizeFoodPreferences(prev.foodPreferences, guests),
        guestNames: resizeGuestNames(prev.guestNames, guests),
      };
    });
  };

  const handleGuestNameChange = (guestIndex, value) => {
    setForm(prev => {
      const guestNames = resizeGuestNames(prev.guestNames, prev.guests);
      guestNames[guestIndex] = value;

      return { ...prev, guestNames };
    });
  };

  const removeGuest = guestIndex => {
    if (guestIndex <= 0) return;

    setFoodMenuOpen(null);
    setForm(prev => {
      const currentGuests = normalizeGuests(prev.guests);
      const nextGuests = Math.max(1, currentGuests - 1);
      const guestNames = resizeGuestNames(prev.guestNames, currentGuests)
        .filter((_, index) => index !== guestIndex);
      const foodPreferences = resizeFoodPreferences(prev.foodPreferences, currentGuests)
        .filter((_, index) => index !== guestIndex);

      return {
        ...prev,
        guests: nextGuests,
        guestNames: resizeGuestNames(guestNames, nextGuests),
        foodPreferences: resizeFoodPreferences(foodPreferences, nextGuests),
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

  const renderFoodPreferenceOptions = (guestPreferences, guestIndex) => {
    let currentGroup = "";

    return config.foodPreferencesOptions.flatMap(option => {
      const group = foodPreferenceMenuOptions.includes(option)
        ? "Preferenze alimentari"
        : "Intolleranze";
      const items = [];

      if (group !== currentGroup) {
        currentGroup = group;
        items.push(
          <div
            key={`group-${guestIndex}-${group}`}
            className="pt-2 text-xs font-body font-semibold text-muted first:pt-0 sm:col-span-2"
          >
            {group}
          </div>
        );
      }

      items.push(
        <label key={option} className="flex items-center gap-2 text-sm font-body text-text">
          <input
            type="checkbox"
            checked={guestPreferences.includes(option)}
            onChange={() => toggleFoodPreference(guestIndex, option)}
          />
          {option}
        </label>
      );

      return items;
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const guests = form.attending ? normalizeGuests(form.guests) : 0;
      const foodPreferences = resizeFoodPreferences(form.foodPreferences, guests || 1);
      const guestNames = resizeGuestNames(form.guestNames, guests || 1);
      const completeGuestNames = [form.name.trim(), ...guestNames.slice(1).map(name => name.trim())];

      if (form.attending && completeGuestNames.some(name => !name)) {
        setError(config.guestNamesErrorMessage || "Inserisci il nome di tutti gli ospiti.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          partecipa: form.attending,
          guests,
          guest_names: form.attending ? completeGuestNames : [],
          food_preferences: formatFoodPreferences(foodPreferences),
          message: form.notes,
        }),
      });

      if (!res.ok) {
        throw new Error("Invio non riuscito");
      }

      setShowSuccess(true);
      setForm({ name: "", guests: 1, attending: true, foodPreferences: emptyFoodPreferences(1), guestNames: resizeGuestNames([], 1), notes: "" });
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="guests"
                value={form.guests}
                onChange={handleChange}
                onBlur={handleGuestsBlur}
                aria-describedby="guests-help"
              />
              <p id="guests-help" className="text-xs leading-relaxed text-muted">
                {config.guestsHelpText}
              </p>
            </div>

            {normalizeGuests(form.guests) <= 1 && (
              <div className="space-y-3 text-left">
                <label className="mb-2 block text-sm font-body text-text" htmlFor="food-preferences-button">
                  {config.foodPreferencesLabel}
                </label>
                <div className="relative" data-rsvp-food-menu>
                  {(() => {
                    const primaryPreferences = resizeFoodPreferences(form.foodPreferences, form.guests)[0] || [];

                    return (
                      <>
                        <button
                          id="food-preferences-button"
                          type="button"
                          className="w-full border rounded-input px-4 py-2 text-body text-left bg-white flex items-center justify-between gap-3"
                          onClick={() => setFoodMenuOpen(prev => (prev === 0 ? null : 0))}
                          aria-expanded={foodMenuOpen === 0}
                        >
                          <span className={primaryPreferences.length ? "" : "text-muted"}>
                            {primaryPreferences.length
                              ? primaryPreferences.join(", ")
                              : config.foodPreferencesPlaceholder}
                          </span>
                          <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-text" />
                        </button>

                        {foodMenuOpen === 0 && (
                          <div className="absolute z-20 mt-2 max-h-40 w-full overflow-y-auto rounded-input border bg-white p-3 shadow-lg">
                            <div className="space-y-2">
                              {renderFoodPreferenceOptions(primaryPreferences, 0)}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {normalizeGuests(form.guests) > 1 && (
              <div className="space-y-2 text-left">
                <p className="text-sm font-body text-text">
                  {config.guestNamesLabel || "Ospiti aggiuntivi"}
                </p>

                {resizeFoodPreferences(form.foodPreferences, form.guests).map((guestPreferences, guestIndex) => {
                  const isPrimaryGuest = guestIndex === 0;
                  const guestNames = resizeGuestNames(form.guestNames, form.guests);
                  const guestName = isPrimaryGuest ? form.name : guestNames[guestIndex] || "";
                  const preferenceButtonId = `food-preferences-button-${guestIndex}`;
                  const displayName = getGuestDisplayName(form, guestIndex);
                  const guestLabel = config.guestNameLabel
                    ? `${config.guestNameLabel} ${guestIndex + 1}`
                    : `Nome ospite ${guestIndex + 1}`;
                  const preferencesLabel = guestPreferences.length
                    ? guestPreferences.join(", ")
                    : "Nessuna preferenza";

                  return (
                    <div key={guestIndex} className="relative rounded-input border bg-white/80 p-2.5" data-rsvp-food-menu>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-body text-muted">{guestLabel}</span>
                        {!isPrimaryGuest && (
                          <button
                            type="button"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-transparent text-muted transition hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                            onClick={() => removeGuest(guestIndex)}
                            aria-label={`Rimuovi ${guestLabel}`}
                          >
                            <X size={13} aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,0.9fr)] sm:items-end">
                        <label className="block text-xs font-body text-muted">
                          Nome e Cognome
                          <input
                            className={`mt-1 w-full border rounded-input px-3 py-2 text-sm ${isPrimaryGuest ? "bg-surface text-muted" : ""}`}
                            value={guestName}
                            onChange={event => handleGuestNameChange(guestIndex, event.target.value)}
                            placeholder={config.guestNamePlaceholder || "Nome e cognome"}
                            readOnly={isPrimaryGuest}
                            aria-readonly={isPrimaryGuest}
                            aria-label={guestLabel}
                            required
                          />
                        </label>

                        <div>
                          <label className="mb-1 block text-xs font-body text-muted" htmlFor={preferenceButtonId}>
                            {config.foodPreferencesLabel}
                          </label>
                          <button
                            id={preferenceButtonId}
                            type="button"
                            className="w-full border rounded-input bg-white px-3 py-2 text-left text-sm flex items-center justify-between gap-2"
                            onClick={() => setFoodMenuOpen(prev => (prev === guestIndex ? null : guestIndex))}
                            aria-expanded={foodMenuOpen === guestIndex}
                          >
                            <span className={`min-w-0 truncate ${guestPreferences.length ? "text-text" : "text-muted"}`}>
                              {preferencesLabel}
                            </span>
                            <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-text" />
                          </button>
                        </div>
                      </div>

                      {foodMenuOpen === guestIndex && (
                        <div className="absolute left-2 right-2 z-20 mt-2 max-h-40 overflow-y-auto rounded-input border bg-white p-3 text-left shadow-lg">
                          <div className="mb-2 text-xs font-body text-muted">{displayName}</div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {renderFoodPreferenceOptions(guestPreferences, guestIndex)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

      {showSuccess && createPortal(
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
        </div>,
        document.body
      )}
    </form>
  );
}
