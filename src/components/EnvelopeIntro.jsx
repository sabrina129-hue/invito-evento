import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import WeddingSparkles from "./WeddingSparkles";

const MotionButton = motion.button;
const MotionDiv = motion.div;

export default function EnvelopeIntro({ config, children }) {
  const [isOpening, setIsOpening] = useState(false);
  const [showInvitation, setShowInvitation] = useState(false);
  const [hideEnvelope, setHideEnvelope] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const timersRef = useRef([]);

  useEffect(() => () => {
    timersRef.current.forEach(window.clearTimeout);
  }, []);

  const schedule = (callback, delay) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  };

  const openEnvelope = () => {
    if (isOpening || showInvitation) return;

    setIsOpening(true);
    schedule(() => setHideEnvelope(true), 840);
    schedule(() => setShowInvitation(true), 940);
    schedule(() => setShowSparkles(true), 2450);
  };

  return (
    <main className={`envelope-stage ${showInvitation ? "is-open" : ""}`}>
      {showSparkles ? <WeddingSparkles /> : null}
      <AnimatePresence>
        {!hideEnvelope && (
          <MotionButton
            type="button"
            className={`envelope-button ${isOpening ? "is-opening" : ""}`}
            onClick={openEnvelope}
            disabled={isOpening}
            aria-label={config?.buttonLabel || "Apri invito"}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 42, opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.58, ease: [0.18, 0.72, 0.22, 1] }}
          >
            <span className="envelope-card">
              <span className="envelope-card-title">{config?.title}</span>
              {config?.subtitle ? (
                <span className="envelope-card-subtitle">{config.subtitle}</span>
              ) : null}
            </span>
            <span className="envelope">
              <span className="envelope-back" />
              <span className="envelope-flap" />
              <span className="envelope-front" />
              <span className="envelope-seal">{config?.seal}</span>
            </span>
          </MotionButton>
        )}

        {showInvitation && (
          <MotionDiv
            className="parchment-scroll"
            key="invitation-paper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <MotionDiv
              className="parchment-scroll-inner"
              initial={{
                y: 72,
                scale: 0.96,
                opacity: 0,
              }}
              animate={{
                y: 0,
                scale: 1,
                opacity: 1,
              }}
              transition={{
                duration: 0.82,
                ease: [0.18, 0.82, 0.22, 1],
              }}
            >
              <div className="parchment-content">{children}</div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </main>
  );
}
