const DRIVE_FOLDER_ID = "1TGrE-60Fxc4hYbZVzWwv3Q2KFoWpMj_k";
const SECRET_PROPERTY = "PHOTO_UPLOAD_SECRET";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Run once from the editor to authorize Drive and create the shared secret. */
function initializeDriveWebhook() {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const properties = PropertiesService.getScriptProperties();
  let secret = properties.getProperty(SECRET_PROPERTY);

  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty(SECRET_PROPERTY, secret);
  }

  console.log("Cartella Drive collegata: " + folder.getName());
  console.log("PHOTO_UPLOAD_SECRET=" + secret);
}

function doGet() {
  return jsonResponse({ success: true, message: "Webhook foto pronto" });
}

function doPost(event) {
  try {
    const body = JSON.parse(event?.postData?.contents || "{}");
    const expectedSecret = PropertiesService.getScriptProperties().getProperty(SECRET_PROPERTY);

    if (!expectedSecret || body.secret !== expectedSecret) {
      return jsonResponse({ success: false, error: "Richiesta non autorizzata" });
    }
    if (body.action !== "upload") {
      return jsonResponse({ success: false, error: "Azione non supportata" });
    }
    if (body.mimeType !== "image/jpeg" || typeof body.base64 !== "string") {
      return jsonResponse({ success: false, error: "Formato foto non valido" });
    }

    const bytes = Utilities.base64Decode(body.base64);
    if (bytes.length < 4 || bytes.length > MAX_IMAGE_BYTES ||
        (bytes[0] & 0xff) !== 0xff || (bytes[1] & 0xff) !== 0xd8 || (bytes[2] & 0xff) !== 0xff) {
      return jsonResponse({ success: false, error: "Foto non valida o troppo grande" });
    }

    const timestamp = Utilities.formatDate(new Date(), "UTC", "yyyy-MM-dd'T'HH-mm-ss'Z'");
    const suffix = Utilities.getUuid().slice(0, 8);
    const fileName = "istantanea-laurea-corrado-" + timestamp + "-" + suffix + ".jpg";
    const blob = Utilities.newBlob(bytes, "image/jpeg", fileName);
    const file = DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob);

    return jsonResponse({ success: true, fileName: file.getName() });
  } catch (error) {
    console.error("Errore webhook foto: " + String(error));
    return jsonResponse({ success: false, error: "Errore durante il salvataggio della foto" });
  }
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
