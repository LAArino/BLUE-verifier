'use client'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../../locales'
import styles from './LanguageSelector.module.css'

export function LanguageSelector() {
  const { i18n } = useTranslation()
  const currentLang = (i18n.language?.substring(0, 2) || 'en') as LanguageCode

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value)
  }

  return (
    <select
      className={styles.selector}
      value={currentLang}
      onChange={handleChange}
      aria-label='Language'
    >
      {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
        <option key={code} value={code}>{name}</option>
      ))}
    </select>
  )
}
