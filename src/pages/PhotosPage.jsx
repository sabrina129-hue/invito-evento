import { ArrowLeft, Camera, CheckCircle, Loader2, RefreshCw, RotateCcw, Send, Trash2, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./PhotosPage.css";

const PHOTO_QUALITY = 0.9;

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

const drawWeddingFrame = ({ context, width, height, title, date }) => {
  const shortSide = Math.min(width, height);
  const border = Math.max(18, Math.round(shortSide * 0.035));
  const innerBorder = Math.max(5, Math.round(border * 0.28));
  const bandHeight = Math.max(88, Math.round(height * 0.13));
  const padding = Math.max(24, Math.round(shortSide * 0.04));

  context.save();

  const bottomGradient = context.createLinearGradient(0, height - bandHeight, 0, height);
  bottomGradient.addColorStop(0, "rgba(255, 248, 241, 0)");
  bottomGradient.addColorStop(0.24, "rgba(255, 248, 241, 0.72)");
  bottomGradient.addColorStop(1, "rgba(255, 241, 223, 0.94)");
  context.fillStyle = bottomGradient;
  context.fillRect(0, height - bandHeight, width, bandHeight);

  context.lineJoin = "round";
  context.strokeStyle = "rgba(127, 23, 31, 0.92)";
  context.lineWidth = border;
  context.strokeRect(border / 2, border / 2, width - border, height - border);

  context.strokeStyle = "rgba(245, 216, 137, 0.9)";
  context.lineWidth = innerBorder;
  context.strokeRect(border + innerBorder, border + innerBorder, width - 2 * (border + innerBorder), height - 2 * (border + innerBorder));

  context.fillStyle = "rgba(127, 23, 31, 0.92)";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const titleSize = fitText({
    context,
    text: title,
    maxWidth: width - padding * 2,
    startSize: Math.max(34, Math.round(bandHeight * 0.34)),
    minSize: 24,
    family: "Georgia, serif",
  });
  context.font = `700 ${titleSize}px Georgia, serif`;
  context.fillText(title, width / 2, height - bandHeight * 0.54);

  context.fillStyle = "rgba(151, 104, 31, 0.95)";
  const dateSize = fitText({
    context,
    text: date,
    maxWidth: width - padding * 2,
    startSize: Math.max(24, Math.round(bandHeight * 0.24)),
    minSize: 18,
    family: "Georgia, serif",
  });
  context.font = `700 ${dateSize}px Georgia, serif`;
  context.fillText(date, width / 2, height - bandHeight * 0.2);

  context.restore();
};

const captureFrame = (video, frameConfig) => new Promise((resolve, reject) => {
  if (!video?.videoWidth || !video?.videoHeight) {
    reject(new Error("Fotocamera non pronta."));
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  drawWeddingFrame({
    context,
    width: canvas.width,
    height: canvas.height,
    title: frameConfig.title,
    date: frameConfig.date,
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
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [status, setStatus] = useState("permission");
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [facingMode, setFacingMode] = useState("environment");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    stopCamera();
  }, []);

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
      setMessage(config.cameraErrorMessage);
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
      const blob = await captureFrame(videoRef.current, {
        title: config.frameTitle,
        date: config.frameDate,
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
      setMessage(error.message || config.cameraErrorMessage);
    }
  };

  const clearPhoto = () => {
    if (photo?.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    setPhoto(null);
    setMessage("");
    startCamera();
  };

  const uploadPhoto = async () => {
    if (!photo || status === "sending") return;

    const safeGuestName = cleanName(guestName);
    if (!safeGuestName) {
      setStatus("ready");
      setMessage(config.nameRequiredMessage);
      return;
    }

    setStatus("sending");
    setMessage("");

    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const response = await fetch(config.uploadEndpoint, {
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
        throw new Error(payload.error || config.errorMessage);
      }

      if (photo.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      setPhoto(null);
      setMessage(config.successMessage);
      await startCamera({ keepMessage: true });
    } catch (error) {
      setStatus("error");
      setMessage(error.message || config.errorMessage);
    }
  };

  const hasPhoto = Boolean(photo);
  const isBusy = status === "opening" || status === "preparing" || status === "sending";
  const showCamera = status === "opening" || status === "camera" || status === "preparing";
  const showNameField = status !== "success";

  return (
    <main className="photos-page">
      <section className="photos-card invitation-card" aria-label="Foto del matrimonio">
        <div className="photos-icon" aria-hidden="true">
          <Camera size={26} />
        </div>

        <h1 className="photos-title">{config.title}</h1>

        <div className="photos-copy">
          {config.subtitle && <p>{config.subtitle}</p>}
          {config.message && <p>{config.message}</p>}
        </div>

        {showNameField && (
          <label className="photos-name-field">
            <span>{config.nameLabel}</span>
            <input
              type="text"
              value={guestName}
              onChange={event => setGuestName(event.target.value)}
              placeholder={config.namePlaceholder}
              autoComplete="name"
            />
          </label>
        )}

        {status === "permission" && (
          <div className="photos-permission-panel" role="dialog" aria-labelledby="photos-permission-title">
            <div className="photos-permission-icon" aria-hidden="true">
              <Video size={28} />
            </div>
            <h2 id="photos-permission-title">{config.permissionTitle}</h2>
            <p>{config.permissionMessage}</p>
            <button type="button" onClick={() => startCamera()}>
              <Camera size={18} aria-hidden="true" />
              {config.permissionLabel}
            </button>
          </div>
        )}

        {showCamera && (
          <div className="photos-camera-panel">
            <div className="photos-camera-frame">
              <video ref={videoRef} className="photos-video" playsInline muted autoPlay />
              <div className="photos-live-frame" aria-hidden="true">
                <span>{config.frameTitle}</span>
                <strong>{config.frameDate}</strong>
              </div>
              {status === "opening" && (
                <div className="photos-camera-overlay">
                  <Loader2 size={22} aria-hidden="true" />
                  {config.permissionLabel}
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
                {config.switchCameraLabel}
              </button>
              <button
                type="button"
                onClick={takePhoto}
                disabled={isBusy}
                className={`photos-primary-button ${status === "preparing" ? "is-loading" : ""}`}
              >
                {status === "preparing" ? <Loader2 size={18} aria-hidden="true" /> : <Camera size={18} aria-hidden="true" />}
                {status === "preparing" ? config.preparingLabel : config.cameraLabel}
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
                {config.deleteLabel}
              </button>
              <button
                type="button"
                onClick={uploadPhoto}
                disabled={isBusy}
                className={`photos-primary-button ${status === "sending" ? "is-loading" : ""}`}
              >
                {status === "sending" ? <Loader2 size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
                {status === "sending" ? config.sendingLabel : config.sendLabel}
              </button>
            </div>
            <button type="button" onClick={clearPhoto} disabled={isBusy} className="photos-text-button">
              <RotateCcw size={16} aria-hidden="true" />
              {config.retakeLabel}
            </button>
          </div>
        )}

        {(status === "camera-error" || status === "error" || (status === "ready" && message)) && message && (
          <div className="photos-error-panel">
            <p className="photos-status is-error">{message}</p>
            {status === "camera-error" && (
              <button type="button" onClick={() => startCamera()} className="photos-secondary-button">
                <RotateCcw size={18} aria-hidden="true" />
                {config.retryCameraLabel}
              </button>
            )}
          </div>
        )}

        <div className="photos-actions">
          <Link to="/" className="photos-secondary-action">
            <ArrowLeft size={18} aria-hidden="true" />
            {config.backLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
