import { ArrowLeft, Camera, CheckCircle, Loader2, RotateCcw, Send, Trash2, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./PhotosPage.css";

const PHOTO_QUALITY = 0.86;

const readBlobAsBase64 = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || "");
    resolve(result.includes(",") ? result.split(",")[1] : result);
  };
  reader.onerror = () => reject(new Error("Impossibile leggere la foto."));
  reader.readAsDataURL(blob);
});

const captureFrame = video => new Promise((resolve, reject) => {
  if (!video?.videoWidth || !video?.videoHeight) {
    reject(new Error("Fotocamera non pronta."));
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(blob => {
    if (!blob) {
      reject(new Error("Impossibile preparare la foto."));
      return;
    }
    resolve(blob);
  }, "image/jpeg", PHOTO_QUALITY);
});

export default function PhotosPage({ config }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [status, setStatus] = useState("permission");
  const [message, setMessage] = useState("");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    stopCamera();
    if (photo?.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
  }, [photo?.previewUrl]);

  const startCamera = async () => {
    setStatus("opening");
    setMessage("");

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
        audio: false,
      });

      streamRef.current = stream;
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

  const takePhoto = async () => {
    if (status !== "camera") return;

    setStatus("preparing");
    setMessage("");

    try {
      const blob = await captureFrame(videoRef.current);
      const previewUrl = URL.createObjectURL(blob);
      const base64 = await readBlobAsBase64(blob);

      stopCamera();
      setPhoto({
        base64,
        mimeType: "image/jpeg",
        fileName: `foto-matrimonio-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`,
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
    setStatus("permission");
    setMessage("");
  };

  const uploadPhoto = async () => {
    if (!photo || status === "sending") return;

    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch(config.uploadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: photo.base64,
          mimeType: photo.mimeType,
          fileName: photo.fileName,
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
      setStatus("success");
      setMessage(config.successMessage);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || config.errorMessage);
    }
  };

  const hasPhoto = Boolean(photo);
  const isBusy = status === "opening" || status === "preparing" || status === "sending";
  const showCamera = status === "opening" || status === "camera" || status === "preparing";

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

        {status === "permission" && (
          <div className="photos-permission-panel" role="dialog" aria-labelledby="photos-permission-title">
            <div className="photos-permission-icon" aria-hidden="true">
              <Video size={28} />
            </div>
            <h2 id="photos-permission-title">{config.permissionTitle}</h2>
            <p>{config.permissionMessage}</p>
            <button type="button" onClick={startCamera}>
              <Camera size={18} aria-hidden="true" />
              {config.permissionLabel}
            </button>
          </div>
        )}

        {showCamera && (
          <div className="photos-camera-panel">
            <div className="photos-camera-frame">
              <video ref={videoRef} className="photos-video" playsInline muted autoPlay />
              {status === "opening" && (
                <div className="photos-camera-overlay">
                  <Loader2 size={22} aria-hidden="true" />
                  {config.permissionLabel}
                </div>
              )}
            </div>
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
            <button type="button" onClick={startCamera} disabled={isBusy} className="photos-text-button">
              <RotateCcw size={16} aria-hidden="true" />
              {config.retakeLabel}
            </button>
          </div>
        )}

        {status === "success" && (
          <p className="photos-status is-success">
            <CheckCircle size={18} aria-hidden="true" />
            {config.successTitle}
          </p>
        )}

        {(status === "camera-error" || status === "error") && message && (
          <div className="photos-error-panel">
            <p className="photos-status is-error">{message}</p>
            {status === "camera-error" && (
              <button type="button" onClick={startCamera} className="photos-secondary-button">
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
