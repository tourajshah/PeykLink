import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import translation files (we will create these next)
import en from "./app/locales/en.json";
import fa from "./app/locales/fa.json";
import tr from "./app/locales/tr.json";

const RESOURCES = {
  en: { translation: en },
  tr: { translation: tr },
  fa: { translation: fa },
};

const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem("language");

  if (!savedLanguage) {
    const locales = Localization.getLocales();
    savedLanguage = locales[0]?.languageCode || "en";
  }

  i18n.use(initReactI18next).init({
    compatibilityJSON: "v3",
    resources: RESOURCES,
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });
};

initI18n();

export default i18n;
