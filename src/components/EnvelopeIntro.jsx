import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import WeddingSparkles from "./WeddingSparkles";

export default function EnvelopeIntro({ config, children }) {
  const [isOpening, setIsOpening] = useState(false);
  const [showInvitation, setShowInvitation] = useState(false);
  const [hideEnvelope, setHideEnvelope] = useState(false);

  const openEnvelope = () => {
    if (isOpening || showInvitation) return;

    setIsOpening(true);
    window.setTimeout(() => setShowInvitation(true), 520);
    window.setTimeout(() => setHideEnvelope(true), 2200);
  };

  return (
    <main className={`envelope-stage ${showInvitation ? "is-open" : ""}`}>
      {showInvitation ? <WeddingSparkles /> : null}
      <AnimatePresence>
        {!hideEnvelope && (
          <motion.button
            type="button"
            className={`envelope-button ${isOpening ? "is-opening" : ""}`}
            onClick={openEnvelope}
            disabled={isOpening}
            aria-label={config?.buttonLabel || "Apri invito"}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 86, opacity: 0, scale: 0.88 }}
            transition={{ duration: 1.15, ease: [0.16, 0.84, 0.22, 1] }}
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
          </motion.button>
        )}

        {showInvitation && (
          <motion.div
            className="parchment-scroll"
            key="invitation-paper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <motion.div
              className="parchment-scroll-inner"
              initial={{
                y: 280,
                scaleY: 0.06,
                scaleX: 0.68,
                opacity: 0.28,
                rotateX: -38,
                transformOrigin: "50% 0%",
              }}
              animate={{
                y: 0,
                scaleY: 1,
                scaleX: 1,
                opacity: 1,
                rotateX: 0,
              }}
              transition={{
                duration: 1.95,
                ease: [0.14, 0.82, 0.18, 1],
              }}
            >
              <div className="parchment-content">{children}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
