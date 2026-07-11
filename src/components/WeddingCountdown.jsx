const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getDaysUntil = value => {
  const targetDate = new Date(value);

  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  return Math.max(0, Math.ceil((targetStart.getTime() - todayStart.getTime()) / DAY_IN_MS));
};

export default function WeddingCountdown({ event }) {
  const days = getDaysUntil(event.calendar?.start);
  const labels = event.countdown || {};

  if (days === null) {
    return null;
  }

  const unit = days === 1
    ? labels.daySingular || "giorno"
    : labels.dayPlural || "giorni";

  return (
    <div className="wedding-countdown" aria-label={labels.ariaLabel || labels.label || "Countdown matrimonio"}>
      {labels.label && <span>{labels.label}</span>}
      <strong>{days}</strong>
      <span>{unit}</span>
    </div>
  );
}
