import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cli: resolve(__dirname, 'bin/declarelang.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        '@declarelang/core',
        '@declarelang/generators',
        '@declarelang/runtime',
        'commander',
        'chalk',
        'ora',
        'inquirer',
        'chokidar',
        'fastify',
        'pg',
      ],
      output: {
        exports: 'named',
        preserveModules: false,
      },
    },
    sourcemap: true,
    minify: false,
    target: 'node20',
  },
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'bin/**/*.ts'],
      rollupTypes: true,
      insertTypesEntry: true,
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/dist/**', '**/node_modules/**', 'bin/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
