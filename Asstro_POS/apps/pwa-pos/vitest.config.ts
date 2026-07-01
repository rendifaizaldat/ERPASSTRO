import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@asstro/ledger': path.resolve(__dirname, '../../packages/ledger/src/index.ts'),
      '@asstro/projection': path.resolve(__dirname, '../../packages/projection/src/index.ts'),
      '@asstro/protocol': path.resolve(__dirname, '../../packages/protocol/src/index.ts'),
    }
  }
});
