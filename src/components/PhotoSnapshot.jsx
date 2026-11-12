import { useEffect, useRef, useState } from "react";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 1280;
const NAME_COOKIE = "corrado_snapshot_name";

function readSavedName() {
  if (typeof document === "undefined") return "";
  const cookie = document.cookie.split("; ").find(item => item.startsWith(`${NAME_COOKIE}=`));
  if (!cookie) return "";
  try {
    return decodeURIComponent(cookie.slice(NAME_COOKIE.length + 1));
  } catch {
    return "";
  }
}

function saveName(name) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const maxAge = name ? 60 * 60 * 24 * 365 : 0;
  document.cookie = `${NAME_COOKIE}=${encodeURIComponent(name)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

function getDateParts(date) {
  const options = { timeZone: "Europe/Rome" };
  return {
    date: new Intl.DateTimeFormat("it-IT", { ...options, day: "2-digit", month: "long", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat("it-IT", { ...options, hour: "2-digit", minute: "2-digit" }).format(date),
  };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Lettura della foto non riuscita"));
    reader.readAsDataURL(blob);
  });
}

function fitCanvasText(context, text, maxWidth, startSize, fontFamily = "Georgia, serif") {
  let size = startSize;
  context.font = `600 ${size}px ${fontFamily}`;
  while (context.measureText(text).width > maxWidth && size > 12) {
    size -= 1;
    context.font = `600 ${size}px ${fontFamily}`;
  }
  let fitted = text;
  while (context.measureText(fitted).width > maxWidth && fitted.length > 4) {
    fitted = `${fitted.slice(0, -2)}…`;
  }
  return fitted;
}

export default function PhotoSnapshot() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const nameInputRef = useRef(null);
  const [guestName, setGuestName] = useState(readSavedName);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [clock, setClock] = useState(() => new Date());
  const dateParts = getDateParts(clock);

  useEffect(() => {
    if (!cameraOpen) return undefined;

    let cancelled = false;
    setCameraReady(false);
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("La fotocamera non è disponibile in questo browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1600 }, height: { ideal: 1200 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (cameraError) {
        setError(cameraError.message || "Non riesco ad aprire la fotocamera. Controlla i permessi del browser.");
      }
    };
    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, [cameraOpen]);

  useEffect(() => {
    if (!cameraOpen) return undefined;
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [cameraOpen]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraReady(false);
    setCameraOpen(false);
  };

  const handleNameChange = event => {
    const value = event.target.value;
    setGuestName(value);
    saveName(value.trim());
    if (value.trim()) setError("");
  };

  const openCamera = () => {
    setError("");
    setNotice("");
    if (!guestName.trim()) {
      setError("Inserisci il tuo nome prima di scattare.");
      nameInputRef.current?.focus();
      return;
    }
    setCameraOpen(true);
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) {
      setError("La fotocamera non è ancora pronta. Riprova tra un momento.");
      return;
    }

    try {
      const shotTime = new Date();
      const scale = Math.min(1, MAX_IMAGE_WIDTH / video.videoWidth);
      const imageWidth = Math.round(video.videoWidth * scale);
      const imageHeight = Math.round(video.videoHeight * scale);
      const padding = 18;
      const headerHeight = 66;
      const footerHeight = 78;
      const canvas = document.createElement("canvas");
      canvas.width = imageWidth + padding * 2;
      canvas.height = headerHeight + imageHeight + footerHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Non sono riuscito a preparare la cornice della foto.");

      context.fillStyle = "#f3e7ca";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, padding, headerHeight, imageWidth, imageHeight);
      context.strokeStyle = "#8f6b37";
      context.lineWidth = 3;
      context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#1d2a49";
      fitCanvasText(context, "La Laurea di Corrado", canvas.width - 36, 25);
      context.fillText("La Laurea di Corrado", canvas.width / 2, headerHeight / 2);
      context.fillStyle = "#8f6b37";
      context.fillRect(padding, headerHeight - 1, imageWidth, 1);
      context.fillRect(padding, headerHeight + imageHeight, imageWidth, 1);

      const { date, time } = getDateParts(shotTime);
      const footerName = guestName.trim();
      context.fillStyle = "#1d2a49";
      fitCanvasText(context, footerName, canvas.width - 36, 18);
      context.fillText(footerName, canvas.width / 2, headerHeight + imageHeight + 25);
      context.fillStyle = "#5b4b34";
      context.font = "14px Georgia, serif";
      context.fillText(`${date} · ${time}`, canvas.width / 2, headerHeight + imageHeight + 52);

      let captured = null;
      for (const quality of [0.82, 0.72, 0.62]) {
        captured = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
        if (captured && captured.size <= MAX_IMAGE_BYTES) break;
      }
      if (!captured || captured.size > MAX_IMAGE_BYTES) {
        setError("La foto è troppo grande. Riprova con un’inquadratura più semplice.");
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPhoto(captured);
      setPreviewUrl(URL.createObjectURL(captured));
      setError("");
      setNotice("");
      closeCamera();
    } catch (captureError) {
      setError(captureError.message || "Non sono riuscito a preparare la foto. Riprova.");
    }
  };

  const clearPhotoAndRestart = () => {
    setPhoto(null);
    setPreviewUrl("");
    setError("");
    setCameraOpen(true);
  };

  const handleSave = async () => {
    if (!photo || saving) return;
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const photoData = await blobToDataUrl(photo);
      const response = await fetch("/api/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: photoData }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = result.code || `HTTP_${response.status}`;
        const reference = result.requestId ? ` · Riferimento: ${result.requestId}` : "";
        throw new Error(`Non sono riuscito a inviare la foto. Codice: ${code}${reference}`);
      }

      setNotice("Foto inviata nel Drive dell’organizzatore. Grazie!");
      setPhoto(null);
      setPreviewUrl("");
    } catch (saveError) {
      setError(saveError.message || "Invio non riuscito. Verifica la connessione e riprova.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="snapshot-section" aria-labelledby="snapshot-title">
      <span className="snapshot-ornament" aria-hidden="true">✦</span>
      <h2 id="snapshot-title">Una foto ricordo</h2>
      <p className="snapshot-description">Scatta un’istantanea per farmi ricordare questo giorno attraverso i tuoi occhi!</p>
      <p className="snapshot-upload-note">La foto sarà inviata al Drive solo quando premi <strong>Invia</strong>.</p>

      <label className="snapshot-name-field">
        <span>Nome di chi scatta <strong aria-hidden="true">*</strong></span>
        <input
          ref={nameInputRef}
          type="text"
          value={guestName}
          onChange={handleNameChange}
          placeholder="Scrivi il tuo nome"
          autoComplete="name"
          maxLength={80}
          required
          aria-required="true"
        />
        <small className="snapshot-name-help">Il nome resta memorizzato in questo browser finché non cancelli i cookie.</small>
      </label>

      {cameraOpen && (
        <div className="snapshot-camera-panel">
          <div className="snapshot-media-frame">
            <video
              ref={videoRef}
              className="snapshot-video"
              autoPlay
              muted
              playsInline
              onCanPlay={() => setCameraReady(true)}
              aria-label="Anteprima della fotocamera con cornice della laurea"
            />
            <div className="snapshot-live-frame" aria-hidden="true">
              <span className="snapshot-frame-title">La Laurea di Corrado</span>
              <div className="snapshot-frame-footer">
                <strong>{guestName.trim()}</strong>
                <time>{dateParts.date} · {dateParts.time}</time>
              </div>
            </div>
          </div>
          <div className="snapshot-actions">
            <button type="button" className="snapshot-button snapshot-primary" onClick={handleCapture} disabled={!cameraReady || !guestName.trim()}>
              Scatta foto
            </button>
            <button type="button" className="snapshot-button snapshot-secondary" onClick={closeCamera}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {!cameraOpen && previewUrl && (
        <div className="snapshot-preview-panel">
          <img className="snapshot-preview" src={previewUrl} alt="Anteprima della foto incorniciata da inviare" />
          <div className="snapshot-actions">
            <button type="button" className="snapshot-button snapshot-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Invio…" : "Invia"}
            </button>
            <button type="button" className="snapshot-button snapshot-secondary" onClick={clearPhotoAndRestart} disabled={saving}>
              Scatta di nuovo
            </button>
          </div>
        </div>
      )}

      {!cameraOpen && !previewUrl && (
        <button type="button" className="snapshot-button snapshot-primary" onClick={openCamera}>
          Scatta un’istantanea
        </button>
      )}

      {error && <p className="snapshot-message snapshot-error" role="alert">{error}</p>}
      {notice && <p className="snapshot-message snapshot-success" role="status">{notice}</p>}
    </section>
  );
}