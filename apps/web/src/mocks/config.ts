// The one place the handlers read the mock scenario and latency from.

export const MOCK_SCENARIOS = ['normal', 'slow', 'empty', 'error'] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export type LatencyRange = { minMs: number; maxMs: number };

export const DEFAULT_LATENCY: LatencyRange = { minMs: 150, maxMs: 400 };
export const SLOW_LATENCY: LatencyRange = { minMs: 2500, maxMs: 4000 };

export type MockConfig = {
  scenario: MockScenario;
  /** Used by every scenario except `slow`, which uses `SLOW_LATENCY`. */
  latency: LatencyRange;
};

const DEFAULT_CONFIG: MockConfig = {
  scenario: 'normal',
  latency: DEFAULT_LATENCY,
};

let config: MockConfig = DEFAULT_CONFIG;

export function getMockConfig(): MockConfig {
  return config;
}

export function setMockConfig(next: Partial<MockConfig>): void {
  config = { ...config, ...next };
}

export function resetMockConfig(): void {
  config = DEFAULT_CONFIG;
}

function isScenario(value: string | null): value is MockScenario {
  return MOCK_SCENARIOS.some((scenario) => scenario === value);
}

/** `?mock=error` selects a scenario; a missing or unknown value falls back to `normal`. */
export function scenarioFromSearch(search: string): MockScenario {
  const value = new URLSearchParams(search).get('mock');
  return isScenario(value) ? value : 'normal';
}
