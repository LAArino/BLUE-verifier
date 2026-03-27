'use client'
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CredentialError } from '@/types/credential.d';
import type { ResultLogProps } from './ResultLog.d';
import styles from './ResultLog.module.css';
import { StatusPurpose, hasStatusPurpose } from '@/lib/credentialStatus';
import { TestId } from "@/lib/testIds"

export enum LogId {
  ValidSignature = 'valid_signature',
  Expiration = 'expiration',
  IssuerDIDResolves = 'registered_issuer',
  RevocationStatus = 'revocation_status',
  SuspensionStatus = 'suspension_status'
}

export enum LogMessages {
  HasExpired = 'has expired',
  NoExpirationDate = 'no expiration date set',
  HasNotExpired = 'has not expired',
  GeneralError = 'There was an error verifing this credential.',
  UnknownError = 'There was an unknown error verifing this credential.',
  WellFormed = 'is in a supported credential format',
  MalFormed = 'is not a recognized credential type',
  ValidSignature = 'has a valid signature',
  InvalidSignature = 'has an invalid signature',
  KnownIssuer = 'has been issued by a known issuer',
  UnknownIssuer = "isn't in a known issuer registry",
  NotRevoked = 'has not been revoked',
  Revoked = 'has been revoked',
  UncheckedRevocation = 'Revocation status could not be checked',
  NotSuspended = 'has not been suspended',
  Suspended = 'has been suspended'
}

export const ResultLog = ({ verificationResult }: ResultLogProps) => {
  const [moreInfo, setMoreInfo] = useState(false);
  const { t } = useTranslation('verification');


  const ResultItem = ({
    verified = true,
    positiveMessage = '',
    negativeMessage = '',
    warningMessage = '',
    sourceLogId = '',
    testId = '',
    issuer = false
  }) => {
    const isIssuerCheck = sourceLogId === LogId.IssuerDIDResolves;
    const isExpirationCheck = sourceLogId === LogId.Expiration;
    const status = verified
      ? 'positive'
      : isIssuerCheck || isExpirationCheck
        ? 'warning'
        : 'negative';

    const getStatusClass = () => {
      if (status === 'positive') return styles.verified;
      if (status === 'warning') return `${styles.warning} ${styles.warningIcon}`;
      return styles.notVerified;
    };

    return (
      <div className={styles.resultItem}>
        <span
          role="img"
          aria-label={
            status === 'positive'
              ? 'green checkmark'
              : status === 'warning'
                ? 'yellow warning'
                : 'red x'
          }
          className={`material-icons ${getStatusClass()}`}
        >
          {status === 'positive'
            ? 'check_circle'
            : status === 'warning'
              ? 'priority_high'
              : 'close'}
        </span>
        <div data-testid={testId}>
          {status === 'positive' && positiveMessage}
          {status === 'warning' && warningMessage}
          {status === 'negative' && negativeMessage}
        </div>
      </div>
    );
  };


  let logMap: { [x: string]: any; };
  let hasKnownError = false;
  let shouldShowKnownError = false;
  let hasUnknownError = false;
  let hasSigningError = false;
  let error: CredentialError;
  let hasResult = verificationResult.results[0];


  if (hasResult) {
    let log = []
    const result = verificationResult.results[0];
    const hasResultLog = !!result.log;
    const hasErrorLog = !!result.error?.log
    hasKnownError = !!result.error
    shouldShowKnownError = !!result.error?.isFatal
    if (hasKnownError) {
      error = result.error
      console.log('Error: ', error);
    }
    if (hasResultLog) {
      log = result.log
    } else if (hasErrorLog) {
      log = result.error.log
    }
    logMap = log.reduce((acc: Record<string, boolean>, logEntry: any) => {
      acc[logEntry.id] = logEntry.valid;
      return acc;
    }, {}) ?? {};

    hasSigningError = !logMap[LogId.ValidSignature];

  } else {
    hasUnknownError = true;
  }

  const renderResult = () => {
    const result = verificationResult.results[0];
    const isMalformedError =
      result?.error?.message ===
      'Credential could not be checked for verification and may be malformed.';
    const { credential } = result;
    if (shouldShowKnownError) {
      return (
        <div>
          <p data-testid={TestId.GeneralErrorMsg} className={styles.error}>{t('log.generalError')}</p>
          {error?.message && (
            <div className={styles.errorContainer}>
              <p data-testid={TestId.ReturnedErrorMsg}>{error.message}</p>
            </div>
          )}
        </div>
      )
    } else if (hasSigningError) {
      return (
        <div>
          <p data-testid={TestId.SigningErrorMsg} className={styles.error}>{t('signingError')} <span className={styles.moreInfoLink} onClick={() => setMoreInfo(!moreInfo)}>{t('moreInfo')}</span></p>
          {moreInfo && (
            <div className={styles.errorContainer}>
              <p>{t('signingErrorDetail')}</p>
            </div>
          )}
        </div>
      )
    } else if (hasUnknownError) {
      return (<div>
        <p data-testid={TestId.UnknownErrorMsg} className={styles.error}>{t('log.unknownError')} <span className={styles.moreInfoLink} onClick={() => setMoreInfo(!moreInfo)}>{t('moreInfo')}</span></p>
        {moreInfo && (
          <div className={styles.errorContainer}>
            <p>{t('unknownErrorDetail')}</p>
          </div>
        )}
      </div>)

    } else {

      const hasCredentialStatus = credential.credentialStatus !== undefined;
      //const hasRevocationStatus = hasStatusPurpose(credential, StatusPurpose.Revocation);
      const hasSuspensionStatus = hasStatusPurpose(credential, StatusPurpose.Suspension);
      const expirationDateExists =
        ('expirationDate' in credential && !!(credential as any).expirationDate) ||
        ('validUntil' in credential && !!(credential as any).validUntil);
      const expirationStatus = logMap[LogId.Expiration]; // could be true, false, or undefined

      return (
        <div className={styles.resultLog} data-testid={TestId.ResultLog}>
          <ResultItem
            verified={!isMalformedError}
            positiveMessage={t('log.wellFormed')}
            negativeMessage={t('log.malFormed')}
            testId={TestId.MalformedLogMsg}
          />

          <ResultItem
            verified={logMap[LogId.ValidSignature] ?? true}
            positiveMessage={t('log.validSignature')}
            negativeMessage={t('log.invalidSignature')}
            testId={TestId.SigningLogMsg}
          />
          <ResultItem
            verified={logMap[LogId.IssuerDIDResolves] ?? true}
            positiveMessage={t('log.knownIssuer')}
            warningMessage={t('log.unknownIssuer')}
            sourceLogId={LogId.IssuerDIDResolves}
            testId={TestId.IssuerLogMsg}
            issuer={true}
          />

          {
            <ResultItem
              verified={logMap[LogId.RevocationStatus] !== undefined ? logMap[LogId.RevocationStatus] : true}
              positiveMessage={t('log.notRevoked')}
              negativeMessage={verificationResult.hasStatusError ? t('log.uncheckedRevocation') : t('log.revoked')}
              testId={TestId.RevocationLogMsg}
            />
          }

          <ResultItem
            verified={expirationStatus === false ? false : true}
            positiveMessage={!expirationDateExists ? t('log.noExpirationDate') : t('log.hasNotExpired')}
            warningMessage={t('log.hasExpired')}
            sourceLogId={LogId.Expiration}
            testId={TestId.ExpirationLogMsg}
          />

          {hasCredentialStatus && hasSuspensionStatus &&
            <ResultItem
              verified={logMap[LogId.SuspensionStatus] ?? true}
              positiveMessage={t('log.notSuspended')}
              negativeMessage={t('log.suspended')}
              testId={TestId.SuspensionLogMsg}
            />}

        </div>
      )
    }
  }

  return (
    renderResult()
  );
}
