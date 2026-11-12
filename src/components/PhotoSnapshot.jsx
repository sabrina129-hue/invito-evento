import { useEffect, useRef, useState } from "react";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 1280;

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Lettura della foto non riuscita"));
    reader.readAsDataURL(blob);
  });
}

export default function PhotoSnapshot() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
          video: { facingMode: { ideal: "user" }, width: { ideal: 1280 } },
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

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraReady(false);
    setCameraOpen(false);
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) {
      setError("La fotocamera non è ancora pronta. Riprova tra un momento.");
      return;
    }

    const scale = Math.min(1, MAX_IMAGE_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
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
    } catch {
      setError("Non sono riuscito a preparare la foto. Riprova.");
    }
  };

  const handleSave = async () => {
    if (!photo) return;
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
        throw new Error(`Non sono riuscito a salvare la foto. Codice: ${code}${reference}`);
      }

      setNotice("Foto salvata nel Drive dell’organizzatore. Grazie!");
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
      <p className="snapshot-description">
        Scatta un’istantanea da conservare. La foto verrà inviata al Drive dell’organizzatore solo quando scegli di salvarla.
      </p>

      {cameraOpen && (
        <div className="snapshot-camera-panel">
          <video
            ref={videoRef}
            className="snapshot-video"
            autoPlay
            muted
            playsInline
            onCanPlay={() => setCameraReady(true)}
            aria-label="Anteprima della fotocamera"
          />
          <div className="snapshot-actions">
            <button type="button" className="snapshot-button snapshot-primary" onClick={handleCapture} disabled={!cameraReady}>
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
          <img className="snapshot-preview" src={previewUrl} alt="Anteprima dell’istantanea da salvare" />
          <div className="snapshot-actions">
            <button type="button" className="snapshot-button snapshot-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio…" : "Salva su Drive"}
            </button>
            <button type="button" className="snapshot-button snapshot-secondary" onClick={() => { setPhoto(null); setPreviewUrl(""); setError(""); }} disabled={saving}>
              Scatta di nuovo
            </button>
          </div>
        </div>
      )}

      {!cameraOpen && !previewUrl && (
        <button type="button" className="snapshot-button snapshot-primary" onClick={() => { setError(""); setNotice(""); setCameraOpen(true); }}>
          Scatta un’istantanea
        </button>
      )}

      {error && <p className="snapshot-message snapshot-error" role="alert">{error}</p>}
      {notice && <p className="snapshot-message snapshot-success" role="status">{notice}</p>}
    </section>
  );
}
