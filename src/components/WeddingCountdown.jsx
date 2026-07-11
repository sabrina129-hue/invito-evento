import { useEffect, useState } from "react";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const HOUR_IN_MS = 60 * 60 * 1000;
const MINUTE_IN_MS = 60 * 1000;
const SECOND_IN_MS = 1000;

const getRemainingTime = (value, now) => {
  const targetDate = new Date(value);

  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  const remainingMs = Math.max(0, targetDate.getTime() - now);
  const days = Math.floor(remainingMs / DAY_IN_MS);
  const hours = Math.floor((remainingMs % DAY_IN_MS) / HOUR_IN_MS);
  const minutes = Math.floor((remainingMs % HOUR_IN_MS) / MINUTE_IN_MS);
  const seconds = Math.floor((remainingMs % MINUTE_IN_MS) / SECOND_IN_MS);

  return { days, hours, minutes, seconds };
};

const getUnitLabel = (labels, unit, value, singularFallback, pluralFallback) => (
  value === 1
    ? labels[`${unit}Singular`] || singularFallback
    : labels[`${unit}Plural`] || pluralFallback
);

const formatValue = (value, pad = true) => (
  pad ? String(value).padStart(2, "0") : String(value)
);

const getSegments = (remaining, labels) => [
  {
    key: "days",
    value: remaining.days,
    label: getUnitLabel(labels, "day", remaining.days, "giorno", "giorni"),
    pad: false,
  },
  {
    key: "hours",
    value: remaining.hours,
    label: getUnitLabel(labels, "hour", remaining.hours, "ora", "ore"),
  },
  {
    key: "minutes",
    value: remaining.minutes,
    label: getUnitLabel(labels, "minute", remaining.minutes, "minuto", "minuti"),
  },
  {
    key: "seconds",
    value: remaining.seconds,
    label: getUnitLabel(labels, "second", remaining.seconds, "secondo", "secondi"),
  },
];


export default function WeddingCountdown({ event }) {
  const [now, setNow] = useState(() => Date.now());
  const labels = event.countdown || {};
  const remaining = getRemainingTime(event.calendar?.start, now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (remaining === null) {
    return null;
  }

  const segments = getSegments(remaining, labels);

  return (
    <div className="wedding-countdown" aria-label={labels.ariaLabel || labels.label || "Countdown matrimonio"}>
      {labels.label && <span className="wedding-countdown-label">{labels.label}</span>}
      <div className="wedding-countdown-grid">
        {segments.map(segment => (
          <span className="wedding-countdown-part" key={segment.key}>
            <strong>{formatValue(segment.value, segment.pad)}</strong>
            <span>{segment.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
