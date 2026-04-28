import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/app/core/utils/*.spec.ts'],
    globals: true,
  },
});
