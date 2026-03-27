'use client'
import { NextPage } from 'next';
import styles from '@/css/infopages.module.css'
import { BottomBar } from '@/components/BottomBar/BottomBar';
import { TopBar } from '@/components/TopBar/TopBar';
import { useEffect, useState } from 'react';

const Faq: NextPage = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.lang = 'en';
    document.title = 'BLUE VerifierPlus FAQ';
  }, []);

  return (
    <main className={styles.main}>
      <TopBar hasLogo={true} isDark={isDark} setIsDark={setIsDark}/>
      <div className={styles.textContent}>
        <h1 className={styles.title}>BLUE VerifierPlus Frequently Asked Questions</h1>
        <h2 id='trust'>Why trust us?</h2>
        <p>BLUE VerifierPlus is based on open source software developed by the <a href='https://digitalcredentials.mit.edu/'>Digital Credentials Consortium</a>, a network of leading international universities designing an open infrastructure for digital academic credentials.</p>
        <p>This instance has been evolved for{' '}
          <a href='https://wiki.rediris.es/spaces/BLUE'>BLUE</a>, the academic trust network
          operated by <a href='https://www.rediris.es/'>RedIRIS</a> (Red.es) in collaboration
          with <a href='https://www.crue.org/'>CRUE Universidades Españolas</a>.
        </p>
        <p>This website implements <a href='https://github.com/digitalcredentials'>open source libraries</a> that support open technical standards for supported digital credentials.</p>
        <p>Please contact <a href='mailto:blue@rediris.es'>blue@rediris.es</a> with any questions.</p>

        <h2 id='supported'>What formats of digital academic credentials are supported?</h2>
        <p>BLUE VerifierPlus supports digital academic credentials:</p>
        <ul>
          <li>Using the W3C Verifiable Credential Data Model v1.1 and v2.0</li>
          <li>Expressed as Open Badges v3</li>
          <li>JWT-VC (ES256/P-256)</li>
          <li>SD-JWT VC with selective disclosure</li>
        </ul>

        <p>In addition, credentials must support the following standards and specifications for full verification:</p>
        <ul>
          <li>The issuer must exist in a supported registry (EBSI, BLUE, or DCC Known Issuers).</li>
          <li>The issuer and subject decentralized identifiers must be did:key, did:web, did:jwk, did:ebsi, or did:blue</li>
          <li>The appropriate cryptographic signing method must be used</li>
        </ul>

        <h2>What is a Public Link?</h2>
        <p>Users of the BLUE Learner Credential Wallet mobile app are able to create Public Links if they wish to share a credential from their wallet to anyone with the link.</p>

        <h2>Who do I contact if I have more questions?</h2>
        <p>For questions about BLUE VerifierPlus please email <a href='mailto:blue@rediris.es'>blue@rediris.es</a>.</p>
        <p>To learn more about BLUE please visit <a href='https://wiki.rediris.es/spaces/BLUE'>wiki.rediris.es/spaces/BLUE</a>.</p>

      </div>
      <BottomBar isDark={isDark}/>
    </main>
  );
}

export default Faq;
