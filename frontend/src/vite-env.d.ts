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
  /** Stripe publishable key (primary) */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /** Stripe public key (fallback for backward compatibility) */
  readonly VITE_STRIPE_PUBLIC_KEY?: string;
  /** Enable mock payment flow for testing (set to 'true' to enable) */
  readonly VITE_ENABLE_PAYMENT_MOCK?: string;
  /** Enable mock notifications for testing (set to 'true' to enable) */
  readonly VITE_ENABLE_NOTIFICATION_MOCK?: string;
  /** WebSocket server URL for real-time features */
  readonly VITE_SOCKET_URL?: string;
}

/**
 * Augment the ImportMeta interface to include environment variables
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
