'use client'
import { DateTime, Info } from 'luxon';
import { useTranslation } from 'react-i18next';
import { CompletionDocumentSection } from '@/components/CompletionDocumentSection/CompletionDocumentSection';
import { Issuer } from '@/components/Issuer/Issuer';
import { IssuerObject, VerifiableCredential } from '@/types/credential.d';
import type { CredentialCardProps, CredentialDisplayFields, SubjectField } from './CredentialCard.d';
import styles from './CredentialCard.module.css';
import { InfoBlock } from '@/components/InfoBlock/InfoBlock';
import { VerifyIndicator } from '@/components/VerifyIndicator/VerifyIndicator';
import { useState } from 'react';
import { useVerificationContext } from "@/lib/verificationContext";
import ReactMarkdown from 'react-markdown';
import { getExpirationDate, getIssuanceDate } from '@/lib/credentialValidityPeriod';
import { extractNameFromOBV3Identifier } from '@/lib/extractNameFromOBV3Identifier';
import { TestId } from '@/lib/testIds';
import { Alignment } from '@/components/Alignment/Alignment';
import { vctToTypeName } from '@/lib/crypto/sdJwt';


export const CredentialCard = ({ credential, wasMulti = false }: CredentialCardProps) => {
  // TODO: add back IssuerInfoModal
  // TODO: add icon back to Issuer
  // NOTE: unused imports will be used when above features get reinstated

  const { t, i18n } = useTranslation('credential');
  const displayValues = mapCredDataToDisplayValues(credential)
  const { verificationResult } = useVerificationContext();

  const issuer = extractIssuerFromVerification(verificationResult, credential?.issuer as IssuerObject);
  const [isOpen, setIsOpen] = useState(false);

  const infoButtonPushed = () => {
    setIsOpen(true);
  }


  return (
    <main aria-labelledby='title'>
      {wasMulti && (
        <div className={styles.errorContainer}>

          <span className={`material-icons-outlined ${styles.warningIcon}`}>
            warning
          </span>
          <p className={styles.error}>{t('multipleCredentials', { ns: 'home' })}</p>
        </div>
      )}
      <div className={styles.card}>
        <div className={styles.topCard}>
          <div className={styles.verifyContainer}>
            <VerifyIndicator />
            <div className={styles.buttonContainer}>
              {/* <Button
                text="Share"
                icon={<span className="material-icons">share</span>}
                secondary
              /> */}
              {/* <Button
                // className={styles.viewSource}
                icon={<span className="material-icons">code</span>}
                text="View Source"
                secondary
              /> */}
            </div>
          </div>
          <div className={styles.achivementInfo}>
            {displayValues.achievementImage ? <img className={styles.achievementImage} src={displayValues.achievementImage} alt="achievement image" data-testid={TestId.AchievementImage}/> : null}
            <div>
              <h1 id='title' className={styles.credentialName} data-testid={TestId.CredentialName}>{displayValues.credentialName}</h1>
              {displayValues.achievementType ? <p className={styles.achievementType} data-testid={TestId.AchievementType}>{t('achievementType', { type: displayValues.achievementType })}</p> : null}
              {displayValues.vct ? <p className={styles.achievementType}>{t('type', { vct: displayValues.vct })}</p> : null}
            </div>
          </div>
        </div>
        <div className={styles.mainCard}>
          <div className={styles.secondaryColumn}>
            <section>
              <Issuer issuer={issuer} infoButtonPushed={infoButtonPushed} header={t('issuer')} />
              <div className={styles.headerRow}>
                {displayValues.issuanceDate && (
                  <InfoBlock header={t('issuanceDate')} contents={DateTime.fromISO(displayValues.issuanceDate).setLocale(i18n.language).toLocaleString(DateTime.DATE_MED)} testId={TestId.IssuanceDate} />
                )}

                <InfoBlock
                  header={t('expirationDate')}
                  contents={
                    displayValues.expirationDate
                      ? DateTime.fromISO(displayValues.expirationDate).setLocale(i18n.language).toLocaleString(DateTime.DATE_MED)
                      : t('notApplicable')
                  }
                  testId={TestId.ExpirationDate}
                />
              </div>
              {credential?.credentialSubject?.hasCredential?.awardedOnCompletionOf && (
                <CompletionDocumentSection completionDocument={credential.credentialSubject.hasCredential.awardedOnCompletionOf} />
              )}
            </section>
            {/* <div className={styles.qrCodeContainer}>
              <QRCodeSVG value={JSON.stringify(credential)} className={styles.qrCode}/>
            </div> */}
          </div>

          <div className={styles.primaryColumn}>
            {displayValues.issuedTo ?
              <InfoBlock header={t('issuedTo')} contents={displayValues.issuedTo} testId={TestId.IssuedTo}/>
              :
              null
            }
            {displayValues.credentialDescription ?
              <InfoBlock header={t('description')} contents={displayValues.credentialDescription} testId={TestId.CredentialDescription}/>
              :
              null
            }
            {displayValues.criteria && (
              <div>
                <h3 className={styles.smallHeader}>{t('criteria')}</h3>
                {/* <div className={styles.credentialCriteria}>{displayValues.criteria}</div> */}
                <div className={styles.markdownContainer} data-testid={TestId.CredentialCriteria}>
                  <ReactMarkdown >{displayValues.criteria}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Alignments (Open Badges 3.0) */}
            {credential?.credentialSubject?.achievement?.alignment && (
              <Alignment
                alignment={credential.credentialSubject.achievement.alignment as any}
                headerClassName={styles.smallHeader}
              />
            )}

            {/* Generic subject fields (DC4EU / non-OBv3 credentials) */}
            {displayValues.subjectFields && displayValues.subjectFields.length > 0 && (
              <div className={styles.subjectFields}>
                <h3 className={styles.smallHeader}>{t('credentialDetails')}</h3>
                <div className={styles.subjectFieldsGrid}>
                  {displayValues.subjectFields.map((field) => (
                    <div key={field.key} className={styles.subjectField}>
                      <span className={styles.subjectFieldLabel}>{field.label}</span>
                      <span className={styles.subjectFieldValue}>{field.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* <IssuerInfoModal isOpen={isOpen} setIsOpen={setIsOpen} issuer={issuer}/> */}
    </main>
  );
}

const extractIssuerFromVerification = (
  verificationResult: any,
  credentialIssuer: IssuerObject
): IssuerObject => {
  const registeredIssuerEntry = verificationResult?.log?.find(
    (entry: any) => entry.id === 'registered_issuer'
  );

  const matchingIssuers = registeredIssuerEntry?.matchingIssuers;

  if (matchingIssuers && matchingIssuers.length > 0) {
    const matched = matchingIssuers[0];
    const org = matched.issuer?.federation_entity;

    return {
      id: credentialIssuer?.id || '',
      name: org?.organization_name || '',
      url: org?.homepage_uri || '',
      image: org?.logo_uri || '',
    };
  }

  // fallback to credential issuer
  return {
    id: credentialIssuer?.id || '',
    name: credentialIssuer?.name || '',
    url: credentialIssuer?.url || '',
    image: credentialIssuer?.image || '',
  };
};

const mapCredDataToDisplayValues = (credential?: VerifiableCredential): CredentialDisplayFields => {
  if (!credential) {
    return {
      issuedTo: '',
      issuanceDate: '',
      expirationDate: '',
      credentialName: '',
      credentialDescription: '',
      criteria: ''
    }
  }
  const common = {
    issuedTo: credential.credentialSubject?.name ?? extractNameFromOBV3Identifier(credential.credentialSubject) ?? credential.name,
    issuanceDate: getIssuanceDate(credential),
    expirationDate: getExpirationDate(credential)
  }

  // OpenBadge / Achievement credentials
  if (credential.type.includes("OpenBadgeCredential") || credential.type.includes("AchievementCredential")) {
    return {
      ...common,
      credentialName: credential.credentialSubject.achievement?.name,
      credentialDescription: credential.credentialSubject.achievement?.description,
      criteria: credential.credentialSubject.achievement?.criteria?.narrative,
      achievementImage: credential.credentialSubject.achievement?.image?.id,
      achievementType: credential.credentialSubject.achievement?.achievementType
    }
  }

  // Educational Operational Credentials (hasCredential)
  if (credential.credentialSubject.hasCredential) {
    return {
      ...common,
      credentialName: credential.credentialSubject.hasCredential?.name,
      credentialDescription: credential.credentialSubject.hasCredential?.description,
      criteria: credential.credentialSubject.hasCredential?.competencyRequired
    }
  }

  // Generic credentials (DC4EU JWT-VC / SD-JWT: PID, diplomas, etc.)
  const cred = credential as any;
  const vct = cred.vct as string | undefined;

  // Derive credential name from vct, credential name field, or type array
  let credentialName: string | undefined;
  if (vct) {
    credentialName = vctToTypeName(vct);
  }
  if (!credentialName || credentialName === 'VerifiableCredential') {
    credentialName = credential.name
      ?? credential.type.find(t => t !== 'VerifiableCredential')
      ?? 'VerifiableCredential';
  }

  // Extract subject fields as generic key-value pairs
  const subjectFields = extractSubjectFields(credential.credentialSubject);

  // Try to find issuedTo from common PID fields
  const issuedTo = common.issuedTo
    ?? buildSubjectName(credential.credentialSubject as Record<string, unknown>);

  return {
    ...common,
    issuedTo,
    credentialName,
    credentialDescription: cred.description ?? undefined,
    criteria: undefined,
    vct,
    subjectFields
  }
}

/**
 * Extracts displayable key-value pairs from credentialSubject.
 * Skips metadata fields and flattens simple nested objects.
 */
const SKIP_SUBJECT_KEYS = new Set([
  'id', 'type', 'name', 'achievement', 'hasCredential', 'identifier'
]);

function extractSubjectFields(subject: Record<string, unknown>): SubjectField[] {
  const fields: SubjectField[] = [];

  for (const [key, value] of Object.entries(subject)) {
    if (SKIP_SUBJECT_KEYS.has(key) || value === undefined || value === null) continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Flatten one level of nesting
      const nested = value as Record<string, unknown>;
      for (const [nk, nv] of Object.entries(nested)) {
        if (nv === undefined || nv === null) continue;
        fields.push({
          key: `${key}.${nk}`,
          label: formatFieldLabel(`${key} ${nk}`),
          value: formatFieldValue(nv)
        });
      }
    } else {
      fields.push({
        key,
        label: formatFieldLabel(key),
        value: formatFieldValue(value)
      });
    }
  }

  return fields;
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase → camel Case
    .replace(/_/g, ' ')                     // snake_case → snake case
    .replace(/\b\w/g, c => c.toUpperCase()); // capitalize first letter of each word
}

function formatFieldValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(formatFieldValue).join(', ');
  return JSON.stringify(value);
}

/**
 * Tries to build a display name from common PID/DC4EU subject fields.
 */
function buildSubjectName(subject: Record<string, unknown>): string | undefined {
  const given = subject.given_name ?? subject.givenName ?? subject.firstName;
  const family = subject.family_name ?? subject.familyName ?? subject.lastName;
  if (given && family) return `${given} ${family}`;
  if (given) return String(given);
  if (family) return String(family);
  return undefined;
}
