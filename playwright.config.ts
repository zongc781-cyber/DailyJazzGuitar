import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against a production build, on a phone and a desktop viewport.
// `npm run test:e2e` builds and starts the app on port 3100 unless one is already running there.

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npx next start -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 600_000,
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
  ],
});
