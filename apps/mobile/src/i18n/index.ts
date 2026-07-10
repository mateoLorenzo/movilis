import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { createMMKV } from "react-native-mmkv";

import en from "@/i18n/locales/en.json";
import es from "@/i18n/locales/es.json";

const resources = {
  es: { translation: es },
  en: { translation: en },
} as const;

type SupportedLanguage = keyof typeof resources;

const supportedLanguages: SupportedLanguage[] = ["es", "en"];
const defaultLanguage: SupportedLanguage = "es";

const storage = createMMKV({ id: "app-preferences" });
const LANGUAGE_KEY = "language";

function getStoredLanguage(): SupportedLanguage {
  const stored = storage.getString(LANGUAGE_KEY);
  return stored && (supportedLanguages as string[]).includes(stored)
    ? (stored as SupportedLanguage)
    : defaultLanguage;
}

const i18nInitialization = i18n.use(initReactI18next).init({
  resources,
  lng: getStoredLanguage(),
  fallbackLng: defaultLanguage,
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

i18nInitialization.catch((error) => {
  console.error("Failed to initialize i18n", error);
});

i18n.on("languageChanged", (lng) => {
  storage.set(LANGUAGE_KEY, lng);
});

export { i18nInitialization, resources, supportedLanguages };
export type { SupportedLanguage };
export default i18n;
