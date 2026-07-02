export const rsvpDataChangedEventName = "rsvp-data-changed";
export const rsvpDataVersionStorageKey = "rsvp-data-version";

export const notifyRsvpDataChanged = detail => {
  const payload = {
    detail,
    updatedAt: Date.now(),
  };

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(rsvpDataVersionStorageKey, JSON.stringify(payload));
  } catch {
    // Ignore storage errors; the in-window event still keeps active views in sync.
  }

  window.dispatchEvent(new CustomEvent(rsvpDataChangedEventName, { detail: payload }));
};
