import { defineConfig, devices } from '@playwright/test';

// Runs against the production build served under the same base path as GitHub Pages.
// Locally: PW_CHANNEL=msedge npm run test:e2e   (CI-style runs can use the Playwright chromium instead).
const channel = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173/celebrare-photo-gallery/', ...devices['Desktop Chrome'], ...channel },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/celebrare-photo-gallery/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
