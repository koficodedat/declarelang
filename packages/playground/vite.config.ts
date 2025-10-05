import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  base: '/declarelang/', // Adjust for GitHub Pages
  build: {
    target: 'esnext',
    sourcemap: true,
  },
});
