import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, LogOut, Pencil, Plus, Trash2, Utensils } from "lucide-react";
import { Link } from "react-router-dom";

import { getParticipantGuestNames } from "../lib/guestNames.js";
import { notifyRsvpDataChanged } from "../lib/rsvpSync.js";
import "./Admin.css";

const emptyParticipant = {
    name: "",
    partecipate: true,
    guests: 1,
    guest_names: [],
    food_preferences: "",
    message: "",
};

const nameRequiredMessage = "Il nome è obbligatorio";
const noFoodPreferenceOption = "Nessuna intolleranza/preferenza alimentare";

const isNoFoodPreferenceOption = option =>
    String(option || "").trim().toLowerCase() === noFoodPreferenceOption.toLowerCase();

const isNameRequiredError = error =>
    String(error || "").trim() === nameRequiredMessage;

const normalizeFoodPreferenceItems = items => {
    const normalized = (Array.isArray(items) ? items : [])
        .map(item => String(item || "").trim())
        .filter(Boolean)
        .map(item => (isNoFoodPreferenceOption(item) ? noFoodPreferenceOption : item));

    return normalized.some(isNoFoodPreferenceOption)
        ? [noFoodPreferenceOption]
        : normalized;
};

const foodPreferencesToList = value =>
    String(value || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => (isNoFoodPreferenceOption(item) ? noFoodPreferenceOption : item));

const normalizeGuestCount = guests => Math.max(1, Number(guests) || 1);

const resizeGuestFoodPreferences = (groups, guests) =>
    Array.from({ length: normalizeGuestCount(guests) }, (_, index) =>
        Array.isArray(groups[index]) ? normalizeFoodPreferenceItems(groups[index]) : []
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
                ? normalizeFoodPreferenceItems(values.split(","))
                : [];
        });

        return resizeGuestFoodPreferences(groups, guestCount);
    }

    return resizeGuestFoodPreferences([foodPreferencesToList(textValue)], guestCount);
};

const serializeGuestFoodPreferences = (groups, guests) => {
    const resized = resizeGuestFoodPreferences(groups, guests);

    const normalized = resized.map(normalizeFoodPreferenceItems);

    if (normalized.length <= 1) {
        return normalized[0].join(", ");
    }

    return normalized
        .map((items, index) => `Persona ${index + 1}: ${items.length ? items.join(", ") : "-"}`)
        .join(" | ");
};

const toggleGuestFoodPreference = (value, guests, guestIndex, option) => {
    const groups = parseGuestFoodPreferences(value, guests);
    const selected = groups[guestIndex] || [];

    if (selected.includes(option)) {
        groups[guestIndex] = selected.filter(item => item !== option);
    } else if (isNoFoodPreferenceOption(option)) {
        groups[guestIndex] = [noFoodPreferenceOption];
    } else {
        groups[guestIndex] = [
            ...selected.filter(item => !isNoFoodPreferenceOption(item)),
            option,
        ];
    }

    return serializeGuestFoodPreferences(groups, guests);
};

const getParticipantPersonName = (participant, index) => {
    const guestNames = getParticipantGuestNames(participant);

    if (index === 0) {
        return participant.name || guestNames[index] || "Invitato senza nome";
    }

    if (guestNames[index]) {
        return guestNames[index];
    }

    return `Persona ${index + 1}`;
};

const getParticipantPeople = participant => {
    const guestCount = participant.partecipate ? normalizeGuestCount(participant.guests) : 0;
    const preferences = parseGuestFoodPreferences(participant.food_preferences, guestCount || 1);

    return Array.from({ length: guestCount }, (_, index) => ({
        id: `${participant.id || participant.name}-${index}`,
        name: getParticipantPersonName(participant, index),
        invitationName: participant.name || "Invitato senza nome",
        preferences: preferences[index] || [],
    }));
};

const getParticipantGuestNameValues = (participant, guests = participant.guests) => {
    const guestCount = normalizeGuestCount(guests);
    const guestNames = getParticipantGuestNames(participant);

    return Array.from({ length: guestCount }, (_, index) => {
        if (index === 0) {
            return String(participant.name || guestNames[index] || "").trim();
        }

        return String(guestNames[index] || "").trim();
    });
};

const getParticipantGuestNameValue = (participant, guestIndex) =>
    getParticipantGuestNameValues(participant, participant.guests)[guestIndex] || "";

const getMissingGuestNameIndexes = (participant, guests = participant.guests) => {
    if (!participant.partecipate) {
        return [];
    }

    const guestCount = normalizeGuestCount(guests);
    const guestNames = getParticipantGuestNameValues(participant, guestCount);

    return guestNames
        .map((name, index) => ({ index, name }))
        .filter(({ index, name }) => index > 0 && !String(name || "").trim())
        .map(({ index }) => index);
};

const updateParticipantGuestName = (participant, guestIndex, value) => {
    const guestNames = getParticipantGuestNameValues(participant, participant.guests);

    guestNames[guestIndex] = value;

    return {
        ...participant,
        guest_names: guestNames,
    };
};

const removeParticipantGuest = (participant, guestIndex) => {
    const currentGuestCount = normalizeGuestCount(participant.guests);

    if (guestIndex <= 0 || guestIndex >= currentGuestCount) {
        return participant;
    }

    const nextGuestCount = Math.max(1, currentGuestCount - 1);
    const preferenceGroups = parseGuestFoodPreferences(participant.food_preferences, currentGuestCount)
        .filter((_, index) => index !== guestIndex);
    const guestNames = getParticipantGuestNameValues(participant, currentGuestCount)
        .filter((_, index) => index !== guestIndex);

    return {
        ...participant,
        guests: nextGuestCount,
        food_preferences: serializeGuestFoodPreferences(preferenceGroups, nextGuestCount),
        guest_names: guestNames,
    };
};

const countFoodPreferencePeople = (participant, preference) => {
    if (!preference || !participant.partecipate) {
        return 0;
    }

    return getParticipantPeople(participant)
        .filter(person => person.preferences.includes(preference))
        .length;
};

const getFoodPreferenceMatches = (participants, preference) =>
    preference
        ? participants.flatMap(participant =>
            getParticipantPeople(participant)
                .filter(person => person.preferences.includes(preference))
                .map(person => ({
                    ...person,
                    participantId: participant.id,
                }))
        )
        : [];

const formatParticipantFoodPreferences = participant => {
    const people = getParticipantPeople(participant);

    if (!people.length) {
        return participant.food_preferences || "-";
    }

    const rows = people
        .filter(person => person.preferences.length)
        .map(person => `${person.name}: ${person.preferences.join(", ")}`);

    return rows.length ? rows.join(" | ") : "-";
};

const formatParticipantGuestNames = participant => {
    if (!participant.partecipate) {
        return "-";
    }

    const guestCount = normalizeGuestCount(participant.guests);
    const guestNames = getParticipantGuestNames(participant);
    const names = Array.from({ length: guestCount }, (_, index) => {
        if (index === 0) {
            return String(guestNames[index] || participant.name || "").trim();
        }

        return String(guestNames[index] || "").trim();
    }).filter(Boolean);

    return names.length ? names.join(", ") : "-";
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
        { label: "Nome", x: 76, width: 130 },
        { label: "Partecipa", x: 212, width: 84 },
        { label: "Ospiti", x: 302, width: 146 },
        { label: "Alimentazione", x: 454, width: 142 },
        { label: "Messaggio", x: 602, width: 198 },
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
        ...(isFiltered ? [text(`Risultati filtrati: ${participants.length}`, margin + 420, pageHeight - 104, 10, "F2")] : []),
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
        const foodLines = wrapPdfText(formatParticipantFoodPreferences(participant), 22);
        const messageLines = wrapPdfText(participant.message || "-", 30);
        const nameLines = wrapPdfText(participant.name || "-", 19);
        const guestLines = wrapPdfText(formatParticipantGuestNames(participant), 21);
        const rowLines = Math.max(foodLines.length, messageLines.length, nameLines.length, guestLines.length, 1);
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
        guestLines.forEach((guestLine, lineIndex) => {
            currentPage.push(text(guestLine, columns[3].x, rowTop - 18 - lineIndex * lineHeight, 9));
        });
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
    const [editFormError, setEditFormError] = useState("");
    const [addFormError, setAddFormError] = useState("");
    const [editGuestNameErrors, setEditGuestNameErrors] = useState({});
    const [addGuestNameErrors, setAddGuestNameErrors] = useState({});
    const [search, setSearch] = useState("");
    const [foodPreferenceFilter, setFoodPreferenceFilter] = useState("");
    const [newParticipant, setNewParticipant] = useState(emptyParticipant);
    const [addFoodMenuOpen, setAddFoodMenuOpen] = useState(null);
    const [editFoodMenuOpen, setEditFoodMenuOpen] = useState(null);
    const editNameInputRef = useRef(null);
    const addNameInputRef = useRef(null);

    const token = localStorage.getItem("adminToken");

    const focusNameField = inputRef => {
        window.requestAnimationFrame(() => {
            inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
            inputRef.current?.focus();
        });
    };

    const focusGuestNameField = (mode, guestIndex) => {
        window.requestAnimationFrame(() => {
            const input = document.querySelector(`[data-${mode}-guest-name-index="${guestIndex}"]`);

            input?.scrollIntoView({ block: "center", behavior: "smooth" });
            input?.focus();
        });
    };

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
        notifyRsvpDataChanged({ action: "delete", id: toDelete.id });
        setToDelete(null);
    };

    const handleSaveEdit = async () => {
        setError("");
        setEditFormError("");
        setEditGuestNameErrors({});

        if (!String(editing.name || "").trim()) {
            setEditFormError(nameRequiredMessage);
            focusNameField(editNameInputRef);
            return;
        }

        const guestCount = editing.partecipate ? normalizeGuestCount(editing.guests) : 0;
        const missingGuestNameIndexes = getMissingGuestNameIndexes(
            { ...editing, name: String(editing.name || "").trim() },
            guestCount
        );

        if (missingGuestNameIndexes.length) {
            setEditGuestNameErrors(Object.fromEntries(
                missingGuestNameIndexes.map(index => [index, nameRequiredMessage])
            ));
            focusGuestNameField("edit", missingGuestNameIndexes[0]);
            return;
        }

        const normalizedEditing = {
            ...editing,
            name: String(editing.name || "").trim(),
            guests: guestCount,
            guest_names: editing.partecipate
                ? getParticipantGuestNameValues({ ...editing, name: String(editing.name || "").trim() }, guestCount)
                : [],
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
            setEditFormError(result.error || result.details || "Errore durante il salvataggio.");
            return;
        }

        setPartecipanti(prev =>
            prev.map(p => (p.id === normalizedEditing.id ? result.data : p))
        );
        notifyRsvpDataChanged({ action: "update", participant: result.data });
        setEditing(null);
        setEditFoodMenuOpen(null);
        setEditFormError("");
        setEditGuestNameErrors({});
    };

    const handleAdd = async () => {
        if (addingParticipant) return;

        setError("");
        setAddFormError("");
        setAddGuestNameErrors({});

        if (!String(newParticipant.name || "").trim()) {
            setAddFormError(nameRequiredMessage);
            focusNameField(addNameInputRef);
            return;
        }

        const guestCount = newParticipant.partecipate ? normalizeGuestCount(newParticipant.guests) : 0;
        const missingGuestNameIndexes = getMissingGuestNameIndexes(
            { ...newParticipant, name: String(newParticipant.name || "").trim() },
            guestCount
        );

        if (missingGuestNameIndexes.length) {
            setAddGuestNameErrors(Object.fromEntries(
                missingGuestNameIndexes.map(index => [index, nameRequiredMessage])
            ));
            focusGuestNameField("add", missingGuestNameIndexes[0]);
            return;
        }

        setAddingParticipant(true);

        try {
            const normalizedParticipant = {
                ...newParticipant,
                name: String(newParticipant.name || "").trim(),
                guests: guestCount,
                guest_names: newParticipant.partecipate
                    ? getParticipantGuestNameValues({ ...newParticipant, name: String(newParticipant.name || "").trim() }, guestCount)
                    : [],
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
                setAddFormError(details || "Errore durante l'inserimento.");
                return;
            }

            setPartecipanti(prev => [result.data, ...prev]);
            notifyRsvpDataChanged({ action: "create", participant: result.data });
            setNewParticipant(emptyParticipant);
            setAddFoodMenuOpen(null);
            setAddFormError("");
            setAddGuestNameErrors({});
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
    const partecipantiFiltratiPerRicerca = searchTerm
        ? partecipanti.filter(p => {
            if (statusFilter !== null) {
                return Boolean(p.partecipate) === statusFilter;
            }

            const stato = p.partecipate ? "partecipa si presente" : "non partecipa no assente";
            return [
                p.name,
                ...getParticipantPeople(p).map(person => person.name),
                stato,
                String(p.guests ?? 0),
                formatParticipantFoodPreferences(p),
                p.message,
            ]
                .join(" ")
                .toLowerCase()
                .includes(searchTerm);
        })
        : partecipanti;
    const partecipantiFiltrati = foodPreferenceFilter
        ? partecipantiFiltratiPerRicerca.filter(p => countFoodPreferencePeople(p, foodPreferenceFilter) > 0)
        : partecipantiFiltratiPerRicerca;
    const personeConPreferenza = getFoodPreferenceMatches(partecipantiFiltrati, foodPreferenceFilter);
    const totalePreferenzaSelezionata = personeConPreferenza.length;
    const hasActiveFilters = Boolean(searchTerm || foodPreferenceFilter);
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
            isFiltered: hasActiveFilters,
        });
        const pdfBytes = new TextEncoder().encode(pdf);
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const suffix = hasActiveFilters ? "filtrata" : "completa";

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
        <main className="admin-page">
            <div className="admin-shell">
                <header className="admin-header">
                    <div>
                        <p>Dashboard Organizzatore</p>
                        <h1>{labels.dashboardTitle}</h1>
                    </div>

                    <div className="admin-header-actions">
                        <button type="button" onClick={handleDownloadPdf} className="admin-outline-action">
                            <Download size={17} aria-hidden="true" />
                            Scarica PDF
                        </button>
                        <Link to="/admin/tavoli" className="admin-outline-action">
                            <Utensils size={17} aria-hidden="true" />
                            Organizza tavoli
                        </Link>
                        <button type="button" onClick={handleLogout} className="admin-danger-action">
                            <LogOut size={17} aria-hidden="true" />
                            Logout
                        </button>
                    </div>
                </header>

                {error && <p className="admin-error">{error}</p>}
                {notice && <p className="admin-notice">{notice}</p>}

                <section className="admin-summary" aria-label="Riepilogo invitati">
                    <div>
                        <span>Totale risposte</span>
                        <strong>{totaleRisposte}</strong>
                    </div>
                    <div>
                        <span>Partecipanti</span>
                        <strong>{risposteSi}</strong>
                    </div>
                    <div>
                        <span>Assenti</span>
                        <strong>{risposteNo}</strong>
                    </div>
                </section>

                <section className="admin-toolbar" aria-label="Filtri lista invitati">
                    <div className="admin-filter-field admin-filter-field-wide">
                        <label>
                            Cerca invitato
                        </label>
                        <input
                            type="search"
                            placeholder="Cerca per nome, partecipa, ospiti o messaggio"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="admin-filter-field">
                        <label>
                            Filtra per intolleranza o preferenza alimentare
                        </label>
                        <div className="admin-select-row">
                            <select
                                value={foodPreferenceFilter}
                                onChange={e => setFoodPreferenceFilter(e.target.value)}
                            >
                                <option value="">Tutte le preferenze</option>
                                {foodPreferenceOptions.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                            {foodPreferenceFilter && (
                                <button
                                    type="button"
                                    className="admin-clear-filter"
                                    onClick={() => setFoodPreferenceFilter("")}
                                    aria-label="Rimuovi filtro preferenza alimentare"
                                    title="Rimuovi filtro"
                                >
                                    X
                                </button>
                            )}
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="admin-filter-summary">
                            {!foodPreferenceFilter && (
                                <p>
                                    Risultati: <b>{partecipantiFiltrati.length}</b> di <b>{partecipanti.length}</b>
                                </p>
                            )}
                            {foodPreferenceFilter && (
                                <p>
                                    Totale persone con <b>{foodPreferenceFilter}</b>: <b>{totalePreferenzaSelezionata}</b>
                                </p>
                            )}
                            {foodPreferenceFilter && personeConPreferenza.length > 0 && (
                                <p>
                                    Persone: <b>{personeConPreferenza.map(person => person.name).join(", ")}</b>
                                </p>
                            )}
                        </div>
                    )}
                </section>

                <section className="admin-table-card" aria-label="Lista invitati">
                    <div className="admin-list-header">
                        <div>
                            <h2>Lista invitati</h2>
                            <p>{partecipantiFiltrati.length} invitati visualizzati</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setAddFormError("");
                                setAddGuestNameErrors({});
                                setAdding(true);
                            }}
                            className="admin-primary-action"
                        >
                            <Plus size={17} aria-hidden="true" />
                            Aggiungi invitato
                        </button>
                    </div>
                    <div className="admin-table-scroll">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Partecipa</th>
                                    <th>Ospiti</th>
                                    <th>Intolleranze / Preferenze Alimentari</th>
                                    <th>Messaggio</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partecipantiFiltrati.map(p => (
                                    <tr key={p.id}>
                                        <td className="admin-name-cell">{p.name}</td>
                                        <td>
                                            <span className={`admin-status-badge ${p.partecipate ? "is-yes" : "is-no"}`}>
                                                {p.partecipate ? "Sì" : "No"}
                                            </span>
                                        </td>
                                        <td className="admin-text-cell">
                                            {formatParticipantGuestNames(p)}
                                        </td>
                                        <td className="admin-text-cell">
                                            {formatParticipantFoodPreferences(p)}
                                        </td>
                                        <td className="admin-message-cell">
                                            {p.message || "-"}
                                        </td>
                                        <td>
                                            <div className="admin-row-actions">
                                            <button
                                                type="button"
                                            onClick={() => {
                                                setEditFormError("");
                                                setEditGuestNameErrors({});
                                                setEditing(p);
                                                setEditFoodMenuOpen(null);
                                            }}
                                                className="admin-table-action"
                                            >
                                                <Pencil size={15} aria-hidden="true" />
                                                Modifica
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setToDelete(p)}
                                                className="admin-table-action is-danger"
                                            >
                                                <Trash2 size={15} aria-hidden="true" />
                                                Elimina
                                            </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {partecipantiFiltrati.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="admin-empty-row">
                                            Nessun invitato trovato.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {toDelete && (
                    <div
                        className="admin-modal-overlay"
                        onClick={() => setToDelete(null)}
                    >
                        <div
                            className="admin-modal admin-modal-small admin-modal-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2>
                                Conferma eliminazione
                            </h2>

                            <p>
                                Vuoi eliminare <b>{toDelete.name}</b>?
                                <br />
                                Questa azione è irreversibile.
                            </p>

                            <div className="admin-modal-actions is-centered">
                                <button
                                    onClick={() => setToDelete(null)}
                                    type="button"
                                    className="admin-outline-action"
                                >
                                    Annulla
                                </button>

                                <button
                                    onClick={handleDelete}
                                    type="button"
                                    className="admin-danger-action"
                                >
                                    <Trash2 size={16} aria-hidden="true" />
                                    Elimina
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {editing && (
                    <div className="admin-modal-overlay">
                        <div className="admin-modal">
                            <h2>Modifica invitato</h2>
                            {editFormError && !isNameRequiredError(editFormError) && (
                                <p className="admin-form-error">
                                    {editFormError}
                                </p>
                            )}
                            <label className="admin-form-field">
                                <span>Nome</span>
                                <input
                                    ref={editNameInputRef}
                                    className={`admin-input ${isNameRequiredError(editFormError) ? "is-invalid" : ""}`}
                                    value={editing.name}
                                    aria-invalid={isNameRequiredError(editFormError)}
                                    onChange={e => {
                                        setEditFormError("");
                                        setEditing({ ...editing, name: e.target.value });
                                    }}
                                />
                                {isNameRequiredError(editFormError) && (
                                    <small className="admin-field-error" role="alert">{editFormError}</small>
                                )}
                            </label>

                            <label className="admin-form-field">
                                <span>Partecipa</span>
                                <select
                                    className="admin-select"
                                    value={String(editing.partecipate)}
                                    onChange={e => {
                                        setEditGuestNameErrors({});
                                        setEditing({
                                            ...editing,
                                            partecipa: e.target.value === "true",
                                            partecipate: e.target.value === "true",
                                            guests: e.target.value === "true" ? normalizeGuestCount(editing.guests) : 0,
                                            food_preferences: e.target.value === "true" ? editing.food_preferences || "" : "",
                                        });
                                    }}
                                >
                                    <option value="true">Partecipa</option>
                                    <option value="false">Non partecipa</option>
                                </select>
                            </label>

                            <label className="admin-form-field">
                                <span>Numero ospiti</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    disabled={!editing.partecipate}
                                    className="admin-input"
                                    value={editing.guests}
                                    onChange={e => {
                                        const guests = e.target.value.replace(/\D/g, "");
                                        setEditFoodMenuOpen(null);
                                        setEditGuestNameErrors({});
                                        setEditing({ ...editing, guests });
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

                            <div className="admin-form-field">
                                <span>Intolleranze / Preferenze Alimentari</span>
                                <div className="admin-food-list">
                                    {parseGuestFoodPreferences(editing.food_preferences, editing.guests).map((guestPreferences, guestIndex) => (
                                        <div key={guestIndex} className="admin-food-picker">
                                            {Number(editing.guests) > 1 && (
                                                <div className="admin-person-row">
                                                    {guestIndex > 0 ? (
                                                        <label className="admin-guest-name-field">
                                                            <span>Ospite {guestIndex}</span>
                                                                <input
                                                                    data-edit-guest-name-index={guestIndex}
                                                                    className={`admin-input ${editGuestNameErrors[guestIndex] ? "is-invalid" : ""}`}
                                                                    value={getParticipantGuestNameValue(editing, guestIndex)}
                                                                    placeholder={`Persona ${guestIndex + 1}`}
                                                                    aria-invalid={Boolean(editGuestNameErrors[guestIndex])}
                                                                    onChange={event => {
                                                                        setEditFormError("");
                                                                        setEditGuestNameErrors(prev => {
                                                                            const nextErrors = { ...prev };

                                                                            delete nextErrors[guestIndex];
                                                                            return nextErrors;
                                                                        });
                                                                        setEditing(prev => updateParticipantGuestName(prev, guestIndex, event.target.value));
                                                                    }}
                                                                />
                                                                {editGuestNameErrors[guestIndex] && (
                                                                    <small className="admin-field-error" role="alert">
                                                                        {editGuestNameErrors[guestIndex]}
                                                                    </small>
                                                                )}
                                                            </label>
                                                    ) : (
                                                        <p>
                                                            {getParticipantPersonName(editing, guestIndex)}
                                                        </p>
                                                    )}
                                                    {guestIndex > 0 && (
                                                        <button
                                                            type="button"
                                                            className="admin-remove-guest-button"
                                                            onClick={() => {
                                                                setEditFoodMenuOpen(prev => {
                                                                    if (prev === guestIndex) return null;
                                                                    if (prev > guestIndex) return prev - 1;
                                                                    return prev;
                                                                });
                                                                setEditGuestNameErrors({});
                                                                setEditing(prev => removeParticipantGuest(prev, guestIndex));
                                                            }}
                                                        >
                                                            Elimina ospite
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                className="admin-food-trigger"
                                                disabled={!editing.partecipate}
                                                onClick={() => setEditFoodMenuOpen(prev => (prev === guestIndex ? null : guestIndex))}
                                                aria-expanded={editFoodMenuOpen === guestIndex}
                                            >
                                                <span className={guestPreferences.length ? "" : "admin-placeholder"}>
                                                    {guestPreferences.length ? guestPreferences.join(", ") : "Seleziona intolleranze o preferenze alimentari"}
                                                </span>
                                                <ChevronDown size={18} aria-hidden="true" />
                                            </button>

                                            {editFoodMenuOpen === guestIndex && editing.partecipate && (
                                                <div className="admin-food-menu">
                                                    <div>
                                                        {foodPreferenceOptions.map(option => (
                                                            <label key={option} className="admin-food-option">
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

                            <label className="admin-form-field">
                                <span>Messaggio</span>
                                <textarea
                                    className="admin-textarea"
                                    value={editing.message || ""}
                                    onChange={e => setEditing({ ...editing, message: e.target.value })}
                                />
                            </label>
                            <div className="admin-modal-actions">
                                <button type="button" className="admin-outline-action" onClick={() => {
                                    setEditing(null);
                                    setEditFormError("");
                                    setEditGuestNameErrors({});
                                }}>Annulla</button>
                                <button type="button" onClick={handleSaveEdit} className="admin-primary-action">
                                    Salva
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {adding && (
                    <div className="admin-modal-overlay">
                        <div className="admin-modal">

                            <h2>Nuovo partecipante</h2>
                            {addFormError && !isNameRequiredError(addFormError) && (
                                <p className="admin-form-error">
                                    {addFormError}
                                </p>
                            )}

                            <label className="admin-form-field">
                                <span>Nome</span>
                                <input
                                    ref={addNameInputRef}
                                    className={`admin-input ${isNameRequiredError(addFormError) ? "is-invalid" : ""}`}
                                    placeholder="Nome"
                                    value={newParticipant.name}
                                    aria-invalid={isNameRequiredError(addFormError)}
                                    onChange={e => {
                                        setAddFormError("");
                                        setNewParticipant({ ...newParticipant, name: e.target.value });
                                    }}
                                />
                                {isNameRequiredError(addFormError) && (
                                    <small className="admin-field-error" role="alert">{addFormError}</small>
                                )}
                            </label>

                            <select
                                className="admin-select"
                                value={String(newParticipant.partecipate)}
                                    onChange={e =>
                                    {
                                        setAddGuestNameErrors({});
                                        setNewParticipant({
                                            ...newParticipant,
                                            partecipate: e.target.value === "true",
                                            guests: e.target.value === "true" ? normalizeGuestCount(newParticipant.guests) : 0,
                                            food_preferences: e.target.value === "true" ? newParticipant.food_preferences : "",
                                        });
                                    }
                                }
                            >
                                <option value="true">Partecipa</option>
                                <option value="false">Non partecipa</option>
                            </select>

                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                disabled={!newParticipant.partecipate}
                                className="admin-input"
                                value={newParticipant.guests}
                                onChange={e =>
                                    {
                                        const guests = e.target.value.replace(/\D/g, "");
                                        setAddFoodMenuOpen(null);
                                        setAddGuestNameErrors({});
                                        setNewParticipant({ ...newParticipant, guests });
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

                            <div className="admin-form-field">
                                <label>
                                    Intolleranze / Preferenze Alimentari
                                </label>
                                {parseGuestFoodPreferences(newParticipant.food_preferences, newParticipant.guests).map((guestPreferences, guestIndex) => (
                                    <div key={guestIndex} className="admin-food-picker">
                                        {Number(newParticipant.guests) > 1 && (
                                            <div className="admin-person-row">
                                                {guestIndex > 0 ? (
                                                    <label className="admin-guest-name-field">
                                                        <span>Ospite {guestIndex}</span>
                                                        <input
                                                            data-add-guest-name-index={guestIndex}
                                                            className={`admin-input ${addGuestNameErrors[guestIndex] ? "is-invalid" : ""}`}
                                                            value={getParticipantGuestNameValue(newParticipant, guestIndex)}
                                                            placeholder={`Persona ${guestIndex + 1}`}
                                                            aria-invalid={Boolean(addGuestNameErrors[guestIndex])}
                                                            onChange={event => {
                                                                setAddFormError("");
                                                                setAddGuestNameErrors(prev => {
                                                                    const nextErrors = { ...prev };

                                                                    delete nextErrors[guestIndex];
                                                                    return nextErrors;
                                                                });
                                                                setNewParticipant(prev => updateParticipantGuestName(prev, guestIndex, event.target.value));
                                                            }}
                                                        />
                                                        {addGuestNameErrors[guestIndex] && (
                                                            <small className="admin-field-error" role="alert">
                                                                {addGuestNameErrors[guestIndex]}
                                                            </small>
                                                        )}
                                                    </label>
                                                ) : (
                                                    <p>
                                                        {getParticipantPersonName(newParticipant, guestIndex)}
                                                    </p>
                                                )}
                                                {guestIndex > 0 && (
                                                    <button
                                                        type="button"
                                                        className="admin-remove-guest-button"
                                                        onClick={() => {
                                                            setAddFormError("");
                                                            setAddFoodMenuOpen(prev => {
                                                                if (prev === guestIndex) return null;
                                                                if (prev > guestIndex) return prev - 1;
                                                                return prev;
                                                            });
                                                            setAddGuestNameErrors({});
                                                            setNewParticipant(prev => removeParticipantGuest(prev, guestIndex));
                                                        }}
                                                    >
                                                        Elimina ospite
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            className="admin-food-trigger"
                                            disabled={!newParticipant.partecipate}
                                            onClick={() => setAddFoodMenuOpen(prev => (prev === guestIndex ? null : guestIndex))}
                                            aria-expanded={addFoodMenuOpen === guestIndex}
                                        >
                                            <span className={guestPreferences.length ? "" : "admin-placeholder"}>
                                                {guestPreferences.length ? guestPreferences.join(", ") : "Seleziona intolleranze o preferenze alimentari"}
                                            </span>
                                            <ChevronDown size={18} aria-hidden="true" />
                                        </button>

                                        {addFoodMenuOpen === guestIndex && newParticipant.partecipate && (
                                            <div className="admin-food-menu">
                                                <div>
                                                    {foodPreferenceOptions.map(option => (
                                                        <label key={option} className="admin-food-option">
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
                                className="admin-textarea"
                                placeholder="Messaggio"
                                value={newParticipant.message}
                                onChange={e =>
                                    setNewParticipant({
                                        ...newParticipant,
                                        message: e.target.value,
                                    })
                                }
                            />

                            <div className="admin-modal-actions">
                                <button
                                    type="button"
                                    className="admin-outline-action"
                                    onClick={() => {
                                        setAdding(false);
                                        setAddFoodMenuOpen(null);
                                        setAddFormError("");
                                        setAddGuestNameErrors({});
                                    }}
                                >
                                    Annulla
                                </button>
                                <button
                                    type="button"
                                    className="admin-primary-action"
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
        </main>
    );
}
