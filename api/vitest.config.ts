import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    threads: false,
    sequence: {
      concurrent: false,
    },
    setupFiles: ['./src/test/global-setup.ts', './src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/test/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
});
