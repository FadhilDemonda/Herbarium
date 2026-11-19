import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  timeout: 20000,
  expect: { timeout: 4000 },
  use: {
    baseURL: 'http://127.0.0.1:5186',
    browserName: 'chromium',
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5186 --strictPort',
    url: 'http://127.0.0.1:5186',
    reuseExistingServer: false,
    env: { VITE_GAS_URL: 'https://script.google.com/macros/s/audit-test-only/exec' },
  },
});
