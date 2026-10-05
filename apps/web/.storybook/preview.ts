import type { Preview } from '@storybook/react-vite';

// Same global styles as the app: fonts, tokens, reset, base styles.
import '../src/styles/index.css';

const preview: Preview = {
  parameters: {
    // Violations count as failures, not warnings. Nothing runs these
    // automatically yet (no addon-vitest); the a11y panel shows the result.
    a11y: { test: 'error' },
  },
};

export default preview;
