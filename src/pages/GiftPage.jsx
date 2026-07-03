import { Check, Copy, Gift } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import "./GiftPage.css";

const isConfiguredIban = iban => {
  const value = String(iban || "").trim();
  return value && !value.toLowerCase().includes("inserisci");
};

export default function GiftPage({ config }) {
  const [copied, setCopied] = useState(false);
  const paymentProviders = (config?.paymentProviders || []).filter(provider => (
    provider?.label && provider?.url
  ));
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
        <div className="gift-icon" aria-hidden="true">
          <Gift size={28} />
        </div>

        <div className="gift-copy">
          {config.subtitle && <p>{config.subtitle}</p>}
          <h1>{config.title}</h1>
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

        {paymentProviders.length > 0 && (
          <section className="gift-provider-section" aria-label={config.providersTitle}>
            <h2>{config.providersTitle}</h2>
            <p className="gift-provider-links">
              {paymentProviders.map(provider => (
                <a key={provider.label} href={provider.url} target="_blank" rel="noreferrer">
                  {provider.label}
                </a>
              ))}
            </p>
            {config.providersNote && <p>{config.providersNote}</p>}
          </section>
        )}

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
