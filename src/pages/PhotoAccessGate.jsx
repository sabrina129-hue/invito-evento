import { CalendarClock } from "lucide-react";
import WeddingCountdown from "../components/WeddingCountdown";
import "./PhotoAccessGate.css";

export default function PhotoAccessGate({
  cardClassName,
  labels,
  pageClassName,
  countdownEvent,
}) {
  return (
    <main className={pageClassName}>
      <section className={`${cardClassName} photo-access-card`} aria-label={labels.lockedTitle}>
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
