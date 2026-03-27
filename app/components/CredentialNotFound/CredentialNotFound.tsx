'use client'
import { useTranslation } from 'react-i18next'
import Link from "next/link"
import styles from './CredentialNotFound.module.css'

export const CredentialNotFound = () => {
  const { t } = useTranslation('errors');
  const { t: tc } = useTranslation('common');

  return (
    <div className={styles.contentContainer}>
      <Link href='/'>
        <div>
          <h1 className={styles.title}>
            {tc('appName')}
          </h1>
        </div>
      </Link>
      <h2 className={styles.errorTitle}>{t('notFoundTitle')}</h2>
      <p className={styles.errorMessage}>
        {t('confirmUrl')} <br /> {t('otherReasons')}
      </p>
      <ul className={styles.errorList}>
        <li>{t('credentialExpired')}</li>
        <li>{t('credentialUnshared')}</li>
      </ul>
    </div>
  )
}
