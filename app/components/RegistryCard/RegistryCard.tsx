
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './RegistryCard.module.css';
import { TestId } from '@/lib/testIds';

type RegistryCardProps = {
  registryName: string;
  issuerName?: string;
  issuerId?: string;
  issuerLogo?: string | { id: string };
  issuerLegalName?: string;
  issuerUrl?: string;
  policyUrl?: string;
};

export const RegistryCard: React.FC<RegistryCardProps> = ({ registryName, issuerName, issuerId, issuerLogo, issuerLegalName, issuerUrl,policyUrl }) => {
  const { t } = useTranslation('credential');
  return (
    <div className={styles.registryCard}>
      <strong className={styles.registryName}>{registryName}</strong>{' '}
      {policyUrl ? (
                <a href={policyUrl} target="_blank" rel="noopener noreferrer">
                    {t('moreInfoGovernance')}
                </a>
              ) : null}



      <div className={styles.issuerMeta}>
      {issuerLogo && (
  <div className={styles.logoPlaceholder}>
    <img
      src={typeof issuerLogo === 'string' ? issuerLogo : issuerLogo.id}
      alt={t('issuerLogo')}
    />
  </div>
)}
        <div>
          {issuerName && (
            <p className={styles.registryName}>
              <strong>{t('issuerName')}</strong>{' '}
              <span data-testid={TestId.RegistryIssuerName}>
              {issuerUrl ? (
                <a href={issuerUrl} target="_blank" rel="noopener noreferrer">
                  {issuerName}
                </a>
              ) : (
                issuerName
              )}
              </span>
            </p>
          )}
          {issuerLegalName && (
            <p className={styles.registryName}>
              <strong  className={styles.registryName}>{t('legalName')}</strong> {issuerLegalName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
