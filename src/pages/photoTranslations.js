export const PHOTO_LANGUAGES = {
  it: "Italiano",
  pl: "Polski",
};

const polishLabels = {
  title: "Zdjęcia z naszego dnia",
  subtitle: "Pomóżcie nam zebrać najpiękniejsze wspomnienia.",
  message: "Zróbcie zdjęcie albo wybierzcie je z telefonu i wyślijcie parze młodej.",
  galleryButtonLabel: "Galeria",
  lockedTitle: "Już prawie",
  lockedMessage: "Strona do udostępniania zdjęć będzie dostępna w dniu ślubu.",
  lockedDateLabel: "Otwarcie",
  galleryTitle: "Galeria zdjęć",
  galleryMessage: "Przeglądajcie wspomnienia udostępnione przez gości.",
  galleryInstantLabel: "Migawki",
  galleryUploadLabel: "Przesłane",
  galleryLoadingLabel: "Ładowanie galerii...",
  galleryEmptyMessage: "Nie ma jeszcze zdjęć do wyświetlenia.",
  galleryEmptyInstantMessage: "Nie ma jeszcze migawek do wyświetlenia.",
  galleryEmptyUploadMessage: "Nie ma jeszcze przesłanych zdjęć do wyświetlenia.",
  galleryErrorMessage: "Nie udało się załadować galerii. Spróbuj ponownie za chwilę.",
  galleryRetryLabel: "Spróbuj ponownie",
  galleryCameraLabel: "Udostępnij zdjęcie!",
  galleryPreviousLabel: "Poprzednie zdjęcie",
  galleryNextLabel: "Następne zdjęcie",
  galleryImageAlt: "Zdjęcie z galerii",
  permissionTitle: "Użyjemy aparatu?",
  permissionMessage: "Możecie zrobić zdjęcie teraz albo wybrać je z urządzenia.",
  permissionLabel: "Użyj aparatu",
  deviceUploadLabel: "Wybierz z urządzenia",
  deviceUploadShortLabel: "Wybierz zdjęcie",
  deviceUploadPreviewLabel: "Zdjęcie z urządzenia zostanie wysłane bez ramki.",
  chooseAnotherUploadLabel: "Wybierz inne zdjęcie",
  unsupportedUploadMessage: "Nieobsługiwany format. Użyj JPG, PNG albo WebP.",
  nameLabel: "Dodaj swoje imię!",
  namePlaceholder: "Imię i nazwisko",
  nameRequiredMessage: "Wpisz swoje imię przed wysłaniem zdjęcia.",
  cameraLabel: "Zrób zdjęcie",
  switchCameraLabel: "Obróć aparat",
  deleteLabel: "Usuń",
  sendLabel: "Wyślij",
  sendingLabel: "Wysyłanie...",
  retryCameraLabel: "Spróbuj ponownie",
  retakeLabel: "Zrób ponownie",
  successMessage: "Dziękujemy, otrzymaliśmy Wasze wspomnienie.",
  errorMessage: "Nie udało się przesłać zdjęcia. Spróbuj ponownie za chwilę.",
  cameraErrorMessage: "Nie udało się uruchomić aparatu. Sprawdź uprawnienia przeglądarki i spróbuj ponownie.",
  preparingLabel: "Przygotowywanie zdjęcia...",
};

export const getPhotoLabels = (config, language) => ({
  ...config,
  ...(language === "pl" ? polishLabels : {}),
});

export const getPhotoLanguage = searchParams => (
  searchParams.get("lang") === "pl" ? "pl" : "it"
);

export const getPhotoPath = (path, language) => (
  language === "pl" ? `${path}?lang=pl` : path
);
