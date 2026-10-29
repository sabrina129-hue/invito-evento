import { Camera, CheckCircle, Images, Loader2, RefreshCw, RotateCcw, Send, Trash2, Upload, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PhotoAccessGate from "./PhotoAccessGate";
import { usePhotoAccess } from "./photoAccess";
import "./PhotosPage.css";

const PHOTO_QUALITY = 0.9;
const DEVICE_UPLOAD_MAX_SIDE = 1800;
const DEFAULT_PHOTO_ENDPOINT = "/api/photos";
const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const ITALIAN_COUNTDOWN_LABELS = {
  label: "Apre tra",
  daySingular: "giorno",
  dayPlural: "giorni",
  hourSingular: "ora",
  hourPlural: "ore",
  minuteSingular: "minuto",
  minutePlural: "minuti",
  secondSingular: "secondo",
  secondPlural: "secondi",
  ariaLabel: "Tempo all'apertura della pagina foto",
};
const getCountdownEvent = availableFrom => {
  if (!availableFrom) {
    return null;
  }

  return {
    calendar: {
      start: availableFrom,
    },
    countdown: ITALIAN_COUNTDOWN_LABELS,
  };
};

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
  const outerLine = Math.max(8, Math.round(shortSide * 0.012));
  const topText = title;
  const bottomText = `${date} - ${time}`;

  context.save();

  context.fillStyle = "rgba(250, 253, 242, 0.95)";
  context.fillRect(0, 0, width, horizontalBand);
  context.fillRect(0, height - horizontalBand, width, horizontalBand);
  context.fillRect(0, horizontalBand, verticalBand, height - horizontalBand * 2);
  context.fillRect(width - verticalBand, horizontalBand, verticalBand, height - horizontalBand * 2);

  context.lineJoin = "round";
  context.strokeStyle = "rgba(83, 91, 46, 0.94)";
  context.lineWidth = outerLine;
  context.strokeRect(context.lineWidth / 2, context.lineWidth / 2, width - context.lineWidth, height - context.lineWidth);

  context.lineWidth = innerLine;
  context.strokeStyle = "rgba(156, 122, 60, 0.88)";
  context.strokeRect(verticalBand, horizontalBand, width - verticalBand * 2, height - horizontalBand * 2);

  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillStyle = "rgba(83, 91, 46, 0.94)";
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

  context.fillStyle = "rgba(122, 135, 84, 0.96)";
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

const prepareDeviceUploadBlob = file => new Promise((resolve, reject) => {
  const image = new Image();
  const imageUrl = URL.createObjectURL(file);

  image.onload = () => {
    URL.revokeObjectURL(imageUrl);
    const ratio = Math.min(1, DEVICE_UPLOAD_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, width, height);

    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error("Impossibile preparare la foto."));
        return;
      }

      resolve(blob);
    }, "image/jpeg", PHOTO_QUALITY);
  };

  image.onerror = () => {
    URL.revokeObjectURL(imageUrl);
    reject(new Error("Impossibile leggere la foto."));
  };

  image.src = imageUrl;
});

const cleanName = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9-_ ]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .slice(0, 52);

const getPhotoExtension = mimeType => MIME_EXTENSIONS[mimeType] || "jpg";

export default function PhotosPage({ config }) {
  const labels = config;
  const countdownEvent = getCountdownEvent(config.availableFrom);
  const frameTitle = config.frameTitle || labels.frameTitle;
  const frameDate = config.frameDate || labels.frameDate;
  const photoAccess = usePhotoAccess(config.availableFrom);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);
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
        title: frameTitle,
        date: frameDate,
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
        photoType: "instant",
      });
      setStatus("ready");
    } catch (error) {
      setStatus("camera");
      setMessage(error.message || labels.cameraErrorMessage);
    }
  };

  const clearPhoto = ({ restartCamera = photo?.photoType === "instant" } = {}) => {
    if (photo?.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setPhoto(null);
    setMessage("");
    setNameError("");
    if (restartCamera) {
      startCamera();
    } else {
      stopCamera();
      setStatus("permission");
    }
  };

  const chooseDevicePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleDevicePhoto = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    setNameError("");

    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error(labels.unsupportedUploadMessage);
      }

      stopCamera();
      if (photo?.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }

      const uploadBlob = await prepareDeviceUploadBlob(file);
      const previewUrl = URL.createObjectURL(uploadBlob);
      const base64 = await readBlobAsBase64(uploadBlob);
      setPhoto({
        base64,
        mimeType: "image/jpeg",
        previewUrl,
        photoType: "upload",
      });
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || labels.errorMessage);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
      const photoType = photo.photoType || "instant";
      const extension = getPhotoExtension(photo.mimeType);
      const response = await fetch(uploadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: photo.base64,
          mimeType: photo.mimeType,
          guestName: guestName.trim(),
          photoType,
          fileName: `${safeGuestName}-${photoType}-${stamp}.${extension}`,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || labels.errorMessage);
      }

      if (photo.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setPhoto(null);
      setMessage(labels.successMessage);
      if (photo.photoType === "instant") {
        await startCamera({ keepMessage: true });
      } else {
        stopCamera();
        setStatus("permission");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error.message || labels.errorMessage);
    }
  };

  if (photoAccess.isLocked) {
    return (
      <PhotoAccessGate
        cardClassName="photos-card invitation-card"
        labels={labels}
        pageClassName="photos-page"
        countdownEvent={countdownEvent}
      />
    );
  }

  const hasPhoto = Boolean(photo);
  const isBusy = status === "opening" || status === "preparing" || status === "sending";
  const showCamera = status === "opening" || status === "camera" || status === "preparing";
  const showNameField = status !== "success";
  const errorPanelMessage = status === "camera-error" ? labels.cameraErrorMessage : message;
  const isDeviceUpload = photo?.photoType === "upload";

  return (
    <main className="photos-page">
      <section className="photos-card invitation-card" aria-label="Foto del matrimonio">
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="photos-file-input"
          onChange={handleDevicePhoto}
        />

        {status === "permission" && (
          <div className="photos-permission-panel" role="dialog" aria-labelledby="photos-permission-title">
            <div className="photos-permission-icon" aria-hidden="true">
              <Video size={28} />
            </div>
            <h2 id="photos-permission-title">{labels.permissionTitle}</h2>
            <p>{labels.permissionMessage}</p>
            {message && (
              <p className="photos-status is-success">
                <CheckCircle size={18} aria-hidden="true" />
                {message}
              </p>
            )}
            <button type="button" onClick={() => startCamera()}>
              <Camera size={18} aria-hidden="true" />
              {labels.permissionLabel}
            </button>
            <button type="button" onClick={chooseDevicePhoto} className="photos-upload-option">
              <Upload size={18} aria-hidden="true" />
              {labels.deviceUploadLabel}
            </button>
          </div>
        )}

        {showCamera && (
          <div className="photos-camera-panel">
            <div className="photos-camera-frame">
              <video ref={videoRef} className="photos-video" playsInline muted autoPlay />
              <div className="photos-live-frame" aria-hidden="true">
                <span>{frameTitle}</span>
                <strong>{frameDate}</strong>
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
              <button type="button" onClick={chooseDevicePhoto} disabled={isBusy} className="photos-secondary-button">
                <Upload size={18} aria-hidden="true" />
                {labels.deviceUploadShortLabel || labels.deviceUploadLabel}
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
            {isDeviceUpload && <p className="photos-upload-note">{labels.deviceUploadPreviewLabel}</p>}
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
              {isDeviceUpload ? labels.chooseAnotherUploadLabel : labels.retakeLabel}
            </button>
          </div>
        )}

        {(status === "camera-error" || status === "error" || (status === "ready" && message)) && errorPanelMessage && (
          <div className="photos-error-panel">
            <p className="photos-status is-error">{errorPanelMessage}</p>
            {status === "camera-error" && (
              <button type="button" onClick={() => startCamera()} className="photos-secondary-button">
                <RotateCcw size={18} aria-hidden="true" />
                {labels.retryCameraLabel}
              </button>
            )}
          </div>
        )}

        <div className="photos-bottom-actions">
          <Link to="/foto/galleria" className="photos-secondary-button photos-link-button">
            <Images size={18} aria-hidden="true" />
            {labels.galleryButtonLabel}
          </Link>
        </div>

      </section>
    </main>
  );
}
