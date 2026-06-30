import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";

const MotionDiv = motion.div;

const normalizeGuests = guests => Math.max(1, Number(guests) || 1);

const emptyFoodPreferences = guests =>
  Array.from({ length: normalizeGuests(guests) }, () => []);

const resizeGuestNames = (names, guests) =>
  Array.from({ length: normalizeGuests(guests) }, (_, index) =>
    index === 0 ? "" : String(names[index] || "")
  );

const getGuestDisplayName = (form, guestIndex, personLabel = "Persona") => {
  if (guestIndex === 0) {
    return form.name.trim() || `${personLabel} 1`;
  }

  return String(form.guestNames[guestIndex] || "").trim() || `${personLabel} ${guestIndex + 1}`;
};

const resizeFoodPreferences = (preferences, guests) => {
  const nextLength = normalizeGuests(guests);
  return Array.from({ length: nextLength }, (_, index) =>
    Array.isArray(preferences[index]) ? preferences[index] : []
  );
};

const formatFoodPreferences = (preferences, personLabel = "Persona") => {
  if (preferences.length <= 1) {
    return (preferences[0] || []).join(", ");
  }

  return preferences
    .map((items, index) => `${personLabel} ${index + 1}: ${items.length ? items.join(", ") : "-"}`)
    .join(" | ");
};

export default function RSVP({ config }) {
  const requiredFieldMessage = config.requiredMessage || "Compila questo campo";
  const personLabel = config.personLabel || "Persona";
  const foodPreferenceMenuOptionCount = config.foodPreferenceMenuOptionCount ?? 3;
  const foodPreferenceMenuGroupLabel = config.foodPreferenceMenuGroupLabel || "Preferenze alimentari";
  const foodPreferenceAllergyGroupLabel = config.foodPreferenceAllergyGroupLabel || "Intolleranze";
  const noPreferenceLabel = config.noPreferenceLabel || "Nessuna preferenza";
  const removeGuestLabel = config.removeGuestLabel || "Rimuovi";
  const primaryGuestInfoMessage = config.primaryGuestInfoMessage || "Questo campo si compila automaticamente con il Nome e Cognome inserito nella casella in alto.";
  const [form, setForm] = useState({ name: "", guests: 1, attending: true, foodPreferences: emptyFoodPreferences(1), guestNames: resizeGuestNames([], 1), notes: "" });
  const [foodMenuOpen, setFoodMenuOpen] = useState(null);
  const [primaryGuestInfoVisible, setPrimaryGuestInfoVisible] = useState(false);
  const [fieldError, setFieldError] = useState(null);
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

  useEffect(() => {
    if (!primaryGuestInfoVisible) return undefined;

    const closePrimaryGuestInfoOnOutsidePointerDown = event => {
      if (!event.target.closest("[data-primary-guest-info-area]")) {
        setPrimaryGuestInfoVisible(false);
      }
    };
    const timer = window.setTimeout(() => setPrimaryGuestInfoVisible(false), 4200);

    document.addEventListener("pointerdown", closePrimaryGuestInfoOnOutsidePointerDown, true);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", closePrimaryGuestInfoOnOutsidePointerDown, true);
    };
  }, [primaryGuestInfoVisible]);

  useEffect(() => {
    if (normalizeGuests(form.guests) <= 1) {
      setPrimaryGuestInfoVisible(false);
    }
  }, [form.guests]);

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
        setFieldError(null);
        return { ...prev, guests: value.replace(/\D/g, "") };
      }

      return {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
    });

    if (name === "name") {
      setFieldError(null);
    }
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

    setFieldError(prev => (prev?.field === `guest-${guestIndex}` ? null : prev));
  };

  const showPrimaryGuestInfo = () => {
    if (normalizeGuests(form.guests) > 1) {
      setPrimaryGuestInfoVisible(true);
    }
  };

  const removeGuest = guestIndex => {
    if (guestIndex <= 0) return;

    setFoodMenuOpen(null);
    setFieldError(null);
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

    return config.foodPreferencesOptions.flatMap((option, optionIndex) => {
      const group = optionIndex < foodPreferenceMenuOptionCount
        ? foodPreferenceMenuGroupLabel
        : foodPreferenceAllergyGroupLabel;
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
    setFieldError(null);

    try {
      const guests = form.attending ? normalizeGuests(form.guests) : 0;
      const foodPreferences = resizeFoodPreferences(form.foodPreferences, guests || 1);
      const guestNames = resizeGuestNames(form.guestNames, guests || 1);
      const completeGuestNames = [form.name.trim(), ...guestNames.slice(1).map(name => name.trim())];

      if (form.attending && !form.name.trim()) {
        setPrimaryGuestInfoVisible(false);
        setFieldError({ field: "name", message: requiredFieldMessage });
        setSubmitting(false);
        return;
      }

      if (form.attending && completeGuestNames.some(name => !name)) {
        const emptyGuestIndex = completeGuestNames.findIndex(name => !name);
        setPrimaryGuestInfoVisible(false);
        setFieldError({ field: `guest-${emptyGuestIndex}`, message: requiredFieldMessage });
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
          food_preferences: formatFoodPreferences(foodPreferences, personLabel),
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
    <form onSubmit={handleSubmit} className="section" noValidate>
      <h2 className="h2">{config.title}</h2>

      <label className="relative block text-left text-sm font-body text-text">
        {config.nameLabel}
        <input
          className="mt-2 w-full border rounded-input px-4 py-2 text-body"
          placeholder={config.namePlaceholder}
          name="name"
          value={form.name}
          onChange={handleChange}
          aria-invalid={fieldError?.field === "name"}
          aria-describedby={fieldError?.field === "name" ? "name-field-error" : undefined}
          required
        />
        {fieldError?.field === "name" && (
          <span
            id="name-field-error"
            className="pointer-events-none absolute left-0 top-full z-30 mt-1 w-full rounded-input border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-relaxed text-amber-900 shadow-lg"
            role="alert"
          >
            {fieldError.message}
          </span>
        )}
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
                  const displayName = getGuestDisplayName(form, guestIndex, personLabel);
                  const guestLabel = config.guestNameLabel
                    ? `${config.guestNameLabel} ${guestIndex + 1}`
                    : `Nome ospite ${guestIndex + 1}`;
                  const preferencesLabel = guestPreferences.length
                    ? guestPreferences.join(", ")
                    : noPreferenceLabel;

                  return (
                    <div key={guestIndex} className="relative rounded-input border bg-white/80 p-2.5" data-rsvp-food-menu>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-body text-muted">{guestLabel}</span>
                        {!isPrimaryGuest && (
                          <button
                            type="button"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-transparent text-muted transition hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                            onClick={() => removeGuest(guestIndex)}
                            aria-label={`${removeGuestLabel} ${guestLabel}`}
                          >
                            <X size={13} aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,0.9fr)] sm:items-end">
                        <label className="relative block text-xs font-body text-muted" {...(isPrimaryGuest ? { "data-primary-guest-info-area": true } : {})}>
                          {config.nameLabel}
                          <input
                            className={`mt-1 w-full border rounded-input px-3 py-2 text-sm ${isPrimaryGuest ? "bg-surface text-muted" : ""}`}
                            value={guestName}
                            onChange={event => handleGuestNameChange(guestIndex, event.target.value)}
                            onFocus={isPrimaryGuest ? showPrimaryGuestInfo : undefined}
                            onClick={isPrimaryGuest ? showPrimaryGuestInfo : undefined}
                            placeholder={config.guestNamePlaceholder || "Nome e cognome"}
                            readOnly={isPrimaryGuest}
                            aria-readonly={isPrimaryGuest}
                            aria-label={guestLabel}
                            aria-invalid={fieldError?.field === `guest-${guestIndex}`}
                            aria-describedby={[
                              isPrimaryGuest && primaryGuestInfoVisible ? "primary-guest-info" : "",
                              fieldError?.field === `guest-${guestIndex}` ? `guest-${guestIndex}-field-error` : "",
                            ].filter(Boolean).join(" ") || undefined}
                            required
                          />
                          {fieldError?.field === `guest-${guestIndex}` && (
                            <span
                              id={`guest-${guestIndex}-field-error`}
                              className="pointer-events-none absolute left-0 top-full z-30 mt-1 w-full rounded-input border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-relaxed text-amber-900 shadow-lg"
                              role="alert"
                            >
                              {fieldError.message}
                            </span>
                          )}
                          {isPrimaryGuest && primaryGuestInfoVisible && (
                            <span
                              id="primary-guest-info"
                              className="pointer-events-none absolute left-0 top-full z-30 mt-1 w-full rounded-input border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-relaxed text-amber-900 shadow-lg"
                              role="status"
                            >
                              {primaryGuestInfoMessage}
                            </span>
                          )}
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
