import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { getParticipantGuestNames } from "../lib/guestNames.js";
import "./TablePlanner.css";

const tablePlannerStorageKey = "adminTablePlanner";

const familyColors = [
  { background: "#fef3c7", border: "#f59e0b", text: "#78350f" },
  { background: "#dbeafe", border: "#3b82f6", text: "#1e3a8a" },
  { background: "#dcfce7", border: "#22c55e", text: "#14532d" },
  { background: "#fce7f3", border: "#ec4899", text: "#831843" },
  { background: "#ede9fe", border: "#8b5cf6", text: "#4c1d95" },
  { background: "#cffafe", border: "#06b6d4", text: "#164e63" },
  { background: "#ffedd5", border: "#f97316", text: "#7c2d12" },
  { background: "#e0f2fe", border: "#0ea5e9", text: "#075985" },
  { background: "#f3e8ff", border: "#a855f7", text: "#581c87" },
  { background: "#ccfbf1", border: "#14b8a6", text: "#134e4a" },
];

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

const clampNumber = (value, min, max, fallback = min) => {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;

  return Math.min(max, Math.max(min, safeValue));
};

const hasTableCountValue = value => String(value ?? "").trim() !== "";

const normalizeTableSeats = (tableSeats, tableCount, defaultSeats) => {
  if (!hasTableCountValue(tableCount)) {
    return [];
  }

  const count = clampNumber(tableCount, 1, 80);
  const seats = clampNumber(defaultSeats, 1, 80, 8);

  return Array.from({ length: count }, (_, index) =>
    tableSeats?.[index] === undefined || tableSeats?.[index] === ""
      ? seats
      : clampNumber(tableSeats[index], 1, 80, seats)
  );
};

const normalizeTableNames = (tableNames, tableCount) => {
  if (!hasTableCountValue(tableCount)) {
    return [];
  }

  const count = clampNumber(tableCount, 1, 80);

  return Array.from({ length: count }, (_, index) => {
    const name = String(tableNames?.[index] || "").trim();
    return name || `Tavolo ${index + 1}`;
  });
};

const getDefaultTablePosition = index => ({
  x: 24 + (index % 4) * 210,
  y: 24 + Math.floor(index / 4) * 170,
});

const normalizeTablePositions = (tablePositions, tableCount) => {
  if (!hasTableCountValue(tableCount)) {
    return {};
  }

  const count = clampNumber(tableCount, 1, 80);

  return Array.from({ length: count }, (_, index) => {
    const tableId = String(index + 1);
    const position = tablePositions?.[tableId];
    const x = Number(position?.x);
    const y = Number(position?.y);

    return [
      tableId,
      Number.isFinite(x) && Number.isFinite(y)
        ? { x: Math.max(0, x), y: Math.max(0, y) }
        : getDefaultTablePosition(index),
    ];
  }).reduce((positions, [tableId, position]) => {
    positions[tableId] = position;
    return positions;
  }, {});
};

const normalizeTablePlanner = planner => {
  const tableCount = hasTableCountValue(planner?.tableCount)
    ? clampNumber(planner?.tableCount, 1, 80)
    : 1;
  const seatsPerTable = clampNumber(planner?.seatsPerTable, 1, 80, 8);

  return {
    tableCount,
    seatsPerTable,
    tableSeats: normalizeTableSeats(planner?.tableSeats, tableCount, seatsPerTable),
    tableNames: normalizeTableNames(planner?.tableNames, tableCount),
    tablePositions: normalizeTablePositions(planner?.tablePositions, tableCount),
    assignments: planner?.assignments && typeof planner.assignments === "object"
      ? planner.assignments
      : {},
    seatPositions: planner?.seatPositions && typeof planner.seatPositions === "object"
      ? planner.seatPositions
      : {},
  };
};

const loadTablePlanner = () => {
  try {
    return normalizeTablePlanner(JSON.parse(localStorage.getItem(tablePlannerStorageKey) || "{}"));
  } catch {
    return normalizeTablePlanner({});
  }
};

const buildTableAttendees = participants =>
  participants
    .filter(participant => participant.partecipate)
    .flatMap((participant, participantIndex) => {
      const guestCount = normalizeGuestCount(participant.guests);
      const preferenceGroups = parseGuestFoodPreferences(participant.food_preferences, guestCount);
      const guestNames = getParticipantGuestNames(participant);
      const familyId = String(participant.id ?? `${participant.name}-${participantIndex}`);
      const color = familyColors[participantIndex % familyColors.length];

      return Array.from({ length: guestCount }, (_, guestIndex) => {
        const foodPreferences = preferenceGroups[guestIndex] || [];
        const fallbackName = guestIndex === 0
          ? participant.name || "Invitato senza nome"
          : `Persona ${guestIndex + 1}`;
        const personName = guestNames[guestIndex] || fallbackName;

        return {
          id: `${familyId}-${guestIndex}`,
          familyId,
          familyName: participant.name || "Invitato senza nome",
          name: personName,
          seatLabel: guestIndex === 0 ? "Invito principale" : `Invito di ${participant.name || "invitato"}`,
          foodPreferences,
          foodDetails: foodPreferences.length ? foodPreferences.join(", ") : "Nessuna intolleranza indicata",
          color,
        };
      });
    });

const groupAttendeesByFamily = attendees =>
  Object.values(attendees.reduce((groups, attendee) => {
    groups[attendee.familyId] = [...(groups[attendee.familyId] || []), attendee];
    return groups;
  }, {}));

const distributeAttendees = (attendees, tableSeats) => {
  const assignments = {};
  const remainingSeats = [...tableSeats];

  groupAttendeesByFamily(attendees)
    .sort((a, b) => b.length - a.length)
    .forEach(group => {
    const tableIndex = remainingSeats.findIndex(seats => seats >= group.length);

    if (tableIndex >= 0) {
      group.forEach(attendee => {
        assignments[attendee.id] = String(tableIndex + 1);
      });
      remainingSeats[tableIndex] -= group.length;
    }
  });

  return assignments;
};

const sanitizeFamilyAssignments = (attendees, assignments, tableSeats) => {
  const nextAssignments = {};

  groupAttendeesByFamily(attendees).forEach(group => {
    const preferredTables = group.reduce((counts, attendee) => {
      const tableId = assignments?.[attendee.id];
      const tableIndex = Number(tableId) - 1;

      if (tableIndex >= 0 && tableSeats[tableIndex] !== undefined) {
        counts[tableId] = (counts[tableId] || 0) + 1;
      }

      return counts;
    }, {});
    const tableId = Object.entries(preferredTables)
      .sort((a, b) => b[1] - a[1])
      .map(([preferredTableId]) => preferredTableId)[0];

    if (tableId) {
      group.forEach(attendee => {
        nextAssignments[attendee.id] = tableId;
      });
    }
  });

  return nextAssignments;
};

const normalizeSeatPositions = (attendees, assignments, seatPositions, tableSeats) => {
  const nextPositions = {};

  tableSeats.forEach((seatCount, tableIndex) => {
    const tableId = String(tableIndex + 1);
    const tablePeople = attendees.filter(attendee => assignments[attendee.id] === tableId);
    const reservedSeats = new Set();
    const waitingPeople = [];

    tablePeople.forEach(person => {
      const position = Number(seatPositions?.[person.id]);

      if (Number.isInteger(position) && position >= 0 && position < seatCount && !reservedSeats.has(position)) {
        reservedSeats.add(position);
        nextPositions[person.id] = position;
        return;
      }

      waitingPeople.push(person);
    });

    waitingPeople.forEach(person => {
      let nextSeat = 0;

      while (reservedSeats.has(nextSeat) && nextSeat < seatCount) {
        nextSeat += 1;
      }

      if (nextSeat >= seatCount) {
        nextSeat = reservedSeats.size;
      }

      reservedSeats.add(nextSeat);
      nextPositions[person.id] = nextSeat;
    });
  });

  return nextPositions;
};

const countTableFoodPreferences = people =>
  people.reduce((counts, person) => {
    person.foodPreferences.forEach(preference => {
      counts[preference] = (counts[preference] || 0) + 1;
    });

    return counts;
  }, {});

const buildTablePlan = (attendees, assignments, tableSeats, tableNames, seatPositions) => {
  const tables = tableSeats.map((seats, index) => ({
    id: String(index + 1),
    name: tableNames[index] || `Tavolo ${index + 1}`,
    seats,
    people: [],
    slots: [],
    foodCounts: {},
  }));
  const unassigned = [];

  attendees.forEach(attendee => {
    const tableIndex = Number(assignments[attendee.id]) - 1;

    if (tableIndex >= 0 && tables[tableIndex]) {
      tables[tableIndex].people.push(attendee);
    } else {
      unassigned.push(attendee);
    }
  });

  tables.forEach(table => {
    table.foodCounts = countTableFoodPreferences(table.people);
    const slotCount = Math.max(table.seats, table.people.length, 1);
    table.slots = Array.from({ length: slotCount }, (_, index) => ({
      id: index,
      person: null,
      isOverflow: index >= table.seats,
    }));

    table.people.forEach(person => {
      const position = Number(seatPositions?.[person.id]);
      const seatIndex = Number.isInteger(position) && position >= 0 ? position : table.slots.length;

      while (!table.slots[seatIndex]) {
        table.slots.push({
          id: table.slots.length,
          person: null,
          isOverflow: table.slots.length >= table.seats,
        });
      }

      if (table.slots[seatIndex].person) {
        const emptySlot = table.slots.find(slot => !slot.person);

        if (emptySlot) {
          emptySlot.person = person;
        } else {
          table.slots.push({
            id: table.slots.length,
            person,
            isOverflow: true,
          });
        }
      } else {
        table.slots[seatIndex].person = person;
      }
    });
  });

  return { tables, unassigned };
};

function SeatCard({
  person,
  seatNumber,
  tableId,
  tableOptions,
  peopleOptions,
  onMove,
  onAssignToSeat,
  isExpanded,
  onToggle,
  isOverflow,
  feedback,
}) {
  if (!person) {
    return (
      <div className={`seat-card empty-seat ${isExpanded ? "is-expanded" : ""}`}>
        <button type="button" className="seat-person-button" onClick={onToggle}>
          <span>Posto {seatNumber}</span>
          <strong>Libero</strong>
        </button>
        {isExpanded && (
          <div className="seat-expanded-details empty-seat-details">
            <label>
              Scegli persona
              <select value="" onChange={event => event.target.value && onAssignToSeat(event.target.value)}>
                <option value="">Seleziona invitato</option>
                {peopleOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {feedback && (
              <p className={`seat-action-feedback ${feedback.type}`}>
                {feedback.message}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`seat-card occupied-seat ${isExpanded ? "is-expanded" : ""} ${isOverflow ? "overflow-seat" : ""}`}
      style={{
        backgroundColor: person.color.background,
        borderColor: person.color.border,
        color: person.color.text,
      }}
    >
      <button type="button" className="seat-person-button" onClick={onToggle}>
        <span>Posto {seatNumber}</span>
        <strong>{person.name}</strong>
      </button>
      {isExpanded && (
        <div className="seat-expanded-details">
          <dl>
            <div>
              <dt>Invito</dt>
              <dd>{person.familyName}</dd>
            </div>
            <div>
              <dt>Dettaglio</dt>
              <dd>{person.seatLabel}</dd>
            </div>
            <div>
              <dt>Intolleranze</dt>
              <dd>{person.foodDetails}</dd>
            </div>
          </dl>
          <label>
            Sposta invito
            <select value={tableId} onChange={event => onMove(person.familyId, event.target.value)}>
              <option value="">Non assegnata</option>
              {tableOptions.map(table => (
                <option key={table.id} value={table.id}>{table.name}</option>
              ))}
            </select>
          </label>
          {feedback && (
            <p className={`seat-action-feedback ${feedback.type}`}>
              {feedback.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TablePlanner() {
  const plannerCanvasRef = useRef(null);
  const dragStateRef = useRef(null);
  const suppressTableClickRef = useRef(false);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedPanelId, setExpandedPanelId] = useState("");
  const [moveFeedback, setMoveFeedback] = useState({});
  const [guestSearch, setGuestSearch] = useState("");
  const [draggingTableId, setDraggingTableId] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [planner, setPlanner] = useState(loadTablePlanner);
  const token = localStorage.getItem("adminToken");

  const attendees = useMemo(() => buildTableAttendees(participants), [participants]);
  const hasTablesConfigured = hasTableCountValue(planner.tableCount);
  const tableSeats = useMemo(
    () => normalizeTableSeats(planner.tableSeats, planner.tableCount, planner.seatsPerTable),
    [planner.tableCount, planner.seatsPerTable, planner.tableSeats]
  );
  const tableNames = useMemo(
    () => normalizeTableNames(planner.tableNames, planner.tableCount),
    [planner.tableCount, planner.tableNames]
  );
  const tablePositions = useMemo(
    () => normalizeTablePositions(planner.tablePositions, planner.tableCount),
    [planner.tableCount, planner.tablePositions]
  );
  const effectiveAssignments = useMemo(
    () => sanitizeFamilyAssignments(attendees, planner.assignments, tableSeats),
    [attendees, planner.assignments, tableSeats]
  );
  const effectiveSeatPositions = useMemo(
    () => normalizeSeatPositions(attendees, effectiveAssignments, planner.seatPositions, tableSeats),
    [attendees, effectiveAssignments, planner.seatPositions, tableSeats]
  );
  const tablePlan = useMemo(
    () => buildTablePlan(attendees, effectiveAssignments, tableSeats, tableNames, effectiveSeatPositions),
    [attendees, effectiveAssignments, effectiveSeatPositions, tableNames, tableSeats]
  );
  const totalCapacity = tableSeats.reduce((total, seats) => total + seats, 0);
  const assignedPeople = attendees.length - tablePlan.unassigned.length;
  const peopleOptions = useMemo(() => attendees.map(person => {
    const tableId = effectiveAssignments[person.id];
    const tableName = tableId
      ? tableNames[Number(tableId) - 1] || `Tavolo ${tableId}`
      : "Non assegnata";

    return {
      id: person.id,
      label: `${person.name} - ${tableName} (${person.familyName})`,
    };
  }), [attendees, effectiveAssignments, tableNames]);
  const visibleUnassigned = useMemo(() => {
    const search = guestSearch.trim().toLowerCase();

    if (!search) {
      return tablePlan.unassigned;
    }

    return tablePlan.unassigned.filter(person =>
      [person.name, person.familyName, person.seatLabel, person.foodDetails]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [guestSearch, tablePlan.unassigned]);
  const canvasSize = useMemo(() => {
    const positions = Object.values(tablePositions);
    const width = positions.reduce((max, position) => Math.max(max, position.x + 220), 860);
    const height = positions.reduce((max, position) => Math.max(max, position.y + 190), 520);

    return { width, height };
  }, [tablePositions]);

  useEffect(() => {
    fetch("/api/rsvps", {
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Caricamento non riuscito");
        return res.json();
      })
      .then(result => {
        setParticipants(result.data || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Non sono riuscito a caricare gli invitati.");
        setParticipants([]);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (!hasTablesConfigured) {
      return;
    }

    localStorage.setItem(tablePlannerStorageKey, JSON.stringify({
      ...planner,
      assignments: effectiveAssignments,
      seatPositions: effectiveSeatPositions,
      tableNames,
      tablePositions,
      tableSeats,
    }));
  }, [effectiveAssignments, effectiveSeatPositions, hasTablesConfigured, planner, tableNames, tablePositions, tableSeats]);

  const updateTableCount = value => {
    setPlanner(prev => {
      if (!hasTableCountValue(value)) {
        return { ...prev, tableCount: "", tableNames: [], tablePositions: {}, tableSeats: [] };
      }

      const tableCount = clampNumber(value, 1, 80);
      const nextSeats = normalizeTableSeats(prev.tableSeats, tableCount, prev.seatsPerTable);
      const nextNames = normalizeTableNames(prev.tableNames, tableCount);
      const nextPositions = normalizeTablePositions(prev.tablePositions, tableCount);
      const assignments = Object.fromEntries(
        Object.entries(prev.assignments).filter(([, tableId]) => Number(tableId) <= tableCount)
      );
      const seatPositions = Object.fromEntries(
        Object.entries(prev.seatPositions || {}).filter(([attendeeId]) => assignments[attendeeId])
      );

      return { ...prev, tableCount, tableNames: nextNames, tablePositions: nextPositions, tableSeats: nextSeats, assignments, seatPositions };
    });
  };

  const updateSeatsPerTable = value => {
    const seatsPerTable = clampNumber(value, 1, 80);

    setPlanner(prev => {
      const tableCount = hasTableCountValue(prev.tableCount)
        ? clampNumber(prev.tableCount, 1, 80)
        : 0;

      return {
        ...prev,
        seatsPerTable,
        tableSeats: Array.from({ length: tableCount }, () => seatsPerTable),
      };
    });
  };

  const updateSingleTableSeats = (tableIndex, value) => {
    setPlanner(prev => {
      const nextSeats = normalizeTableSeats(prev.tableSeats, prev.tableCount, prev.seatsPerTable);
      nextSeats[tableIndex] = clampNumber(value, 1, 80);

      return { ...prev, tableSeats: nextSeats };
    });
  };

  const updateTableName = (tableIndex, value) => {
    setPlanner(prev => {
      const nextNames = normalizeTableNames(prev.tableNames, prev.tableCount);
      nextNames[tableIndex] = value;

      return { ...prev, tableNames: nextNames };
    });
  };

  const normalizeTableNameOnBlur = tableIndex => {
    setPlanner(prev => {
      const nextNames = normalizeTableNames(prev.tableNames, prev.tableCount);
      nextNames[tableIndex] = String(nextNames[tableIndex] || "").trim() || `Tavolo ${tableIndex + 1}`;

      return { ...prev, tableNames: nextNames };
    });
  };

  const updateTablePosition = (tableId, position) => {
    setPlanner(prev => ({
      ...prev,
      tablePositions: {
        ...normalizeTablePositions(prev.tablePositions, prev.tableCount),
        [tableId]: {
          x: Math.max(0, Math.round(position.x)),
          y: Math.max(0, Math.round(position.y)),
        },
      },
    }));
  };

  const canStartTableDrag = event =>
    !event.target.closest("input, select, textarea, .table-detail-popover, .seat-card, .seat-person-button, .unassigned-card");

  const startTableDrag = (event, tableId) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    if (dragStateRef.current || !canStartTableDrag(event)) {
      return;
    }

    const currentPosition = tablePositions[tableId] || getDefaultTablePosition(Number(tableId) - 1);

    dragStateRef.current = {
      tableId,
      mode: "pointer",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialX: currentPosition.x,
      initialY: currentPosition.y,
      didDrag: false,
    };
    setDraggingTableId(tableId);
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const startTableMouseDrag = (event, tableId) => {
    if (event.button !== 0 || dragStateRef.current || !canStartTableDrag(event)) {
      return;
    }

    const currentPosition = tablePositions[tableId] || getDefaultTablePosition(Number(tableId) - 1);

    dragStateRef.current = {
      tableId,
      mode: "mouse",
      startX: event.clientX,
      startY: event.clientY,
      initialX: currentPosition.x,
      initialY: currentPosition.y,
      didDrag: false,
    };
    setDraggingTableId(tableId);
    event.preventDefault();
  };

  const moveTableDrag = event => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
      dragState.didDrag = true;
    }

    if (dragState.didDrag) {
      updateTablePosition(dragState.tableId, {
        x: dragState.initialX + deltaX,
        y: dragState.initialY + deltaY,
      });
    }
  };

  const endTableDrag = event => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    suppressTableClickRef.current = Boolean(dragState.didDrag);
    dragStateRef.current = null;
    setDraggingTableId("");
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    const handleMouseMove = event => {
      const dragState = dragStateRef.current;

      if (!dragState || dragState.mode !== "mouse") {
        return;
      }

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
        dragState.didDrag = true;
      }

      if (dragState.didDrag) {
        updateTablePosition(dragState.tableId, {
          x: dragState.initialX + deltaX,
          y: dragState.initialY + deltaY,
        });
      }
    };
    const handleMouseUp = () => {
      const dragState = dragStateRef.current;

      if (!dragState || dragState.mode !== "mouse") {
        return;
      }

      suppressTableClickRef.current = Boolean(dragState.didDrag);
      dragStateRef.current = null;
      setDraggingTableId("");
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  });

  const distributeTables = () => {
    if (!hasTablesConfigured) {
      setNotice("Inserisci il numero di tavoli prima di distribuire gli invitati.");
      return;
    }

    setPlanner(prev => {
      const nextSeats = normalizeTableSeats(prev.tableSeats, prev.tableCount, prev.seatsPerTable);
      const assignments = distributeAttendees(attendees, nextSeats);

      return {
        ...prev,
        tableSeats: nextSeats,
        assignments,
        seatPositions: normalizeSeatPositions(attendees, assignments, {}, nextSeats),
      };
    });
  };

  const moveFamily = (familyId, tableId, options = {}) => {
    setPlanner(prev => {
      const assignments = { ...sanitizeFamilyAssignments(attendees, prev.assignments, tableSeats) };
      const seatPositions = { ...normalizeSeatPositions(attendees, assignments, prev.seatPositions, tableSeats) };
      const family = attendees.filter(attendee => attendee.familyId === familyId);
      const selectedPersonId = options.personId || family[0]?.id;
      const preferredSeatIndex = Number(options.seatIndex);
      const hasPreferredSeat = Number.isInteger(preferredSeatIndex) && preferredSeatIndex >= 0;
      const feedbackKeys = [familyId, options.feedbackKey].filter((key, index, all) => key && all.indexOf(key) === index);
      const setLocalFeedback = feedback => {
        setMoveFeedback(prevFeedback => ({
          ...prevFeedback,
          ...Object.fromEntries(feedbackKeys.map(key => [key, feedback])),
        }));
      };

      if (!family.length) {
        return prev;
      }

      setNotice("");

      if (tableId) {
        const tableIndex = Number(tableId) - 1;
        const tableCapacity = tableSeats[tableIndex] || 0;

        if (!tableCapacity) {
          setLocalFeedback({ type: "error", message: `Il Tavolo ${tableId} non esiste.` });
          return prev;
        }

        if (family.length > tableCapacity) {
          setLocalFeedback({
            type: "error",
            message: `${family[0].familyName} ha ${family.length} persone: il Tavolo ${tableId} ha solo ${tableCapacity} posti.`,
          });
          return prev;
        }

        family.forEach(attendee => {
          delete assignments[attendee.id];
          delete seatPositions[attendee.id];
        });

        const targetOccupants = attendees.filter(attendee => assignments[attendee.id] === tableId);
        let freeSeats = tableCapacity - targetOccupants.length;
        const displacedFamilies = [];
        const preferredSeatOccupant = hasPreferredSeat
          ? targetOccupants.find(attendee => seatPositions[attendee.id] === preferredSeatIndex)
          : null;
        const targetFamilyGroups = groupAttendeesByFamily(targetOccupants);
        const prioritizedTargetGroups = [
          ...(preferredSeatOccupant
            ? targetFamilyGroups.filter(group => group.some(attendee => attendee.id === preferredSeatOccupant.id))
            : []),
          ...targetFamilyGroups
            .filter(group => !preferredSeatOccupant || !group.some(attendee => attendee.id === preferredSeatOccupant.id))
            .reverse(),
        ];

        if (freeSeats < family.length || preferredSeatOccupant) {
          for (const targetFamily of prioritizedTargetGroups) {
            const preferredSeatStillOccupied = hasPreferredSeat && targetFamily.some(attendee => seatPositions[attendee.id] === preferredSeatIndex);

            if (freeSeats >= family.length && !preferredSeatStillOccupied) break;

            targetFamily.forEach(attendee => {
              delete assignments[attendee.id];
              delete seatPositions[attendee.id];
            });
            displacedFamilies.push(targetFamily);
            freeSeats += targetFamily.length;
          }
        }

        const occupiedSeats = new Set(
          attendees
            .filter(attendee => assignments[attendee.id] === tableId)
            .map(attendee => seatPositions[attendee.id])
            .filter(position => Number.isInteger(position) && position >= 0 && position < tableCapacity)
        );
        const selectedPerson = family.find(attendee => attendee.id === selectedPersonId) || family[0];
        const familyOrder = [
          selectedPerson,
          ...family.filter(attendee => attendee.id !== selectedPerson.id),
        ];

        familyOrder.forEach((attendee, index) => {
          let targetSeat = index === 0 && hasPreferredSeat && !occupiedSeats.has(preferredSeatIndex)
            ? preferredSeatIndex
            : 0;

          while (occupiedSeats.has(targetSeat) && targetSeat < tableCapacity) {
            targetSeat += 1;
          }

          assignments[attendee.id] = tableId;
          seatPositions[attendee.id] = targetSeat;
          occupiedSeats.add(targetSeat);
        });
        setLocalFeedback({
          type: displacedFamilies.length ? "warning" : "success",
          message: displacedFamilies.length
            ? `${family[0].familyName} spostato al Tavolo ${tableId}. Liberato ${displacedFamilies.map(group => group[0].familyName).join(", ")}.`
            : `${family[0].familyName} spostato al Tavolo ${tableId}.`,
        });
        setExpandedPanelId(`person-${selectedPerson.id}`);
      } else {
        family.forEach(attendee => {
          delete assignments[attendee.id];
          delete seatPositions[attendee.id];
        });
        setLocalFeedback({ type: "success", message: `${family[0].familyName} rimosso dai tavoli.` });
      }

      return { ...prev, assignments, seatPositions };
    });
  };

  const clearAssignments = () => {
    setExpandedPanelId("");
    setMoveFeedback({});
    setNotice("");
    setPlanner(prev => ({ ...prev, assignments: {}, seatPositions: {} }));
  };

  const compactTableLayout = () => {
    setPlanner(prev => {
      const tableCount = hasTableCountValue(prev.tableCount)
        ? clampNumber(prev.tableCount, 1, 80)
        : 0;
      const tablePositions = Array.from({ length: tableCount }, (_, index) => [
        String(index + 1),
        getDefaultTablePosition(index),
      ]).reduce((positions, [tableId, position]) => {
        positions[tableId] = position;
        return positions;
      }, {});

      return { ...prev, tablePositions };
    });
  };

  const assignPersonToSeat = (personId, tableId, seatIndex) => {
    const person = attendees.find(attendee => attendee.id === personId);

    if (!person) return;

    moveFamily(person.familyId, tableId, {
      feedbackKey: `empty-${tableId}-${seatIndex}`,
      personId,
      seatIndex,
    });
  };

  if (loading) {
    return (
      <main className="tables-page loading-page">
        <p>Caricamento tavoli...</p>
      </main>
    );
  }

  return (
    <main className="tables-page">
      <header className="tables-header">
        <div>
          <p>Dashboard Organizzatore</p>
          <h1>Organizzazione tavoli</h1>
        </div>
        <div className="tables-header-actions">
          <Link to="/admin" className="outline-table-action">
            <ArrowLeft size={17} aria-hidden="true" />
            Lista invitati
          </Link>
          <button type="button" className="primary-table-action" onClick={distributeTables}>
            <RefreshCw size={17} aria-hidden="true" />
            Distribuisci
          </button>
          <button type="button" className="danger-table-action" onClick={clearAssignments}>
            <Trash2 size={17} aria-hidden="true" />
            Svuota
          </button>
          <button type="button" className="outline-table-action" onClick={compactTableLayout}>
            Compatta
          </button>
        </div>
      </header>

      {error && <p className="tables-error">{error}</p>}
      {notice && <p className="tables-notice">{notice}</p>}

      <section className="tables-summary">
        <div>
          <span>Persone</span>
          <strong>{attendees.length}</strong>
        </div>
        <div>
          <span>Assegnate</span>
          <strong>{assignedPeople}</strong>
        </div>
        <div>
          <span>Non assegnate</span>
          <strong>{tablePlan.unassigned.length}</strong>
        </div>
        <div>
          <span>Posti disponibili</span>
          <strong>{totalCapacity}</strong>
        </div>
      </section>

      <section className="planner-layout">
        <aside className="planner-sidebar" aria-label="Controlli e invitati">
          <section className="tables-controls">
            <label>
              Numero tavoli
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={planner.tableCount}
                onChange={event => updateTableCount(event.target.value.replace(/\D/g, ""))}
              />
            </label>
            {hasTablesConfigured && (
              <label>
                Posti per tavolo
                <input
                  type="number"
                  min="1"
                  max="80"
                  value={planner.seatsPerTable}
                  onChange={event => updateSeatsPerTable(event.target.value)}
                />
              </label>
            )}
          </section>

          {hasTablesConfigured ? (
            <section className="table-seat-controls">
              {tableSeats.map((seats, tableIndex) => (
                <label key={tableIndex}>
                  Tavolo {tableIndex + 1}
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={seats}
                    onChange={event => updateSingleTableSeats(tableIndex, event.target.value)}
                  />
                </label>
              ))}
            </section>
          ) : (
            <section className="tables-empty-state">
              Cancella pure il campo mentre modifichi. Inserisci un numero di tavoli per mostrare posti e mappa.
            </section>
          )}

          <section className="unassigned-panel">
            <div className="unassigned-panel-header">
              <div>
                <h2>Invitati da sistemare</h2>
                <p>{tablePlan.unassigned.length} persone non assegnate</p>
              </div>
              <input
                type="search"
                value={guestSearch}
                onChange={event => setGuestSearch(event.target.value)}
                placeholder="Cerca invitato"
              />
            </div>
            <div>
              {visibleUnassigned.map(person => (
                <article
                  key={person.id}
                  className="unassigned-card"
                  style={{
                    backgroundColor: person.color.background,
                    borderColor: person.color.border,
                    color: person.color.text,
                  }}
                >
                  <button
                    type="button"
                    className="unassigned-detail-button"
                    onClick={() => setExpandedPanelId(prev => (prev === `person-${person.id}` ? "" : `person-${person.id}`))}
                  >
                    <strong>{person.name}</strong>
                  </button>
                  <span>{person.seatLabel}</span>
                  {expandedPanelId === `person-${person.id}` && (
                    <div className="seat-expanded-details">
                      <dl>
                        <div>
                          <dt>Invito</dt>
                          <dd>{person.familyName}</dd>
                        </div>
                        <div>
                          <dt>Intolleranze</dt>
                          <dd>{person.foodDetails}</dd>
                        </div>
                      </dl>
                      {moveFeedback[person.familyId] && (
                        <p className={`seat-action-feedback ${moveFeedback[person.familyId].type}`}>
                          {moveFeedback[person.familyId].message}
                        </p>
                      )}
                    </div>
                  )}
                  <select value="" onChange={event => moveFamily(person.familyId, event.target.value)}>
                    <option value="">Non assegnata</option>
                    {tablePlan.tables.map(table => (
                      <option key={table.id} value={table.id}>{table.name}</option>
                    ))}
                  </select>
                </article>
              ))}
              {visibleUnassigned.length === 0 && (
                <p className="unassigned-empty">Nessun invitato da mostrare.</p>
              )}
            </div>
          </section>
        </aside>

        <section className="planner-canvas" aria-label="Piantina tavoli" ref={plannerCanvasRef}>
          {hasTablesConfigured ? (
            <section
              className="tables-board"
              style={{
                minWidth: `${canvasSize.width}px`,
                minHeight: `${canvasSize.height}px`,
              }}
            >
              {tablePlan.tables.map(table => {
                const isOverCapacity = table.people.length > table.seats;
                const tablePosition = tablePositions[table.id] || getDefaultTablePosition(Number(table.id) - 1);

                return (
                  <article
                    className={`table-map-card compact-table-node ${selectedTableId === table.id ? "is-selected" : ""} ${isOverCapacity ? "is-over-capacity" : ""} ${draggingTableId === table.id ? "is-dragging" : ""}`}
                    key={table.id}
                    style={{
                      left: `${tablePosition.x}px`,
                      top: `${tablePosition.y}px`,
                    }}
                    onPointerDown={event => startTableDrag(event, table.id)}
                    onPointerMove={moveTableDrag}
                    onPointerUp={endTableDrag}
                    onPointerCancel={endTableDrag}
                    onMouseDown={event => startTableMouseDrag(event, table.id)}
                    onClick={() => {
                      if (suppressTableClickRef.current) {
                        suppressTableClickRef.current = false;
                        return;
                      }

                      setSelectedTableId(prev => (prev === table.id ? "" : table.id));
                    }}
                  >
                    <div className="compact-table-face" role="button" tabIndex={0} aria-label={`${table.name}, ${table.people.length} persone su ${table.seats}`}>
                      <span className="compact-table-core">
                        <strong>{table.name}</strong>
                        <small>{table.people.length} / {table.seats}</small>
                      </span>
                      <span className="compact-seat-ring" aria-hidden="true">
                        {table.slots.slice(0, table.seats).map((slot, index) => {
                          const angle = (Math.PI * 2 * index) / Math.max(table.seats, 1) - Math.PI / 2;

                          return (
                            <span
                              key={slot.id}
                              className={`compact-seat-dot ${slot.person ? "is-filled" : ""}`}
                              style={{
                                "--seat-x": `${50 + Math.cos(angle) * 45}%`,
                                "--seat-y": `${50 + Math.sin(angle) * 45}%`,
                                ...(slot.person ? { backgroundColor: slot.person.color.border } : {}),
                              }}
                            >
                              {slot.person && <span>{slot.person.name}</span>}
                            </span>
                          );
                        })}
                      </span>
                    </div>

                    {isOverCapacity && <span className="compact-capacity-alert">Capienza superata</span>}

                    {selectedTableId === table.id && (
                      <section className="table-detail-popover" onClick={event => event.stopPropagation()}>
                        <div className="selected-table-header">
                          <input
                            className="selected-table-name-input"
                            value={tableNames[Number(table.id) - 1] || table.name}
                            onChange={event => updateTableName(Number(table.id) - 1, event.target.value)}
                            onBlur={() => normalizeTableNameOnBlur(Number(table.id) - 1)}
                            aria-label={`Nome ${table.name}`}
                          />
                          <span>{table.people.length} / {table.seats}</span>
                          <button
                            type="button"
                            className="table-detail-close"
                            onClick={() => {
                              setSelectedTableId("");
                              setExpandedPanelId("");
                            }}
                            aria-label="Chiudi dettaglio tavolo"
                          >
                            X
                          </button>
                        </div>

                        <div className="selected-seat-grid">
                          {table.slots.map(slot => {
                            const panelId = slot.person
                              ? `person-${slot.person.id}`
                              : `empty-${table.id}-${slot.id}`;
                            const isExpanded = expandedPanelId === panelId;

                            return (
                              <SeatCard
                                key={`${table.id}-${slot.id}`}
                                person={slot.person}
                                seatNumber={slot.id + 1}
                                tableId={table.id}
                                tableOptions={tablePlan.tables}
                                peopleOptions={peopleOptions}
                                onMove={moveFamily}
                                onAssignToSeat={personId => assignPersonToSeat(personId, table.id, slot.id)}
                                isExpanded={isExpanded}
                                onToggle={() => setExpandedPanelId(prev => (prev === panelId ? "" : panelId))}
                                isOverflow={slot.isOverflow}
                                feedback={slot.person ? moveFeedback[slot.person.familyId] : moveFeedback[panelId]}
                              />
                            );
                          })}
                        </div>

                        <div className="table-food-summary compact-summary">
                          <strong>Intolleranze / preferenze</strong>
                          {Object.entries(table.foodCounts).length ? (
                            <div>
                              {Object.entries(table.foodCounts).map(([preference, count]) => (
                                <span key={preference}>{preference}: {count}</span>
                              ))}
                            </div>
                          ) : (
                            <p>Nessuna intolleranza indicata.</p>
                          )}
                        </div>
                      </section>
                    )}
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="canvas-empty-state">
              Inserisci il numero di tavoli per iniziare la piantina.
            </section>
          )}
        </section>
      </section>
    </main>
  );
}
