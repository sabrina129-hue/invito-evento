import { Camera, ChevronLeft, ChevronRight, Images, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getPhotoLabels, getPhotoLanguage, getPhotoPath, PHOTO_LANGUAGES } from "./photoTranslations";
import "./PhotosGalleryPage.css";

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

export default function PhotosGalleryPage({ config }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const language = getPhotoLanguage(searchParams);
  const labels = getPhotoLabels(config, language);
  const [photos, setPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  const loadGallery = useCallback(async () => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(config.galleryEndpoint);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(language === "pl" ? labels.galleryErrorMessage : payload.error || labels.galleryErrorMessage);
      }

      const nextPhotos = Array.isArray(payload.photos) ? payload.photos : [];
      setPhotos(nextPhotos);
      setCurrentIndex(0);
      setStatus(nextPhotos.length ? "ready" : "empty");
    } catch (error) {
      setStatus("error");
      setMessage(language === "pl" ? labels.galleryErrorMessage : error.message || labels.galleryErrorMessage);
    }
  }, [config.galleryEndpoint, labels.galleryErrorMessage, language]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const currentPhoto = photos[currentIndex];
  const canBrowse = photos.length > 1;
  const goPrevious = () => setCurrentIndex(index => (index === 0 ? photos.length - 1 : index - 1));
  const goNext = () => setCurrentIndex(index => (index + 1) % photos.length);
  const switchLanguage = nextLanguage => {
    setSearchParams(nextLanguage === "pl" ? { lang: "pl" } : {});
  };

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

        {status === "ready" && currentPhoto && (
          <div className="gallery-viewer">
            <div className="gallery-photo-wrap">
              <img src={currentPhoto.imageUrl} alt={currentPhoto.name || labels.galleryImageAlt} className="gallery-photo" />
              {canBrowse && (
                <>
                  <button type="button" className="gallery-nav is-prev" onClick={goPrevious} aria-label={labels.galleryPreviousLabel}>
                    <ChevronLeft size={24} aria-hidden="true" />
                  </button>
                  <button type="button" className="gallery-nav is-next" onClick={goNext} aria-label={labels.galleryNextLabel}>
                    <ChevronRight size={24} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            <div className="gallery-meta">
              <strong>{currentIndex + 1} / {photos.length}</strong>
              {currentPhoto.guestName && <span>{currentPhoto.guestName}</span>}
              {currentPhoto.createdTime && <span>{formatPhotoDate(currentPhoto.createdTime, language)}</span>}
            </div>
          </div>
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
