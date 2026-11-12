import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import RSVP from "./RSVP";
import PhotoSnapshot from "./PhotoSnapshot.jsx";
import { event } from "../data/event";
import "./ParchmentInvite.css";

function useRsvpAvailability(deadline) {
  const deadlineTime = Date.parse(deadline);
  const [isOpen, setIsOpen] = useState(() => !Number.isFinite(deadlineTime) || Date.now() <= deadlineTime);

  useEffect(() => {
    if (!Number.isFinite(deadlineTime)) return undefined;
    const remaining = deadlineTime - Date.now();
    if (remaining < 0) {
      setIsOpen(false);
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setIsOpen(Date.now() <= deadlineTime), remaining + 1);
    return () => window.clearTimeout(timeoutId);
  }, [deadlineTime]);

  return isOpen;
}
function RolledParchment({ onOpen, reduceMotion }) {
  return (
    <motion.button
      type="button"
      className="scroll-cover"
      onClick={onOpen}
      aria-label="Srotola l’invito per la laurea di Corrado"
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? {} : { opacity: 0, scaleY: 0.14, y: -18 }}
      transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <img
        className="scroll-cover-image"
        src="/images/laurea-corrado-rotolo-chiuso-v2.png"
        alt="Rotolo di pergamena chiuso, legato con un cordoncino rosso e un sigillo in ceralacca"
      />
      <span className="scroll-hint"><span aria-hidden="true">✦</span> Tocca il sigillo per aprire</span>
    </motion.button>
  );
}

function EventDetails({ details }) {
  return (
    <div className="event-details" aria-label="Programma della giornata">
      {[details.discussion, details.celebration].map(item => (
        <section className="event-detail-card" key={item.title}>
          <span className="event-detail-ornament" aria-hidden="true">✦</span>
          <h2>{item.title}</h2>
          <p className="event-detail-time">{item.date} · {item.time}</p>
          <a className="event-detail-place" href={item.locationUrl} target="_blank" rel="noopener noreferrer">
            {item.location}
          </a>
        </section>
      ))}
    </div>
  );
}

function UnrolledParchment({ reduceMotion }) {
  const rsvpOpen = useRsvpAvailability(event.rsvp.deadline);
  return (
    <motion.article
      className="unrolled-parchment"
      aria-labelledby="invite-title"
      initial={reduceMotion ? false : { height: 0, opacity: 0.98 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={reduceMotion ? {} : { height: 0, opacity: 0.98 }}
      transition={{
        height: { duration: reduceMotion ? 0 : 1.85, ease: [0.28, 0.72, 0.16, 1] },
        opacity: { duration: reduceMotion ? 0 : 0.35 },
      }}
    >
      <img className="unrolled-parchment-image" src="/images/laurea-corrado-pergamena-aperta.png" alt="" aria-hidden="true" />
      <motion.div
        className="parchment-inner"
        initial={reduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : 1.15 }}
      >
        <span className="parchment-flourish" aria-hidden="true">✦</span>
        <p className="parchment-kicker">Un traguardo importante, una festa da condividere</p>
        <h1 id="invite-title">La laurea di <span>Corrado</span></h1>
        {rsvpOpen && <p className="parchment-intro">{event.content.subtitle}</p>}
        <div className="parchment-divider" aria-hidden="true"><span>✦</span></div>
        <EventDetails details={event.content} />
        {rsvpOpen && <div className="rsvp-panel"><RSVP config={event.rsvp} /></div>}
        <PhotoSnapshot />
        {rsvpOpen && <p className="parchment-signoff">Ti aspetto!</p>}
      </motion.div>
    </motion.article>
  );
}

export default function ParchmentInvite() {
  const [opened, setOpened] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <main className="parchment-page">
      <div className="parchment-glow parchment-glow-one" aria-hidden="true" />
      <div className="parchment-glow parchment-glow-two" aria-hidden="true" />
      <div className="parchment-stage">
        <p className="stage-overline">Un momento da ricordare</p>
        <div className="scroll-sequence">
          <AnimatePresence initial={false}>
            {!opened ? (
              <RolledParchment key="rolled" onOpen={() => setOpened(true)} reduceMotion={reduceMotion} />
            ) : (
              <UnrolledParchment key="unrolled" reduceMotion={reduceMotion} />
            )}
          </AnimatePresence>
        </div>
        {opened && (
          <motion.button
            type="button"
            className="close-invitation"
            onClick={() => setOpened(false)}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduceMotion ? 0 : 1.8 }}
          >
            Riavvolgi la pergamena
          </motion.button>
        )}
      </div>
    </main>
  );
}
