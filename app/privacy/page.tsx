'use client'
import { NextPage } from "next";
import { useTranslation, Trans } from 'react-i18next';
import styles from '@/css/infopages.module.css'
import { BottomBar } from "@/components/BottomBar/BottomBar";
import { TopBar } from "@/components/TopBar/TopBar";
import { useEffect, useState } from "react";

const Privacy: NextPage = () => {
  const [isDark, setIsDark] = useState(false);
  const { t } = useTranslation('privacy');

  useEffect(() => {
    document.title = t('pageTitle');
  }, [t]);

  return (
    <main className={styles.main}>
      <TopBar hasLogo={true} isDark={isDark} setIsDark={setIsDark}/>
      <div className={styles.textContent}>
        <div>
          <h1 className={styles.title}>{t('title')}</h1>
          <h2>{t('introTitle')}</h2>
            <p><Trans i18nKey='intro1' t={t} components={{ dccLink: <a href='https://digitalcredentials.mit.edu' />, blueLink: <a href='https://wiki.rediris.es/spaces/BLUE' />, redirisLink: <a href='https://www.rediris.es/' />, crueLink: <a href='https://www.crue.org/' /> }} /></p>
            <p>{t('intro2')}</p>
          <h2>{t('collectTitle')}</h2>
            <p>{t('collect1')}</p>
            <p>{t('collect2')}</p>
          <h2>{t('howCollectTitle')}</h2>
            <p>{t('howCollect1')}</p>
            <p>{t('howCollect2')}</p>
            <p>{t('howCollect3')}</p>
          <h2>{t('useTitle')}</h2>
            <p>{t('use1')}</p>
          <h2>{t('shareTitle')}</h2>
            <p><Trans i18nKey='share1' t={t} components={{ mongoLink: <a href='https://www.mongodb.com/legal/privacy-policy' /> }} /></p>
          <h2>{t('storageTitle')}</h2>
            <p>{t('storage1')}</p>
          <h2>{t('retentionTitle')}</h2>
            <p><Trans i18nKey='retention1' t={t} components={{ emailLink: <a href='mailto:blue@rediris.es' /> }} /></p>
          <h2>{t('additionalTitle')}</h2>
            <p>{t('additional1')}</p>
            <p><Trans i18nKey='additional2' t={t} components={{ emailLink: <a href='mailto:blue@rediris.es' /> }} /></p>
        </div>
      </div>
      <BottomBar isDark={isDark}/>
    </main>
  );
}

export default Privacy;
