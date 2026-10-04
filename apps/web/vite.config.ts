import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Component tests need a DOM. Files that need another environment declare it
    // in a `@vitest-environment` docblock.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Vitest skips CSS by default, which also empties `?raw` imports. The
    // contrast test reads tokens.css, so that one file is processed.
    css: { include: [/tokens\.css/] },
  },
});
