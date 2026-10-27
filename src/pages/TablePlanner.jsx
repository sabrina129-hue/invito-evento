import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Circle, Download, Plus, RefreshCw, Square, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { splitFoodPreferenceItems } from "../lib/foodPreferences.js";
import { getParticipantGroup, getParticipantGuestNames } from "../lib/guestNames.js";
import { rsvpDataChangedEventName, rsvpDataVersionStorageKey } from "../lib/rsvpSync.js";
import "./TablePlanner.css";

const tablePlannerStorageKey = "adminTablePlanner";
const personDragOptionsMimeType = "application/x-table-planner-drag-options";
const tableCapacityErrorMessage = "Non ci sono posti liberi a sufficienza su questo tavolo per completare l'operazione. Libera dei posti o aumenta la capienza del tavolo";
const noFoodPreferenceOption = "Nessuna intolleranza/preferenza alimentare";

const tableShapeOptions = [
  { value: "round", label: "Rotondo" },
  { value: "square", label: "Quadrato" },
];

const tableCollisionGap = 2;
const tableGridStep = 36;

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

const isNoFoodPreferenceOption = option =>
  String(option || "").trim().toLowerCase() === noFoodPreferenceOption.toLowerCase();

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
  splitFoodPreferenceItems(value)
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
        ? normalizeFoodPreferenceItems(splitFoodPreferenceItems(values))
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

const clampTableCount = value => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(80, Math.max(0, Math.floor(numericValue)));
};

const normalizeTableShape = value => value === "square" ? "square" : "round";

const hasTableCountValue = value => Number(value) > 0;

const getTableVisualSize = seats => {
  const seatCount = clampNumber(seats, 1, 80, 8);

  return Math.min(232, Math.max(116, 92 + seatCount * 4));
};

const getTableNodeSize = seats => getTableVisualSize(seats) + 28;

const getTableBounds = (position, seats) => {
  const size = getTableNodeSize(seats);

  return {
    x: Math.max(0, Number(position?.x) || 0),
    y: Math.max(0, Number(position?.y) || 0),
    width: size,
    height: size,
  };
};

const boundsOverlap = (a, b, gap = tableCollisionGap) =>
  a.x < b.x + b.width + gap &&
  a.x + a.width + gap > b.x &&
  a.y < b.y + b.height + gap &&
  a.y + a.height + gap > b.y;

const findOpenTablePosition = (preferredPosition, tableId, tableSeats, tablePositions) => {
  const normalizedPreferred = {
    x: Math.max(0, Math.round(Number(preferredPosition?.x) || 0)),
    y: Math.max(0, Math.round(Number(preferredPosition?.y) || 0)),
  };
  const tableIndex = Number(tableId) - 1;
  const currentSeats = tableSeats[tableIndex] || 8;
  const occupiedBounds = tableSeats
    .map((seats, index) => {
      const currentTableId = String(index + 1);

      if (currentTableId === String(tableId)) {
        return null;
      }

      return tablePositions[currentTableId]
        ? getTableBounds(tablePositions[currentTableId], seats)
        : null;
    })
    .filter(Boolean);
  const isFree = position => {
    const bounds = getTableBounds(position, currentSeats);

    return occupiedBounds.every(occupied => !boundsOverlap(bounds, occupied));
  };

  if (isFree(normalizedPreferred)) {
    return normalizedPreferred;
  }

  for (let radius = 1; radius <= 80; radius += 1) {
    for (let yOffset = -radius; yOffset <= radius; yOffset += 1) {
      for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
        if (Math.max(Math.abs(xOffset), Math.abs(yOffset)) !== radius) {
          continue;
        }

        const candidate = {
          x: Math.max(0, normalizedPreferred.x + xOffset * tableGridStep),
          y: Math.max(0, normalizedPreferred.y + yOffset * tableGridStep),
        };

        if (isFree(candidate)) {
          return candidate;
        }
      }
    }
  }

  return normalizedPreferred;
};

const resolveTablePositions = (tableSeats, tablePositions, priorityTableId = "") => {
  const resolved = {};
  const tableIds = tableSeats.map((_, index) => String(index + 1));
  const orderedTableIds = tableIds.includes(String(priorityTableId))
    ? [String(priorityTableId), ...tableIds.filter(tableId => tableId !== String(priorityTableId))]
    : tableIds;

  orderedTableIds.forEach(tableId => {
    const index = Number(tableId) - 1;
    const preferredPosition = tablePositions[tableId] || getDefaultTablePosition(index);

    resolved[tableId] = findOpenTablePosition(preferredPosition, tableId, tableSeats, resolved);
  });

  return resolved;
};

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
    : 0;
  const seatsPerTable = clampNumber(planner?.seatsPerTable, 1, 80, 8);

  return {
    tableCount,
    seatsPerTable,
    tableShape: normalizeTableShape(planner?.tableShape),
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

const getSeatPosition = (index, totalSeats, tableShape) => {
  const safeTotal = Math.max(totalSeats, 1);

  if (tableShape === "square") {
    const progress = ((index + 0.5) / safeTotal) * 4;
    const side = Math.floor(progress) % 4;
    const offset = progress - Math.floor(progress);
    const start = 8;
    const end = 92;
    const axis = start + (end - start) * offset;

    if (side === 0) return { x: axis, y: 5 };
    if (side === 1) return { x: 95, y: axis };
    if (side === 2) return { x: end - (axis - start), y: 95 };

    return { x: 5, y: end - (axis - start) };
  }

  const angle = (Math.PI * 2 * index) / safeTotal - Math.PI / 2;

  return {
    x: 50 + Math.cos(angle) * 45,
    y: 50 + Math.sin(angle) * 45,
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
      const groupName = getParticipantGroup(participant);
      const color = familyColors[participantIndex % familyColors.length];

      return Array.from({ length: guestCount }, (_, guestIndex) => {
        const foodPreferenceDetails = normalizeFoodPreferenceItems(preferenceGroups[guestIndex] || []);
        const foodPreferences = foodPreferenceDetails.filter(preference => !isNoFoodPreferenceOption(preference));
        const fallbackName = guestIndex === 0
          ? participant.name || "Invitato senza nome"
          : `Persona ${guestIndex + 1}`;
        const personName = guestNames[guestIndex] || fallbackName;

        return {
          id: `${familyId}-${guestIndex}`,
          familyId,
          familyName: participant.name || "Invitato senza nome",
          group: groupName,
          groupLabel: groupName || "Senza gruppo",
          name: personName,
          seatLabel: guestIndex === 0 ? "Invito principale" : `Invito di ${participant.name || "invitato"}`,
          foodPreferences,
          foodDetails: foodPreferenceDetails.length ? foodPreferenceDetails.join(", ") : "Nessuna intolleranza indicata",
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
  const tableGroupKeys = Array.from({ length: tableSeats.length }, () => "");
  let tableCursor = 0;

  const findNextOpenTable = startIndex => {
    for (let offset = 0; offset < remainingSeats.length; offset += 1) {
      const index = (startIndex + offset) % remainingSeats.length;

      if (remainingSeats[index] > 0) {
        return index;
      }
    }

    return -1;
  };

  const getTableGroupPriority = (index, groupKey) => {
    if (tableGroupKeys[index] === groupKey) return 0;
    if (!tableGroupKeys[index]) return 1;
    return 2;
  };

  const findBestTable = (familySize, groupKey, startIndex, allowMixedTable = false, preferRoomForGroup = false) => {
    let bestIndex = -1;
    let bestPriority = Number.POSITIVE_INFINITY;
    let bestRemainingSeats = preferRoomForGroup ? -1 : Number.POSITIVE_INFINITY;

    for (let offset = 0; offset < remainingSeats.length; offset += 1) {
      const index = (startIndex + offset) % remainingSeats.length;
      const remainingAfterPlacement = remainingSeats[index] - familySize;

      if (remainingAfterPlacement < 0) continue;

      const priority = getTableGroupPriority(index, groupKey);

      if (!allowMixedTable && priority === 2) continue;

      if (
        priority < bestPriority ||
        (
          priority === bestPriority &&
          (
            preferRoomForGroup
              ? remainingAfterPlacement > bestRemainingSeats
              : remainingAfterPlacement < bestRemainingSeats
          )
        )
      ) {
        bestIndex = index;
        bestPriority = priority;
        bestRemainingSeats = remainingAfterPlacement;
      }
    }

    return bestIndex;
  };

  const findTableForWholeFamily = (familySize, groupKey, startIndex, preferRoomForGroup = false) => {
    const sameGroupOrEmptyTable = findBestTable(familySize, groupKey, startIndex, false, preferRoomForGroup);

    return sameGroupOrEmptyTable >= 0
      ? sameGroupOrEmptyTable
      : findBestTable(familySize, groupKey, startIndex, true, preferRoomForGroup);
  };

  const assignPeopleToTable = (people, tableIndex, groupKey) => {
    people.forEach(attendee => {
      assignments[attendee.id] = String(tableIndex + 1);
    });

    if (!tableGroupKeys[tableIndex]) tableGroupKeys[tableIndex] = groupKey;
    remainingSeats[tableIndex] -= people.length;
    tableCursor = remainingSeats[tableIndex] > 0
      ? tableIndex
      : findNextOpenTable(tableIndex + 1);
  };

  const familiesByGroup = groupAttendeesByFamily(attendees).reduce((groups, family, familyIndex) => {
    const groupName = family[0]?.group || "";
    const groupKey = groupName || "__ungrouped__";

    groups[groupKey] = [
      ...(groups[groupKey] || []),
      { family, familyIndex, groupName },
    ];

    return groups;
  }, {});
  const orderedGroupKeys = Object.keys(familiesByGroup)
    .sort((left, right) => {
      if (left === "__ungrouped__") return 1;
      if (right === "__ungrouped__") return -1;
      const leftLargestFamily = Math.max(...familiesByGroup[left].map(({ family }) => family.length));
      const rightLargestFamily = Math.max(...familiesByGroup[right].map(({ family }) => family.length));

      if (leftLargestFamily !== rightLargestFamily) return rightLargestFamily - leftLargestFamily;

      return familiesByGroup[left][0].groupName.localeCompare(
        familiesByGroup[right][0].groupName,
        "it",
        { sensitivity: "base" }
      );
    });

  orderedGroupKeys.forEach(groupKey => {
    const sortedFamilies = familiesByGroup[groupKey]
      .sort((left, right) => right.family.length - left.family.length || left.familyIndex - right.familyIndex);

    sortedFamilies
      .forEach(({ family }, familyOrderIndex) => {
        const remainingGroupPeople = sortedFamilies
          .slice(familyOrderIndex + 1)
          .reduce((count, nextFamily) => count + nextFamily.family.length, 0);
        const wholeFamilyTableIndex = findTableForWholeFamily(
          family.length,
          groupKey,
          Math.max(tableCursor, 0),
          remainingGroupPeople > 0
        );

        if (wholeFamilyTableIndex >= 0) {
          assignPeopleToTable(family, wholeFamilyTableIndex, groupKey);
          return;
        }

        family.forEach(attendee => {
          const tableIndex = findTableForWholeFamily(1, groupKey, Math.max(tableCursor, 0), true);

          if (tableIndex < 0) {
            return;
          }

          assignPeopleToTable([attendee], tableIndex, groupKey);
        });
      });
  });

  return assignments;
};

const sanitizeAssignments = (attendees, assignments, tableSeats) => {
  const attendeeIds = new Set(attendees.map(attendee => attendee.id));
  const tableOccupancy = Array.from({ length: tableSeats.length }, () => 0);
  const nextAssignments = {};

  Object.entries(assignments || {}).forEach(([attendeeId, tableId]) => {
    const tableIndex = Number(tableId) - 1;
    const tableCapacity = tableSeats[tableIndex] || 0;

    if (
      attendeeIds.has(attendeeId) &&
      tableIndex >= 0 &&
      tableSeats[tableIndex] !== undefined &&
      tableOccupancy[tableIndex] < tableCapacity
    ) {
      nextAssignments[attendeeId] = tableId;
      tableOccupancy[tableIndex] += 1;
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

const formatTableFoodCounts = foodCounts => {
  const entries = Object.entries(foodCounts || {});

  return entries.length
    ? entries.map(([preference, count]) => `${preference}: ${count}`).join(", ")
    : "Nessuna intolleranza indicata";
};

const buildTablesPdf = ({ tables, unassigned, totals }) => {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 36;
  const bottomMargin = 36;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 12;
  const generatedAt = new Date();
  const columns = [
    { label: "Posto", x: margin + 10, width: 58, maxLength: 10 },
    { label: "Nome", x: margin + 78, width: 178, maxLength: 27 },
    { label: "Invito", x: margin + 266, width: 150, maxLength: 23 },
    { label: "Intolleranze", x: margin + 426, width: 340, maxLength: 50 },
  ];
  const pages = [];
  let currentPage = [];
  let y = 132;

  const text = (value, x, top, size = 10, font = "F1") =>
    `0 0 0 rg BT /${font} ${size} Tf ${x} ${pageHeight - top} Td (${escapePdfString(value)}) Tj ET`;
  const line = (x1, top1, x2, top2) =>
    `0.82 0.84 0.87 RG ${x1} ${pageHeight - top1} m ${x2} ${pageHeight - top2} l S`;
  const rect = (x, top, width, height, color = "0.96 0.97 0.98") =>
    `${color} rg ${x} ${pageHeight - top - height} ${width} ${height} re f`;
  const drawHeader = () => [
    rect(margin, 42, contentWidth, 42, "0.94 0.96 0.98"),
    text("Organizzazione tavoli", margin + 14, 68, 18, "F2"),
    text(
      `Generato il ${generatedAt.toLocaleDateString("it-IT")} alle ${generatedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
      pageWidth - 236,
      66,
      9
    ),
    text(`Tavoli: ${totals.tables}`, margin + 14, 104, 10, "F2"),
    text(`Posti: ${totals.capacity}`, margin + 112, 104, 10, "F2"),
    text(`Assegnati: ${totals.assigned}`, margin + 214, 104, 10, "F2"),
    text(`Non assegnati: ${totals.unassigned}`, margin + 342, 104, 10, "F2"),
    line(margin, 118, pageWidth - margin, 118),
  ];
  const finishPage = () => {
    pages.push([...drawHeader(), ...currentPage]);
    currentPage = [];
    y = 132;
  };
  const ensureSpace = height => {
    if (y + height > pageHeight - bottomMargin) {
      finishPage();
    }
  };
  const drawColumnHeader = () => {
    ensureSpace(25);
    currentPage.push(rect(margin, y, contentWidth, 24, "0.90 0.92 0.95"));
    columns.forEach(column => {
      currentPage.push(text(column.label, column.x, y + 16, 9, "F2"));
    });
    currentPage.push(line(margin, y + 24, pageWidth - margin, y + 24));
    y += 24;
  };
  const drawPersonRow = (row, index) => {
    const hasFoodPreferences = Boolean(row.hasFoodPreferences);
    const cellLines = columns.map(column => wrapPdfText(row[column.label], column.maxLength));
    const rowLines = Math.max(...cellLines.map(lines => lines.length), 1);
    const rowHeight = Math.max(26, rowLines * lineHeight + 12);

    if (y + rowHeight > pageHeight - bottomMargin) {
      finishPage();
      drawColumnHeader();
    }

    if (index % 2 === 0) {
      currentPage.push(rect(margin, y, contentWidth, rowHeight, "0.99 0.99 0.99"));
    }

    if (hasFoodPreferences) {
      const foodColumn = columns.find(column => column.label === "Intolleranze");
      const foodCellX = foodColumn.x - 8;

      currentPage.push(rect(foodCellX, y, pageWidth - margin - foodCellX, rowHeight, "1.00 0.95 0.86"));
    }

    currentPage.push(line(margin, y + rowHeight, pageWidth - margin, y + rowHeight));
    columns.slice(1).forEach(column => {
      currentPage.push(line(column.x - 8, y, column.x - 8, y + rowHeight));
    });
    cellLines.forEach((lines, columnIndex) => {
      lines.forEach((lineText, lineIndex) => {
        const shouldEmphasize = hasFoodPreferences && columns[columnIndex].label === "Intolleranze";

        currentPage.push(text(lineText, columns[columnIndex].x, y + 17 + lineIndex * lineHeight, 8.5, shouldEmphasize ? "F2" : "F1"));
      });
    });
    y += rowHeight;
  };

  if (!tables.length) {
    currentPage.push(text("Nessun tavolo configurato.", margin + 14, y + 20, 11));
    finishPage();
  }

  tables.forEach(table => {
    const tableFoodTotals = formatTableFoodCounts(table.foodCounts);

    ensureSpace(84);
    currentPage.push(rect(margin, y, contentWidth, 34, "0.95 0.97 1.00"));
    currentPage.push(text(table.name, margin + 14, y + 21, 13, "F2"));
    currentPage.push(text(`${table.people.length} persone su ${table.seats} posti`, pageWidth - 226, y + 21, 10, "F2"));
    y += 42;
    currentPage.push(rect(margin, y - 8, contentWidth, 28, "0.92 0.94 1.00"));
    currentPage.push(text("Intolleranze totali", margin + 12, y + 9, 9.5, "F2"));
    wrapPdfText(tableFoodTotals, 92).slice(0, 2).forEach((lineText, lineIndex) => {
      currentPage.push(text(lineText, margin + 138, y + 9 + lineIndex * lineHeight, 9.5, "F2"));
    });
    y += 30;
    drawColumnHeader();

    table.slots.slice(0, table.seats).forEach((slot, index) => {
      drawPersonRow({
        Posto: String(slot.id + 1),
        Nome: slot.person?.name || "Libero",
        Invito: slot.person?.familyName || "-",
        Intolleranze: slot.person?.foodDetails || "-",
        hasFoodPreferences: Boolean(slot.person?.foodPreferences.length),
      }, index);
    });

    y += 18;
  });

  if (unassigned.length) {
    ensureSpace(72);
    currentPage.push(rect(margin, y, contentWidth, 32, "0.99 0.95 0.92"));
    currentPage.push(text("Invitati non assegnati", margin + 14, y + 20, 13, "F2"));
    y += 42;
    drawColumnHeader();
    unassigned.forEach((person, index) => {
      drawPersonRow({
        Posto: "-",
        Nome: person.name,
        Invito: person.familyName,
        Intolleranze: person.foodDetails,
        hasFoodPreferences: Boolean(person.foodPreferences.length),
      }, index);
    });
  }

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
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];

  pages.forEach((pageCommands, pageIndex) => {
    const pageNumber = text(`Pagina ${pageIndex + 1} di ${pages.length}`, pageWidth - 110, pageHeight - 22, 8);
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

const buildTablesMapPdf = ({ tables, tablePositions, tableShape, totals }) => {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const mapTop = 132;
  const mapHeight = pageHeight - mapTop - margin;
  const mapPadding = 18;
  const generatedAt = new Date();
  const pages = [];
  const commands = [];
  const formatNumber = value => Number(value).toFixed(2);
  const text = (value, x, top, size = 10, font = "F1") =>
    `0 0 0 rg BT /${font} ${size} Tf ${formatNumber(x)} ${formatNumber(pageHeight - top)} Td (${escapePdfString(value)}) Tj ET`;
  const line = (x1, top1, x2, top2, color = "0.72 0.75 0.80") =>
    `${color} RG ${formatNumber(x1)} ${formatNumber(pageHeight - top1)} m ${formatNumber(x2)} ${formatNumber(pageHeight - top2)} l S`;
  const rect = (x, top, width, height, color = "0.96 0.97 0.98") =>
    `${color} rg ${formatNumber(x)} ${formatNumber(pageHeight - top - height)} ${formatNumber(width)} ${formatNumber(height)} re f`;
  const strokeRect = (x, top, width, height, color = "0.72 0.75 0.80") =>
    `${color} RG ${formatNumber(x)} ${formatNumber(pageHeight - top - height)} ${formatNumber(width)} ${formatNumber(height)} re S`;
  const circle = (cx, top, radius, fill = "1 1 1", stroke = "0.72 0.75 0.80") => {
    const cy = pageHeight - top;
    const k = 0.5522847498 * radius;

    return [
      `${fill} rg ${stroke} RG`,
      `${formatNumber(cx + radius)} ${formatNumber(cy)} m`,
      `${formatNumber(cx + radius)} ${formatNumber(cy + k)} ${formatNumber(cx + k)} ${formatNumber(cy + radius)} ${formatNumber(cx)} ${formatNumber(cy + radius)} c`,
      `${formatNumber(cx - k)} ${formatNumber(cy + radius)} ${formatNumber(cx - radius)} ${formatNumber(cy + k)} ${formatNumber(cx - radius)} ${formatNumber(cy)} c`,
      `${formatNumber(cx - radius)} ${formatNumber(cy - k)} ${formatNumber(cx - k)} ${formatNumber(cy - radius)} ${formatNumber(cx)} ${formatNumber(cy - radius)} c`,
      `${formatNumber(cx + k)} ${formatNumber(cy - radius)} ${formatNumber(cx + radius)} ${formatNumber(cy - k)} ${formatNumber(cx + radius)} ${formatNumber(cy)} c`,
      "h B",
    ].join(" ");
  };
  const clampPdfValue = (value, min, max) => Math.min(max, Math.max(min, value));
  const tableBounds = tables.map(table => {
    const tableIndex = Number(table.id) - 1;
    const position = tablePositions[table.id] || getDefaultTablePosition(tableIndex);
    const nodeSize = getTableNodeSize(table.seats);

    return {
      table,
      nodeSize,
      x: position.x,
      y: position.y,
      width: nodeSize,
      height: nodeSize,
    };
  });

  commands.push(rect(margin, 42, contentWidth, 42, "0.94 0.96 0.98"));
  commands.push(text("Piantina tavoli", margin + 14, 68, 18, "F2"));
  commands.push(text(
    `Generato il ${generatedAt.toLocaleDateString("it-IT")} alle ${generatedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
    pageWidth - 236,
    66,
    9
  ));
  commands.push(text(`Tavoli: ${totals.tables}`, margin + 14, 104, 10, "F2"));
  commands.push(text(`Posti: ${totals.capacity}`, margin + 112, 104, 10, "F2"));
  commands.push(text(`Assegnati: ${totals.assigned}`, margin + 214, 104, 10, "F2"));
  commands.push(text(`Non assegnati: ${totals.unassigned}`, margin + 342, 104, 10, "F2"));
  commands.push(line(margin, 118, pageWidth - margin, 118));
  commands.push(rect(margin, mapTop, contentWidth, mapHeight, "0.985 0.988 0.992"));
  commands.push(strokeRect(margin, mapTop, contentWidth, mapHeight, "0.82 0.84 0.87"));

  if (!tableBounds.length) {
    commands.push(text("Nessun tavolo configurato.", margin + 16, mapTop + 28, 11));
  } else {
    const minX = Math.min(...tableBounds.map(bound => bound.x));
    const minY = Math.min(...tableBounds.map(bound => bound.y));
    const maxX = Math.max(...tableBounds.map(bound => bound.x + bound.width));
    const maxY = Math.max(...tableBounds.map(bound => bound.y + bound.height));
    const layoutWidth = Math.max(1, maxX - minX);
    const layoutHeight = Math.max(1, maxY - minY);
    const availableWidth = contentWidth - mapPadding * 2;
    const availableHeight = mapHeight - mapPadding * 2;
    const scale = Math.min(availableWidth / layoutWidth, availableHeight / layoutHeight, 1);
    const offsetX = margin + mapPadding + (availableWidth - layoutWidth * scale) / 2;
    const offsetY = mapTop + mapPadding + (availableHeight - layoutHeight * scale) / 2;

    tableBounds.forEach(({ table, x, y, nodeSize }) => {
      const nodeX = offsetX + (x - minX) * scale;
      const nodeY = offsetY + (y - minY) * scale;
      const scaledNodeSize = Math.max(82, nodeSize * scale);
      const tableSize = Math.max(72, getTableVisualSize(table.seats) * scale);
      const centerX = nodeX + scaledNodeSize / 2;
      const centerY = nodeY + scaledNodeSize / 2;
      const tableName = wrapPdfText(table.name, 22)[0];
      const labelTracks = { left: [], right: [] };

      if (tableShape === "square") {
        const side = tableSize * 0.58;
        commands.push(rect(centerX - side / 2, centerY - side / 2, side, side, "0.93 0.96 1.00"));
        commands.push(strokeRect(centerX - side / 2, centerY - side / 2, side, side, "0.30 0.42 0.70"));
      } else {
        commands.push(circle(centerX, centerY, tableSize * 0.34, "0.93 0.96 1.00", "0.30 0.42 0.70"));
      }

      commands.push(text(tableName, centerX - Math.min(44, toPdfText(tableName).length * 2.8), centerY - 2, 8, "F2"));
      commands.push(text(`${table.people.length}/${table.seats}`, centerX - 9, centerY + 11, 7));

      const seatItems = table.slots.slice(0, table.seats).map((slot, index) => {
        const seatPosition = getSeatPosition(index, table.seats, tableShape);
        const dotX = centerX - tableSize / 2 + tableSize * seatPosition.x / 100;
        const dotY = centerY - tableSize / 2 + tableSize * seatPosition.y / 100;

        return { slot, index, dotX, dotY };
      });

      seatItems.forEach(({ slot, dotX, dotY }) => {
        commands.push(circle(dotX, dotY, slot.person ? 3.2 : 2.4, slot.person ? "0.23 0.40 0.77" : "1 1 1", "0.30 0.42 0.70"));
      });

      seatItems
        .filter(item => item.slot.person)
        .sort((a, b) => a.dotY - b.dotY)
        .forEach(({ slot, dotX, dotY }) => {
          const side = dotX < centerX ? "left" : "right";
          const name = wrapPdfText(slot.person.name, 20)[0];
          const labelWidth = Math.min(92, Math.max(46, toPdfText(name).length * 3.05 + 10));
          const labelHeight = 10.5;
          const rawLabelX = side === "right" ? dotX + 5 : dotX - labelWidth - 5;
          const labelX = clampPdfValue(rawLabelX, margin + 4, pageWidth - margin - labelWidth - 4);
          const previousLabelY = labelTracks[side][labelTracks[side].length - 1];
          const minLabelY = mapTop + 6;
          const maxLabelY = mapTop + mapHeight - labelHeight - 6;
          const rawLabelY = Number.isFinite(previousLabelY)
            ? Math.max(dotY - labelHeight / 2, previousLabelY + labelHeight + 1.5)
            : dotY - labelHeight / 2;
          const labelY = clampPdfValue(rawLabelY, minLabelY, maxLabelY);
          const connectorX = side === "right" ? labelX : labelX + labelWidth;

          labelTracks[side].push(labelY);
          commands.push(line(dotX, dotY, connectorX, labelY + labelHeight / 2, "0.70 0.73 0.78"));
          commands.push(rect(labelX, labelY, labelWidth, labelHeight, "1 1 1"));
          commands.push(strokeRect(labelX, labelY, labelWidth, labelHeight, "0.78 0.81 0.86"));
          commands.push(text(name, labelX + 3, labelY + 7.5, 5.8, "F2"));
        });
    });
  }

  pages.push(commands);

  const objects = [];
  const addObject = content => {
    objects.push(content);
    return objects.length;
  };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];

  pages.forEach((pageCommands, pageIndex) => {
    const pageNumber = text(`Pagina ${pageIndex + 1} di ${pages.length}`, pageWidth - 110, pageHeight - 22, 8);
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
  const [tableSeatDrafts, setTableSeatDrafts] = useState({});
  const [guestSearch, setGuestSearch] = useState("");
  const [guestListMode, setGuestListMode] = useState("unassigned");
  const [seatGuestSearch, setSeatGuestSearch] = useState("");
  const [draggingTableId, setDraggingTableId] = useState("");
  const [personDragTarget, setPersonDragTarget] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [pendingFamilyMove, setPendingFamilyMove] = useState(null);
  const [pendingSeatRemoval, setPendingSeatRemoval] = useState(null);
  const [pendingSeatSwap, setPendingSeatSwap] = useState(null);
  const [planner, setPlanner] = useState(loadTablePlanner);
  const token = localStorage.getItem("adminToken");

  const attendees = useMemo(() => buildTableAttendees(participants), [participants]);
  const hasTablesConfigured = hasTableCountValue(planner.tableCount);
  const tableShape = normalizeTableShape(planner.tableShape);
  const tableSeats = useMemo(
    () => normalizeTableSeats(planner.tableSeats, planner.tableCount, planner.seatsPerTable),
    [planner.tableCount, planner.seatsPerTable, planner.tableSeats]
  );
  const tableNames = useMemo(
    () => normalizeTableNames(planner.tableNames, planner.tableCount),
    [planner.tableCount, planner.tableNames]
  );
  const rawTablePositions = useMemo(
    () => normalizeTablePositions(planner.tablePositions, planner.tableCount),
    [planner.tableCount, planner.tablePositions]
  );
  const tablePositions = useMemo(
    () => resolveTablePositions(tableSeats, rawTablePositions),
    [rawTablePositions, tableSeats]
  );
  const effectiveAssignments = useMemo(
    () => sanitizeAssignments(attendees, planner.assignments, tableSeats),
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
      label: `${person.name} - ${tableName} (${person.familyName}, ${person.groupLabel})`,
    };
  }), [attendees, effectiveAssignments, tableNames]);
  const filteredSeatPeopleOptions = useMemo(() => {
    const search = seatGuestSearch.trim().toLowerCase();

    if (!search) {
      return peopleOptions;
    }

    return peopleOptions.filter(option => option.label.toLowerCase().includes(search));
  }, [peopleOptions, seatGuestSearch]);
  const visibleUnassigned = useMemo(() => {
    const search = guestSearch.trim().toLowerCase();

    if (!search) {
      return tablePlan.unassigned;
    }

    return tablePlan.unassigned.filter(person =>
      [person.name, person.familyName, person.groupLabel, person.seatLabel, person.foodDetails]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [guestSearch, tablePlan.unassigned]);
  const positionedGuests = useMemo(() =>
    tablePlan.tables.flatMap(table =>
      table.slots
        .filter(slot => slot.person)
        .map(slot => ({
          ...slot.person,
          tableId: table.id,
          tableName: table.name,
          seatNumber: slot.id + 1,
          positionLabel: `${table.name} - posto ${slot.id + 1}`,
        }))
    ), [tablePlan.tables]);
  const visiblePositionedGuests = useMemo(() => {
    const search = guestSearch.trim().toLowerCase();

    if (!search) {
      return positionedGuests;
    }

    return positionedGuests.filter(person =>
      [person.name, person.familyName, person.groupLabel, person.seatLabel, person.foodDetails, person.positionLabel]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [guestSearch, positionedGuests]);
  const visibleSidebarGuests = guestListMode === "positioned" ? visiblePositionedGuests : visibleUnassigned;
  const addTablePosition = useMemo(() => {
    const nextSeats = [...tableSeats, clampNumber(planner.seatsPerTable, 1, 80, 8)];

    return findOpenTablePosition(getDefaultTablePosition(tableSeats.length), String(nextSeats.length), nextSeats, tablePositions);
  }, [planner.seatsPerTable, tablePositions, tableSeats]);
  const canvasSize = useMemo(() => {
    const tableBounds = tableSeats.map((seats, index) =>
      getTableBounds(tablePositions[String(index + 1)] || getDefaultTablePosition(index), seats)
    );
    const addTableBounds = getTableBounds(addTablePosition, clampNumber(planner.seatsPerTable, 1, 80, 8));
    const bounds = [...tableBounds, addTableBounds];
    const width = bounds.reduce((max, bound) => Math.max(max, bound.x + bound.width + 48), 860);
    const height = bounds.reduce((max, bound) => Math.max(max, bound.y + bound.height + 48), 520);

    return { width, height };
  }, [addTablePosition, planner.seatsPerTable, tablePositions, tableSeats]);

  const loadParticipants = useCallback(async ({ clearOnError = false, showLoading = false } = {}) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/rsvps", {
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Caricamento non riuscito");

      const result = await res.json();

      setParticipants(result.data || []);
      setError("");
    } catch {
      setError("Non sono riuscito a caricare gli invitati.");

      if (clearOnError) {
        setParticipants([]);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadParticipants({ clearOnError: true, showLoading: true });

    const refreshParticipants = () => {
      loadParticipants();
    };
    const refreshWhenVisible = () => {
      if (!document.hidden) {
        refreshParticipants();
      }
    };
    const refreshFromStorage = event => {
      if (event.key === rsvpDataVersionStorageKey) {
        refreshParticipants();
      }
    };

    window.addEventListener(rsvpDataChangedEventName, refreshParticipants);
    window.addEventListener("focus", refreshParticipants);
    window.addEventListener("storage", refreshFromStorage);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener(rsvpDataChangedEventName, refreshParticipants);
      window.removeEventListener("focus", refreshParticipants);
      window.removeEventListener("storage", refreshFromStorage);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadParticipants]);

  useEffect(() => {
    if (loading) {
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
  }, [effectiveAssignments, effectiveSeatPositions, hasTablesConfigured, loading, planner, tableNames, tablePositions, tableSeats]);

  const clearCapacityFeedback = useCallback(() => {
    setNotice(prev => prev === tableCapacityErrorMessage ? "" : prev);
    setMoveFeedback(prev => {
      const nextEntries = Object.entries(prev).filter(([, feedback]) =>
        feedback?.message !== tableCapacityErrorMessage
      );

      return nextEntries.length === Object.keys(prev).length ? prev : Object.fromEntries(nextEntries);
    });
  }, []);

  const closeTableDetail = useCallback(() => {
    setSelectedTableId("");
    setExpandedPanelId("");
    setSeatGuestSearch("");
  }, []);

  const ensureTableDetailInView = useCallback(() => {
    const canvas = plannerCanvasRef.current;

    if (!canvas) return;

    const popover = canvas.querySelector(".table-detail-popover");

    if (!(popover instanceof HTMLElement)) return;

    const padding = 16;

    popover.style.setProperty("--popover-shift-x", "0px");

    requestAnimationFrame(() => {
      const canvasRect = canvas.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const maxScrollLeft = Math.max(0, canvas.scrollWidth - canvas.clientWidth);
      const maxScrollTop = Math.max(0, canvas.scrollHeight - canvas.clientHeight);
      let nextScrollLeft = canvas.scrollLeft;
      let nextScrollTop = canvas.scrollTop;

      if (popoverRect.left < canvasRect.left + padding) {
        nextScrollLeft -= canvasRect.left + padding - popoverRect.left;
      } else if (popoverRect.right > canvasRect.right - padding) {
        nextScrollLeft += popoverRect.right - (canvasRect.right - padding);
      }

      if (popoverRect.top < canvasRect.top + padding) {
        nextScrollTop -= canvasRect.top + padding - popoverRect.top;
      } else if (popoverRect.bottom > canvasRect.bottom - padding) {
        nextScrollTop += popoverRect.bottom - (canvasRect.bottom - padding);
      }

      canvas.scrollTo({
        left: Math.min(maxScrollLeft, Math.max(0, nextScrollLeft)),
        top: Math.min(maxScrollTop, Math.max(0, nextScrollTop)),
      });

      requestAnimationFrame(() => {
        const updatedCanvasRect = canvas.getBoundingClientRect();
        const updatedPopoverRect = popover.getBoundingClientRect();
        let popoverShiftX = 0;

        if (updatedPopoverRect.left < updatedCanvasRect.left + padding) {
          popoverShiftX = updatedCanvasRect.left + padding - updatedPopoverRect.left;
        } else if (updatedPopoverRect.right > updatedCanvasRect.right - padding) {
          popoverShiftX = -(updatedPopoverRect.right - (updatedCanvasRect.right - padding));
        }

        if (popoverShiftX) {
          popover.style.setProperty("--popover-shift-x", `${popoverShiftX}px`);
        }
      });
    });
  }, []);

  useEffect(() => {
    document.addEventListener("pointerdown", clearCapacityFeedback, true);

    return () => {
      document.removeEventListener("pointerdown", clearCapacityFeedback, true);
    };
  }, [clearCapacityFeedback]);

  useEffect(() => {
    if (!selectedTableId) {
      return;
    }

    ensureTableDetailInView();
  }, [ensureTableDetailInView, expandedPanelId, selectedTableId]);

  useEffect(() => {
    const closeDetailOnOutsidePointerDown = event => {
      if (!selectedTableId || !(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest(".table-detail-popover, .table-map-card")) {
        return;
      }

      closeTableDetail();
    };

    document.addEventListener("pointerdown", closeDetailOnOutsidePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", closeDetailOnOutsidePointerDown, true);
    };
  }, [closeTableDetail, selectedTableId]);

  const updateSingleTableSeats = (tableIndex, value) => {
    setPlanner(prev => {
      const nextSeats = normalizeTableSeats(prev.tableSeats, prev.tableCount, prev.seatsPerTable);
      nextSeats[tableIndex] = clampNumber(value, 1, 80);
      const tablePositions = resolveTablePositions(
        nextSeats,
        normalizeTablePositions(prev.tablePositions, prev.tableCount)
      );

      return { ...prev, tableSeats: nextSeats, tablePositions };
    });
  };

  const updateSingleTableSeatDraft = (tableIndex, value) => {
    const numericValue = value.replace(/\D/g, "");

    setTableSeatDrafts(prev => ({ ...prev, [tableIndex]: numericValue }));
  };

  const clearSingleTableSeatDraft = tableIndex => {
    setTableSeatDrafts(prev => {
      if (!(tableIndex in prev)) {
        return prev;
      }

      const next = { ...prev };
      delete next[tableIndex];
      return next;
    });
  };

  const commitSingleTableSeatDraft = (tableIndex, value) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      clearSingleTableSeatDraft(tableIndex);
      return;
    }

    updateSingleTableSeats(tableIndex, numericValue);
    clearSingleTableSeatDraft(tableIndex);
  };

  const updateTableCount = value => {
    const nextCount = clampTableCount(value);

    setTableSeatDrafts(prev => {
      const nextEntries = Object.entries(prev).filter(([index]) => Number(index) < nextCount);

      return nextEntries.length === Object.keys(prev).length ? prev : Object.fromEntries(nextEntries);
    });
    setSelectedTableId(prev => Number(prev) > nextCount ? "" : prev);
    setExpandedPanelId(prev => {
      const seatMatch = String(prev).match(/^seat-(\d+)-/);

      return seatMatch && Number(seatMatch[1]) > nextCount ? "" : prev;
    });

    setPlanner(prev => {
      const currentSeats = normalizeTableSeats(prev.tableSeats, prev.tableCount, prev.seatsPerTable);
      const currentCount = currentSeats.length;

      if (nextCount === currentCount) {
        return prev;
      }

      const currentNames = normalizeTableNames(prev.tableNames, currentCount);
      const currentPositions = normalizeTablePositions(prev.tablePositions, currentCount);
      const defaultSeats = clampNumber(prev.seatsPerTable, 1, 80, 8);
      const tableSeats = Array.from({ length: nextCount }, (_, index) => currentSeats[index] || defaultSeats);
      const tableNames = Array.from({ length: nextCount }, (_, index) => currentNames[index] || `Tavolo ${index + 1}`);
      const preferredPositions = Array.from({ length: nextCount }, (_, index) => {
        const tableId = String(index + 1);

        return [
          tableId,
          currentPositions[tableId] || getDefaultTablePosition(index),
        ];
      }).reduce((positions, [tableId, position]) => {
        positions[tableId] = position;
        return positions;
      }, {});
      const tablePositions = resolveTablePositions(tableSeats, preferredPositions);
      const assignments = {};

      Object.entries(prev.assignments || {}).forEach(([attendeeId, assignedTableId]) => {
        const assignedIndex = Number(assignedTableId) - 1;

        if (assignedIndex >= 0 && assignedIndex < nextCount) {
          assignments[attendeeId] = assignedTableId;
        }
      });

      const seatPositions = Object.fromEntries(
        Object.entries(prev.seatPositions || {}).filter(([attendeeId]) => assignments[attendeeId])
      );

      return { ...prev, tableCount: nextCount, tableSeats, tableNames, tablePositions, assignments, seatPositions };
    });
  };

  const updateTableShape = value => {
    setPlanner(prev => ({ ...prev, tableShape: normalizeTableShape(value) }));
  };

  const addTable = () => {
    const nextSelectedTableId = String(Math.min(80, tableSeats.length + 1));

    setPlanner(prev => {
      const currentSeats = normalizeTableSeats(prev.tableSeats, prev.tableCount, prev.seatsPerTable);
      const currentCount = currentSeats.length;
      const nextCount = Math.min(80, currentCount + 1);

      if (nextCount === currentCount) {
        return prev;
      }

      const nextTableId = String(nextCount);
      const nextNames = normalizeTableNames(prev.tableNames, currentCount);
      const nextPositions = normalizeTablePositions(prev.tablePositions, currentCount);
      const nextSeats = [...currentSeats, clampNumber(prev.seatsPerTable, 1, 80, 8)];

      nextNames.push(`Tavolo ${nextCount}`);
      nextPositions[nextTableId] = findOpenTablePosition(
        getDefaultTablePosition(currentCount),
        nextTableId,
        nextSeats,
        nextPositions
      );

      return {
        ...prev,
        tableCount: nextCount,
        tableNames: nextNames,
        tablePositions: resolveTablePositions(nextSeats, nextPositions),
        tableSeats: nextSeats,
      };
    });
    setSelectedTableId(nextSelectedTableId);
  };

  const deleteTable = tableId => {
    const deleteIndex = Number(tableId) - 1;

    if (deleteIndex < 0) return;

    setSelectedTableId("");
    setExpandedPanelId("");
    setMoveFeedback({});

    setPlanner(prev => {
      const currentSeats = normalizeTableSeats(prev.tableSeats, prev.tableCount, prev.seatsPerTable);
      const currentNames = normalizeTableNames(prev.tableNames, currentSeats.length);
      const currentPositions = normalizeTablePositions(prev.tablePositions, currentSeats.length);

      if (!currentSeats[deleteIndex]) {
        return prev;
      }

      const tableCount = currentSeats.length - 1;
      const tableSeats = currentSeats.filter((_, index) => index !== deleteIndex);
      const tableNames = currentNames.filter((_, index) => index !== deleteIndex);
      const preferredPositions = {};

      currentSeats.forEach((_, index) => {
        if (index === deleteIndex) return;

        const nextIndex = index > deleteIndex ? index - 1 : index;
        preferredPositions[String(nextIndex + 1)] = currentPositions[String(index + 1)] || getDefaultTablePosition(nextIndex);
      });
      const tablePositions = resolveTablePositions(tableSeats, preferredPositions);

      const assignments = {};
      Object.entries(prev.assignments || {}).forEach(([attendeeId, assignedTableId]) => {
        const assignedIndex = Number(assignedTableId) - 1;

        if (assignedIndex === deleteIndex || assignedIndex < 0 || assignedIndex >= currentSeats.length) {
          return;
        }

        assignments[attendeeId] = String(assignedIndex > deleteIndex ? assignedIndex : assignedIndex + 1);
      });
      const seatPositions = Object.fromEntries(
        Object.entries(prev.seatPositions || {}).filter(([attendeeId]) => assignments[attendeeId])
      );

      return { ...prev, tableCount, tableSeats, tableNames, tablePositions, assignments, seatPositions };
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
    setPlanner(prev => {
      const currentSeats = normalizeTableSeats(prev.tableSeats, prev.tableCount, prev.seatsPerTable);
      const currentPositions = normalizeTablePositions(prev.tablePositions, prev.tableCount);
      const targetPosition = {
        x: Math.max(0, Math.round(position.x)),
        y: Math.max(0, Math.round(position.y)),
      };
      const preferredPositions = {
        ...currentPositions,
        [tableId]: targetPosition,
      };

      return {
        ...prev,
        tablePositions: resolveTablePositions(currentSeats, preferredPositions, tableId),
      };
    });
  };

  const canStartTableDrag = event =>
    !event.target.closest("input, select, textarea, button, .table-detail-popover, .seat-card, .seat-person-button, .unassigned-card");

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

  const movePerson = (personId, tableId, options = {}) => {
    const person = attendees.find(attendee => attendee.id === personId);

    if (!person) return;

    const familyMembers = attendees.filter(attendee => attendee.familyId === person.familyId);
    const preferredSeatIndex = Number(options.seatIndex);
    const hasPreferredSeat = Number.isInteger(preferredSeatIndex) && preferredSeatIndex >= 0;
    const currentTableId = effectiveAssignments[person.id];
    const currentSeatIndex = effectiveSeatPositions[person.id];
    const optionFamilyMemberIds = Array.isArray(options.familyMemberIds)
      ? new Set(options.familyMemberIds)
      : null;
    const isCrossTableMove = Boolean(tableId && currentTableId && currentTableId !== tableId);
    const sourceTableFamilyMembers = !currentTableId || isCrossTableMove || options.familySelectionScope === "all"
      ? familyMembers
      : familyMembers.filter(attendee => effectiveAssignments[attendee.id] === currentTableId);
    const familyMembersForOperation = optionFamilyMemberIds
      ? familyMembers.filter(attendee => optionFamilyMemberIds.has(attendee.id))
      : sourceTableFamilyMembers;
    const familyMovePeople = familyMembersForOperation.some(attendee => attendee.id === person.id)
      ? familyMembersForOperation
      : [person, ...familyMembersForOperation];

    if (tableId && currentTableId === tableId && !hasPreferredSeat) {
      return;
    }

    if (tableId && currentTableId === tableId && hasPreferredSeat && currentSeatIndex === preferredSeatIndex) {
      return;
    }

    const isSameTableSeatMove = Boolean(
      tableId &&
      currentTableId === tableId &&
      hasPreferredSeat &&
      currentSeatIndex !== preferredSeatIndex
    );

    const isFamilyMove = options.scope === "family" && familyMovePeople.length > 1;
    const movingPeople = isFamilyMove
      ? [person, ...familyMovePeople.filter(attendee => attendee.id !== person.id)]
      : [person];
    const movingPeopleIds = new Set(movingPeople.map(attendee => attendee.id));
    const feedbackKeys = [
      ...movingPeople.map(attendee => attendee.id),
      ...(isFamilyMove ? [person.familyId] : []),
      ...(Array.isArray(options.feedbackKeys) ? options.feedbackKeys : []),
      options.feedbackKey,
    ].filter((key, index, all) => key && all.indexOf(key) === index);
    const setMoveErrorFeedback = message => {
      const feedback = { type: "error", message };

      setMoveFeedback(prevFeedback => ({
        ...prevFeedback,
        ...Object.fromEntries(feedbackKeys.map(key => [key, feedback])),
      }));
      setNotice(message);
    };
    const targetPerson = tableId && hasPreferredSeat
      ? attendees.find(attendee =>
        !movingPeopleIds.has(attendee.id) &&
        effectiveAssignments[attendee.id] === tableId &&
        effectiveSeatPositions[attendee.id] === preferredSeatIndex
      )
      : null;
    let shouldConfirmTargetRemoval = false;

    if (!options.scope && familyMovePeople.length > 1 && !isSameTableSeatMove) {
      const mainGuest = familyMembers.find(attendee => attendee.seatLabel === "Invito principale") || familyMembers[0];

      setPendingFamilyMove({
        personId,
        tableId,
        options: {
          ...options,
          familyMemberIds: familyMovePeople.map(attendee => attendee.id),
        },
        personName: person.name,
        familyName: mainGuest.name || person.familyName,
      });
      return;
    }

    if (tableId) {
      const tableIndex = Number(tableId) - 1;
      const tableCapacity = tableSeats[tableIndex] || 0;

      if (!tableCapacity) {
        setMoveErrorFeedback(`Il Tavolo ${tableId} non esiste.`);
        return;
      }

      if (hasPreferredSeat && preferredSeatIndex >= tableCapacity) {
        setMoveErrorFeedback(tableCapacityErrorMessage);
        return;
      }

      const assignedToTargetTable = attendees.filter(attendee =>
        effectiveAssignments[attendee.id] === tableId && !movingPeopleIds.has(attendee.id)
      ).length;
      const availableSeats = tableCapacity - assignedToTargetTable;
      const canFitByRemovingTarget = Boolean(targetPerson && availableSeats + 1 >= movingPeople.length);

      if (availableSeats < movingPeople.length && !canFitByRemovingTarget) {
        setMoveErrorFeedback(tableCapacityErrorMessage);
        return;
      }

      shouldConfirmTargetRemoval = Boolean(targetPerson && availableSeats < movingPeople.length);
    }

    if (tableId && hasPreferredSeat && !options.confirmSwap && !isSameTableSeatMove) {
      if (targetPerson && shouldConfirmTargetRemoval) {
        setPendingSeatSwap({
          personId,
          tableId,
          options,
          seatIndex: preferredSeatIndex,
          personName: person.name,
          targetPersonName: targetPerson.name,
        });
        return;
      }
    }

    setPlanner(prev => {
      const currentTableSeats = normalizeTableSeats(prev.tableSeats, prev.tableCount, prev.seatsPerTable);
      const assignments = { ...sanitizeAssignments(attendees, prev.assignments, currentTableSeats) };
      const seatPositions = { ...normalizeSeatPositions(attendees, assignments, prev.seatPositions, currentTableSeats) };
      const setLocalFeedback = feedback => {
        setMoveFeedback(prevFeedback => ({
          ...prevFeedback,
          ...Object.fromEntries(feedbackKeys.map(key => [key, feedback])),
        }));
      };
      const finalizeTableMove = (peopleToVerify = movingPeople) => {
        const verifiedAssignments = sanitizeAssignments(attendees, assignments, currentTableSeats);
        const verifiedSeatPositions = normalizeSeatPositions(attendees, verifiedAssignments, seatPositions, currentTableSeats);
        const tableIndex = Number(tableId) - 1;
        const tableCapacity = currentTableSeats[tableIndex] || 0;
        const isComplete = peopleToVerify.every(attendee => {
          const seatPosition = verifiedSeatPositions[attendee.id];

          return (
            verifiedAssignments[attendee.id] === tableId &&
            Number.isInteger(seatPosition) &&
            seatPosition >= 0 &&
            seatPosition < tableCapacity
          );
        });

        if (!isComplete) {
          const feedback = { type: "error", message: tableCapacityErrorMessage };

          setLocalFeedback(feedback);
          setNotice(tableCapacityErrorMessage);
          return null;
        }

        return {
          assignments: verifiedAssignments,
          seatPositions: verifiedSeatPositions,
        };
      };
      const finalizeRemoval = () => {
        const verifiedAssignments = sanitizeAssignments(attendees, assignments, currentTableSeats);
        const verifiedSeatPositions = normalizeSeatPositions(attendees, verifiedAssignments, seatPositions, currentTableSeats);
        const isComplete = movingPeople.every(attendee => !verifiedAssignments[attendee.id]);

        if (!isComplete) {
          const feedback = { type: "error", message: "Operazione non completata. Riprova." };

          setLocalFeedback(feedback);
          setNotice(feedback.message);
          return null;
        }

        return {
          assignments: verifiedAssignments,
          seatPositions: verifiedSeatPositions,
        };
      };

      setNotice("");
      movingPeople.forEach(attendee => {
        delete assignments[attendee.id];
        delete seatPositions[attendee.id];
      });

      if (tableId) {
        const tableIndex = Number(tableId) - 1;
        const tableCapacity = currentTableSeats[tableIndex] || 0;

        if (!tableCapacity) {
          setLocalFeedback({ type: "error", message: `Il Tavolo ${tableId} non esiste.` });
          return prev;
        }

        if (hasPreferredSeat && preferredSeatIndex >= tableCapacity) {
          const feedback = { type: "error", message: tableCapacityErrorMessage };

          setLocalFeedback(feedback);
          setNotice(tableCapacityErrorMessage);
          return prev;
        }

        const targetSeatOccupant = hasPreferredSeat
          ? attendees.find(attendee =>
            !movingPeopleIds.has(attendee.id) &&
            assignments[attendee.id] === tableId &&
            seatPositions[attendee.id] === preferredSeatIndex
          )
          : null;
        const swapOccupant = hasPreferredSeat && options.confirmSwap ? targetSeatOccupant : null;
        const assignedToTargetTable = attendees.filter(attendee => assignments[attendee.id] === tableId).length;
        const availableSeats = tableCapacity - assignedToTargetTable;
        const canRelocateTargetSeatOccupant = Boolean(
          targetSeatOccupant &&
          !options.confirmSwap &&
          availableSeats >= movingPeople.length
        );
        const availableSeatsForMove = availableSeats + (swapOccupant ? 1 : 0);

        if (availableSeatsForMove < movingPeople.length) {
          const feedback = { type: "error", message: tableCapacityErrorMessage };

          setLocalFeedback(feedback);
          setNotice(tableCapacityErrorMessage);
          return prev;
        }

        const occupiedSeats = new Set(
          attendees
            .filter(attendee => assignments[attendee.id] === tableId)
            .map(attendee => seatPositions[attendee.id])
            .filter(position => Number.isInteger(position) && position >= 0 && position < tableCapacity)
        );
        const findNextSeat = () => {
          let nextSeat = 0;

          while (occupiedSeats.has(nextSeat) && nextSeat < tableCapacity) {
            nextSeat += 1;
          }

          return nextSeat;
        };
        const removeOccupantFromSeat = seatIndex => {
          const occupant = attendees.find(attendee =>
            assignments[attendee.id] === tableId && seatPositions[attendee.id] === seatIndex
          );

          if (!occupant) return null;

          occupiedSeats.delete(seatIndex);
          delete assignments[occupant.id];
          delete seatPositions[occupant.id];

          return occupant;
        };

        if (isSameTableSeatMove && targetPerson && !canRelocateTargetSeatOccupant) {
          assignments[person.id] = tableId;
          seatPositions[person.id] = preferredSeatIndex;
          assignments[targetPerson.id] = tableId;
          seatPositions[targetPerson.id] = currentSeatIndex;
          const finalized = finalizeTableMove([person, targetPerson]);

          if (!finalized) {
            return prev;
          }

          setExpandedPanelId(`seat-${tableId}-${preferredSeatIndex}`);

          return { ...prev, assignments: finalized.assignments, seatPositions: finalized.seatPositions };
        }

        if (hasPreferredSeat && occupiedSeats.has(preferredSeatIndex) && !options.confirmSwap && !canRelocateTargetSeatOccupant) {
          setLocalFeedback({
            type: "error",
            message: `Il posto ${preferredSeatIndex + 1} è già occupato.`,
          });
          return prev;
        }

        movingPeople.forEach((movingPerson, index) => {
          let targetSeat;

          if (index === 0 && hasPreferredSeat) {
            if (occupiedSeats.has(preferredSeatIndex)) {
              if (canRelocateTargetSeatOccupant && targetSeatOccupant) {
                const relocationSeat = findNextSeat();

                seatPositions[targetSeatOccupant.id] = relocationSeat;
                occupiedSeats.add(relocationSeat);
                occupiedSeats.delete(preferredSeatIndex);
              } else {
                removeOccupantFromSeat(preferredSeatIndex);
              }
            }

            if (!occupiedSeats.has(preferredSeatIndex)) {
              targetSeat = preferredSeatIndex;
            }
          }

          if (!Number.isInteger(targetSeat)) {
            targetSeat = findNextSeat();
          }

          assignments[movingPerson.id] = tableId;
          seatPositions[movingPerson.id] = targetSeat;
          occupiedSeats.add(targetSeat);
        });

        const finalized = finalizeTableMove();

        if (!finalized) {
          return prev;
        }

        setExpandedPanelId("");
        return { ...prev, assignments: finalized.assignments, seatPositions: finalized.seatPositions };
      } else {
        const finalized = finalizeRemoval();

        if (!finalized) {
          return prev;
        }

        return { ...prev, assignments: finalized.assignments, seatPositions: finalized.seatPositions };
      }
    });
  };

  const confirmPendingFamilyMove = scope => {
    if (!pendingFamilyMove) return;

    const { personId, tableId, options } = pendingFamilyMove;

    setPendingFamilyMove(null);
    movePerson(personId, tableId, { ...options, scope });
  };

  const requestRemovePersonFromSeat = (person, table) => {
    const familyMembers = attendees.filter(attendee => attendee.familyId === person.familyId);
    const tableFamilyMembers = familyMembers.filter(attendee => effectiveAssignments[attendee.id] === table.id);
    const mainGuest = familyMembers.find(attendee => attendee.seatLabel === "Invito principale") || familyMembers[0];

    setPendingSeatRemoval({
      personId: person.id,
      personName: person.name,
      familyName: mainGuest?.name || person.familyName,
      familyMemberIds: tableFamilyMembers.map(attendee => attendee.id),
      hasFamily: tableFamilyMembers.length > 1,
      tableName: table.name,
    });
  };

  const confirmPendingSeatRemoval = (scope = "single") => {
    if (!pendingSeatRemoval) return;

    const { personId, familyMemberIds } = pendingSeatRemoval;

    setPendingSeatRemoval(null);
    movePerson(personId, "", { scope, familyMemberIds });
  };

  const confirmPendingSeatSwap = () => {
    if (!pendingSeatSwap) return;

    const { personId, tableId, options } = pendingSeatSwap;

    setPendingSeatSwap(null);
    movePerson(personId, tableId, { ...options, confirmSwap: true });
  };

  const clearAssignments = () => {
    setExpandedPanelId("");
    setMoveFeedback({});
    setPendingFamilyMove(null);
    setPendingSeatRemoval(null);
    setPendingSeatSwap(null);
    setNotice("");
    setPlanner(prev => ({ ...prev, assignments: {}, seatPositions: {} }));
  };

  const handleDownloadTablesPdf = () => {
    setNotice("");
    const pdf = buildTablesPdf({
      tables: tablePlan.tables,
      unassigned: tablePlan.unassigned,
      totals: {
        tables: tablePlan.tables.length,
        capacity: totalCapacity,
        assigned: assignedPeople,
        unassigned: tablePlan.unassigned.length,
      },
    });
    const pdfBytes = new TextEncoder().encode(pdf);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const suffix = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `organizzazione-tavoli-${suffix}.pdf`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadTablesMapPdf = () => {
    setNotice("");
    const pdf = buildTablesMapPdf({
      tables: tablePlan.tables,
      tablePositions,
      tableShape,
      totals: {
        tables: tablePlan.tables.length,
        capacity: totalCapacity,
        assigned: assignedPeople,
        unassigned: tablePlan.unassigned.length,
      },
    });
    const pdfBytes = new TextEncoder().encode(pdf);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const suffix = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `piantina-tavoli-${suffix}.pdf`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const assignPersonToSeat = (personId, tableId, seatIndex) => {
    const person = attendees.find(attendee => attendee.id === personId);

    if (!person) return;

    movePerson(person.id, tableId, {
      feedbackKeys: [`table-${tableId}`, `empty-${tableId}-${seatIndex}`],
      seatIndex,
    });
  };

  const startPersonDrag = (event, personId, dragOptions = {}) => {
    event.stopPropagation();
    setPersonDragTarget(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", personId);
    event.dataTransfer.setData(personDragOptionsMimeType, JSON.stringify(dragOptions));
  };

  const allowPersonDrop = event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const setPersonDropTarget = (tableId, seatIndex = null) => {
    setPersonDragTarget(prev => (
      prev?.tableId === tableId && prev?.seatIndex === seatIndex
        ? prev
        : { tableId, seatIndex }
    ));
  };

  const clearPersonDropTarget = () => {
    setPersonDragTarget(null);
  };

  const handlePersonDragOverTable = (event, tableId) => {
    allowPersonDrop(event);
    setPersonDropTarget(tableId, null);
  };

  const handlePersonDragOverSeat = (event, tableId, seatIndex) => {
    event.stopPropagation();
    allowPersonDrop(event);
    setPersonDropTarget(tableId, seatIndex);
  };

  const handlePersonDragLeaveTable = (event, tableId) => {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setPersonDragTarget(prev => (prev?.tableId === tableId ? null : prev));
  };

  const dropPersonOnTable = (event, tableId, seatIndex) => {
    event.preventDefault();
    event.stopPropagation();
    clearPersonDropTarget();

    const personId = event.dataTransfer.getData("text/plain");
    let dragOptions = {};

    try {
      dragOptions = JSON.parse(event.dataTransfer.getData(personDragOptionsMimeType) || "{}");
    } catch {
      dragOptions = {};
    }

    if (!personId) return;

    movePerson(personId, tableId, {
      ...dragOptions,
      seatIndex,
      feedbackKeys: [
        `table-${tableId}`,
        Number.isInteger(seatIndex) ? `empty-${tableId}-${seatIndex}` : "",
      ],
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
          <span className="table-action-tooltip">
            <button
              type="button"
              className="primary-table-action"
              onClick={distributeTables}
              aria-describedby="distribute-tables-help"
            >
              <RefreshCw size={17} aria-hidden="true" />
              Distribuisci
            </button>
            <span id="distribute-tables-help" className="table-action-tooltip-message" role="tooltip">
              Distribuisce gli invitati in base al gruppo assegnato. Le famiglie restano allo stesso tavolo quando la capienza lo permette; i posti rimasti possono essere completati con altri gruppi.
            </span>
          </span>
          <button type="button" className="danger-table-action" onClick={clearAssignments}>
            <Trash2 size={17} aria-hidden="true" />
            Svuota
          </button>
          <button type="button" className="outline-table-action" onClick={handleDownloadTablesPdf}>
            <Download size={17} aria-hidden="true" />
            PDF dettagli
          </button>
          <button type="button" className="outline-table-action" onClick={handleDownloadTablesMapPdf}>
            <Download size={17} aria-hidden="true" />
            PDF piantina
          </button>
        </div>
      </header>

      {error && <p className="tables-error">{error}</p>}
      {notice && <p className="tables-error">{notice}</p>}

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

      <section className="planner-toolbar" aria-label="Impostazioni tavoli">
        <label className="table-count-field">
          <span>Numero tavoli</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={tableSeats.length}
            onChange={event => updateTableCount(event.target.value)}
            aria-label="Numero tavoli"
          />
        </label>

        <div className="table-shape-field">
          <span>Forma tavolo</span>
          <div className="table-shape-options" role="group" aria-label="Forma tavolo">
            {tableShapeOptions.map(({ value, label }) => (
              <button
                type="button"
                key={value}
                className={tableShape === value ? "is-active" : ""}
                onClick={() => updateTableShape(value)}
                aria-pressed={tableShape === value}
              >
                {value === "round"
                  ? <Circle size={18} aria-hidden="true" />
                  : <Square size={18} aria-hidden="true" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="planner-layout">
        <aside className="planner-sidebar" aria-label="Controlli e invitati">
          <section className="unassigned-panel">
            <div className="unassigned-panel-header">
              <div>
                <h2>{guestListMode === "positioned" ? "Invitati già posizionati" : "Invitati da posizionare"}</h2>
                <p>
                  {guestListMode === "positioned"
                    ? `${positionedGuests.length} persone già assegnate`
                    : `${tablePlan.unassigned.length} persone non assegnate`}
                </p>
              </div>
              <div className="guest-list-switch" role="group" aria-label="Vista invitati">
                <button
                  type="button"
                  className={guestListMode === "unassigned" ? "is-active" : ""}
                  onClick={() => setGuestListMode("unassigned")}
                  aria-pressed={guestListMode === "unassigned"}
                >
                  Da posizionare
                </button>
                <button
                  type="button"
                  className={guestListMode === "positioned" ? "is-active" : ""}
                  onClick={() => setGuestListMode("positioned")}
                  aria-pressed={guestListMode === "positioned"}
                >
                  Già posizionati
                </button>
              </div>
              <input
                type="search"
                value={guestSearch}
                onChange={event => setGuestSearch(event.target.value)}
                placeholder="Cerca invitato"
              />
            </div>
            <div>
              {visibleSidebarGuests.map(person => {
                const personFeedback = moveFeedback[person.id] || moveFeedback[person.familyId];

                return (
                  <article
                    key={person.id}
                    className="unassigned-card"
                    draggable
                    onDragStart={event => startPersonDrag(event, person.id, { familySelectionScope: "all" })}
                    onDragEnd={clearPersonDropTarget}
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
                    <span>{guestListMode === "positioned" ? person.positionLabel : person.seatLabel}</span>
                    {expandedPanelId === `person-${person.id}` && (
                      <div className="seat-expanded-details">
                        <dl>
                          {guestListMode === "positioned" && (
                            <div>
                              <dt>Posizione</dt>
                              <dd>{person.positionLabel}</dd>
                            </div>
                          )}
                          <div>
                            <dt>Invito</dt>
                            <dd>{person.familyName}</dd>
                          </div>
                          <div>
                            <dt>Gruppo</dt>
                            <dd>{person.groupLabel}</dd>
                          </div>
                          <div>
                            <dt>Intolleranze</dt>
                            <dd>{person.foodDetails}</dd>
                          </div>
                        </dl>
                      </div>
                    )}
                    <select
                      value={guestListMode === "positioned" ? person.tableId : ""}
                      onChange={event => movePerson(person.id, event.target.value, { familySelectionScope: "all" })}
                    >
                      <option value="">Non assegnata</option>
                      {tablePlan.tables.map(table => (
                        <option key={table.id} value={table.id}>{table.name}</option>
                      ))}
                    </select>
                    {personFeedback && (
                      <p className={`seat-action-feedback unassigned-select-feedback ${personFeedback.type}`}>
                        {personFeedback.message}
                      </p>
                    )}
                  </article>
                );
              })}
              {visibleSidebarGuests.length === 0 && (
                <p className="unassigned-empty">
                  {guestListMode === "positioned"
                    ? "Nessun invitato già posizionato da mostrare."
                    : "Nessun invitato da posizionare da mostrare."}
                </p>
              )}
            </div>
          </section>
        </aside>

        <section className="planner-canvas" aria-label="Piantina tavoli" ref={plannerCanvasRef}>
          <section
            className="tables-board"
            style={{
              minWidth: `${canvasSize.width}px`,
              minHeight: `${canvasSize.height}px`,
            }}
          >
            {tablePlan.tables.map(table => {
              const tableIndex = Number(table.id) - 1;
              const isOverCapacity = table.people.length > table.seats;
              const tablePosition = tablePositions[table.id] || getDefaultTablePosition(tableIndex);
              const tableVisualSize = getTableVisualSize(table.seats);
              const tableNodeSize = getTableNodeSize(table.seats);
              const tableDropTarget = personDragTarget?.tableId === table.id ? personDragTarget : null;
              const isTableDropTarget = Boolean(tableDropTarget && tableDropTarget.seatIndex === null);
              const tableSeatInputValue = tableSeatDrafts[tableIndex] ?? String(table.seats);
              const tableFeedback = moveFeedback[`table-${table.id}`];

              return (
                <article
                  className={`table-map-card compact-table-node ${selectedTableId === table.id ? "is-selected" : ""} ${isOverCapacity ? "is-over-capacity" : ""} ${draggingTableId === table.id ? "is-dragging" : ""} ${isTableDropTarget ? "is-person-drop-target" : ""}`}
                  key={table.id}
                  style={{
                    left: `${tablePosition.x}px`,
                    top: `${tablePosition.y}px`,
                    "--table-size": `${tableVisualSize}px`,
                    "--table-node-size": `${tableNodeSize}px`,
                  }}
                  onDragOver={event => handlePersonDragOverTable(event, table.id)}
                  onDragLeave={event => handlePersonDragLeaveTable(event, table.id)}
                  onDrop={event => dropPersonOnTable(event, table.id)}
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

                    setSelectedTableId(prev => (
                      String(expandedPanelId).startsWith(`seat-${table.id}-`)
                        ? table.id
                        : prev === table.id ? "" : table.id
                    ));
                    setExpandedPanelId("");
                    setSeatGuestSearch("");
                  }}
                >
                  <div className={`compact-table-face is-${tableShape}`} role="button" tabIndex={0} aria-label={`${table.name}, ${table.people.length} persone su ${table.seats}`}>
                    <span className="compact-table-core">
                      <input
                        className="table-surface-name-input"
                        value={tableNames[tableIndex] || table.name}
                        onClick={event => event.stopPropagation()}
                        onPointerDown={event => event.stopPropagation()}
                        onChange={event => updateTableName(tableIndex, event.target.value)}
                        onBlur={() => normalizeTableNameOnBlur(tableIndex)}
                        aria-label={`Nome ${table.name}`}
                      />
                      <input
                        className="table-seat-count-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={tableSeatInputValue}
                        onClick={event => event.stopPropagation()}
                        onPointerDown={event => event.stopPropagation()}
                        onChange={event => updateSingleTableSeatDraft(tableIndex, event.target.value)}
                        onBlur={event => {
                          if (event.currentTarget.dataset.cancelSeatDraft === "true") {
                            delete event.currentTarget.dataset.cancelSeatDraft;
                            return;
                          }

                          if (tableSeatDrafts[tableIndex] !== undefined) {
                            commitSingleTableSeatDraft(tableIndex, event.currentTarget.value);
                          }
                        }}
                        onKeyDown={event => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }

                          if (event.key === "Escape") {
                            event.preventDefault();
                            event.currentTarget.dataset.cancelSeatDraft = "true";
                            clearSingleTableSeatDraft(tableIndex);
                            event.currentTarget.blur();
                          }
                        }}
                        aria-label={`Posti ${table.name}`}
                      />
                      <small>posti</small>
                    </span>
                    <span className="compact-seat-ring">
                      {table.slots.slice(0, table.seats).map((slot, index) => {
                        const seatPosition = getSeatPosition(index, table.seats, tableShape);
                        const seatPanelId = `seat-${table.id}-${slot.id}`;

                        return (
                          <button
                            type="button"
                            key={slot.id}
                            className={`compact-seat-dot ${slot.person ? "is-filled" : ""} ${tableDropTarget?.seatIndex === slot.id ? "is-seat-drop-target" : ""}`}
                            draggable={Boolean(slot.person)}
                            onClick={event => {
                              event.stopPropagation();
                              if (expandedPanelId === seatPanelId) {
                                closeTableDetail();
                                return;
                              }

                              setSelectedTableId(table.id);
                              setSeatGuestSearch("");
                              setExpandedPanelId(seatPanelId);
                            }}
                            onPointerDown={event => event.stopPropagation()}
                            onDragStart={event => slot.person && startPersonDrag(event, slot.person.id)}
                            onDragOver={event => handlePersonDragOverSeat(event, table.id, slot.id)}
                            onDragEnd={clearPersonDropTarget}
                            onDrop={event => dropPersonOnTable(event, table.id, slot.id)}
                            aria-label={slot.person ? `Posto ${slot.id + 1}, ${slot.person.name}` : `Posto ${slot.id + 1} libero`}
                            style={{
                              "--seat-x": `${seatPosition.x}%`,
                              "--seat-y": `${seatPosition.y}%`,
                              "--seat-name-z": String(20 + (index % 8)),
                              ...(slot.person ? { backgroundColor: slot.person.color.border } : {}),
                            }}
                          >
                            {slot.person && <span>{slot.person.name}</span>}
                          </button>
                        );
                      })}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="compact-table-count"
                    onPointerDown={event => event.stopPropagation()}
                    onClick={event => {
                      event.stopPropagation();
                      if (selectedTableId === table.id && !String(expandedPanelId).startsWith(`seat-${table.id}-`)) {
                        closeTableDetail();
                        return;
                      }

                      setSelectedTableId(table.id);
                      setExpandedPanelId("");
                      setSeatGuestSearch("");
                    }}
                    aria-label={`Seleziona ${table.name}`}
                  >
                    {table.people.length} / {table.seats}
                  </button>
                  {tableFeedback ? (
                    <span className={`table-drop-feedback ${tableFeedback.type}`}>{tableFeedback.message}</span>
                  ) : (
                    isOverCapacity && <span className="compact-capacity-alert">Capienza superata</span>
                  )}

                  {selectedTableId === table.id && (
                    <section className="table-detail-popover" onClick={event => event.stopPropagation()}>
                      <div className="selected-table-header">
                        <input
                          className="selected-table-name-input"
                          value={tableNames[tableIndex] || table.name}
                          onChange={event => updateTableName(tableIndex, event.target.value)}
                          onBlur={() => normalizeTableNameOnBlur(tableIndex)}
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

                      <button type="button" className="delete-table-button" onClick={() => deleteTable(table.id)}>
                        <Trash2 size={16} aria-hidden="true" />
                        Elimina tavolo
                      </button>

                      {(() => {
                        const selectedSeat = table.slots.find(slot => expandedPanelId === `seat-${table.id}-${slot.id}`);
                        const seatFeedback = selectedSeat?.person
                          ? moveFeedback[selectedSeat.person.id]
                          : selectedSeat
                            ? moveFeedback[`empty-${table.id}-${selectedSeat.id}`]
                            : null;
                        const tablePreferenceEntries = Object.entries(table.foodCounts);

                        if (!selectedSeat) {
                          return (
                            <div className="table-food-summary compact-summary">
                              <strong>Intolleranze per tavolo</strong>
                              {table.people.length ? (
                                <>
                                  <div className="table-food-people">
                                    {table.people.map(person => (
                                      <p key={person.id}>
                                        <strong>{person.name}</strong>:{" "}
                                        {person.foodPreferences.length ? (
                                          <span className="food-preference-highlight">{person.foodPreferences.join(", ")}</span>
                                        ) : (
                                          "nessuna intolleranza"
                                        )}
                                      </p>
                                    ))}
                                  </div>
                                  <div className="table-food-totals">
                                    <strong>Totale</strong>
                                    {tablePreferenceEntries.length ? (
                                      <div>
                                        {tablePreferenceEntries.map(([preference, count]) => (
                                          <span key={preference}>{preference}: {count}</span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p>Nessuna intolleranza indicata.</p>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <p>Nessun invitato assegnato a questo tavolo.</p>
                              )}
                            </div>
                          );
                        }

                        return (
                          <section className="seat-picker-panel">
                            <div>
                              <span>Posto {selectedSeat.id + 1}</span>
                              <strong>{selectedSeat.person ? selectedSeat.person.name : "Assegna un invitato a questo posto"}</strong>
                            </div>
                            {selectedSeat.person && (
                              <dl>
                                <div>
                                  <dt>Invito</dt>
                                  <dd>{selectedSeat.person.familyName}</dd>
                                </div>
                                <div>
                                  <dt>Gruppo</dt>
                                  <dd>{selectedSeat.person.groupLabel}</dd>
                                </div>
                                <div>
                                  <dt>Intolleranze</dt>
                                  <dd>{selectedSeat.person.foodDetails}</dd>
                                </div>
                              </dl>
                            )}
                            {selectedSeat.person && (
                              <button
                                type="button"
                                className="remove-seat-person-button"
                                onClick={() => requestRemovePersonFromSeat(selectedSeat.person, table)}
                              >
                                <Trash2 size={15} aria-hidden="true" />
                                Elimina da questo posto
                              </button>
                            )}
                            {!selectedSeat.person && (
                              <div className="seat-guest-picker">
                                <label className="seat-search-field">
                                  Cerca invitato
                                  <input
                                    type="search"
                                    value={seatGuestSearch}
                                    onChange={event => setSeatGuestSearch(event.target.value)}
                                    placeholder="Nome o cognome"
                                  />
                                </label>
                                <div className="seat-guest-results" aria-label="Invitati">
                                  {filteredSeatPeopleOptions.map(option => {
                                    const [namePart, metaPart = ""] = option.label.split(" - ");

                                    return (
                                      <button
                                        type="button"
                                        key={option.id}
                                        onClick={() => assignPersonToSeat(option.id, table.id, selectedSeat.id)}
                                      >
                                        <strong>{namePart}</strong>
                                        <span>{metaPart}</span>
                                      </button>
                                    );
                                  })}
                                  {filteredSeatPeopleOptions.length === 0 && (
                                    <p>Nessun invitato trovato</p>
                                  )}
                                </div>
                              </div>
                            )}
                            {seatFeedback && (
                              <p className={`seat-action-feedback ${seatFeedback.type}`}>
                                {seatFeedback.message}
                              </p>
                            )}
                          </section>
                        );
                      })()}
                    </section>
                  )}
                </article>
              );
            })}

            <button
              type="button"
              className="table-map-card add-table-node"
              style={{
                left: `${addTablePosition.x}px`,
                top: `${addTablePosition.y}px`,
                "--table-size": `${getTableVisualSize(clampNumber(planner.seatsPerTable, 1, 80, 8))}px`,
                "--table-node-size": `${getTableNodeSize(clampNumber(planner.seatsPerTable, 1, 80, 8))}px`,
              }}
              onClick={addTable}
              aria-label="Aggiungi tavolo"
            >
              <span className={`add-table-face is-${tableShape}`}>
                <Plus size={34} aria-hidden="true" />
              </span>
            </button>
          </section>
        </section>
      </section>

      {pendingFamilyMove && (
        <div className="family-move-overlay" onClick={() => setPendingFamilyMove(null)}>
          <section
            className="family-move-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="family-move-title"
            onClick={event => event.stopPropagation()}
          >
            <h2 id="family-move-title">Sposta ospiti</h2>
            <p>
              Vuoi spostare solo <strong>{pendingFamilyMove.personName}</strong> o anche gli altri ospiti?
            </p>
            <div className="family-move-actions">
              <button type="button" onClick={() => confirmPendingFamilyMove("single")}>
                Solo {pendingFamilyMove.personName}
              </button>
              <button type="button" onClick={() => confirmPendingFamilyMove("family")}>
                Tutti gli ospiti per {pendingFamilyMove.familyName}
              </button>
              <button type="button" onClick={() => setPendingFamilyMove(null)}>
                Annulla
              </button>
            </div>
          </section>
        </div>
      )}

      {pendingSeatRemoval && (
        <div className="family-move-overlay" onClick={() => setPendingSeatRemoval(null)}>
          <section
            className="family-move-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seat-removal-title"
            onClick={event => event.stopPropagation()}
          >
            <h2 id="seat-removal-title">Elimina dal posto</h2>
            {pendingSeatRemoval.hasFamily ? (
              <p>
                Vuoi eliminare solo <strong>{pendingSeatRemoval.personName}</strong> dal <strong>{pendingSeatRemoval.tableName}</strong>{" "}
                o anche tutti i suoi ospiti?
              </p>
            ) : (
              <p>
                Vuoi eliminare <strong>{pendingSeatRemoval.personName}</strong> dal <strong>{pendingSeatRemoval.tableName}</strong>?
              </p>
            )}
            <div className="family-move-actions">
              <button type="button" onClick={() => setPendingSeatRemoval(null)}>
                Annulla
              </button>
              {pendingSeatRemoval.hasFamily ? (
                <>
                  <button type="button" className="is-danger" onClick={() => confirmPendingSeatRemoval("single")}>
                    Solo {pendingSeatRemoval.personName}
                  </button>
                  <button type="button" className="is-danger" onClick={() => confirmPendingSeatRemoval("family")}>
                    Anche tutti gli ospiti per {pendingSeatRemoval.familyName}
                  </button>
                </>
              ) : (
                <button type="button" className="is-danger" onClick={() => confirmPendingSeatRemoval("single")}>
                  Conferma eliminazione
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {pendingSeatSwap && (
        <div className="family-move-overlay" onClick={() => setPendingSeatSwap(null)}>
          <section
            className="family-move-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seat-swap-title"
            onClick={event => event.stopPropagation()}
          >
            <h2 id="seat-swap-title">Posto occupato</h2>
            <p>
              Vuoi spostare <strong>{pendingSeatSwap.personName}</strong> al posto di <strong>{pendingSeatSwap.targetPersonName}</strong>?{" "}
              <strong>{pendingSeatSwap.targetPersonName}</strong> verrà eliminato dal tavolo se confermi.
            </p>
            <div className="family-move-actions">
              <button type="button" onClick={() => setPendingSeatSwap(null)}>
                Annulla
              </button>
              <button type="button" onClick={confirmPendingSeatSwap}>
                Conferma spostamento
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
