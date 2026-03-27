import { InfoBlock } from '@/components/InfoBlock/InfoBlock';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';
import type { CompletionDocumentSectionProps } from './CompletionDocumentSection.d';
import styles from './CompletionDocumentSection.module.css';

export const CompletionDocumentSection = ({ completionDocument }: CompletionDocumentSectionProps) => {
  const { t, i18n } = useTranslation('credential');
  const {numberOfCredits, startDate, endDate} = completionDocument;

  return (
    <div>
      {numberOfCredits !== undefined && (
        <InfoBlock header={t('numberOfCredits')} contents={numberOfCredits.value as string} />
      )}
      <div className={styles.dateContainer}>
        {startDate !== undefined && (
          <InfoBlock header={t('startDate')} contents={DateTime.fromISO(startDate).setLocale(i18n.language).toLocaleString(DateTime.DATE_MED)} />
        )}
        {endDate !== undefined && (
          <InfoBlock header={t('endDate')} contents={DateTime.fromISO(endDate).setLocale(i18n.language).toLocaleString(DateTime.DATE_MED)} />
        )}
      </div>
    </div>
  );
};
