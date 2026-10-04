import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/** The same handlers in Node, for Vitest. */
export const server = setupServer(...handlers);
