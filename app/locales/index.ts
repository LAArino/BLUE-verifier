import enCommon from './en/common.json'
import enHome from './en/home.json'
import enVerification from './en/verification.json'
import enCredential from './en/credential.json'
import enOid4vp from './en/oid4vp.json'
import enScan from './en/scan.json'
import enErrors from './en/errors.json'
import enTerms from './en/terms.json'
import enPrivacy from './en/privacy.json'
import enFaq from './en/faq.json'

import esCommon from './es/common.json'
import esHome from './es/home.json'
import esVerification from './es/verification.json'
import esCredential from './es/credential.json'
import esOid4vp from './es/oid4vp.json'
import esScan from './es/scan.json'
import esErrors from './es/errors.json'
import esTerms from './es/terms.json'
import esPrivacy from './es/privacy.json'
import esFaq from './es/faq.json'

import caCommon from './ca/common.json'
import caHome from './ca/home.json'
import caVerification from './ca/verification.json'
import caCredential from './ca/credential.json'
import caOid4vp from './ca/oid4vp.json'
import caScan from './ca/scan.json'
import caErrors from './ca/errors.json'
import caTerms from './ca/terms.json'
import caPrivacy from './ca/privacy.json'
import caFaq from './ca/faq.json'

import euCommon from './eu/common.json'
import euHome from './eu/home.json'
import euVerification from './eu/verification.json'
import euCredential from './eu/credential.json'
import euOid4vp from './eu/oid4vp.json'
import euScan from './eu/scan.json'
import euErrors from './eu/errors.json'
import euTerms from './eu/terms.json'
import euPrivacy from './eu/privacy.json'
import euFaq from './eu/faq.json'

import glCommon from './gl/common.json'
import glHome from './gl/home.json'
import glVerification from './gl/verification.json'
import glCredential from './gl/credential.json'
import glOid4vp from './gl/oid4vp.json'
import glScan from './gl/scan.json'
import glErrors from './gl/errors.json'
import glTerms from './gl/terms.json'
import glPrivacy from './gl/privacy.json'
import glFaq from './gl/faq.json'

import deCommon from './de/common.json'
import deHome from './de/home.json'
import deVerification from './de/verification.json'
import deCredential from './de/credential.json'
import deOid4vp from './de/oid4vp.json'
import deScan from './de/scan.json'
import deErrors from './de/errors.json'
import deTerms from './de/terms.json'
import dePrivacy from './de/privacy.json'
import deFaq from './de/faq.json'

import itCommon from './it/common.json'
import itHome from './it/home.json'
import itVerification from './it/verification.json'
import itCredential from './it/credential.json'
import itOid4vp from './it/oid4vp.json'
import itScan from './it/scan.json'
import itErrors from './it/errors.json'
import itTerms from './it/terms.json'
import itPrivacy from './it/privacy.json'
import itFaq from './it/faq.json'

import nlCommon from './nl/common.json'
import nlHome from './nl/home.json'
import nlVerification from './nl/verification.json'
import nlCredential from './nl/credential.json'
import nlOid4vp from './nl/oid4vp.json'
import nlScan from './nl/scan.json'
import nlErrors from './nl/errors.json'
import nlTerms from './nl/terms.json'
import nlPrivacy from './nl/privacy.json'
import nlFaq from './nl/faq.json'

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Español',
  ca: 'Català',
  eu: 'Euskara',
  gl: 'Galego',
  de: 'Deutsch',
  it: 'Italiano',
  nl: 'Nederlands'
} as const

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES

const ns = (
  common: any, home: any, verification: any, credential: any,
  oid4vp: any, scan: any, errors: any, terms: any, privacy: any, faq: any
) => ({ common, home, verification, credential, oid4vp, scan, errors, terms, privacy, faq })

export const resources = {
  en: ns(enCommon, enHome, enVerification, enCredential, enOid4vp, enScan, enErrors, enTerms, enPrivacy, enFaq),
  es: ns(esCommon, esHome, esVerification, esCredential, esOid4vp, esScan, esErrors, esTerms, esPrivacy, esFaq),
  ca: ns(caCommon, caHome, caVerification, caCredential, caOid4vp, caScan, caErrors, caTerms, caPrivacy, caFaq),
  eu: ns(euCommon, euHome, euVerification, euCredential, euOid4vp, euScan, euErrors, euTerms, euPrivacy, euFaq),
  gl: ns(glCommon, glHome, glVerification, glCredential, glOid4vp, glScan, glErrors, glTerms, glPrivacy, glFaq),
  de: ns(deCommon, deHome, deVerification, deCredential, deOid4vp, deScan, deErrors, deTerms, dePrivacy, deFaq),
  it: ns(itCommon, itHome, itVerification, itCredential, itOid4vp, itScan, itErrors, itTerms, itPrivacy, itFaq),
  nl: ns(nlCommon, nlHome, nlVerification, nlCredential, nlOid4vp, nlScan, nlErrors, nlTerms, nlPrivacy, nlFaq),
}
