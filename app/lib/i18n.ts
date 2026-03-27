import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { resources, SUPPORTED_LANGUAGES } from '../locales'

const supportedLngs = Object.keys(SUPPORTED_LANGUAGES)

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common', 'home', 'verification', 'credential',
      'oid4vp', 'scan', 'errors', 'terms', 'privacy', 'faq'
    ],
    interpolation: {
      escapeValue: false // React handles XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
      caches: ['localStorage']
    }
  })

export default i18n
