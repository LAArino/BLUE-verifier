import styles from './[publicCredentialId].module.css'
import { VerifiableCredential } from '@/types/credential';
import { extractCredentialsFrom } from '@/lib/verifiableObject';
import { LoadingError } from '@/components/LoadingError/LoadingError';
import { CredentialNotFound } from '@/components/CredentialNotFound/CredentialNotFound';
import Link from "next/link";
import { CredentialVerification } from '@/components/CredentialVerification/CredentialVerification'
import * as credentialsFetcher from '@/lib/credentials';

export default async function Page({
  params,
}: {
  params: Promise<{ publicCredentialId: string }>
}) {
  let credentials : VerifiableCredential[]
  try {
    const { publicCredentialId } = await params
    const credentialVP = await credentialsFetcher.get({ publicCredentialId });
    credentials = extractCredentialsFrom(credentialVP.vp) || []
  } catch (error) {
    console.log(error)
    return (<LoadingError />)
  }

  if (credentials.length === 0) {
    return <CredentialNotFound />
  }

  return (
    <div>
      {credentials.map((credential, index) => (
        <CredentialVerification credential={credential} key={index} />
      ))}
    </div>
  )
}