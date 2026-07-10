import { Camera, CheckCircle, Images, Loader2, RefreshCw, RotateCcw, Send, Trash2, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getPhotoLabels, getPhotoLanguage, getPhotoPath, PHOTO_LANGUAGES } from "./photoTranslations";
import "./PhotosPage.css";

const PHOTO_QUALITY = 0.9;
const DEFAULT_PHOTO_ENDPOINT = "/api/photos";

const readBlobAsBase64 = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || "");
    resolve(result.includes(",") ? result.split(",")[1] : result);
  };
  reader.onerror = () => reject(new Error("Impossibile leggere la foto."));
  reader.readAsDataURL(blob);
});

const fitText = ({ context, text, maxWidth, startSize, minSize, family }) => {
  let size = startSize;

  while (size > minSize) {
    context.font = `${size}px ${family}`;
    if (context.measureText(text).width <= maxWidth) {
      return size;
    }
    size -= 2;
  }

  return minSize;
};

const formatShotTime = value => new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
}).format(value);

const drawWeddingFrame = ({ context, width, height, title, date, time }) => {
  const shortSide = Math.min(width, height);
  const horizontalBand = Math.max(78, Math.round(shortSide * 0.14));
  const verticalBand = Math.max(28, Math.round(shortSide * 0.05));
  const innerLine = Math.max(4, Math.round(shortSide * 0.008));
  const padding = Math.max(28, Math.round(shortSide * 0.05));
  const topText = title;
  const bottomText = `${date} - ${time}`;

  context.save();

  context.fillStyle = "rgba(255, 248, 241, 0.94)";
  context.fillRect(0, 0, width, horizontalBand);
  context.fillRect(0, height - horizontalBand, width, horizontalBand);
  context.fillRect(0, horizontalBand, verticalBand, height - horizontalBand * 2);
  context.fillRect(width - verticalBand, horizontalBand, verticalBand, height - horizontalBand * 2);

  context.lineJoin = "round";
  context.strokeStyle = "rgba(127, 23, 31, 0.94)";
  context.lineWidth = Math.max(8, Math.round(shortSide * 0.012));
  context.strokeRect(context.lineWidth / 2, context.lineWidth / 2, width - context.lineWidth, height - context.lineWidth);

  context.lineWidth = innerLine;
  context.strokeStyle = "rgba(199, 154, 59, 0.92)";
  context.strokeRect(verticalBand, horizontalBand, width - verticalBand * 2, height - horizontalBand * 2);

  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillStyle = "rgba(127, 23, 31, 0.94)";
  const titleSize = fitText({
    context,
    text: topText,
    maxWidth: width - padding * 2,
    startSize: Math.max(28, Math.round(horizontalBand * 0.34)),
    minSize: 20,
    family: "Georgia, serif",
  });
  context.font = `700 ${titleSize}px Georgia, serif`;
  context.fillText(topText, width / 2, horizontalBand * 0.5);

  context.fillStyle = "rgba(151, 104, 31, 0.95)";
  const bottomSize = fitText({
    context,
    text: bottomText,
    maxWidth: width - padding * 2,
    startSize: Math.max(24, Math.round(horizontalBand * 0.28)),
    minSize: 18,
    family: "Georgia, serif",
  });
  context.font = `700 ${bottomSize}px Georgia, serif`;
  context.fillText(bottomText, width / 2, height - horizontalBand * 0.5);

  context.restore();
};

const captureFrame = (video, frameConfig, { mirrorSource = false } = {}) => new Promise((resolve, reject) => {
  if (!video?.videoWidth || !video?.videoHeight) {
    reject(new Error("Fotocamera non pronta."));
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");

  context.save();
  if (mirrorSource) {
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  context.restore();

  drawWeddingFrame({
    context,
    width: canvas.width,
    height: canvas.height,
    title: frameConfig.title,
    date: frameConfig.date,
    time: frameConfig.time,
  });

  canvas.toBlob(blob => {
    if (!blob) {
      reject(new Error("Impossibile preparare la foto."));
      return;
    }
    resolve(blob);
  }, "image/jpeg", PHOTO_QUALITY);
});

const cleanName = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9-_ ]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .slice(0, 52);

export default function PhotosPage({ config }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const language = getPhotoLanguage(searchParams);
  const labels = getPhotoLabels(config, language);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const nameInputRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [status, setStatus] = useState("permission");
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [nameError, setNameError] = useState("");
  const [facingMode, setFacingMode] = useState("environment");
  const uploadEndpoint = config.uploadEndpoint || DEFAULT_PHOTO_ENDPOINT;

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    stopCamera();
  }, []);

  useEffect(() => {
    if (nameError && nameError !== labels.nameRequiredMessage) {
      setNameError(labels.nameRequiredMessage);
    }
  }, [labels.nameRequiredMessage, nameError]);

  const startCamera = async ({ nextFacingMode = facingMode, keepMessage = false } = {}) => {
    setStatus("opening");
    if (!keepMessage) {
      setMessage("");
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacingMode },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setFacingMode(nextFacingMode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("camera");
    } catch {
      setStatus("camera-error");
      setMessage(labels.cameraErrorMessage);
    }
  };

  const switchCamera = () => {
    const nextFacingMode = facingMode === "environment" ? "user" : "environment";
    startCamera({ nextFacingMode });
  };

  const takePhoto = async () => {
    if (status !== "camera") return;

    setStatus("preparing");
    setMessage("");

    try {
      const shotTime = new Date();
      const blob = await captureFrame(videoRef.current, {
        title: labels.frameTitle,
        date: labels.frameDate,
        time: formatShotTime(shotTime),
      }, {
        mirrorSource: facingMode === "user",
      });
      const previewUrl = URL.createObjectURL(blob);
      const base64 = await readBlobAsBase64(blob);

      stopCamera();
      setPhoto({
        base64,
        mimeType: "image/jpeg",
        previewUrl,
      });
      setStatus("ready");
    } catch (error) {
      setStatus("camera");
      setMessage(language === "pl" ? labels.cameraErrorMessage : error.message || labels.cameraErrorMessage);
    }
  };

  const clearPhoto = () => {
    if (photo?.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    setPhoto(null);
    setMessage("");
    setNameError("");
    startCamera();
  };

  const uploadPhoto = async () => {
    if (!photo || status === "sending") return;

    const safeGuestName = cleanName(guestName);
    if (!safeGuestName) {
      setStatus("ready");
      setMessage("");
      setNameError(labels.nameRequiredMessage);
      window.requestAnimationFrame(() => {
        nameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        nameInputRef.current?.focus({ preventScroll: true });
      });
      return;
    }

    setStatus("sending");
    setMessage("");
    setNameError("");

    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const response = await fetch(uploadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: photo.base64,
          mimeType: photo.mimeType,
          guestName: guestName.trim(),
          fileName: `${safeGuestName}-${stamp}.jpg`,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(language === "pl" ? labels.errorMessage : payload.error || labels.errorMessage);
      }

      if (photo.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      setPhoto(null);
      setMessage(labels.successMessage);
      await startCamera({ keepMessage: true });
    } catch (error) {
      setStatus("error");
      setMessage(language === "pl" ? labels.errorMessage : error.message || labels.errorMessage);
    }
  };

  const switchLanguage = nextLanguage => {
    setSearchParams(nextLanguage === "pl" ? { lang: "pl" } : {});
  };

  const hasPhoto = Boolean(photo);
  const isBusy = status === "opening" || status === "preparing" || status === "sending";
  const showCamera = status === "opening" || status === "camera" || status === "preparing";
  const showNameField = status !== "success";

  return (
    <main className="photos-page">
      <section className="photos-card invitation-card" aria-label="Foto del matrimonio">
        <div className="photos-language-switch" aria-label="Lingua">
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

        <div className="photos-icon" aria-hidden="true">
          <Camera size={26} />
        </div>

        <h1 className="photos-title">{labels.title}</h1>

        <div className="photos-copy">
          {labels.subtitle && <p>{labels.subtitle}</p>}
          {labels.message && <p>{labels.message}</p>}
        </div>

        {showNameField && (
          <label className={`photos-name-field ${nameError ? "is-invalid" : ""}`}>
            <span>{labels.nameLabel}</span>
            <input
              ref={nameInputRef}
              type="text"
              value={guestName}
              onChange={event => {
                setGuestName(event.target.value);
                if (nameError) {
                  setNameError("");
                }
              }}
              placeholder={labels.namePlaceholder}
              autoComplete="name"
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "photos-name-error" : undefined}
            />
            {nameError && (
              <strong id="photos-name-error" className="photos-name-error">
                {nameError}
              </strong>
            )}
          </label>
        )}

        {status === "permission" && (
          <div className="photos-permission-panel" role="dialog" aria-labelledby="photos-permission-title">
            <div className="photos-permission-icon" aria-hidden="true">
              <Video size={28} />
            </div>
            <h2 id="photos-permission-title">{labels.permissionTitle}</h2>
            <p>{labels.permissionMessage}</p>
            <button type="button" onClick={() => startCamera()}>
              <Camera size={18} aria-hidden="true" />
              {labels.permissionLabel}
            </button>
          </div>
        )}

        {showCamera && (
          <div className="photos-camera-panel">
            <div className="photos-camera-frame">
              <video ref={videoRef} className="photos-video" playsInline muted autoPlay />
              <div className="photos-live-frame" aria-hidden="true">
                <span>{labels.frameTitle}</span>
                <strong>{labels.frameDate}</strong>
              </div>
              {status === "opening" && (
                <div className="photos-camera-overlay">
                  <Loader2 size={22} aria-hidden="true" />
                  {labels.permissionLabel}
                </div>
              )}
            </div>
            {message && status === "camera" && (
              <p className="photos-status is-success">
                <CheckCircle size={18} aria-hidden="true" />
                {message}
              </p>
            )}
            <div className="photos-camera-actions">
              <button type="button" onClick={switchCamera} disabled={isBusy} className="photos-secondary-button">
                <RefreshCw size={18} aria-hidden="true" />
                {labels.switchCameraLabel}
              </button>
              <button
                type="button"
                onClick={takePhoto}
                disabled={isBusy}
                className={`photos-primary-button ${status === "preparing" ? "is-loading" : ""}`}
              >
                {status === "preparing" ? <Loader2 size={18} aria-hidden="true" /> : <Camera size={18} aria-hidden="true" />}
                {status === "preparing" ? labels.preparingLabel : labels.cameraLabel}
              </button>
            </div>
          </div>
        )}

        {hasPhoto && (
          <div className="photos-preview-panel">
            <img src={photo.previewUrl} alt="Anteprima foto da inviare" className="photos-preview" />
            <div className="photos-photo-actions">
              <button type="button" onClick={clearPhoto} disabled={isBusy} className="photos-secondary-button">
                <Trash2 size={18} aria-hidden="true" />
                {labels.deleteLabel}
              </button>
              <button
                type="button"
                onClick={uploadPhoto}
                disabled={isBusy}
                className={`photos-primary-button ${status === "sending" ? "is-loading" : ""}`}
              >
                {status === "sending" ? <Loader2 size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
                {status === "sending" ? labels.sendingLabel : labels.sendLabel}
              </button>
            </div>
            <button type="button" onClick={clearPhoto} disabled={isBusy} className="photos-text-button">
              <RotateCcw size={16} aria-hidden="true" />
              {labels.retakeLabel}
            </button>
          </div>
        )}

        {(status === "camera-error" || status === "error" || (status === "ready" && message)) && message && (
          <div className="photos-error-panel">
            <p className="photos-status is-error">{message}</p>
            {status === "camera-error" && (
              <button type="button" onClick={() => startCamera()} className="photos-secondary-button">
                <RotateCcw size={18} aria-hidden="true" />
                {labels.retryCameraLabel}
              </button>
            )}
          </div>
        )}

        <div className="photos-bottom-actions">
          <Link to={getPhotoPath("/foto/galleria", language)} className="photos-secondary-button photos-link-button">
            <Images size={18} aria-hidden="true" />
            {labels.galleryButtonLabel}
          </Link>
        </div>

      </section>
    </main>
  );
}
