import type { VerifiableCredential } from 'types/credential';

export type CredentialCardProps = {
  credential?: VerifiableCredential,
  wasMulti?: Boolean
}

export type SubjectField = {
  key: string,
  label: string,
  value: string
}

export type CredentialDisplayFields = {
  credentialName: string | undefined,
  issuedTo: string | undefined,
  issuanceDate: string | undefined,
  expirationDate: string | undefined,
  credentialDescription: string | undefined,
  criteria: string | undefined,
  achievementImage?: string | undefined,
  achievementType?: string | undefined,
  vct?: string | undefined,
  subjectFields?: SubjectField[],
}
