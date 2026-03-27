import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TrustRegistryCard.module.css';
import type { IssuerTIRDetails } from '@/types/credential';

type TrustRegistryCardProps = {
  tirDetails: IssuerTIRDetails;
};

export const TrustRegistryCard: React.FC<TrustRegistryCardProps> = ({ tirDetails }) => {
  const { t, i18n } = useTranslation('credential');
  const {
    networkName,
    environmentLabel,
    issuerName,
    accreditingOrganization,
    accreditingDid,
    accreditations,
    issuerDid
  } = tirDetails;

  const networkLabel = environmentLabel
    ? `${networkName} (${environmentLabel})`
    : networkName;

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={`material-icons ${styles.trustIcon}`}>verified</span>
        <strong>{t('trustRegistry.title')}</strong>
      </div>

      <div className={styles.network}>
        <span className={styles.badge}>{networkLabel}</span>
      </div>

      <div className={styles.details}>
        {issuerName && (
          <div className={styles.row}>
            <span className={styles.label}>{t('trustRegistry.issuer')}</span>
            <span className={styles.value}>{issuerName}</span>
          </div>
        )}

        <div className={styles.row}>
          <span className={styles.label}>{t('trustRegistry.did')}</span>
          <span className={`${styles.value} ${styles.did}`}>{issuerDid}</span>
        </div>

        {accreditingOrganization && (
          <div className={styles.row}>
            <span className={styles.label}>{t('trustRegistry.accreditedBy')}</span>
            <span className={styles.value}>
              {accreditingOrganization}
              {accreditingDid && (
                <span className={styles.accreditingDid}> ({accreditingDid})</span>
              )}
            </span>
          </div>
        )}
      </div>

      {accreditations.length > 0 && (
        <div className={styles.accreditations}>
          <span className={styles.label}>{t('trustRegistry.accreditedTypes')}</span>
          <div className={styles.accreditationList}>
            {accreditations.map((acc, index) => (
              <div key={index} className={styles.accreditation}>
                <div className={styles.credentialTypes}>
                  {acc.credentialTypes.map((type, i) => (
                    <span key={i} className={styles.typeBadge}>{type}</span>
                  ))}
                </div>
                <div className={styles.accMeta}>
                  {acc.limitJurisdiction && (
                    <span className={styles.metaItem}>
                      <span className={`material-icons ${styles.metaIcon}`}>public</span>
                      {acc.limitJurisdiction}
                    </span>
                  )}
                  {acc.validFrom && (
                    <span className={styles.metaItem}>
                      <span className={`material-icons ${styles.metaIcon}`}>event</span>
                      {formatDate(acc.validFrom)}
                      {acc.validUntil && ` — ${formatDate(acc.validUntil)}`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
