import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';
import type { VerificationControlsProps } from './VerificationControls.d';
import styles from './VerificationControls.module.css';
import { ResultLog } from '@/components/ResultLog/ResultLog';
import { VerifyResponse } from '@/types/credential';

export const VerificationControls = ({ verificationResult, verifyCredential }: VerificationControlsProps ) => {
  const { t, i18n } = useTranslation('verification');
  const hasFatalError = verificationResult?.results?.[0]?.error?.isFatal;

  return (
    <div>

      <div className={styles.result}>
      <div className={styles.title}> {t('title')}</div>
      {!hasFatalError && <div className={styles.subTitle}> {t('thisCredential')}</div>}
        <div className={styles.messageContainer}>
        <ResultLog verificationResult={verificationResult as VerifyResponse} />
        <div className={styles.lastChecked}>{t('lastChecked', { date: DateTime.now().setLocale(i18n.language).toLocaleString(DateTime.DATE_MED) })}</div>
        </div>
      </div>

      <button className={styles.verifyButton} type="button" onClick={verifyCredential}>
        <span className="material-icons">sync</span>
        {t('runVerification')}
      </button>
    </div>
  );
};
