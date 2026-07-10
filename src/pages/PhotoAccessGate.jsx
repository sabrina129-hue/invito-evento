import { CalendarClock } from "lucide-react";
import { PHOTO_LANGUAGES } from "./photoTranslations";
import "./PhotoAccessGate.css";

const formatAvailableAt = (availableAt, language) => {
  if (!availableAt) return "";

  return new Intl.DateTimeFormat(language === "pl" ? "pl-PL" : "it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(availableAt);
};

export default function PhotoAccessGate({
  availableAt,
  cardClassName,
  labels,
  language,
  languageSwitchClassName,
  onSwitchLanguage,
  pageClassName,
}) {
  return (
    <main className={pageClassName}>
      <section className={`${cardClassName} photo-access-card`} aria-label={labels.lockedTitle}>
        <div className={languageSwitchClassName} aria-label="Lingua">
          {Object.entries(PHOTO_LANGUAGES).map(([code, label]) => (
            <button
              type="button"
              key={code}
              className={language === code ? "is-active" : ""}
              onClick={() => onSwitchLanguage(code)}
              aria-pressed={language === code}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="photo-access-icon" aria-hidden="true">
          <CalendarClock size={28} />
        </div>

        <h1 className="photo-access-title">{labels.lockedTitle}</h1>
        <p className="photo-access-message">{labels.lockedMessage}</p>

        {availableAt && (
          <p className="photo-access-date">
            <span>{labels.lockedDateLabel}</span>
            <strong>{formatAvailableAt(availableAt, language)}</strong>
          </p>
        )}
      </section>
    </main>
  );
}
