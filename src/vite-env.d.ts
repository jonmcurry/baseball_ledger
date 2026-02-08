/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project API URL (e.g., http://localhost:54321) */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase anonymous/public API key (safe for browsers; RLS enforces access) */
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Current environment identifier: 'development' | 'staging' | 'production' */
  readonly VITE_APP_ENV?: string;
  /** Vite built-in: true when running in development mode */
  readonly DEV: boolean;
  /** Vite built-in: true when running in production mode */
  readonly PROD: boolean;
  /** Vite built-in: 'development' | 'production' */
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
