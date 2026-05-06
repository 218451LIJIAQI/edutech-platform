/// <reference types="vite/client" />

/**
 * Environment variables available in import.meta.env
 * All custom environment variables must be prefixed with VITE_
 */
interface ImportMetaEnv {
  /** The mode the app is running in (development, production, etc.) */
  readonly MODE: string;
  /** The base URL the app is being served from */
  readonly BASE_URL: string;
  /** Whether the app is running in production */
  readonly PROD: boolean;
  /** Whether the app is running in development */
  readonly DEV: boolean;
  /** Whether the app is running in SSR mode */
  readonly SSR: boolean;

  // Custom environment variables
  /** Backend API base URL */
  readonly VITE_API_URL?: string;
  /** WebSocket server URL for real-time features */
  readonly VITE_SOCKET_URL?: string;
  /** Public support email shown in customer-facing pages */
  readonly VITE_SUPPORT_EMAIL?: string;
  /** Public legal contact email shown in customer-facing pages */
  readonly VITE_LEGAL_EMAIL?: string;
  /** Public privacy contact email shown in customer-facing pages */
  readonly VITE_PRIVACY_EMAIL?: string;
  /** Optional public support phone number */
  readonly VITE_SUPPORT_PHONE?: string;
  /** Optional public support or mailing address */
  readonly VITE_SUPPORT_ADDRESS?: string;
  /** Optional published support hours */
  readonly VITE_SUPPORT_HOURS?: string;
  /** Optional published support response window */
  readonly VITE_SUPPORT_RESPONSE_WINDOW?: string;
  /** Optional governing law/jurisdiction text */
  readonly VITE_GOVERNING_LAW?: string;
  /** Optional public X/Twitter profile URL */
  readonly VITE_SOCIAL_X_URL?: string;
  /** Optional public GitHub profile or repository URL */
  readonly VITE_SOCIAL_GITHUB_URL?: string;
  /** Optional public LinkedIn profile or page URL */
  readonly VITE_SOCIAL_LINKEDIN_URL?: string;
  /** Optional public last-updated date for Terms of Service */
  readonly VITE_TERMS_LAST_UPDATED?: string;
  /** Optional public last-updated date for Privacy Policy */
  readonly VITE_PRIVACY_LAST_UPDATED?: string;
}

/**
 * Augment the ImportMeta interface to include environment variables
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
