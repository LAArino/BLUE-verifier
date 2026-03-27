'use client'
import { NextPage } from "next";
import styles from '@/css/infopages.module.css'
import { BottomBar } from "@/components/BottomBar/BottomBar";
import { TopBar } from "@/components/TopBar/TopBar";
import { useEffect, useState } from "react";

const Terms: NextPage = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.lang = "en";
    document.title = "BLUE VerifierPlus Terms";
  }, []);

  return (
    <main className={styles.main}>
      <TopBar hasLogo={true} isDark={isDark} setIsDark={setIsDark}/>
      <div className={styles.textContent}>
        <h1 className={styles.title}>TERMS AND CONDITIONS OF USE</h1>
            <p>Welcome to the BLUE VerifierPlus site (the {'"'}Site{'"'}). The Site is an open source digital credential verification and public sharing website originally developed by the <a href='https://digitalcredentials.mit.edu'>Digital Credentials Consortium</a> and evolved for <a href='https://wiki.rediris.es/spaces/BLUE'>BLUE</a>, the academic trust network operated by <a href='https://www.rediris.es/'>RedIRIS</a> (Red.es) in collaboration with <a href='https://www.crue.org/'>CRUE Universidades Españolas</a>. By accessing this Site, users agree to be bound by the following terms and conditions which may be revised at any time. Users are encouraged to visit this page periodically to review the current terms and conditions, as your continued use of this Site signifies your agreement to these terms and conditions. If you do not understand or do not agree to be bound by these terms and conditions, please exit this Site immediately.</p>
            <ol>
                <li><p>When used to verify a supported digital credential, the Site may collect or retain personally identifiable information about you. Please see our <a href='privacy'>Privacy Policy</a> for additional information.</p></li>
                <li><p>When used with the <a href='https://wiki.rediris.es/spaces/BLUE'>BLUE Learner Credential Wallet</a>, the Site may collect or retain personally identifiable information about you that you have chosen to share. Please see our <a href='privacy'>Privacy Policy</a> for additional information.</p></li>
                <li><p>The text, images, trademarks, data, audio files, video files and clips, and other documentation on the Site, as well as the infrastructure used to provide the Site, (collectively the {'"'}Materials{'"'}) are protected by copyright and may be covered by other restrictions as well. The original VerifierPlus software is copyright of the Digital Credentials Consortium (MIT). The BLUE adaptations are copyright of RedIRIS/Red.es. Copyright and other proprietary rights may be held by individuals or entities, other than, or in addition to, the operators of this Site.</p></li>
                <li><p>The {'"'}BLUE{'"'} name and branding are property of RedIRIS (Red.es). The {'"'}CRUE{'"'} name and logo are property of CRUE Universidades Españolas. Except for purposes of attribution, you may not use these names or logos, or any variations thereof, without prior written consent. You may not use them for promotional purposes, or in any way that deliberately or inadvertently claims, suggests, or gives the appearance or impression of a relationship with or endorsement by these organizations.</p></li>
                <li><p>Without limiting the foregoing, all Materials on the Site are provided {'"'}AS IS{'"'} WITHOUT A WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, COPYRIGHT OWNERSHIP AND/OR NON-INFRINGEMENT OF OTHER THIRD PARTY PROPRIETARY RIGHTS. BLUE VerifierPlus does not warrant the Site will operate in an uninterrupted or error-free manner or that the Site is free of viruses or other harmful components. Use of information obtained from or through this Site is at your own risk.</p></li>
                <li><p>NEITHER REDIRIS (RED.ES), CRUE, NOR THE DIGITAL CREDENTIALS CONSORTIUM, NOR THEIR RESPECTIVE AFFILIATES, DIRECTORS, OFFICERS, EMPLOYEES AND AGENTS SHALL HAVE ANY LIABILITY FOR ANY DAMAGES, INCLUDING WITHOUT LIMITATION, ANY DIRECT, INDIRECT, INCIDENTAL, COMPENSATORY, PUNITIVE, SPECIAL OR CONSEQUENTIAL DAMAGES ARISING FROM OR RELATED TO THE USE OF THE SITE, CONTENT, AND/OR COMPILATION.</p></li>
                <li><p>You agree to defend, hold harmless and indemnify RedIRIS (Red.es), CRUE, and the Digital Credentials Consortium and their respective officers, agents, and employees from and against any third-party claims, actions or demands arising out of, resulting from or in any way related to your use of the Site, including any liability or expense arising from any and all claims, losses, damages (actual and consequential), suits, judgments, litigation costs and attorneys&apos; fees, of every kind and nature.</p></li>
                <li><p>These terms and conditions constitute the entire agreement between you and the operators of this Site with respect to your use of the Site. The failure to exercise or enforce any right or provision of the terms and conditions shall not constitute a waiver of such right or provision. If any provision of the terms and conditions is found by a court of competent jurisdiction to be invalid, the parties nevertheless agree that the court should endeavor to give effect to the parties&apos; intentions as reflected in the provision, and the other provisions of the terms and conditions remain in full force and effect.</p></li>
                <li><p>You agree that any dispute arising out of or relating to these terms and conditions or any content posted to the Site will be governed by the laws of the Kingdom of Spain. You further consent to the jurisdiction of the courts of Madrid, Spain as the legal forum for any such dispute.</p></li>
            </ol>
            <p>Effective Date March 2026</p>
      </div>
      <BottomBar isDark={isDark}/>
    </main>
  );
}

export default Terms;
