import { Camera, ChevronLeft, ChevronRight, Images, Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { getPhotoLabels, getPhotoLanguage, getPhotoPath, PHOTO_LANGUAGES } from "./photoTranslations";
import "./PhotosGalleryPage.css";

const DEFAULT_PHOTO_ENDPOINT = "/api/photos";

const formatPhotoDate = (value, language) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(language === "pl" ? "pl-PL" : "it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatPhotoTime = value => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function PhotosGalleryPage({ config }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const language = getPhotoLanguage(searchParams);
  const labels = getPhotoLabels(config, language);
  const frameTitle = config.frameTitle || labels.frameTitle;
  const frameDate = config.frameDate || labels.frameDate;
  const [photos, setPhotos] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const galleryEndpoint = config.galleryEndpoint || DEFAULT_PHOTO_ENDPOINT;

  const loadGallery = useCallback(async () => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(galleryEndpoint);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(language === "pl" ? labels.galleryErrorMessage : payload.error || labels.galleryErrorMessage);
      }

      const nextPhotos = Array.isArray(payload.photos) ? payload.photos : [];
      setPhotos(nextPhotos);
      setSelectedIndex(0);
      setIsDetailOpen(false);
      setStatus(nextPhotos.length ? "ready" : "empty");
    } catch (error) {
      setStatus("error");
      setMessage(language === "pl" ? labels.galleryErrorMessage : error.message || labels.galleryErrorMessage);
    }
  }, [galleryEndpoint, labels.galleryErrorMessage, language]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const selectedPhoto = photos[selectedIndex];
  const openPhoto = index => {
    setSelectedIndex(index);
    setIsDetailOpen(true);
  };
  const showPreviousPhoto = useCallback(() => {
    setSelectedIndex(currentIndex => (
      photos.length ? (currentIndex - 1 + photos.length) % photos.length : currentIndex
    ));
  }, [photos.length]);
  const showNextPhoto = useCallback(() => {
    setSelectedIndex(currentIndex => (
      photos.length ? (currentIndex + 1) % photos.length : currentIndex
    ));
  }, [photos.length]);
  const switchLanguage = nextLanguage => {
    setSearchParams(nextLanguage === "pl" ? { lang: "pl" } : {});
  };

  useEffect(() => {
    if (!isDetailOpen) return undefined;

    const handleKeyDown = event => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPreviousPhoto();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextPhoto();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDetailOpen, showNextPhoto, showPreviousPhoto]);

  const selectedPhotoFrameTime = formatPhotoTime(selectedPhoto?.createdTime);
  const selectedPhotoFrameDate = [frameDate, selectedPhotoFrameTime].filter(Boolean).join(" - ");

  return (
    <main className="gallery-page">
      <section className="gallery-card invitation-card" aria-label={labels.galleryTitle}>
        <div className="gallery-language-switch" aria-label="Lingua">
          {Object.entries(PHOTO_LANGUAGES).map(([code, label]) => (
            <button
              type="button"
              key={code}
              className={language === code ? "is-active" : ""}
              onClick={() => switchLanguage(code)}
              aria-pressed={language === code}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="gallery-icon" aria-hidden="true">
          <Images size={26} />
        </div>

        <h1 className="gallery-title">{labels.galleryTitle}</h1>
        {labels.galleryMessage && <p className="gallery-copy">{labels.galleryMessage}</p>}

        {status === "loading" && (
          <div className="gallery-state is-loading">
            <Loader2 size={24} aria-hidden="true" />
            <span>{labels.galleryLoadingLabel}</span>
          </div>
        )}

        {status === "empty" && (
          <div className="gallery-state">
            <Images size={24} aria-hidden="true" />
            <span>{labels.galleryEmptyMessage}</span>
          </div>
        )}

        {status === "error" && (
          <div className="gallery-state is-error">
            <span>{message}</span>
            <button type="button" onClick={loadGallery}>
              <RefreshCw size={18} aria-hidden="true" />
              {labels.galleryRetryLabel}
            </button>
          </div>
        )}

        {status === "ready" && selectedPhoto && (
          <div className="gallery-viewer">
            <div className="gallery-grid" aria-label={labels.galleryTitle}>
              {photos.map((photo, index) => (
                <button
                  type="button"
                  key={photo.id || photo.imageUrl || index}
                  className={`gallery-thumb ${selectedIndex === index ? "is-selected" : ""}`}
                  onClick={() => openPhoto(index)}
                  aria-pressed={selectedIndex === index}
                >
                  <img src={photo.imageUrl} alt={photo.name || labels.galleryImageAlt} />
                </button>
              ))}
            </div>
          </div>
        )}

        {status === "ready" && selectedPhoto && isDetailOpen && createPortal(
          <div className="gallery-detail-overlay" role="dialog" aria-modal="true" aria-label={selectedPhoto.name || labels.galleryImageAlt}>
            <div className="gallery-detail">
              <button type="button" className="gallery-detail-close" onClick={() => setIsDetailOpen(false)} aria-label="Chiudi">
                <X size={18} aria-hidden="true" />
              </button>

              <div className="gallery-photo-wrap">
                {photos.length > 1 && (
                  <button
                    type="button"
                    className="gallery-detail-nav is-prev"
                    onClick={showPreviousPhoto}
                    aria-label={labels.galleryPreviousLabel}
                  >
                    <ChevronLeft size={26} aria-hidden="true" />
                  </button>
                )}
                <img src={selectedPhoto.imageUrl} alt={selectedPhoto.name || labels.galleryImageAlt} className="gallery-photo" />
                <div className="gallery-display-frame" aria-hidden="true">
                  <span>{frameTitle}</span>
                  <strong>{selectedPhotoFrameDate}</strong>
                </div>
                {photos.length > 1 && (
                  <button
                    type="button"
                    className="gallery-detail-nav is-next"
                    onClick={showNextPhoto}
                    aria-label={labels.galleryNextLabel}
                  >
                    <ChevronRight size={26} aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="gallery-meta">
                {selectedPhoto.guestName && <span>{selectedPhoto.guestName}</span>}
                {selectedPhoto.createdTime && <span>{formatPhotoDate(selectedPhoto.createdTime, language)}</span>}
              </div>
            </div>
          </div>,
          document.body,
        )}

        <div className="gallery-actions">
          <Link to={getPhotoPath("/foto", language)}>
            <Camera size={18} aria-hidden="true" />
            {labels.galleryCameraLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
