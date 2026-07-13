const guestNamesMarker = "[[GUEST_NAMES]]";
const inviteGroupMarker = "[[INVITE_GROUP]]";

export const normalizeInvitationGroup = value =>
  String(value || "").trim().replace(/\s+/g, " ");

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

export const readInvitationGroupFromMessage = message => {
  const markerLine = String(message || "")
    .split(/\r?\n/)
    .find(line => line.startsWith(inviteGroupMarker));

  if (!markerLine) return "";

  const value = markerLine.slice(inviteGroupMarker.length).trim();

  try {
    return normalizeInvitationGroup(decodeURIComponent(value));
  } catch {
    return normalizeInvitationGroup(value);
  }
};

export const stripInvitationGroupFromMessage = message =>
  String(message || "")
    .split(/\r?\n/)
    .filter(line => !line.startsWith(inviteGroupMarker))
    .join("\n")
    .trim();

export const stripInviteMetadataFromMessage = message =>
  stripInvitationGroupFromMessage(stripGuestNamesFromMessage(message));

export const mergeMessageWithGuestNames = (message, names) => {
  const cleanMessage = stripGuestNamesFromMessage(message);
  const serializedNames = serializeGuestNames(names);

  return [cleanMessage, serializedNames ? `${guestNamesMarker}${serializedNames}` : ""]
    .filter(Boolean)
    .join("\n");
};

export const mergeMessageWithGuestNamesAndGroup = (message, names, group) => {
  const cleanMessage = stripInviteMetadataFromMessage(message);
  const serializedNames = serializeGuestNames(names);
  const cleanGroup = normalizeInvitationGroup(group);

  return [
    cleanMessage,
    serializedNames ? `${guestNamesMarker}${serializedNames}` : "",
    cleanGroup ? `${inviteGroupMarker}${encodeURIComponent(cleanGroup)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

export const mergeMessageWithInvitationGroup = (message, group) =>
  mergeMessageWithGuestNamesAndGroup(message, [], group);

export const getParticipantGuestNames = participant => {
  const storedNames = participant?.guest_names || participant?.guestNames || "";
  const parsedNames = Array.isArray(storedNames)
    ? storedNames.map(name => String(name || "").trim())
    : parseGuestNamesValue(storedNames);
  const fallbackNames = readGuestNamesFromMessage(participant?.message);

  return parsedNames.length ? parsedNames : fallbackNames;
};

export const getParticipantGroup = participant =>
  normalizeInvitationGroup(
    participant?.group ||
    participant?.organizer_group ||
    participant?.organizerGroup ||
    readInvitationGroupFromMessage(participant?.message)
  );
