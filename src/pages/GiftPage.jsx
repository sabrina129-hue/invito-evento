import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import "./GiftPage.css";

const isConfiguredIban = iban => {
  const value = String(iban || "").trim();
  return value && !value.toLowerCase().includes("inserisci");
};

export default function GiftPage({ config }) {
  const [copied, setCopied] = useState(false);
  const iban = config?.iban || "";
  const canCopy = isConfiguredIban(iban);

  const copyIban = async () => {
    if (!canCopy) return;

    await navigator.clipboard.writeText(iban.replace(/\s+/g, " ").trim());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="gift-page">
      <section className="gift-card invitation-card" aria-label="Coordinate regalo">
        <h1 className="gift-title">{config.title}</h1>

        <div className="gift-copy">
          {config.subtitle && <p>{config.subtitle}</p>}
          {config.message && <p>{config.message}</p>}
        </div>

        <dl className="gift-details">
          <div>
            <dt>{config.holderLabel}</dt>
            <dd>{config.holder}</dd>
          </div>
          <div>
            <dt>{config.ibanLabel}</dt>
            <dd className={canCopy ? "" : "is-placeholder"}>{iban}</dd>
          </div>
        </dl>

        <div className="gift-actions">
          <button type="button" onClick={copyIban} disabled={!canCopy}>
            {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            {copied ? config.copiedLabel : config.copyLabel}
          </button>
          <Link to="/">{config.backLabel}</Link>
        </div>
      </section>
    </main>
  );
}
