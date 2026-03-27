'use client'
import { NextPage } from "next";
import { useTranslation, Trans } from 'react-i18next';
import styles from '@/css/infopages.module.css'
import { BottomBar } from "@/components/BottomBar/BottomBar";
import { TopBar } from "@/components/TopBar/TopBar";
import { useEffect, useState } from "react";

const Terms: NextPage = () => {
  const [isDark, setIsDark] = useState(false);
  const { t } = useTranslation('terms');

  useEffect(() => {
    document.title = t('pageTitle');
  }, [t]);

  return (
    <main className={styles.main}>
      <TopBar hasLogo={true} isDark={isDark} setIsDark={setIsDark}/>
      <div className={styles.textContent}>
        <h1 className={styles.title}>{t('title')}</h1>
            <p>
              <Trans i18nKey='intro' t={t}
                components={{
                  dccLink: <a href='https://digitalcredentials.mit.edu' />,
                  blueLink: <a href='https://wiki.rediris.es/spaces/BLUE' />,
                  redirisLink: <a href='https://www.rediris.es/' />,
                  crueLink: <a href='https://www.crue.org/' />
                }}
              />
            </p>
            <ol>
                <li><p><Trans i18nKey='item1' t={t} components={{ privacyLink: <a href='privacy' /> }} /></p></li>
                <li><p><Trans i18nKey='item2' t={t} components={{ blueWalletLink: <a href='https://wiki.rediris.es/spaces/BLUE' />, privacyLink: <a href='privacy' /> }} /></p></li>
                <li><p>{t('item3')}</p></li>
                <li><p>{t('item4')}</p></li>
                <li><p>{t('item5')}</p></li>
                <li><p>{t('item6')}</p></li>
                <li><p>{t('item7')}</p></li>
                <li><p>{t('item8')}</p></li>
                <li><p>{t('item9')}</p></li>
            </ol>
            <p>{t('effectiveDate')}</p>
      </div>
      <BottomBar isDark={isDark}/>
    </main>
  );
}

export default Terms;
