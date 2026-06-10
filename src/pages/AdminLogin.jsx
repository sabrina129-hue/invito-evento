import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLogin({ labels, onLogin }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event?.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("Inserisci la password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await res.json() : null;

      if (res.ok && data?.token) {
        localStorage.setItem("adminToken", data.token);
        onLogin();
        return;
      }

      setError(data?.error || labels.wrongPassword || "Accesso non riuscito.");
    } catch {
      setError("Non riesco a contattare il server. Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-center">{labels.loginTitle}</h1>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className="w-full border p-2 pr-11 rounded"
            placeholder={labels.passwordPlaceholder}
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-500 hover:text-gray-800 disabled:opacity-50"
            onClick={() => setShowPassword(prev => !prev)}
            disabled={loading}
            aria-label={showPassword ? "Nascondi password" : "Mostra password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded"
          disabled={loading}
        >
          {loading ? "Accesso..." : labels.loginButton}
        </button>
      </form>
    </div>
  );
}
