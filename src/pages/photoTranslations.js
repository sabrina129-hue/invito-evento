export const PHOTO_LANGUAGES = {
  it: "Italiano",
  pl: "Polski",
};

const polishLabels = {
  title: "Zdjęcia z naszego dnia",
  subtitle: "Pomóżcie nam zebrać najpiękniejsze wspomnienia.",
  message: "Zezwólcie na użycie aparatu, zróbcie zdjęcie i wyślijcie je parze młodej.",
  galleryButtonLabel: "Galeria",
  galleryTitle: "Galeria zdjęć",
  galleryMessage: "Przeglądajcie wspomnienia udostępnione przez gości.",
  galleryLoadingLabel: "Ładowanie galerii...",
  galleryEmptyMessage: "Nie ma jeszcze zdjęć do wyświetlenia.",
  galleryErrorMessage: "Nie udało się załadować galerii. Spróbuj ponownie za chwilę.",
  galleryRetryLabel: "Spróbuj ponownie",
  galleryCameraLabel: "Udostępnij zdjęcie!",
  galleryPreviousLabel: "Poprzednie zdjęcie",
  galleryNextLabel: "Następne zdjęcie",
  galleryImageAlt: "Zdjęcie z galerii",
  permissionTitle: "Użyjemy aparatu?",
  permissionMessage: "Potrzebujemy go tylko, aby zrobić i wysłać zdjęcie parze młodej.",
  permissionLabel: "Użyj aparatu",
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
