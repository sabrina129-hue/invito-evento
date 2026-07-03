import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTableAttendees,
  buildTablePlan,
  deletePlannerTable,
  distributeAttendees,
  movePlannerPeople,
  normalizeSeatPositions,
  sanitizeAssignments,
  tableCapacityErrorMessage,
} from "../src/lib/tablePlannerCore.js";

const participants = [
  {
    id: 1,
    name: "Famiglia Romano",
    partecipate: true,
    guests: 3,
    guest_names: ["Paolo Romano", "Maria Romano", "Luca Romano"],
    food_preferences: "Persona 1: Uova | Persona 2: Latte e derivati (lattosio) | Persona 3: -",
    group: "Famiglia",
  },
  {
    id: 2,
    name: "Giulia Rossi",
    partecipate: true,
    guests: 1,
    guest_names: ["Giulia Rossi"],
    food_preferences: "Glutine (celiachia)",
    group: "Amici",
  },
  {
    id: 3,
    name: "Marco Verdi",
    partecipate: true,
    guests: 1,
    guest_names: ["Marco Verdi"],
    food_preferences: "",
    group: "Colleghi",
  },
  {
    id: 4,
    name: "Assente Bianchi",
    partecipate: false,
    guests: 1,
    guest_names: ["Assente Bianchi"],
    food_preferences: "",
    group: "Amici",
  },
];

const attendees = buildTableAttendees(participants);
const planner = (assignments = {}, seatPositions = {}, tableSeats = [3, 2]) => ({
  tableCount: tableSeats.length,
  seatsPerTable: 3,
  tableSeats,
  tableNames: tableSeats.map((_, index) => `Tavolo ${index + 1}`),
  assignments,
  seatPositions,
});
const person = name => attendees.find(attendee => attendee.name === name);
const familyIds = familyName => attendees
  .filter(attendee => attendee.familyName === familyName)
  .map(attendee => attendee.id);
const tableOccupancy = assignments =>
  Object.values(assignments).reduce((counts, tableId) => {
    counts[tableId] = (counts[tableId] || 0) + 1;
    return counts;
  }, {});

test("buildTableAttendees excludes non participants and keeps guest names, groups and food preferences", () => {
  assert.equal(attendees.length, 5);
  assert.equal(person("Paolo Romano").groupLabel, "Famiglia");
  assert.deepEqual(person("Paolo Romano").foodPreferences, ["Uova"]);
  assert.deepEqual(person("Maria Romano").foodPreferences, ["Latte e derivati (lattosio)"]);
  assert.equal(attendees.some(attendee => attendee.name === "Assente Bianchi"), false);
});

test("distributeAttendees groups families first, respects capacity and leaves overflow unassigned", () => {
  const smallPlanAssignments = distributeAttendees(attendees, [3, 1]);
  const romanFamilyTables = new Set(familyIds("Famiglia Romano").map(id => smallPlanAssignments[id]));

  assert.deepEqual([...romanFamilyTables], ["1"]);
  assert.deepEqual(tableOccupancy(smallPlanAssignments), { 1: 3, 2: 1 });
  assert.equal(Object.keys(smallPlanAssignments).length, 4);
});

test("buildTablePlan exposes slots, unassigned people and intolerance totals per table", () => {
  const assignments = {
    [person("Paolo Romano").id]: "1",
    [person("Maria Romano").id]: "1",
    [person("Luca Romano").id]: "1",
    [person("Giulia Rossi").id]: "2",
  };
  const seatPositions = normalizeSeatPositions(attendees, assignments, {}, [3, 2]);
  const plan = buildTablePlan(attendees, assignments, [3, 2], ["Tavolo Famiglia", "Tavolo Amici"], seatPositions);

  assert.equal(plan.tables[0].people.length, 3);
  assert.equal(plan.tables[0].foodCounts.Uova, 1);
  assert.equal(plan.tables[0].foodCounts["Latte e derivati (lattosio)"], 1);
  assert.equal(plan.tables[1].foodCounts["Glutine (celiachia)"], 1);
  assert.deepEqual(plan.unassigned.map(attendee => attendee.name), ["Marco Verdi"]);
});

test("movePlannerPeople asks for family confirmation before cross-table family move", () => {
  const base = planner({
    [person("Paolo Romano").id]: "1",
    [person("Maria Romano").id]: "1",
    [person("Luca Romano").id]: "1",
  }, {
    [person("Paolo Romano").id]: 0,
    [person("Maria Romano").id]: 1,
    [person("Luca Romano").id]: 2,
  }, [3, 3]);
  const result = movePlannerPeople({
    attendees,
    planner: base,
    personId: person("Paolo Romano").id,
    tableId: "2",
    options: { familySelectionScope: "all" },
  });

  assert.equal(Boolean(result.pendingFamilyMove), true);
  assert.deepEqual(result.pendingFamilyMove.familyMemberIds.sort(), familyIds("Famiglia Romano").sort());
  assert.deepEqual(result.planner.assignments, base.assignments);
});

test("confirmed family move moves every selected family member when seats are available", () => {
  const base = planner({
    [person("Paolo Romano").id]: "1",
    [person("Maria Romano").id]: "1",
    [person("Luca Romano").id]: "1",
  }, {}, [3, 3]);
  const result = movePlannerPeople({
    attendees,
    planner: base,
    personId: person("Paolo Romano").id,
    tableId: "2",
    options: { scope: "family", familySelectionScope: "all" },
  });

  familyIds("Famiglia Romano").forEach(id => {
    assert.equal(result.planner.assignments[id], "2");
  });
  assert.deepEqual(tableOccupancy(result.planner.assignments), { 2: 3 });
});

test("single-member move moves only the selected person and keeps family members in place", () => {
  const base = planner({
    [person("Paolo Romano").id]: "1",
    [person("Maria Romano").id]: "1",
    [person("Luca Romano").id]: "1",
  }, {}, [3, 3]);
  const result = movePlannerPeople({
    attendees,
    planner: base,
    personId: person("Paolo Romano").id,
    tableId: "2",
    options: { scope: "single", familySelectionScope: "all" },
  });

  assert.equal(result.planner.assignments[person("Paolo Romano").id], "2");
  assert.equal(result.planner.assignments[person("Maria Romano").id], "1");
  assert.equal(result.planner.assignments[person("Luca Romano").id], "1");
});

test("same-table occupied seat move swaps occupants without confirmation", () => {
  const base = planner({
    [person("Paolo Romano").id]: "1",
    [person("Maria Romano").id]: "1",
  }, {
    [person("Paolo Romano").id]: 0,
    [person("Maria Romano").id]: 1,
  }, [2]);
  const result = movePlannerPeople({
    attendees,
    planner: base,
    personId: person("Paolo Romano").id,
    tableId: "1",
    options: { seatIndex: 1 },
  });

  assert.equal(result.planner.seatPositions[person("Paolo Romano").id], 1);
  assert.equal(result.planner.seatPositions[person("Maria Romano").id], 0);
});

test("moving to an occupied seat on a table with free seats relocates the occupant", () => {
  const base = planner({
    [person("Giulia Rossi").id]: "1",
  }, {
    [person("Giulia Rossi").id]: 0,
  }, [3]);
  const result = movePlannerPeople({
    attendees,
    planner: base,
    personId: person("Marco Verdi").id,
    tableId: "1",
    options: { seatIndex: 0 },
  });

  assert.equal(result.planner.assignments[person("Marco Verdi").id], "1");
  assert.equal(result.planner.seatPositions[person("Marco Verdi").id], 0);
  assert.equal(result.planner.assignments[person("Giulia Rossi").id], "1");
  assert.equal(result.planner.seatPositions[person("Giulia Rossi").id], 1);
});

test("moving to an occupied full table asks for swap confirmation and confirmed swap removes target", () => {
  const base = planner({
    [person("Giulia Rossi").id]: "1",
  }, {
    [person("Giulia Rossi").id]: 0,
  }, [1]);
  const pending = movePlannerPeople({
    attendees,
    planner: base,
    personId: person("Marco Verdi").id,
    tableId: "1",
    options: { seatIndex: 0 },
  });
  const confirmed = movePlannerPeople({
    attendees,
    planner: base,
    personId: person("Marco Verdi").id,
    tableId: "1",
    options: { seatIndex: 0, confirmSwap: true },
  });

  assert.equal(Boolean(pending.pendingSeatSwap), true);
  assert.equal(confirmed.planner.assignments[person("Marco Verdi").id], "1");
  assert.equal(confirmed.planner.seatPositions[person("Marco Verdi").id], 0);
  assert.equal(confirmed.planner.assignments[person("Giulia Rossi").id], undefined);
});

test("capacity errors never mutate assignments or exceed table capacity", () => {
  const base = planner({
    [person("Giulia Rossi").id]: "2",
    [person("Marco Verdi").id]: "2",
  }, {}, [3, 2]);
  const result = movePlannerPeople({
    attendees,
    planner: base,
    personId: person("Paolo Romano").id,
    tableId: "2",
    options: { scope: "family", familySelectionScope: "all" },
  });

  assert.equal(result.error, tableCapacityErrorMessage);
  assert.deepEqual(result.planner.assignments, base.assignments);
  assert.equal(tableOccupancy(result.planner.assignments)["2"], 2);
});

test("removing one person from a seat leaves the rest of the family assigned", () => {
  const base = planner({
    [person("Paolo Romano").id]: "1",
    [person("Maria Romano").id]: "1",
    [person("Luca Romano").id]: "1",
  }, {}, [3]);
  const result = movePlannerPeople({
    attendees,
    planner: base,
    personId: person("Paolo Romano").id,
    tableId: "",
    options: { scope: "single", familyMemberIds: familyIds("Famiglia Romano") },
  });

  assert.equal(result.planner.assignments[person("Paolo Romano").id], undefined);
  assert.equal(result.planner.assignments[person("Maria Romano").id], "1");
  assert.equal(result.planner.assignments[person("Luca Romano").id], "1");
});

test("removing a family from a seat clears all selected table family members", () => {
  const base = planner({
    [person("Paolo Romano").id]: "1",
    [person("Maria Romano").id]: "1",
    [person("Luca Romano").id]: "1",
  }, {}, [3]);
  const result = movePlannerPeople({
    attendees,
    planner: base,
    personId: person("Paolo Romano").id,
    tableId: "",
    options: { scope: "family", familyMemberIds: familyIds("Famiglia Romano") },
  });

  familyIds("Famiglia Romano").forEach(id => {
    assert.equal(result.planner.assignments[id], undefined);
  });
});

test("deletePlannerTable removes deleted table assignments and shifts later table ids", () => {
  const base = planner({
    [person("Paolo Romano").id]: "1",
    [person("Giulia Rossi").id]: "2",
    [person("Marco Verdi").id]: "3",
  }, {
    [person("Paolo Romano").id]: 0,
    [person("Giulia Rossi").id]: 0,
    [person("Marco Verdi").id]: 0,
  }, [3, 2, 2]);
  const result = deletePlannerTable(base, "2");

  assert.equal(result.tableCount, 2);
  assert.equal(result.assignments[person("Paolo Romano").id], "1");
  assert.equal(result.assignments[person("Giulia Rossi").id], undefined);
  assert.equal(result.assignments[person("Marco Verdi").id], "2");
  assert.equal(result.seatPositions[person("Giulia Rossi").id], undefined);
});

test("updated participant data is reflected in table attendees and table plan", () => {
  const updatedParticipants = participants.map(participant =>
    participant.id === 1
      ? {
        ...participant,
        name: "Famiglia Romano Aggiornata",
        guest_names: ["Paolo Romano", "Maria Nuova", "Luca Romano"],
        food_preferences: "Persona 1: Uova | Persona 2: Uova, Glutine (celiachia) | Persona 3: -",
      }
      : participant
  );
  const updatedAttendees = buildTableAttendees(updatedParticipants);
  const updatedPerson = updatedAttendees.find(attendee => attendee.name === "Maria Nuova");
  const assignments = { [updatedPerson.id]: "1" };
  const plan = buildTablePlan(
    updatedAttendees,
    assignments,
    [3],
    ["Tavolo 1"],
    normalizeSeatPositions(updatedAttendees, assignments, {}, [3])
  );

  assert.equal(updatedPerson.familyName, "Famiglia Romano Aggiornata");
  assert.deepEqual(updatedPerson.foodPreferences, ["Uova", "Glutine (celiachia)"]);
  assert.equal(plan.tables[0].people[0].name, "Maria Nuova");
  assert.equal(plan.tables[0].foodCounts.Uova, 1);
  assert.equal(plan.tables[0].foodCounts["Glutine (celiachia)"], 1);
});

test("choosing a specific free seat from the list assigns the selected person to that exact seat", () => {
  const base = planner({}, {}, [4]);
  const result = movePlannerPeople({
    attendees,
    planner: base,
    personId: person("Giulia Rossi").id,
    tableId: "1",
    options: { seatIndex: 2 },
  });

  assert.equal(result.planner.assignments[person("Giulia Rossi").id], "1");
  assert.equal(result.planner.seatPositions[person("Giulia Rossi").id], 2);
});

test("sanitizeAssignments drops unknown people, invalid tables and over-capacity assignments", () => {
  const result = sanitizeAssignments(attendees, {
    [person("Paolo Romano").id]: "1",
    [person("Maria Romano").id]: "1",
    [person("Luca Romano").id]: "1",
    [person("Giulia Rossi").id]: "9",
    "missing-person": "1",
  }, [2]);

  assert.deepEqual(Object.values(result), ["1", "1"]);
  assert.equal(result[person("Luca Romano").id], undefined);
  assert.equal(result[person("Giulia Rossi").id], undefined);
});
