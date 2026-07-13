import { CalendarClock } from "lucide-react";
import WeddingCountdown from "../components/WeddingCountdown";
import { PHOTO_LANGUAGES } from "./photoTranslations";
import "./PhotoAccessGate.css";

export default function PhotoAccessGate({
  cardClassName,
  labels,
  language,
  languageSwitchClassName,
  onSwitchLanguage,
  pageClassName,
  countdownEvent,
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

        {countdownEvent && (
          <div className="photo-access-countdown">
            <WeddingCountdown event={countdownEvent} />
          </div>
        )}
      </section>
    </main>
  );
}
