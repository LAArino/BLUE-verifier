'use client'
import Link from 'next/link';
import type { BottomBarProps } from './BottomBar.d'
import styles from './BottomBar.module.css'

export const BottomBar = ({isDark}: BottomBarProps) => {
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
        <Link href='/terms' className={styles.link}>Terms and Conditions of Use</Link>
        <Link href='/privacy' className={styles.link}>Privacy Policy</Link>
        <Link className={styles.link} href='https://wiki.rediris.es/spaces/BLUE'>BLUE</Link>
        <Link className={styles.link} href='https://git.blue.rediris.es/blue'>View on Git</Link>
      </div>
    </footer>
  )
}
