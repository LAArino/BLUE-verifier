'use client'
import { useTranslation } from 'react-i18next'
import styles from './LoadingError.module.css'

export const LoadingError = () => {
  const { t } = useTranslation('errors');

  return(
    <div className={styles.loadingErrorContainer}>
      <h1 className={styles.errorCode}>{t('notFound')}</h1>
      <h3 className={styles.message}>{t('checkLink')}</h3>
      <h3 className={styles.message}>{t('checkHolder')}</h3>
    </div>
  )
}
