import { Children, useState } from "react";
import { motion } from "framer-motion";

export default function BookInvitation({ config, children }) {
  const pages = Children.toArray(children);
  const [currentPage, setCurrentPage] = useState(0);
  const [isTurning, setIsTurning] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [direction, setDirection] = useState("forward");
  const isBookOpen = currentPage > 0;
  const visiblePage = isTurning && direction === "forward"
    ? Math.min(currentPage + 1, pages.length)
    : isClosing
      ? Math.max(currentPage - 1, 0)
      : currentPage;
  const turnFrontContent = currentPage === 0 ? null : pages[currentPage - 1];

  const openBook = () => {
    if (isTurning || isBookOpen || isClosing) return;

    setDirection("forward");
    setIsTurning(true);
    window.setTimeout(() => {
      setCurrentPage(1);
      setIsTurning(false);
    }, 1460);
  };

  const goNext = () => {
    if (!isBookOpen || isTurning || isClosing || currentPage >= pages.length) return;

    setDirection("forward");
    setIsTurning(true);
    window.setTimeout(() => {
      setCurrentPage(page => Math.min(page + 1, pages.length));
      setIsTurning(false);
    }, 1460);
  };

  const goPrev = () => {
    if (!isBookOpen || isClosing || isTurning) return;

    setDirection("backward");
    setIsClosing(true);
    window.setTimeout(() => {
      setCurrentPage(page => Math.max(page - 1, 0));
      setIsClosing(false);
    }, 1180);
  };

  const handleKeyDown = event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openBook();
    }
  };

  return (
    <main className={`book-stage ${isBookOpen ? "is-open" : ""}`}>
      <motion.div
        className={`book-invitation ${isTurning ? "is-turning" : ""} ${isBookOpen ? "is-opened" : ""} ${isClosing ? "is-closing" : ""}`}
        onClick={!isBookOpen ? openBook : undefined}
        onKeyDown={!isBookOpen ? handleKeyDown : undefined}
        role={!isBookOpen ? "button" : undefined}
        tabIndex={!isBookOpen ? 0 : undefined}
        aria-label={!isBookOpen ? config?.buttonLabel || "Apri invito" : undefined}
        initial={{ y: 18, opacity: 0, rotateX: 8 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 0.84, 0.22, 1] }}
      >
        <div className="book-spread">
          <div className="book-page book-page-second">
            <div className="book-page-content">
              {visiblePage > 0 ? pages[visiblePage - 1] : null}
            </div>
          </div>
          <div
            className="book-turn-page"
            onClick={isBookOpen ? goPrev : undefined}
            onKeyDown={isBookOpen ? event => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                goPrev();
              }
            } : undefined}
            role={isBookOpen ? "button" : undefined}
            tabIndex={isBookOpen ? 0 : undefined}
            aria-label={isBookOpen ? "Vai alla pagina precedente" : undefined}
          >
            <div className="book-turn-front">
              {turnFrontContent || (
                <>
                  <span className="book-cover-image" />
                  <span className="book-cover-text">
                    <span>{config?.title || "Abbiamo un invito per te..."}</span>
                  </span>
                  {config?.dateText ? (
                    <span className="book-cover-date">{config.dateText}</span>
                  ) : null}
                </>
              )}
            </div>
            <div className="book-turn-back" />
          </div>
          {isBookOpen && currentPage < pages.length ? (
            <button
              type="button"
              className="book-page-forward"
              onClick={goNext}
              aria-label="Vai alla pagina successiva"
            >
              <span aria-hidden="true">›</span>
            </button>
          ) : null}
        </div>
        {!isBookOpen ? <span className="sr-only">{config?.buttonLabel || "Apri invito"}</span> : null}
      </motion.div>
    </main>
  );
}
