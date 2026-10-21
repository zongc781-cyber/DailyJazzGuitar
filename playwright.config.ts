import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against a production build in Mac-sized browser windows: a 13-inch
// MacBook screen and a narrow window, where the side rail shrinks to icons.
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
    { name: 'mac', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } },
    { name: 'mac-narrow', use: { ...devices['Desktop Chrome'], viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 } },
  ],
});
