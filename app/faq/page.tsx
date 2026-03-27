'use client'
import { NextPage } from 'next';
import { useTranslation, Trans } from 'react-i18next';
import styles from '@/css/infopages.module.css'
import { BottomBar } from '@/components/BottomBar/BottomBar';
import { TopBar } from '@/components/TopBar/TopBar';
import { useEffect, useState } from 'react';

const Faq: NextPage = () => {
  const [isDark, setIsDark] = useState(false);
  const { t } = useTranslation('faq');

  useEffect(() => {
    document.title = t('pageTitle');
  }, [t]);

  return (
    <main className={styles.main}>
      <TopBar hasLogo={true} isDark={isDark} setIsDark={setIsDark}/>
      <div className={styles.textContent}>
        <h1 className={styles.title}>{t('title')}</h1>
        <h2 id='trust'>{t('whyTrustTitle')}</h2>
        <p><Trans i18nKey='whyTrust1' t={t} components={{ dccLink: <a href='https://digitalcredentials.mit.edu/' /> }} /></p>
        <p><Trans i18nKey='whyTrust2' t={t} components={{ blueLink: <a href='https://wiki.rediris.es/spaces/BLUE' />, redirisLink: <a href='https://www.rediris.es/' />, crueLink: <a href='https://www.crue.org/' /> }} /></p>
        <p><Trans i18nKey='whyTrust3' t={t} components={{ githubLink: <a href='https://github.com/digitalcredentials' /> }} /></p>
        <p><Trans i18nKey='whyTrust4' t={t} components={{ emailLink: <a href='mailto:blue@rediris.es' /> }} /></p>

        <h2 id='supported'>{t('formatsTitle')}</h2>
        <p>{t('formatsIntro')}</p>
        <ul>
          <li>{t('formatsList.w3c')}</li>
          <li>{t('formatsList.ob3')}</li>
          <li>{t('formatsList.jwtVc')}</li>
          <li>{t('formatsList.sdJwt')}</li>
        </ul>

        <p>{t('formatsRequirements')}</p>
        <ul>
          <li>{t('requirementsList.registry')}</li>
          <li>{t('requirementsList.did')}</li>
          <li>{t('requirementsList.crypto')}</li>
        </ul>

        <h2>{t('publicLinkTitle')}</h2>
        <p>{t('publicLink')}</p>

        <h2>{t('contactTitle')}</h2>
        <p><Trans i18nKey='contact1' t={t} components={{ emailLink: <a href='mailto:blue@rediris.es' /> }} /></p>
        <p><Trans i18nKey='contact2' t={t} components={{ blueWikiLink: <a href='https://wiki.rediris.es/spaces/BLUE' /> }} /></p>

      </div>
      <BottomBar isDark={isDark}/>
    </main>
  );
}

export default Faq;
