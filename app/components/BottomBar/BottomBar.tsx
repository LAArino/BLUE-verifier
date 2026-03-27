'use client'
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import type { BottomBarProps } from './BottomBar.d'
import styles from './BottomBar.module.css'

export const BottomBar = ({isDark}: BottomBarProps) => {
  const { t } = useTranslation('common');
  return(
    <footer className={styles.container}>
      <div className={styles.logoContainer}>
        <a href='https://www.crue.org/'>
          <img
            src='/CRUE.jpg'
            alt='CRUE Universidades Españolas'
            className={styles.logo}
          />
        </a>
        <a href='https://www.rediris.es/'>
          <img
            src='/RedIRIS.svg'
            alt='RedIRIS'
            className={styles.logoRediris}
          />
        </a>
      </div>
      <div className={styles.linkContainer}>
        <Link href='/terms' className={styles.link}>{t('footer.terms')}</Link>
        <Link href='/privacy' className={styles.link}>{t('footer.privacy')}</Link>
        <Link className={styles.link} href='https://wiki.rediris.es/spaces/BLUE'>{t('footer.blue')}</Link>
        <Link className={styles.link} href='https://git.blue.rediris.es/blue'>{t('footer.viewOnGit')}</Link>
      </div>
    </footer>
  )
}
