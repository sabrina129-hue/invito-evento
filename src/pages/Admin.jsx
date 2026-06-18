import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const emptyParticipant = {
    name: "",
    partecipate: true,
    guests: 1,
    food_preferences: "",
    message: "",
};

const foodPreferencesToList = value =>
    String(value || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);

const normalizeGuestCount = guests => Math.max(1, Number(guests) || 1);

const resizeGuestFoodPreferences = (groups, guests) =>
    Array.from({ length: normalizeGuestCount(guests) }, (_, index) =>
        Array.isArray(groups[index]) ? groups[index] : []
    );

const parseGuestFoodPreferences = (value, guests) => {
    const textValue = String(value || "").trim();
    const guestCount = normalizeGuestCount(guests);

    if (!textValue) {
        return resizeGuestFoodPreferences([], guestCount);
    }

    if (textValue.includes("Persona ")) {
        const groups = [];

        textValue.split("|").forEach(part => {
            const match = part.trim().match(/^Persona\s+(\d+):\s*(.*)$/i);

            if (!match) return;

            const index = Number(match[1]) - 1;
            const values = match[2].trim();

            groups[index] = values && values !== "-"
                ? values.split(",").map(item => item.trim()).filter(Boolean)
                : [];
        });

        return resizeGuestFoodPreferences(groups, guestCount);
    }

    return resizeGuestFoodPreferences([foodPreferencesToList(textValue)], guestCount);
};

const serializeGuestFoodPreferences = (groups, guests) => {
    const resized = resizeGuestFoodPreferences(groups, guests);

    if (resized.length <= 1) {
        return resized[0].join(", ");
    }

    return resized
        .map((items, index) => `Persona ${index + 1}: ${items.length ? items.join(", ") : "-"}`)
        .join(" | ");
};

const toggleGuestFoodPreference = (value, guests, guestIndex, option) => {
    const groups = parseGuestFoodPreferences(value, guests);
    const selected = groups[guestIndex] || [];

    groups[guestIndex] = selected.includes(option)
        ? selected.filter(item => item !== option)
        : [...selected, option];

    return serializeGuestFoodPreferences(groups, guests);
};

const toPdfText = value =>
    String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const escapePdfString = value =>
    toPdfText(value)
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");

const wrapPdfText = (value, maxLength) => {
    const words = toPdfText(value || "-").split(" ");
    const lines = [];
    let line = "";

    words.forEach(word => {
        if (!line) {
            line = word;
            return;
        }

        if (`${line} ${word}`.length > maxLength) {
            lines.push(line);
            line = word;
        } else {
            line = `${line} ${word}`;
        }
    });

    if (line) lines.push(line);
    return lines.length ? lines : ["-"];
};

const buildPdf = ({ title, participants, totals, isFiltered }) => {
    const pageWidth = 842;
    const pageHeight = 595;
    const margin = 36;
    const tableTop = 138;
    const rowPadding = 8;
    const lineHeight = 12;
    const minRowHeight = 30;
    const bottomMargin = 36;
    const columns = [
        { label: "#", x: 42, width: 28 },
        { label: "Nome", x: 76, width: 150 },
        { label: "Partecipa", x: 232, width: 90 },
        { label: "Ospiti", x: 328, width: 48 },
        { label: "Alimentazione", x: 382, width: 178 },
        { label: "Messaggio", x: 566, width: 234 },
    ];
    const pages = [];
    let currentPage = [];
    let y = tableTop + 24;

    const text = (value, x, textY, size = 10, font = "F1") =>
        `0 0 0 rg BT /${font} ${size} Tf ${x} ${textY} Td (${escapePdfString(value)}) Tj ET`;
    const line = (x1, y1, x2, y2) =>
        `0.82 0.84 0.87 RG ${x1} ${y1} m ${x2} ${y2} l S`;
    const rect = (x, rectY, width, height, color = "0.96 0.97 0.98") =>
        `${color} rg ${x} ${rectY} ${width} ${height} re f`;
    const drawHeader = () => [
        rect(margin, pageHeight - 92, pageWidth - margin * 2, 42, "0.94 0.96 0.98"),
        text(title, margin + 14, pageHeight - 66, 18, "F2"),
        text(`Generato il ${new Date().toLocaleDateString("it-IT")} alle ${new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`, 610, pageHeight - 64, 9),
        text(`Totale risposte: ${totals.total}`, margin + 14, pageHeight - 104, 10, "F2"),
        text(`Partecipanti: ${totals.yes}`, margin + 160, pageHeight - 104, 10, "F2"),
        text(`Assenti: ${totals.no}`, margin + 300, pageHeight - 104, 10, "F2"),
        text(isFiltered ? `Lista filtrata: ${participants.length} risultati` : `Lista completa: ${participants.length} invitati`, margin + 420, pageHeight - 104, 10, "F2"),
        rect(margin, pageHeight - tableTop - 22, pageWidth - margin * 2, 24, "0.90 0.92 0.95"),
        ...columns.map(column => text(column.label, column.x, pageHeight - tableTop - 6, 10, "F2")),
        line(margin, pageHeight - tableTop - 22, pageWidth - margin, pageHeight - tableTop - 22),
    ];
    const finishPage = () => {
        pages.push([...drawHeader(), ...currentPage]);
        currentPage = [];
        y = tableTop + 24;
    };

    if (!participants.length) {
        currentPage.push(text("Nessun invitato trovato.", margin + 14, pageHeight - y - 30, 11));
        finishPage();
    }

    participants.forEach((participant, index) => {
        const foodLines = wrapPdfText(participant.food_preferences || "-", 26);
        const messageLines = wrapPdfText(participant.message || "-", 36);
        const nameLines = wrapPdfText(participant.name || "-", 22);
        const rowLines = Math.max(foodLines.length, messageLines.length, nameLines.length, 1);
        const rowHeight = Math.max(minRowHeight, rowLines * lineHeight + rowPadding * 2);

        if (y + rowHeight > pageHeight - bottomMargin) {
            finishPage();
        }

        const rowTop = pageHeight - y;
        const rowBottom = pageHeight - y - rowHeight;
        const isEven = index % 2 === 0;

        if (isEven) {
            currentPage.push(rect(margin, rowBottom, pageWidth - margin * 2, rowHeight, "0.99 0.99 0.99"));
        }

        currentPage.push(line(margin, rowBottom, pageWidth - margin, rowBottom));
        columns.slice(1).forEach(column => {
            currentPage.push(line(column.x - 6, rowTop, column.x - 6, rowBottom));
        });

        currentPage.push(text(String(index + 1), columns[0].x, rowTop - 18, 9));
        nameLines.forEach((nameLine, lineIndex) => {
            currentPage.push(text(nameLine, columns[1].x, rowTop - 18 - lineIndex * lineHeight, 9));
        });
        currentPage.push(text(participant.partecipate ? "Partecipa" : "Non partecipa", columns[2].x, rowTop - 18, 9));
        currentPage.push(text(String(participant.guests ?? 0), columns[3].x, rowTop - 18, 9));
        foodLines.forEach((foodLine, lineIndex) => {
            currentPage.push(text(foodLine, columns[4].x, rowTop - 18 - lineIndex * lineHeight, 9));
        });
        messageLines.forEach((messageLine, lineIndex) => {
            currentPage.push(text(messageLine, columns[5].x, rowTop - 18 - lineIndex * lineHeight, 9));
        });

        y += rowHeight;
    });

    if (currentPage.length) {
        finishPage();
    }

    const objects = [];
    const addObject = content => {
        objects.push(content);
        return objects.length;
    };

    const catalogId = addObject("");
    const pagesId = addObject("");
    const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
    const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const pageIds = [];

    pages.forEach((pageCommands, pageIndex) => {
        const pageNumber = text(`Pagina ${pageIndex + 1} di ${pages.length}`, pageWidth - 110, 22, 8);
        const content = [...pageCommands, pageNumber].join("\n");
        const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
        const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
        pageIds.push(pageId);
    });

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objects.forEach((content, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${content}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.slice(1).forEach(offset => {
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return pdf;
};

export default function Admin({ labels, foodPreferenceOptions = [], onLogout }) {
    const [partecipanti, setPartecipanti] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [adding, setAdding] = useState(false);
    const [addingParticipant, setAddingParticipant] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [search, setSearch] = useState("");
    const [newParticipant, setNewParticipant] = useState(emptyParticipant);
    const [addFoodMenuOpen, setAddFoodMenuOpen] = useState(null);
    const [editFoodMenuOpen, setEditFoodMenuOpen] = useState(null);

    const token = localStorage.getItem("adminToken");

    useEffect(() => {
        fetch("/api/rsvps", {
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error("Caricamento non riuscito");
                return res.json();
            })
            .then(result => {
                setPartecipanti(result.data || []);
                setLoading(false);
            })
            .catch(() => {
                setError("Non sono riuscito a caricare le risposte.");
                setPartecipanti([]);
                setLoading(false);
            });
    }, [token]);

    const handleDelete = async () => {
        if (!toDelete) return;

        const res = await fetch("/api/rsvps", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ id: toDelete.id }),
        });

        if (!res.ok) {
            setError("Errore durante l'eliminazione.");
            return;
        }

        setPartecipanti(prev => prev.filter(p => p.id !== toDelete.id));
        setToDelete(null);
    };

    const handleSaveEdit = async () => {
        const guestCount = editing.partecipate ? normalizeGuestCount(editing.guests) : 0;
        const normalizedEditing = {
            ...editing,
            guests: guestCount,
            food_preferences: editing.partecipate
                ? serializeGuestFoodPreferences(parseGuestFoodPreferences(editing.food_preferences, editing.guests), guestCount)
                : "",
        };
        const res = await fetch("/api/rsvps", {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(normalizedEditing),
        });
        const result = await res.json();

        if (!res.ok) {
            setError("Errore durante il salvataggio.");
            return;
        }

        setPartecipanti(prev =>
            prev.map(p => (p.id === normalizedEditing.id ? result.data : p))
        );
        setEditing(null);
        setEditFoodMenuOpen(null);
    };

    const handleAdd = async () => {
        if (addingParticipant) return;

        setAddingParticipant(true);

        try {
            const guestCount = newParticipant.partecipate ? normalizeGuestCount(newParticipant.guests) : 0;
            const normalizedParticipant = {
                ...newParticipant,
                guests: guestCount,
                food_preferences: newParticipant.partecipate
                    ? serializeGuestFoodPreferences(parseGuestFoodPreferences(newParticipant.food_preferences, newParticipant.guests), guestCount)
                    : "",
            };
            const res = await fetch("/api/rsvps", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(normalizedParticipant),
            });
            const result = await res.json();

            if (!res.ok) {
                const details = typeof result.error === "string"
                    ? result.error
                    : result.details || result.error?.message;
                setError(details || "Errore durante l'inserimento.");
                return;
            }

            setPartecipanti(prev => [result.data, ...prev]);
            setNewParticipant(emptyParticipant);
            setAddFoodMenuOpen(null);
            setAdding(false);
        } finally {
            setAddingParticipant(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("adminToken");
        onLogout();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Caricamento...</p>
            </div>
        );
    }

    const totaleRisposte = partecipanti.length;
    const risposteSi = partecipanti
        .filter(p => p.partecipate)
        .reduce((tot, p) => tot + (p.guests ?? 0), 0);
    const risposteNo = partecipanti.filter(p => !p.partecipate).length;
    const searchTerm = search.trim().toLowerCase();
    const statusFilter =
        ["partecipa", "si", "sì", "presente"].includes(searchTerm)
            ? true
            : ["non partecipa", "no", "assente"].includes(searchTerm)
                ? false
                : null;
    const partecipantiFiltrati = searchTerm
        ? partecipanti.filter(p => {
            if (statusFilter !== null) {
                return Boolean(p.partecipate) === statusFilter;
            }

            const stato = p.partecipate ? "partecipa si presente" : "non partecipa no assente";
            return [
                p.name,
                stato,
                String(p.guests ?? 0),
                p.food_preferences,
                p.message,
            ]
                .join(" ")
                .toLowerCase()
                .includes(searchTerm);
        })
        : partecipanti;
    const handleDownloadPdf = () => {
        setError("");
        setNotice("");

        const pdf = buildPdf({
            title: "Lista invitati",
            participants: partecipantiFiltrati,
            totals: {
                total: totaleRisposte,
                yes: risposteSi,
                no: risposteNo,
            },
            isFiltered: Boolean(searchTerm),
        });
        const pdfBytes = new TextEncoder().encode(pdf);
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const suffix = searchTerm ? "filtrata" : "completa";

        link.href = url;
        link.download = `lista-invitati-${suffix}.pdf`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setNotice(`Download PDF avviato: lista-invitati-${suffix}.pdf`);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="bg-white rounded-xl shadow p-6 space-y-3">
                    <div className="flex flex-wrap justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">{labels.dashboardTitle}</h1>
                            <div className="mt-2 flex flex-wrap gap-6 text-sm">
                                <span>Totale Risposte: <b>{totaleRisposte}</b></span>
                                <span className="text-green-600">Partecipanti: <b>{risposteSi}</b></span>
                                <span className="text-red-600">Assenti: <b>{risposteNo}</b></span>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="text-sm text-red-600 hover:underline"
                        >
                            Logout
                        </button>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {notice && <p className="text-sm text-green-700">{notice}</p>}
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleDownloadPdf}
                        className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                        Scarica PDF
                    </button>
                    <button
                        onClick={() => setAdding(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded"
                    >
                        + Aggiungi partecipante
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cerca invitato
                    </label>
                    <input
                        type="search"
                        className="w-full border rounded p-2"
                        placeholder="Cerca per nome, partecipa, ospiti o messaggio"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {searchTerm && (
                        <p className="mt-2 text-xs text-gray-500">
                            Risultati: {partecipantiFiltrati.length} di {partecipanti.length}
                        </p>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow overflow-x-auto">
                    <table className="w-full text-sm text-center">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4">Nome</th>
                                <th className="p-4">Partecipa</th>
                                <th className="p-4">Ospiti</th>
                                <th className="p-4">Intolleranze / Preferenze Alimentari</th>
                                <th className="p-4">Messaggio</th>
                                <th className="p-4">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {partecipantiFiltrati.map(p => (
                                <tr key={p.id}>
                                    <td className="p-4 font-medium text-center">{p.name}</td>
                                    <td className="p-4">{p.partecipate ? "Sì" : "No"}</td>
                                    <td className="p-4">{p.guests ?? 0}</td>
                                    <td className="p-4 max-w-xs break-words text-center">
                                        {p.food_preferences || "-"}
                                    </td>
                                    <td className="p-4 max-w-md break-words text-center">
                                        {p.message || "-"}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                        <button
                                            onClick={() => {
                                                setEditing(p);
                                                setEditFoodMenuOpen(null);
                                            }}
                                            className="text-blue-600"
                                        >
                                            Modifica
                                        </button>
                                        <button
                                            onClick={() => setToDelete(p)}
                                            className="text-red-600 hover:underline"
                                        >
                                            Elimina
                                        </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {partecipantiFiltrati.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-6 text-center text-gray-500">
                                        Nessun invitato trovato.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {toDelete && (
                    <div
                        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in"
                        onClick={() => setToDelete(null)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center space-y-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-lg font-bold text-gray-900">
                                Conferma eliminazione
                            </h2>

                            <p className="text-gray-600">
                                Vuoi eliminare <b>{toDelete.name}</b>?
                                <br />
                                Questa azione è irreversibile.
                            </p>

                            <div className="flex justify-center gap-4 mt-4">
                                <button
                                    onClick={() => setToDelete(null)}
                                    className="px-4 py-2 rounded border"
                                >
                                    Annulla
                                </button>

                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                                >
                                    Elimina
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {editing && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
                        <div className="bg-white p-6 rounded-xl space-y-4 w-full max-w-md">
                            <h2 className="font-bold">Modifica</h2>
                            <label className="block text-sm font-medium text-gray-700">
                                Nome
                                <input
                                    className="mt-1 w-full border p-2 rounded"
                                    value={editing.name}
                                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                                />
                            </label>

                            <label className="block text-sm font-medium text-gray-700">
                                Partecipa
                                <select
                                    className="mt-1 w-full border p-2 rounded"
                                    value={String(editing.partecipate)}
                                    onChange={e =>
                                        setEditing({
                                            ...editing,
                                            partecipa: e.target.value === "true",
                                            partecipate: e.target.value === "true",
                                            guests: e.target.value === "true" ? normalizeGuestCount(editing.guests) : 0,
                                            food_preferences: e.target.value === "true" ? editing.food_preferences || "" : "",
                                        })
                                    }
                                >
                                    <option value="true">Partecipa</option>
                                    <option value="false">Non partecipa</option>
                                </select>
                            </label>

                            <label className="block text-sm font-medium text-gray-700">
                                Numero ospiti
                                <input
                                    type="number"
                                    min={editing.partecipate ? 1 : 0}
                                    disabled={!editing.partecipate}
                                    className="mt-1 w-full border p-2 rounded disabled:bg-gray-100"
                                    value={editing.guests}
                                    onChange={e => {
                                        if (e.target.value === "") {
                                            setEditFoodMenuOpen(null);
                                            setEditing({ ...editing, guests: "" });
                                            return;
                                        }

                                        const guests = editing.partecipate ? normalizeGuestCount(e.target.value) : 0;
                                        setEditFoodMenuOpen(null);
                                        setEditing({
                                            ...editing,
                                            guests,
                                            food_preferences: editing.partecipate
                                                ? serializeGuestFoodPreferences(
                                                    parseGuestFoodPreferences(editing.food_preferences, editing.guests),
                                                    guests
                                                )
                                                : "",
                                        });
                                    }}
                                    onBlur={() => {
                                        const guests = editing.partecipate ? normalizeGuestCount(editing.guests) : 0;
                                        setEditing({
                                            ...editing,
                                            guests,
                                            food_preferences: editing.partecipate
                                                ? serializeGuestFoodPreferences(
                                                    parseGuestFoodPreferences(editing.food_preferences, editing.guests),
                                                    guests
                                                )
                                                : "",
                                        });
                                    }}
                                />
                            </label>

                            <div className="block text-sm font-medium text-gray-700">
                                Intolleranze / Preferenze Alimentari
                                <div className="mt-1 space-y-2">
                                    {parseGuestFoodPreferences(editing.food_preferences, editing.guests).map((guestPreferences, guestIndex) => (
                                        <div key={guestIndex} className="relative">
                                            {Number(editing.guests) > 1 && (
                                                <p className="mb-1 text-xs font-normal text-gray-500">Persona {guestIndex + 1}</p>
                                            )}
                                            <button
                                                type="button"
                                                className="flex w-full items-center justify-between gap-3 rounded border p-2 text-left font-normal disabled:bg-gray-100 disabled:text-gray-500"
                                                disabled={!editing.partecipate}
                                                onClick={() => setEditFoodMenuOpen(prev => (prev === guestIndex ? null : guestIndex))}
                                                aria-expanded={editFoodMenuOpen === guestIndex}
                                            >
                                                <span className={guestPreferences.length ? "" : "text-gray-400"}>
                                                    {guestPreferences.length ? guestPreferences.join(", ") : "Seleziona intolleranze o preferenze alimentari"}
                                                </span>
                                                <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-gray-500" />
                                            </button>

                                            {editFoodMenuOpen === guestIndex && editing.partecipate && (
                                                <div className="absolute z-20 mt-2 max-h-44 w-full overflow-y-auto rounded border bg-white p-3 shadow-lg">
                                                    <div className="space-y-2">
                                                        {foodPreferenceOptions.map(option => (
                                                            <label key={option} className="flex items-center gap-2 text-sm font-normal text-gray-700">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={guestPreferences.includes(option)}
                                                                    onChange={() =>
                                                                        setEditing({
                                                                            ...editing,
                                                                            food_preferences: toggleGuestFoodPreference(editing.food_preferences, editing.guests, guestIndex, option),
                                                                        })
                                                                    }
                                                                />
                                                                {option}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <label className="block text-sm font-medium text-gray-700">
                                Messaggio
                                <textarea
                                    className="mt-1 w-full border p-2 rounded"
                                    value={editing.message || ""}
                                    onChange={e => setEditing({ ...editing, message: e.target.value })}
                                />
                            </label>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setEditing(null)}>Annulla</button>
                                <button onClick={handleSaveEdit} className="bg-blue-600 text-white px-4 py-2 rounded">
                                    Salva
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {adding && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4">

                            <h2 className="text-lg font-bold">Nuovo partecipante</h2>

                            <input
                                className="w-full border p-2 rounded"
                                placeholder="Nome"
                                value={newParticipant.name}
                                onChange={e =>
                                    setNewParticipant({ ...newParticipant, name: e.target.value })
                                }
                            />

                            <select
                                className="w-full border p-2 rounded"
                                value={String(newParticipant.partecipate)}
                                onChange={e =>
                                    setNewParticipant({
                                        ...newParticipant,
                                        partecipate: e.target.value === "true",
                                        guests: e.target.value === "true" ? normalizeGuestCount(newParticipant.guests) : 0,
                                        food_preferences: e.target.value === "true" ? newParticipant.food_preferences : "",
                                    })
                                }
                            >
                                <option value="true">Partecipa</option>
                                <option value="false">Non partecipa</option>
                            </select>

                            <input
                                type="number"
                                min={newParticipant.partecipate ? 1 : 0}
                                disabled={!newParticipant.partecipate}
                                className="w-full border p-2 rounded"
                                value={newParticipant.guests}
                                onChange={e =>
                                    {
                                        if (e.target.value === "") {
                                            setAddFoodMenuOpen(null);
                                            setNewParticipant({ ...newParticipant, guests: "" });
                                            return;
                                        }

                                        const guests = newParticipant.partecipate
                                            ? normalizeGuestCount(e.target.value)
                                            : 0;
                                        setAddFoodMenuOpen(null);
                                        setNewParticipant({
                                            ...newParticipant,
                                            guests,
                                            food_preferences: newParticipant.partecipate
                                                ? serializeGuestFoodPreferences(
                                                    parseGuestFoodPreferences(newParticipant.food_preferences, newParticipant.guests),
                                                    guests
                                                )
                                            : "",
                                        });
                                    }
                                }
                                onBlur={() => {
                                    const guests = newParticipant.partecipate ? normalizeGuestCount(newParticipant.guests) : 0;
                                    setNewParticipant({
                                        ...newParticipant,
                                        guests,
                                        food_preferences: newParticipant.partecipate
                                            ? serializeGuestFoodPreferences(
                                                parseGuestFoodPreferences(newParticipant.food_preferences, newParticipant.guests),
                                                guests
                                            )
                                            : "",
                                    });
                                }}
                            />

                            <div className="space-y-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Intolleranze / Preferenze Alimentari
                                </label>
                                {parseGuestFoodPreferences(newParticipant.food_preferences, newParticipant.guests).map((guestPreferences, guestIndex) => (
                                    <div key={guestIndex} className="relative">
                                        {Number(newParticipant.guests) > 1 && (
                                            <p className="mb-1 text-xs text-gray-500">Persona {guestIndex + 1}</p>
                                        )}
                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-between gap-3 rounded border p-2 text-left disabled:bg-gray-100 disabled:text-gray-500"
                                            disabled={!newParticipant.partecipate}
                                            onClick={() => setAddFoodMenuOpen(prev => (prev === guestIndex ? null : guestIndex))}
                                            aria-expanded={addFoodMenuOpen === guestIndex}
                                        >
                                            <span className={guestPreferences.length ? "" : "text-gray-400"}>
                                                {guestPreferences.length ? guestPreferences.join(", ") : "Seleziona intolleranze o preferenze alimentari"}
                                            </span>
                                            <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-gray-500" />
                                        </button>

                                        {addFoodMenuOpen === guestIndex && newParticipant.partecipate && (
                                            <div className="absolute z-20 mt-2 max-h-44 w-full overflow-y-auto rounded border bg-white p-3 shadow-lg">
                                                <div className="space-y-2">
                                                    {foodPreferenceOptions.map(option => (
                                                        <label key={option} className="flex items-center gap-2 text-sm font-normal text-gray-700">
                                                            <input
                                                                type="checkbox"
                                                                checked={guestPreferences.includes(option)}
                                                                onChange={() =>
                                                                    setNewParticipant({
                                                                        ...newParticipant,
                                                                        food_preferences: toggleGuestFoodPreference(newParticipant.food_preferences, newParticipant.guests, guestIndex, option),
                                                                    })
                                                                }
                                                            />
                                                            {option}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <textarea
                                className="w-full border p-2 rounded"
                                placeholder="Messaggio"
                                value={newParticipant.message}
                                onChange={e =>
                                    setNewParticipant({
                                        ...newParticipant,
                                        message: e.target.value,
                                    })
                                }
                            />

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        setAdding(false);
                                        setAddFoodMenuOpen(null);
                                    }}
                                >
                                    Annulla
                                </button>
                                <button
                                    className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60"
                                    onClick={handleAdd}
                                    disabled={addingParticipant}
                                >
                                    {addingParticipant ? "Aggiungo..." : "Aggiungi"}
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
