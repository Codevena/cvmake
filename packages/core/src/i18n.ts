import type { LabelDictionary, Locale } from '@codevena/cvmake-schema';

const DE: LabelDictionary = {
  summary: 'Profil',
  experience: 'Berufserfahrung',
  education: 'Ausbildung',
  skills: 'Kenntnisse',
  languages: 'Sprachen',
  present: 'heute',
  personalData: 'Persönliche Daten',
  contact: 'Kontakt',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  website: 'Webseite',
  email: 'E-Mail',
  phone: 'Telefon',
  location: 'Ort',
  birthDate: 'Geburtsdatum',
  drivingLicense: 'Führerschein',
  maritalStatus: 'Familienstand',
};

const EN: LabelDictionary = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  languages: 'Languages',
  present: 'present',
  personalData: 'Personal Data',
  contact: 'Contact',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  website: 'Website',
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  birthDate: 'Date of Birth',
  drivingLicense: 'Driving License',
  maritalStatus: 'Marital Status',
};

const DICTIONARIES: Record<Locale, LabelDictionary> = { de: DE, en: EN };

export function getLabels(locale: Locale): LabelDictionary {
  return DICTIONARIES[locale];
}
