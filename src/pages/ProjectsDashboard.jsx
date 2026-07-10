import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Archive,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  FileJson,
  LayoutDashboard,
  Link as LinkIcon,
  MessageCircle,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";

import "./ProjectsDashboard.css";

const STORAGE_KEY = "personalInviteProjects";

const statusOptions = [
  { value: "bozza", label: "Bozza" },
  { value: "in-lavorazione", label: "In lavorazione" },
  { value: "in-revisione", label: "In revisione" },
  { value: "online", label: "Online" },
  { value: "archiviato", label: "Archiviato" },
];

const statusCopy = {
  bozza: "Bozza",
  "in-lavorazione": "In lavorazione",
  "in-revisione": "In revisione",
  online: "Online",
  archiviato: "Archiviato",
};

const createProject = () => ({
  id: crypto.randomUUID(),
  inviteName: "",
  referenceName: "",
  phone: "",
  status: "bozza",
  dueDate: "",
  paymentCost: "",
  paymentPaid: "",
  links: [{ id: crypto.randomUUID(), label: "Invito", url: "" }],
  envVars: [
    { id: crypto.randomUUID(), name: "SUPABASE_URL", value: "", scope: "Produzione" },
    { id: crypto.randomUUID(), name: "SUPABASE_KEY", value: "", scope: "Produzione" },
    { id: crypto.randomUUID(), name: "ADMIN_PASSWORD", value: "", scope: "Locale" },
    { id: crypto.randomUUID(), name: "ADMIN_TOKEN", value: "", scope: "Locale" },
    { id: crypto.randomUUID(), name: "INVITE_TABLE", value: "", scope: "Produzione" },
  ],
  notes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const starterProjects = [
  {
    ...createProject(),
    id: "starter-template-2",
    inviteName: "Template matrimonio Elena & Marco",
    referenceName: "Demo",
    phone: "",
    status: "in-lavorazione",
    paymentCost: "450",
    paymentPaid: "0",
    links: [
      { id: "starter-link-preview", label: "Anteprima locale", url: "http://localhost:5173/" },
      { id: "starter-link-admin", label: "Dashboard invitati", url: "http://localhost:5173/#/admin" },
      { id: "starter-link-public", label: "Sito pubblico", url: "https://template-invito-2.vercel.app" },
    ],
    envVars: [
      { id: "starter-env-url", name: "SUPABASE_URL", value: "", scope: "Produzione" },
      { id: "starter-env-key", name: "SUPABASE_KEY", value: "", scope: "Produzione" },
      { id: "starter-env-password", name: "ADMIN_PASSWORD", value: "", scope: "Locale" },
      { id: "starter-env-token", name: "ADMIN_TOKEN", value: "", scope: "Locale" },
      { id: "starter-env-table", name: "INVITE_TABLE", value: "partecipanti", scope: "Produzione" },
    ],
    notes: "Progetto iniziale ricavato dal template presente in questa cartella.",
  },
];

const normalizeItems = (items, fallback) =>
  (Array.isArray(items) && items.length ? items : [fallback]).map(item => ({
    ...fallback,
    ...item,
    id: item.id || crypto.randomUUID(),
  }));

const normalizeProject = project => {
  const base = createProject();

  return {
    ...base,
    ...project,
    links: normalizeItems(project.links, { id: crypto.randomUUID(), label: "", url: "" }),
    envVars: normalizeItems(project.envVars, { id: crypto.randomUUID(), name: "", value: "", scope: "" }),
    paymentCost: project.paymentCost ?? "",
    paymentPaid: project.paymentPaid ?? "",
    createdAt: project.createdAt || base.createdAt,
    updatedAt: project.updatedAt || project.createdAt || base.updatedAt,
  };
};

const loadProjects = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return starterProjects.map(normalizeProject);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed.map(normalizeProject) : starterProjects.map(normalizeProject);
  } catch {
    return starterProjects.map(normalizeProject);
  }
};

const normalizePhone = phone => String(phone || "").replace(/[^\d+]/g, "");

const countFilled = items => items.filter(item => item.name || item.label || item.url || item.value).length;

const withUpdatedAt = project => ({ ...project, updatedAt: new Date().toISOString() });

const toMoneyNumber = value => Number(String(value || "0").replace(",", ".")) || 0;

const formatMoney = value =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState(() => loadProjects());
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return projects;

    return projects.filter(project =>
      [
        project.inviteName,
        project.referenceName,
        project.phone,
        statusCopy[project.status],
        project.paymentCost,
        project.paymentPaid,
        ...project.links.map(link => `${link.label} ${link.url}`),
        ...project.envVars.map(variable => `${variable.name} ${variable.scope}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [projects, query]);

  const selectedProject = projects.find(project => project.id === selectedId);
  const isDetailView = Boolean(selectedProject);
  const totalCost = projects.reduce((total, project) => total + toMoneyNumber(project.paymentCost), 0);
  const totalPaid = projects.reduce((total, project) => total + toMoneyNumber(project.paymentPaid), 0);
  const totalDue = Math.max(0, totalCost - totalPaid);

  const totals = useMemo(
    () =>
      statusOptions.map(option => ({
        ...option,
        count: projects.filter(project => project.status === option.value).length,
      })),
    [projects]
  );

  const updateProject = updates => {
    if (!selectedProject) return;
    setProjects(prev =>
      prev.map(project =>
        project.id === selectedProject.id ? withUpdatedAt({ ...project, ...updates }) : project
      )
    );
  };

  const updateListItem = (key, index, updates) => {
    const nextItems = selectedProject[key].map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...updates } : item
    );
    updateProject({ [key]: nextItems });
  };

  const addListItem = key => {
    const blank =
      key === "links"
        ? { id: crypto.randomUUID(), label: "", url: "" }
        : { id: crypto.randomUUID(), name: "", value: "", scope: "" };
    updateProject({ [key]: [...selectedProject[key], blank] });
  };

  const removeListItem = (key, index) => {
    const nextItems = selectedProject[key].filter((_, itemIndex) => itemIndex !== index);
    updateProject({
      [key]: nextItems.length
        ? nextItems
        : key === "links"
          ? [{ id: crypto.randomUUID(), label: "", url: "" }]
          : [{ id: crypto.randomUUID(), name: "", value: "", scope: "" }],
    });
  };

  const addProject = () => {
    const project = createProject();
    project.inviteName = "Nuovo invito";
    setProjects(prev => [project, ...prev]);
    setSelectedId(project.id);
  };

  const deleteProject = id => {
    const nextProjects = projects.filter(project => project.id !== id);
    setProjects(nextProjects.length ? nextProjects : [createProject()]);
    setSelectedId("");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dashboard-inviti-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "[]"));
        if (!Array.isArray(parsed)) return;
        setProjects(parsed.map(normalizeProject));
        setSelectedId("");
      } catch {
        alert("Il file selezionato non e un backup valido.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <main className="projects-dashboard">
      <aside className="projects-sidebar" aria-label="Progetti invito">
        <div className="projects-brand">
          <LayoutDashboard aria-hidden="true" />
          <div>
            <p>Inviti</p>
            <h1>Dashboard personale</h1>
          </div>
        </div>

        <div className="projects-search">
          <Search size={18} aria-hidden="true" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Cerca progetto"
            type="search"
          />
        </div>

        <button className="primary-action" onClick={addProject}>
          <Plus size={18} aria-hidden="true" />
          Nuovo invito
        </button>

        <div className="projects-list">
          {filteredProjects.map(project => (
            <button
              className={`project-list-item ${project.id === selectedProject?.id ? "is-active" : ""}`}
              key={project.id}
              onClick={() => setSelectedId(project.id)}
            >
              <span>{project.inviteName || "Invito senza nome"}</span>
              <small>
                {project.referenceName || "Nessun referente"} - {statusCopy[project.status]} - Da pagare{" "}
                {formatMoney(Math.max(0, toMoneyNumber(project.paymentCost) - toMoneyNumber(project.paymentPaid)))}
              </small>
            </button>
          ))}
        </div>

        <div className="projects-file-actions">
          <button onClick={exportData} title="Esporta backup">
            <Download size={17} aria-hidden="true" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} title="Importa backup">
            <Upload size={17} aria-hidden="true" />
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={importData} />
        </div>
      </aside>

      <section className="projects-workspace">
        {!isDetailView ? (
          <header className="projects-header">
            <div>
              <p>Monitoraggio locale</p>
              <h2>Tutti gli inviti</h2>
            </div>
            <div className="header-actions">
              <button className="primary-action compact-action" onClick={addProject}>
                <Plus size={17} aria-hidden="true" />
                Nuovo invito
              </button>
            </div>
          </header>
        ) : (
          <header className="projects-header">
            <div>
              <p>Dettaglio invito</p>
              <h2>{selectedProject.inviteName || "Invito senza nome"}</h2>
            </div>
            <div className="header-actions">
              <button className="ghost-action" onClick={() => setSelectedId("")}>
                <ArrowLeft size={17} aria-hidden="true" />
                Tutti gli inviti
              </button>
              <a href="/#/" className="ghost-action">
                <ExternalLink size={17} aria-hidden="true" />
                Apri invito
              </a>
              <button className="danger-action" onClick={() => deleteProject(selectedProject.id)}>
                <Trash2 size={17} aria-hidden="true" />
                Elimina
              </button>
            </div>
          </header>
        )}

        <div className="stats-grid">
          {totals.map(total => (
            <div className="stat-tile" key={total.value}>
              <span>{total.label}</span>
              <strong>{total.count}</strong>
            </div>
          ))}
          <div className="stat-tile money-stat">
            <span>Incassato</span>
            <strong>{formatMoney(totalPaid)}</strong>
          </div>
          <div className="stat-tile money-stat">
            <span>Da pagare</span>
            <strong>{formatMoney(totalDue)}</strong>
          </div>
        </div>

        {!isDetailView && (
          <section className="all-invites-panel">
            {filteredProjects.map(project => {
              const cost = toMoneyNumber(project.paymentCost);
              const paid = toMoneyNumber(project.paymentPaid);
              const due = Math.max(0, cost - paid);

              return (
                <button className="invite-card" key={project.id} onClick={() => setSelectedId(project.id)}>
                  <div>
                    <span className={`status-pill status-${project.status}`}>{statusCopy[project.status]}</span>
                    <h3>{project.inviteName || "Invito senza nome"}</h3>
                    <p>{project.referenceName || "Nessun referente"}{project.phone ? ` - ${project.phone}` : ""}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Costo</dt>
                      <dd>{formatMoney(cost)}</dd>
                    </div>
                    <div>
                      <dt>Pagato</dt>
                      <dd>{formatMoney(paid)}</dd>
                    </div>
                    <div>
                      <dt>Da pagare</dt>
                      <dd>{formatMoney(due)}</dd>
                    </div>
                  </dl>
                </button>
              );
            })}
          </section>
        )}

        {isDetailView && (
          <div className="dashboard-grid">
            <section className="panel project-editor">
              <div className="panel-title">
                <FileJson aria-hidden="true" />
                <h3>Dati progetto</h3>
              </div>

              <label>
                Nome invito
                <input
                  value={selectedProject.inviteName}
                  onChange={event => updateProject({ inviteName: event.target.value })}
                  placeholder="Es. Matrimonio Anna e Luca"
                />
              </label>

              <div className="two-columns">
                <label>
                  Persona di riferimento
                  <input
                    value={selectedProject.referenceName}
                    onChange={event => updateProject({ referenceName: event.target.value })}
                    placeholder="Nome referente"
                  />
                </label>
                <label>
                  Cellulare
                  <input
                    value={selectedProject.phone}
                    onChange={event => updateProject({ phone: event.target.value })}
                    placeholder="+39 333 000 0000"
                    inputMode="tel"
                  />
                </label>
              </div>

              <div className="two-columns">
                <label>
                  Stato
                  <select
                    value={selectedProject.status}
                    onChange={event => updateProject({ status: event.target.value })}
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Scadenza
                  <input
                    type="date"
                    value={selectedProject.dueDate}
                    onChange={event => updateProject({ dueDate: event.target.value })}
                  />
                </label>
              </div>

              <div className="three-columns">
                <label>
                  Costo
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={selectedProject.paymentCost}
                    onChange={event => updateProject({ paymentCost: event.target.value })}
                    placeholder="0,00"
                  />
                </label>
                <label>
                  Pagato
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={selectedProject.paymentPaid}
                    onChange={event => updateProject({ paymentPaid: event.target.value })}
                    placeholder="0,00"
                  />
                </label>
                <label>
                  Da pagare
                  <input
                    value={formatMoney(
                      Math.max(
                        0,
                        toMoneyNumber(selectedProject.paymentCost) - toMoneyNumber(selectedProject.paymentPaid)
                      )
                    )}
                    readOnly
                  />
                </label>
              </div>

              <label>
                Note operative
                <textarea
                  value={selectedProject.notes}
                  onChange={event => updateProject({ notes: event.target.value })}
                  placeholder="Cose da ricordare, pubblicazione, richieste del cliente..."
                />
              </label>
            </section>

            <section className="panel">
              <div className="panel-title">
                <UserRound aria-hidden="true" />
                <h3>Referente</h3>
              </div>
              <div className="contact-card">
                <strong>{selectedProject.referenceName || "Referente non indicato"}</strong>
                <span>{selectedProject.phone || "Numero non inserito"}</span>
                <div className="contact-actions">
                  <a href={`tel:${normalizePhone(selectedProject.phone)}`} className={!selectedProject.phone ? "is-disabled" : ""}>
                    <UserRound size={17} aria-hidden="true" />
                    Chiama
                  </a>
                  <a
                    href={`https://wa.me/${normalizePhone(selectedProject.phone).replace("+", "")}`}
                    className={!selectedProject.phone ? "is-disabled" : ""}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={17} aria-hidden="true" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </section>

            <section className="panel payment-panel">
              <div className="panel-title">
                <CreditCard aria-hidden="true" />
                <h3>Pagamento</h3>
              </div>
              <dl>
                <div>
                  <dt>Costo</dt>
                  <dd>{formatMoney(toMoneyNumber(selectedProject.paymentCost))}</dd>
                </div>
                <div>
                  <dt>Pagato</dt>
                  <dd>{formatMoney(toMoneyNumber(selectedProject.paymentPaid))}</dd>
                </div>
                <div>
                  <dt>Da pagare</dt>
                  <dd>
                    {formatMoney(
                      Math.max(0, toMoneyNumber(selectedProject.paymentCost) - toMoneyNumber(selectedProject.paymentPaid))
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="panel wide-panel">
              <div className="panel-title with-action">
                <div>
                  <LinkIcon aria-hidden="true" />
                  <h3>Link invito</h3>
                </div>
                <button onClick={() => addListItem("links")}>
                  <Plus size={17} aria-hidden="true" />
                  Link
                </button>
              </div>

              <div className="editable-list">
                {selectedProject.links.map((link, index) => (
                  <div className="editable-row link-row" key={link.id}>
                    <input
                      value={link.label}
                      onChange={event => updateListItem("links", index, { label: event.target.value })}
                      placeholder="Etichetta"
                    />
                    <input
                      value={link.url}
                      onChange={event => updateListItem("links", index, { url: event.target.value })}
                      placeholder="https://..."
                    />
                    <a href={link.url || "#"} className={!link.url ? "is-disabled" : ""} target="_blank" rel="noreferrer" title="Apri link">
                      <ExternalLink size={17} aria-hidden="true" />
                    </a>
                    <button onClick={() => removeListItem("links", index)} title="Rimuovi link">
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel wide-panel">
              <div className="panel-title with-action">
                <div>
                  <Save aria-hidden="true" />
                  <h3>Variabili ambiente</h3>
                </div>
                <button onClick={() => addListItem("envVars")}>
                  <Plus size={17} aria-hidden="true" />
                  Variabile
                </button>
              </div>

              <div className="editable-list">
                {selectedProject.envVars.map((variable, index) => (
                  <div className="editable-row env-row" key={variable.id}>
                    <input
                      value={variable.name}
                      onChange={event => updateListItem("envVars", index, { name: event.target.value })}
                      placeholder="NOME_VARIABILE"
                    />
                    <input
                      value={variable.value}
                      onChange={event => updateListItem("envVars", index, { value: event.target.value })}
                      placeholder="Valore o riferimento"
                    />
                    <input
                      value={variable.scope}
                      onChange={event => updateListItem("envVars", index, { scope: event.target.value })}
                      placeholder="Ambiente"
                    />
                    <button onClick={() => removeListItem("envVars", index)} title="Rimuovi variabile">
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel summary-panel">
              <div className="panel-title">
                {selectedProject.status === "online" ? <CheckCircle2 aria-hidden="true" /> : <Archive aria-hidden="true" />}
                <h3>Stato progetto</h3>
              </div>
              <dl>
                <div>
                  <dt>Link compilati</dt>
                  <dd>{countFilled(selectedProject.links)} / {selectedProject.links.length}</dd>
                </div>
                <div>
                  <dt>Variabili collegate</dt>
                  <dd>{countFilled(selectedProject.envVars)} / {selectedProject.envVars.length}</dd>
                </div>
                <div>
                  <dt>Ultimo aggiornamento</dt>
                  <dd>{new Date(selectedProject.updatedAt).toLocaleString("it-IT")}</dd>
                </div>
              </dl>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
