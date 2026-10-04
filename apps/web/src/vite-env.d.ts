interface ImportMetaEnv {
  /** `real` for a build against the real API (phase 2); anything else starts the MSW mock. */
  readonly VITE_API_MODE?: 'mock' | 'real';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
