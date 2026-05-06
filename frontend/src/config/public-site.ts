import { formatDate } from '@/utils/helpers';
import { normalizeSafeHttpUrl } from '@/utils/safe-url';

const DEFAULT_POLICY_LAST_UPDATED = '2026-04-23';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PublicSiteConfig = Readonly<{
  supportEmail: string;
  legalEmail: string;
  privacyEmail: string;
  supportPhone: string;
  supportAddress: string;
  supportHours: string;
  supportResponseWindow: string;
  socialXUrl: string;
  socialGithubUrl: string;
  socialLinkedinUrl: string;
  termsLastUpdatedLabel: string;
  privacyLastUpdatedLabel: string;
  governingLawText: string;
}>;

const normalizeText = (value?: string): string => {
  return value?.trim() ?? '';
};

const normalizeEmail = (value?: string): string => {
  const candidate = normalizeText(value).toLowerCase();
  return EMAIL_PATTERN.test(candidate) ? candidate : '';
};

const formatPolicyDate = (value?: string): string => {
  const candidate = normalizeText(value) || DEFAULT_POLICY_LAST_UPDATED;
  const parsedDate = new Date(candidate);

  if (Number.isNaN(parsedDate.getTime())) {
    return formatDate(DEFAULT_POLICY_LAST_UPDATED);
  }

  return formatDate(parsedDate);
};

const normalizePublicUrl = (value?: string): string => {
  return normalizeSafeHttpUrl(normalizeText(value));
};

const supportEmail = normalizeEmail(import.meta.env.VITE_SUPPORT_EMAIL);
const legalEmail = normalizeEmail(import.meta.env.VITE_LEGAL_EMAIL);
const privacyEmail = normalizeEmail(import.meta.env.VITE_PRIVACY_EMAIL);
const governingLaw = normalizeText(import.meta.env.VITE_GOVERNING_LAW);

export const publicSiteConfig: PublicSiteConfig = Object.freeze({
  supportEmail,
  legalEmail: legalEmail || supportEmail,
  privacyEmail: privacyEmail || supportEmail,

  supportPhone: normalizeText(import.meta.env.VITE_SUPPORT_PHONE),
  supportAddress: normalizeText(import.meta.env.VITE_SUPPORT_ADDRESS),
  supportHours: normalizeText(import.meta.env.VITE_SUPPORT_HOURS),
  supportResponseWindow: normalizeText(
    import.meta.env.VITE_SUPPORT_RESPONSE_WINDOW
  ),

  socialXUrl: normalizePublicUrl(import.meta.env.VITE_SOCIAL_X_URL),
  socialGithubUrl: normalizePublicUrl(import.meta.env.VITE_SOCIAL_GITHUB_URL),
  socialLinkedinUrl: normalizePublicUrl(import.meta.env.VITE_SOCIAL_LINKEDIN_URL),

  termsLastUpdatedLabel: formatPolicyDate(
    import.meta.env.VITE_TERMS_LAST_UPDATED
  ),
  privacyLastUpdatedLabel: formatPolicyDate(
    import.meta.env.VITE_PRIVACY_LAST_UPDATED
  ),

  governingLawText:
    governingLaw ||
    'the laws applicable in the jurisdiction where this deployment is operated',
});