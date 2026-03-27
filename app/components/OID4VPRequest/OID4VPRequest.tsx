'use client'
import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import styles from './OID4VPRequest.module.css'

type OID4VPRequestProps = {
  onCredentialReceived: (credential: Record<string, unknown>, verificationResult: any, vpToken?: string) => void
}

type SessionState = {
  sessionId: string
  uri: string
  status: 'pending' | 'completed' | 'failed' | 'expired'
  error?: string
}

const CREDENTIAL_PRESETS = [
  // Generic
  { labelKey: 'presets.anyCredential', types: ['VerifiableCredential'], vctValues: [], typeNames: [], queryMode: 'presentation_definition' as const },
  // Identity
  { labelKey: 'presets.verifiablePid', types: [], vctValues: ['eu.europa.ec.eudi.pid.1', 'urn:eu.europa.ec.eudi:pid:1'], typeNames: ['VerifiablePID', 'PID', 'pid'], queryMode: 'dcql' as const },
  { labelKey: 'presets.educationalId', types: [], vctValues: ['eu.europa.ec.eudi.eduid.1', 'urn:eu.europa.ec.eudi.eduid:1'], typeNames: ['EducationalID', 'EduID', 'eduid', 'EducationalCredential'], queryMode: 'dcql' as const },
  { labelKey: 'presets.myAcademicId', types: [], vctValues: [], typeNames: ['MyAcademicIDIssuer', 'MyAcademicID'], queryMode: 'dcql' as const },
  { labelKey: 'presets.myAllianceId', types: [], vctValues: [], typeNames: ['MyAllianceID'], queryMode: 'dcql' as const },
  { labelKey: 'presets.europeanStudentCard', types: [], vctValues: [], typeNames: ['EuropeanStudentCard', 'ESC'], queryMode: 'dcql' as const },
  // Higher Education
  { labelKey: 'presets.heDiploma', types: [], vctValues: ['eu.europa.ec.eudi.hed.1', 'urn:eu.europa.ec.eudi:hed:1'], typeNames: ['EuropeanHigherEducationDiploma', 'HigherEducationDiploma', 'HED', 'Diploma'], queryMode: 'dcql' as const },
  { labelKey: 'presets.heDiplomaSupplement', types: [], vctValues: ['eu.europa.ec.eudi.heds.1', 'urn:eu.europa.ec.eudi:heds:1'], typeNames: ['EuropeanHigherEducationDiplomaSupplement', 'HEDS'], queryMode: 'dcql' as const },
  { labelKey: 'presets.heProofOfEnrolment', types: [], vctValues: ['eu.europa.ec.eudi.hepoe.1', 'urn:eu.europa.ec.eudi:hepoe:1'], typeNames: ['EuropeanHigherEducationProofOfEnrolment', 'ProofOfEnrolment', 'HEPoE', 'Enrolment'], queryMode: 'dcql' as const },
  { labelKey: 'presets.heMicrocredential', types: [], vctValues: ['eu.europa.ec.eudi.euhemc.1', 'urn:eu.europa.ec.eudi:euhemc:1'], typeNames: ['EuropeanHigherEducationMicrocredential', 'EUHEMC', 'Microcredential'], queryMode: 'dcql' as const },
  { labelKey: 'presets.heTranscript', types: [], vctValues: ['eu.europa.ec.eudi.hetor.1', 'urn:eu.europa.ec.eudi:hetor:1'], typeNames: ['EuropeanHigherEducationTranscriptOfRecords', 'HEToR', 'TranscriptOfRecords'], queryMode: 'dcql' as const },
  // Secondary & VET
  { labelKey: 'presets.upperSecondaryCert', types: [], vctValues: ['eu.europa.ec.eudi.eusec.1', 'urn:eu.europa.ec.eudi:eusec:1'], typeNames: ['EuropeanUpperSecondaryEducationCertificate', 'EUSEC'], queryMode: 'dcql' as const },
  { labelKey: 'presets.upperSecondaryTranscript', types: [], vctValues: ['eu.europa.ec.eudi.usetor.1', 'urn:eu.europa.ec.eudi:usetor:1'], typeNames: ['EuropeanUpperSecondaryEducationTranscriptOfRecords', 'USEToR'], queryMode: 'dcql' as const },
  { labelKey: 'presets.vetMicrocredential', types: [], vctValues: ['eu.europa.ec.eudi.vetmc.1', 'urn:eu.europa.ec.eudi:vetmc:1'], typeNames: ['EuropeanVocationalEducationTrainingMicrocredential', 'VETMC'], queryMode: 'dcql' as const },
  // Professional / Health
  { labelKey: 'presets.professionalId', types: [], vctValues: [], typeNames: ['ProfessionalIdCredential'], queryMode: 'dcql' as const },
  { labelKey: 'presets.doctorId', types: [], vctValues: [], typeNames: ['DoctorIdCredential'], queryMode: 'dcql' as const },
  { labelKey: 'presets.engineerId', types: [], vctValues: [], typeNames: ['EngineerIdCredential'], queryMode: 'dcql' as const },
  { labelKey: 'presets.medicalTraining', types: [], vctValues: [], typeNames: ['ContinuousMedicalTrainingAccreditation'], queryMode: 'dcql' as const },
  { labelKey: 'presets.professionalTraining', types: [], vctValues: [], typeNames: ['ProfessionalTrainingCredential'], queryMode: 'dcql' as const },
  { labelKey: 'presets.professionalSuitability', types: [], vctValues: [], typeNames: ['ProfessionalSuitabilityCredential'], queryMode: 'dcql' as const },
  { labelKey: 'presets.continuousProfDev', types: [], vctValues: [], typeNames: ['ContinuousProfessionalDevelopmentCredential', 'CPD'], queryMode: 'dcql' as const },
]

export const OID4VPRequest = ({ onCredentialReceived }: OID4VPRequestProps) => {
  const { t } = useTranslation('oid4vp')
  const { t: tc } = useTranslation('common')
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [responseMode, setResponseMode] = useState<'direct_post' | 'direct_post.jwt'>('direct_post')
  const [session, setSession] = useState<SessionState | null>(null)
  const [loading, setLoading] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const startSession = async () => {
    setLoading(true)
    stopPolling()

    const preset = CREDENTIAL_PRESETS[selectedPreset]
    try {
      const res = await fetch('/api/oid4vp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialTypes: preset.types.length ? preset.types : undefined,
          vctValues: preset.vctValues.length ? preset.vctValues : undefined,
          typeNames: preset.typeNames?.length ? preset.typeNames : undefined,
          queryMode: preset.queryMode,
          responseMode
        })
      })

      if (!res.ok) throw new Error('Failed to create session')

      const data = await res.json()
      setSession({ sessionId: data.sessionId, uri: data.uri, status: 'pending' })
      setLoading(false)

      // Start polling
      pollingRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/oid4vp/session/${data.sessionId}`)
          if (!pollRes.ok) {
            stopPolling()
            setSession(prev => prev ? { ...prev, status: 'expired', error: t('sessionExpired') } : null)
            return
          }

          const pollData = await pollRes.json()
          if (pollData.status === 'completed') {
            stopPolling()
            setSession(prev => prev ? { ...prev, status: 'completed' } : null)
            onCredentialReceived(pollData.credential, pollData.verificationResult, pollData.vcToken)
          } else if (pollData.status === 'failed') {
            stopPolling()
            setSession(prev => prev ? { ...prev, status: 'failed', error: pollData.error } : null)
          }
        } catch {
          // Polling error, continue
        }
      }, 2000)
    } catch (err) {
      setLoading(false)
      setSession({ sessionId: '', uri: '', status: 'failed', error: t('requestFailed') })
    }
  }

  const reset = () => {
    stopPolling()
    setSession(null)
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{t('title')}</h3>

      {!session && (
        <div className={styles.config}>
          <div className={styles.field}>
            <label className={styles.label}>{t('credentialType')}</label>
            <select
              className={styles.select}
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(Number(e.target.value))}
            >
              {CREDENTIAL_PRESETS.map((preset, i) => (
                <option key={i} value={i}>{t(preset.labelKey)}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('responseMode')}</label>
            <select
              className={styles.select}
              value={responseMode}
              onChange={(e) => setResponseMode(e.target.value as any)}
            >
              <option value="direct_post">{t('directPostPlain')}</option>
              <option value="direct_post.jwt">{t('directPostJarm')}</option>
            </select>
          </div>

          <button className={styles.button} onClick={startSession} disabled={loading}>
            {loading ? t('creating') : t('generateQrCode')}
          </button>
        </div>
      )}

      {session?.status === 'pending' && (
        <div className={styles.qrSection}>
          <p className={styles.instruction}>
            {t('scanInstruction')}
          </p>
          <div className={styles.qrCode}>
            <QRCodeSVG value={session.uri} size={220} />
          </div>
          <div className={styles.polling}>
            <span className={styles.spinner}></span>
            {t('waitingForWallet')}
          </div>
          <button className={styles.cancelButton} onClick={reset}>{tc('buttons.cancel')}</button>
        </div>
      )}

      {session?.status === 'failed' && (
        <div className={styles.error}>
          <span className="material-icons-outlined">warning</span>
          <span>{session.error || t('requestFailed')}</span>
          <button className={styles.cancelButton} onClick={reset}>{tc('buttons.tryAgain')}</button>
        </div>
      )}

      {session?.status === 'expired' && (
        <div className={styles.error}>
          <span className="material-icons-outlined">schedule</span>
          <span>{t('sessionExpired')}</span>
          <button className={styles.cancelButton} onClick={reset}>{tc('buttons.tryAgain')}</button>
        </div>
      )}
    </div>
  )
}
