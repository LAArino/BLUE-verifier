import { useTranslation } from "react-i18next";
import { useVerificationContext } from "@/lib/verificationContext";
import styles from './VerifyIndicator.module.css';
import { TestId } from "@/lib/testIds";

export const VERIFYING_MSG = 'Verifying...';
export const NOT_VERIFIED_MSG = 'Not Verified'
export const WARNING_MSG = 'Warning';
export const VERIFIED_MSG = 'Verified'

export const VerifyIndicator = () => {
  const { loading, verificationResult } = useVerificationContext();
  const { t } = useTranslation('verification');
  let className: string = '';
  let icon: React.ReactElement | null = null;
  let text: string = '';

  const result = verificationResult?.results?.[0];
  const log = result?.log ?? [];

  const details = log.reduce<Record<string, boolean>>((acc, entry) => {
    acc[entry.id] = entry.valid;
    return acc;
  }, {});

  ['valid_signature', 'expiration', 'registered_issuer'].forEach(key => {
    if (!(key in details)) {
      details[key] = false;
    }
  });

  const hasFailure = ['valid_signature', 'revocation_status'].some(
    key => details[key] === false
  );

  const hasWarning = ['expiration', 'registered_issuer'].some(
    key => details[key] === false
  );

  if (loading) {
    className = styles.loading;
    text = t('indicator.verifying');
  } else if (hasFailure) {
    icon = <span className={`material-icons ${styles.indicatorIcon}`}>cancel</span>;
    text = t('indicator.notVerified');
    className = styles.notVerified;
  } else if (hasWarning) {
    icon = <span className={`material-icons ${styles.indicatorIcon}`}>priority_high</span>;
    text = t('indicator.warning');
    className = styles.warning;
  } else {
    icon = <span className={`material-icons ${styles.indicatorIcon}`}>check_circle</span>;
    text = t('indicator.verified');
    className = styles.verified;
  }

  return (
    <div className={styles.container}>
      <span className={`${styles.indicator} ${className}`} >
        {icon}
        <span data-testid={TestId.VerifyIndicator}>{text}</span>
      </span>
    </div>
  );
};
