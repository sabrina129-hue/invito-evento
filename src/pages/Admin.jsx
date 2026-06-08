import { useEffect, useState } from "react";

const emptyParticipant = {
    name: "",
    partecipate: true,
    guests: 1,
    message: "",
};

export default function Admin({ labels, onLogout }) {
    const [partecipanti, setPartecipanti] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [adding, setAdding] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [error, setError] = useState("");
    const [newParticipant, setNewParticipant] = useState(emptyParticipant);

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
        const res = await fetch("/api/rsvps", {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(editing),
        });
        const result = await res.json();

        if (!res.ok) {
            setError("Errore durante il salvataggio.");
            return;
        }

        setPartecipanti(prev =>
            prev.map(p => (p.id === editing.id ? result.data : p))
        );
        setEditing(null);
    };

    const handleAdd = async () => {
        const res = await fetch("/api/rsvps", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(newParticipant),
        });
        const result = await res.json();

        if (!res.ok) {
            setError("Errore durante l'inserimento.");
            return;
        }

        setPartecipanti(prev => [result.data, ...prev]);
        setNewParticipant(emptyParticipant);
        setAdding(false);
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
                </div>

                <div className="bg-white rounded-xl shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4">Nome</th>
                                <th className="p-4">Stato</th>
                                <th className="p-4">Ospiti</th>
                                <th className="p-4">Messaggio</th>
                                <th className="p-4">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {partecipanti.map(p => (
                                <tr key={p.id}>
                                    <td className="p-4 font-medium">{p.name}</td>
                                    <td className="p-4">{p.partecipate ? "Sì" : "No"}</td>
                                    <td className="p-4">{p.guests ?? 0}</td>
                                    <td className="p-4 max-w-md break-words">
                                        {p.message || "-"}
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        <button onClick={() => setEditing(p)} className="text-blue-600">
                                            Modifica
                                        </button>
                                        <button
                                            onClick={() => setToDelete(p)}
                                            className="text-red-600 hover:underline"
                                        >
                                            Elimina
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <button
                    onClick={() => setAdding(true)}
                    className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
                >
                    + Aggiungi partecipante
                </button>

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
                        <div className="bg-white p-6 rounded-xl space-y-4">
                            <h2 className="font-bold">Modifica</h2>
                            <input
                                className="w-full border p-2"
                                value={editing.name}
                                onChange={e => setEditing({ ...editing, name: e.target.value })}
                            />
                            <select
                                className="w-full border p-2 rounded"
                                value={String(editing.partecipate)}
                                onChange={e =>
                                    setEditing({
                                        ...editing,
                                        partecipate: e.target.value === "true",
                                        guests: e.target.value === "true" ? Math.max(1, editing.guests || 1) : 0,
                                    })
                                }
                            >
                                <option value="true">Partecipa</option>
                                <option value="false">Non partecipa</option>
                            </select>

                            <input
                                type="number"
                                min={editing.partecipate ? 1 : 0}
                                disabled={!editing.partecipate}
                                className="w-full border p-2"
                                value={editing.guests}
                                onChange={e => setEditing({ ...editing, guests: editing.partecipate ? Math.max(1, Number(e.target.value)) : 0 })}
                            />
                            <textarea
                                className="w-full border p-2"
                                value={editing.message || ""}
                                onChange={e => setEditing({ ...editing, message: e.target.value })}
                            />
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
                                        guests: e.target.value === "true" ? Math.max(1, newParticipant.guests || 1) : 0,
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
                                    setNewParticipant({
                                        ...newParticipant,
                                        guests: newParticipant.partecipate
                                            ? Math.max(1, Number(e.target.value))
                                            : 0,
                                    })
                                }
                            />

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
                                <button onClick={() => setAdding(false)}>
                                    Annulla
                                </button>
                                <button
                                    className="bg-green-600 text-white px-4 py-2 rounded"
                                    onClick={handleAdd}
                                >
                                    Aggiungi
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
