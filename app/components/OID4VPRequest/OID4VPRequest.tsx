'use client'
import { useState, useRef, useCallback } from 'react'
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
  { label: 'Any Credential', types: ['VerifiableCredential'], vctValues: [], typeNames: [], queryMode: 'presentation_definition' as const },
  // Identity
  { label: 'Verifiable PID', types: [], vctValues: ['eu.europa.ec.eudi.pid.1', 'urn:eu.europa.ec.eudi:pid:1'], typeNames: ['VerifiablePID', 'PID', 'pid'], queryMode: 'dcql' as const },
  { label: 'Educational ID', types: [], vctValues: ['eu.europa.ec.eudi.eduid.1', 'urn:eu.europa.ec.eudi.eduid:1'], typeNames: ['EducationalID', 'EduID', 'eduid', 'EducationalCredential'], queryMode: 'dcql' as const },
  { label: 'MyAcademicID', types: [], vctValues: [], typeNames: ['MyAcademicIDIssuer', 'MyAcademicID'], queryMode: 'dcql' as const },
  { label: 'MyAllianceID', types: [], vctValues: [], typeNames: ['MyAllianceID'], queryMode: 'dcql' as const },
  { label: 'European Student Card', types: [], vctValues: [], typeNames: ['EuropeanStudentCard', 'ESC'], queryMode: 'dcql' as const },
  // Higher Education
  { label: 'HE Diploma', types: [], vctValues: ['eu.europa.ec.eudi.hed.1', 'urn:eu.europa.ec.eudi:hed:1'], typeNames: ['EuropeanHigherEducationDiploma', 'HigherEducationDiploma', 'HED', 'Diploma'], queryMode: 'dcql' as const },
  { label: 'HE Diploma Supplement', types: [], vctValues: ['eu.europa.ec.eudi.heds.1', 'urn:eu.europa.ec.eudi:heds:1'], typeNames: ['EuropeanHigherEducationDiplomaSupplement', 'HEDS'], queryMode: 'dcql' as const },
  { label: 'HE Proof of Enrolment', types: [], vctValues: ['eu.europa.ec.eudi.hepoe.1', 'urn:eu.europa.ec.eudi:hepoe:1'], typeNames: ['EuropeanHigherEducationProofOfEnrolment', 'ProofOfEnrolment', 'HEPoE', 'Enrolment'], queryMode: 'dcql' as const },
  { label: 'HE Microcredential', types: [], vctValues: ['eu.europa.ec.eudi.euhemc.1', 'urn:eu.europa.ec.eudi:euhemc:1'], typeNames: ['EuropeanHigherEducationMicrocredential', 'EUHEMC', 'Microcredential'], queryMode: 'dcql' as const },
  { label: 'HE Transcript of Records', types: [], vctValues: ['eu.europa.ec.eudi.hetor.1', 'urn:eu.europa.ec.eudi:hetor:1'], typeNames: ['EuropeanHigherEducationTranscriptOfRecords', 'HEToR', 'TranscriptOfRecords'], queryMode: 'dcql' as const },
  // Secondary & VET
  { label: 'Upper Secondary Certificate', types: [], vctValues: ['eu.europa.ec.eudi.eusec.1', 'urn:eu.europa.ec.eudi:eusec:1'], typeNames: ['EuropeanUpperSecondaryEducationCertificate', 'EUSEC'], queryMode: 'dcql' as const },
  { label: 'Upper Secondary Transcript', types: [], vctValues: ['eu.europa.ec.eudi.usetor.1', 'urn:eu.europa.ec.eudi:usetor:1'], typeNames: ['EuropeanUpperSecondaryEducationTranscriptOfRecords', 'USEToR'], queryMode: 'dcql' as const },
  { label: 'VET Microcredential', types: [], vctValues: ['eu.europa.ec.eudi.vetmc.1', 'urn:eu.europa.ec.eudi:vetmc:1'], typeNames: ['EuropeanVocationalEducationTrainingMicrocredential', 'VETMC'], queryMode: 'dcql' as const },
  // Professional / Health
  { label: 'Professional ID', types: [], vctValues: [], typeNames: ['ProfessionalIdCredential'], queryMode: 'dcql' as const },
  { label: 'Doctor ID', types: [], vctValues: [], typeNames: ['DoctorIdCredential'], queryMode: 'dcql' as const },
  { label: 'Engineer ID', types: [], vctValues: [], typeNames: ['EngineerIdCredential'], queryMode: 'dcql' as const },
  { label: 'Medical Training Accreditation', types: [], vctValues: [], typeNames: ['ContinuousMedicalTrainingAccreditation'], queryMode: 'dcql' as const },
  { label: 'Professional Training', types: [], vctValues: [], typeNames: ['ProfessionalTrainingCredential'], queryMode: 'dcql' as const },
  { label: 'Professional Suitability', types: [], vctValues: [], typeNames: ['ProfessionalSuitabilityCredential'], queryMode: 'dcql' as const },
  { label: 'Continuous Professional Dev.', types: [], vctValues: [], typeNames: ['ContinuousProfessionalDevelopmentCredential', 'CPD'], queryMode: 'dcql' as const },
]

export const OID4VPRequest = ({ onCredentialReceived }: OID4VPRequestProps) => {
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
            setSession(prev => prev ? { ...prev, status: 'expired', error: 'Session expired' } : null)
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
      setSession({ sessionId: '', uri: '', status: 'failed', error: 'Failed to create session' })
    }
  }

  const reset = () => {
    stopPolling()
    setSession(null)
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Request credential via OID4VP</h3>

      {!session && (
        <div className={styles.config}>
          <div className={styles.field}>
            <label className={styles.label}>Credential Type</label>
            <select
              className={styles.select}
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(Number(e.target.value))}
            >
              {CREDENTIAL_PRESETS.map((preset, i) => (
                <option key={i} value={i}>{preset.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Response Mode</label>
            <select
              className={styles.select}
              value={responseMode}
              onChange={(e) => setResponseMode(e.target.value as any)}
            >
              <option value="direct_post">direct_post (plain)</option>
              <option value="direct_post.jwt">direct_post.jwt (JARM encrypted)</option>
            </select>
          </div>

          <button className={styles.button} onClick={startSession} disabled={loading}>
            {loading ? 'Creating...' : 'Generate QR Code'}
          </button>
        </div>
      )}

      {session?.status === 'pending' && (
        <div className={styles.qrSection}>
          <p className={styles.instruction}>
            Scan with a compatible wallet to present your credential
          </p>
          <div className={styles.qrCode}>
            <QRCodeSVG value={session.uri} size={220} />
          </div>
          <div className={styles.polling}>
            <span className={styles.spinner}></span>
            Waiting for wallet response...
          </div>
          <button className={styles.cancelButton} onClick={reset}>Cancel</button>
        </div>
      )}

      {session?.status === 'failed' && (
        <div className={styles.error}>
          <span className="material-icons-outlined">warning</span>
          <span>{session.error || 'Request failed'}</span>
          <button className={styles.cancelButton} onClick={reset}>Try again</button>
        </div>
      )}

      {session?.status === 'expired' && (
        <div className={styles.error}>
          <span className="material-icons-outlined">schedule</span>
          <span>Session expired</span>
          <button className={styles.cancelButton} onClick={reset}>Try again</button>
        </div>
      )}
    </div>
  )
}
