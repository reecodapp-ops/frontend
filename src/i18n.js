import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'

i18n
  // Load translations from /public/locales/{lng}/translation.json — lazy, not bundled
  .use(HttpBackend)
  // Detect language from localStorage → navigator.language → fallback
  .use(LanguageDetector)
  // Wire into React
  .use(initReactI18next)
  .init({
    // ── Supported languages ──────────────────────────────────────────────
    supportedLngs: ['en', 'fr', 'sw', 'sw-CD'],
    fallbackLng: {
      // 'sw-CD' → try sw-CD first, then sw, then en
      'sw-CD': ['sw', 'en'],
      // Catch-all: any unrecognised tag falls to English
      default: ['en'],
    },

    // ── Backend (i18next-http-backend) ───────────────────────────────────
    backend: {
      // Vite serves /public as the root, so this resolves correctly in both
      // dev and production builds
      loadPath: '/locales/{{lng}}/translation.json',
    },

    // ── Language detection order ─────────────────────────────────────────
    detection: {
      // Check localStorage first; if missing, read navigator.language
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Key used in localStorage — 'dukamate_lang' to avoid collisions
      lookupLocalStorage: 'dukamate_lang',
      // Persist the user's choice back to localStorage
      caches: ['localStorage'],
    },

    // ── Namespace ────────────────────────────────────────────────────────
    defaultNS: 'translation',
    ns: ['translation'],

    // ── Behaviour ────────────────────────────────────────────────────────
    // React already XSS-escapes interpolated values in JSX
    interpolation: {
      escapeValue: false,
    },

    // Show keys (not empty strings) if a translation is missing — useful in dev
    saveMissing: import.meta.env.DEV,

    // Don't try to parse language tags like 'en-US' as 'en' + 'US';
    // our supported langs are exact matches
    load: 'currentOnly',
  })

export default i18n
