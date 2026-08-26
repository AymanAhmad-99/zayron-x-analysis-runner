import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['__tests__/unit/**/*.test.{ts,tsx}', '__tests__/integration/**/*.test.{ts,tsx}'],
    globals: true,
    // Integration tests may hit a real server — give them more time
    testTimeout: 15000,
    hookTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
