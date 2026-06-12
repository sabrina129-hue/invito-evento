import { Children, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const FADE_OUT_DURATION = 360;
const FADE_IN_DURATION = 420;

export default function BookInvitation({ config, children, finalPageSignal }) {
  const pages = Children.toArray(children);
  const [currentPage, setCurrentPage] = useState(0);
  const [transition, setTransition] = useState(null);
  const timers = useRef([]);
  const lastFinalPageSignal = useRef(finalPageSignal);
  const isTransitioning = Boolean(transition);
  const isBookOpen = currentPage > 0 || isTransitioning;
  const displayedPage = transition?.phase === "in" ? transition.target : currentPage;
  const canGoNext = currentPage > 0 && currentPage < pages.length - 1;

  const clearTimers = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };

  const renderCover = () => (
    <>
      <span className="book-cover-image" />
      <span className="book-cover-text">
        <span>{config?.title || "Abbiamo un invito per te..."}</span>
      </span>
      {config?.dateText ? (
        <span className="book-cover-date">{config.dateText}</span>
      ) : null}
    </>
  );

  const renderPage = pageNumber => {
    if (pageNumber <= 0) return renderCover();
    return pages[pageNumber - 1] || null;
  };

  const startPageTransition = targetPage => {
    if (isTransitioning || targetPage < 0 || targetPage > pages.length || targetPage === currentPage) return;

    clearTimers();
    setTransition({ phase: "out", target: targetPage });

    timers.current.push(window.setTimeout(() => {
      setCurrentPage(targetPage);
      setTransition({ phase: "in", target: targetPage });

      timers.current.push(window.setTimeout(() => {
        setTransition(null);
      }, FADE_IN_DURATION));
    }, FADE_OUT_DURATION));
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (finalPageSignal === undefined || finalPageSignal === lastFinalPageSignal.current || isTransitioning) {
      return;
    }

    lastFinalPageSignal.current = finalPageSignal;

    if (pages.length > 0 && currentPage !== pages.length) {
      startPageTransition(pages.length);
    }
  }, [currentPage, finalPageSignal, isTransitioning, pages.length]);

  const openBook = () => {
    startPageTransition(1);
  };

  const goNext = () => {
    startPageTransition(currentPage + 1);
  };

  const goPrev = () => {
    startPageTransition(currentPage - 1);
  };

  const handleCoverKeyDown = event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openBook();
    }
  };

  return (
    <main className={`book-stage ${isBookOpen ? "is-open" : ""}`}>
      <motion.div
        className={[
          "book-invitation",
          isBookOpen ? "is-opened" : "",
          isTransitioning ? "is-fading-page" : "",
        ].filter(Boolean).join(" ")}
        onClick={!isBookOpen ? openBook : undefined}
        onKeyDown={!isBookOpen ? handleCoverKeyDown : undefined}
        role={!isBookOpen ? "button" : undefined}
        tabIndex={!isBookOpen ? 0 : undefined}
        aria-label={!isBookOpen ? config?.buttonLabel || "Apri invito" : undefined}
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.72, ease: [0.16, 0.84, 0.22, 1] }}
      >
        <div className="book-spread">
          <div className={`book-page book-page-current ${displayedPage <= 0 ? "book-cover-closed" : ""} ${transition ? `is-fading-${transition.phase}` : ""}`}>
            <div className="book-page-content">
              {renderPage(displayedPage)}
            </div>
          </div>

          {!isTransitioning && currentPage > 0 ? (
            <button
              type="button"
              className="book-page-backward"
              onClick={goPrev}
              aria-label="Vai alla pagina precedente"
            >
              <span aria-hidden="true">&lsaquo;</span>
            </button>
          ) : null}

          {!isTransitioning && canGoNext ? (
            <button
              type="button"
              className="book-page-forward"
              onClick={goNext}
              aria-label="Vai alla pagina successiva"
            >
              <span aria-hidden="true">&rsaquo;</span>
            </button>
          ) : null}
        </div>
        {!isBookOpen ? <span className="sr-only">{config?.buttonLabel || "Apri invito"}</span> : null}
      </motion.div>
    </main>
  );
}
