import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DeclareLangRuntime',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        '@declarelang/core',
        'fastify',
        'drizzle-orm',
        'postgres',
        'zod',
        'jsonwebtoken',
        'bcrypt',
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
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
      rollupTypes: true,
      insertTypesEntry: true,
    }),
  ],
});
