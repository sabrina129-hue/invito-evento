import { useEffect, useState } from "react";

const getAvailableAt = value => {
  const timestamp = Date.parse(value || "");
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
};

export const usePhotoAccess = availableFrom => {
  const availableAt = getAvailableAt(availableFrom);
  const [now, setNow] = useState(() => Date.now());
  const isLocked = Boolean(availableAt && now < availableAt.getTime());

  useEffect(() => {
    if (!isLocked || !availableAt) return undefined;

    const delay = Math.min(Math.max(availableAt.getTime() - Date.now(), 1000), 60000);
    const timeoutId = window.setTimeout(() => setNow(Date.now()), delay);

    return () => window.clearTimeout(timeoutId);
  }, [availableAt, isLocked, now]);

  return { availableAt, isLocked };
};
