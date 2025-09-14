import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/api/tests/**/*.test.js'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['apps/api/src/services/**'],
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90
    }
  }
});
