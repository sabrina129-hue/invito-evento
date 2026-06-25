const guestNamesMarker = "[[GUEST_NAMES]]";

export const serializeGuestNames = names =>
  Array.isArray(names)
    ? names.map(name => encodeURIComponent(String(name || "").trim())).join("|")
    : "";

export const parseGuestNamesValue = value =>
  String(value || "")
    .split("|")
    .map(name => {
      try {
        return decodeURIComponent(name);
      } catch {
        return name;
      }
    })
    .map(name => name.trim())
    .filter(Boolean);

export const readGuestNamesFromMessage = message => {
  const markerLine = String(message || "")
    .split(/\r?\n/)
    .find(line => line.startsWith(guestNamesMarker));

  if (!markerLine) return [];
  return parseGuestNamesValue(markerLine.slice(guestNamesMarker.length).trim());
};

export const stripGuestNamesFromMessage = message =>
  String(message || "")
    .split(/\r?\n/)
    .filter(line => !line.startsWith(guestNamesMarker))
    .join("\n")
    .trim();

export const mergeMessageWithGuestNames = (message, names) => {
  const cleanMessage = stripGuestNamesFromMessage(message);
  const serializedNames = serializeGuestNames(names);

  return [cleanMessage, serializedNames ? `${guestNamesMarker}${serializedNames}` : ""]
    .filter(Boolean)
    .join("\n");
};

export const getParticipantGuestNames = participant => {
  const storedNames = participant?.guest_names || participant?.guestNames || "";
  const parsedNames = Array.isArray(storedNames)
    ? storedNames.map(name => String(name || "").trim())
    : parseGuestNamesValue(storedNames);
  const fallbackNames = readGuestNamesFromMessage(participant?.message);

  return parsedNames.length ? parsedNames : fallbackNames;
};
