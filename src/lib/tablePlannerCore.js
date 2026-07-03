import { getParticipantGroup, getParticipantGuestNames } from "./guestNames.js";

export const tableCapacityErrorMessage = "Non ci sono posti liberi a sufficienza su questo tavolo per completare l'operazione. Libera dei posti o aumenta la capienza del tavolo";

export const familyColors = [
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

export const noFoodPreferenceOption = "Nessuna intolleranza/preferenza alimentare";

export const isNoFoodPreferenceOption = option =>
  String(option || "").trim().toLowerCase() === noFoodPreferenceOption.toLowerCase();

export const normalizeGuestCount = guests => Math.max(1, Number(guests) || 1);

export const normalizeFoodPreferenceItems = items => {
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

const resizeGuestFoodPreferences = (groups, guests) =>
  Array.from({ length: normalizeGuestCount(guests) }, (_, index) =>
    Array.isArray(groups[index]) ? normalizeFoodPreferenceItems(groups[index]) : []
  );

export const parseGuestFoodPreferences = (value, guests) => {
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

export const groupAttendeesByFamily = attendees =>
  Object.values(attendees.reduce((groups, attendee) => {
    groups[attendee.familyId] = [...(groups[attendee.familyId] || []), attendee];
    return groups;
  }, {}));

export const buildTableAttendees = participants =>
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

export const distributeAttendees = (attendees, tableSeats) => {
  const assignments = {};
  const remainingSeats = [...tableSeats];
  let tableCursor = 0;
  const findNextOpenTable = startIndex => {
    for (let offset = 0; offset < remainingSeats.length; offset += 1) {
      const index = (startIndex + offset) % remainingSeats.length;

      if (remainingSeats[index] > 0) return index;
    }

    return -1;
  };
  const findTableForWholeFamily = (familySize, startIndex) => {
    let bestIndex = -1;
    let bestRemainingSeats = Number.POSITIVE_INFINITY;

    for (let offset = 0; offset < remainingSeats.length; offset += 1) {
      const index = (startIndex + offset) % remainingSeats.length;
      const remainingAfterPlacement = remainingSeats[index] - familySize;

      if (remainingAfterPlacement >= 0 && remainingAfterPlacement < bestRemainingSeats) {
        bestIndex = index;
        bestRemainingSeats = remainingAfterPlacement;
      }
    }

    return bestIndex;
  };
  const assignPeopleToTable = (people, tableIndex) => {
    people.forEach(attendee => {
      assignments[attendee.id] = String(tableIndex + 1);
    });

    remainingSeats[tableIndex] -= people.length;
    tableCursor = remainingSeats[tableIndex] > 0
      ? tableIndex
      : findNextOpenTable(tableIndex + 1);
  };
  const familiesByGroup = groupAttendeesByFamily(attendees).reduce((groups, family, familyIndex) => {
    const groupName = family[0]?.group || "";
    const groupKey = groupName || "__ungrouped__";

    groups[groupKey] = [...(groups[groupKey] || []), { family, familyIndex, groupName }];
    return groups;
  }, {});

  Object.keys(familiesByGroup)
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
    })
    .forEach(groupKey => {
      familiesByGroup[groupKey]
        .sort((left, right) => right.family.length - left.family.length || left.familyIndex - right.familyIndex)
        .forEach(({ family }) => {
          const wholeFamilyTableIndex = findTableForWholeFamily(family.length, Math.max(tableCursor, 0));

          if (wholeFamilyTableIndex >= 0) {
            assignPeopleToTable(family, wholeFamilyTableIndex);
            return;
          }

          family.forEach(attendee => {
            const tableIndex = findNextOpenTable(Math.max(tableCursor, 0));

            if (tableIndex >= 0) {
              assignPeopleToTable([attendee], tableIndex);
            }
          });
        });
    });

  return assignments;
};

export const sanitizeAssignments = (attendees, assignments, tableSeats) => {
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

export const normalizeSeatPositions = (attendees, assignments, seatPositions, tableSeats) => {
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

export const countTableFoodPreferences = people =>
  people.reduce((counts, person) => {
    person.foodPreferences.forEach(preference => {
      counts[preference] = (counts[preference] || 0) + 1;
    });

    return counts;
  }, {});

export const buildTablePlan = (attendees, assignments, tableSeats, tableNames, seatPositions) => {
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
        table.slots.push({ id: table.slots.length, person: null, isOverflow: table.slots.length >= table.seats });
      }

      if (table.slots[seatIndex].person) {
        const emptySlot = table.slots.find(slot => !slot.person);

        if (emptySlot) {
          emptySlot.person = person;
        } else {
          table.slots.push({ id: table.slots.length, person, isOverflow: true });
        }
      } else {
        table.slots[seatIndex].person = person;
      }
    });
  });

  return { tables, unassigned };
};

export const deletePlannerTable = (planner, tableId) => {
  const deleteIndex = Number(tableId) - 1;
  const currentSeats = planner.tableSeats || [];

  if (deleteIndex < 0 || !currentSeats[deleteIndex]) return planner;

  const tableSeats = currentSeats.filter((_, index) => index !== deleteIndex);
  const tableNames = (planner.tableNames || []).filter((_, index) => index !== deleteIndex);
  const assignments = {};

  Object.entries(planner.assignments || {}).forEach(([attendeeId, assignedTableId]) => {
    const assignedIndex = Number(assignedTableId) - 1;

    if (assignedIndex === deleteIndex || assignedIndex < 0 || assignedIndex >= currentSeats.length) return;

    assignments[attendeeId] = String(assignedIndex > deleteIndex ? assignedIndex : assignedIndex + 1);
  });

  return {
    ...planner,
    tableCount: tableSeats.length,
    tableSeats,
    tableNames,
    assignments,
    seatPositions: Object.fromEntries(
      Object.entries(planner.seatPositions || {}).filter(([attendeeId]) => assignments[attendeeId])
    ),
  };
};

export const movePlannerPeople = ({ attendees, planner, personId, tableId, options = {} }) => {
  const person = attendees.find(attendee => attendee.id === personId);

  if (!person) return { planner, error: "Invitato non trovato." };

  const tableSeats = planner.tableSeats || [];
  const currentAssignments = sanitizeAssignments(attendees, planner.assignments || {}, tableSeats);
  const currentSeatPositions = normalizeSeatPositions(attendees, currentAssignments, planner.seatPositions || {}, tableSeats);
  const familyMembers = attendees.filter(attendee => attendee.familyId === person.familyId);
  const optionFamilyMemberIds = Array.isArray(options.familyMemberIds) ? new Set(options.familyMemberIds) : null;
  const currentTableId = currentAssignments[person.id];
  const preferredSeatIndex = Number(options.seatIndex);
  const hasPreferredSeat = Number.isInteger(preferredSeatIndex) && preferredSeatIndex >= 0;
  const isCrossTableMove = Boolean(tableId && currentTableId && currentTableId !== tableId);
  const sourceTableFamilyMembers = !currentTableId || isCrossTableMove || options.familySelectionScope === "all"
    ? familyMembers
    : familyMembers.filter(attendee => currentAssignments[attendee.id] === currentTableId);
  const familyMembersForOperation = optionFamilyMemberIds
    ? familyMembers.filter(attendee => optionFamilyMemberIds.has(attendee.id))
    : sourceTableFamilyMembers;
  const familyMovePeople = familyMembersForOperation.some(attendee => attendee.id === person.id)
    ? familyMembersForOperation
    : [person, ...familyMembersForOperation];
  const isFamilyMove = options.scope === "family" && familyMovePeople.length > 1;
  const movingPeople = isFamilyMove
    ? [person, ...familyMovePeople.filter(attendee => attendee.id !== person.id)]
    : [person];
  const movingPeopleIds = new Set(movingPeople.map(attendee => attendee.id));
  const currentSeatIndex = currentSeatPositions[person.id];
  const isSameTableSeatMove = Boolean(
    tableId && currentTableId === tableId && hasPreferredSeat && currentSeatIndex !== preferredSeatIndex
  );

  if (tableId && currentTableId === tableId && !hasPreferredSeat) {
    return { planner, ignored: true };
  }

  if (tableId && currentTableId === tableId && hasPreferredSeat && currentSeatIndex === preferredSeatIndex) {
    return { planner, ignored: true };
  }

  if (!options.scope && familyMovePeople.length > 1 && !isSameTableSeatMove) {
    return {
      planner,
      pendingFamilyMove: {
        personId,
        tableId,
        familyMemberIds: familyMovePeople.map(attendee => attendee.id),
      },
    };
  }

  const assignments = { ...currentAssignments };
  const seatPositions = { ...currentSeatPositions };

  movingPeople.forEach(attendee => {
    delete assignments[attendee.id];
    delete seatPositions[attendee.id];
  });

  if (!tableId) {
    const verifiedAssignments = sanitizeAssignments(attendees, assignments, tableSeats);

    return {
      planner: {
        ...planner,
        assignments: verifiedAssignments,
        seatPositions: normalizeSeatPositions(attendees, verifiedAssignments, seatPositions, tableSeats),
      },
    };
  }

  const tableIndex = Number(tableId) - 1;
  const tableCapacity = tableSeats[tableIndex] || 0;

  if (!tableCapacity || (hasPreferredSeat && preferredSeatIndex >= tableCapacity)) {
    return { planner, error: tableCapacityErrorMessage };
  }

  const targetSeatOccupant = hasPreferredSeat
    ? attendees.find(attendee =>
      !movingPeopleIds.has(attendee.id) &&
      assignments[attendee.id] === tableId &&
      seatPositions[attendee.id] === preferredSeatIndex
    )
    : null;
  const assignedToTargetTable = attendees.filter(attendee => assignments[attendee.id] === tableId).length;
  const availableSeats = tableCapacity - assignedToTargetTable;
  const canRelocateTargetSeatOccupant = Boolean(
    targetSeatOccupant &&
    !options.confirmSwap &&
    availableSeats >= movingPeople.length
  );
  const canFitByRemovingTarget = Boolean(targetSeatOccupant && availableSeats + 1 >= movingPeople.length);

  if (availableSeats < movingPeople.length && !canFitByRemovingTarget) {
    return { planner, error: tableCapacityErrorMessage };
  }

  if (targetSeatOccupant && availableSeats < movingPeople.length && !options.confirmSwap && !isSameTableSeatMove) {
    return {
      planner,
      pendingSeatSwap: {
        personId,
        tableId,
        seatIndex: preferredSeatIndex,
        targetPersonId: targetSeatOccupant.id,
      },
    };
  }

  const occupiedSeats = new Set(
    attendees
      .filter(attendee => assignments[attendee.id] === tableId)
      .map(attendee => seatPositions[attendee.id])
      .filter(position => Number.isInteger(position) && position >= 0 && position < tableCapacity)
  );
  const findNextSeat = () => {
    let nextSeat = 0;

    while (occupiedSeats.has(nextSeat) && nextSeat < tableCapacity) nextSeat += 1;

    return nextSeat;
  };

  if (isSameTableSeatMove && targetSeatOccupant && !canRelocateTargetSeatOccupant) {
    assignments[person.id] = tableId;
    seatPositions[person.id] = preferredSeatIndex;
    assignments[targetSeatOccupant.id] = tableId;
    seatPositions[targetSeatOccupant.id] = currentSeatIndex;

    return {
      planner: {
        ...planner,
        assignments: sanitizeAssignments(attendees, assignments, tableSeats),
        seatPositions: normalizeSeatPositions(attendees, assignments, seatPositions, tableSeats),
      },
    };
  }

  movingPeople.forEach((movingPerson, index) => {
    let targetSeat;

    if (index === 0 && hasPreferredSeat) {
      if (occupiedSeats.has(preferredSeatIndex) && targetSeatOccupant) {
        if (canRelocateTargetSeatOccupant) {
          const relocationSeat = findNextSeat();
          seatPositions[targetSeatOccupant.id] = relocationSeat;
          occupiedSeats.add(relocationSeat);
          occupiedSeats.delete(preferredSeatIndex);
        } else {
          delete assignments[targetSeatOccupant.id];
          delete seatPositions[targetSeatOccupant.id];
          occupiedSeats.delete(preferredSeatIndex);
        }
      }

      if (!occupiedSeats.has(preferredSeatIndex)) targetSeat = preferredSeatIndex;
    }

    if (!Number.isInteger(targetSeat)) targetSeat = findNextSeat();

    assignments[movingPerson.id] = tableId;
    seatPositions[movingPerson.id] = targetSeat;
    occupiedSeats.add(targetSeat);
  });

  const verifiedAssignments = sanitizeAssignments(attendees, assignments, tableSeats);
  const verifiedSeatPositions = normalizeSeatPositions(attendees, verifiedAssignments, seatPositions, tableSeats);
  const isComplete = movingPeople.every(attendee => (
    verifiedAssignments[attendee.id] === tableId &&
    Number.isInteger(verifiedSeatPositions[attendee.id]) &&
    verifiedSeatPositions[attendee.id] >= 0 &&
    verifiedSeatPositions[attendee.id] < tableCapacity
  ));

  if (!isComplete) return { planner, error: tableCapacityErrorMessage };

  return {
    planner: {
      ...planner,
      assignments: verifiedAssignments,
      seatPositions: verifiedSeatPositions,
    },
  };
};
